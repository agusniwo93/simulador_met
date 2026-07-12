import type {
  WritingTask,
  SpeakingTask,
  McqItem,
  ReadingPassage,
  Section,
} from "../types";

// Parser de la PLANTILLA FIJA de preguntas en PDF (sección de Writing).
// El admin debe seguir este formato para que la carga sea 100% fiable.

export { TEMPLATE_GUIDE } from "./template-guide";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// ========================================================================
//  Parser del formato NATURAL del examen (Writing / Listening / Grammar /
//  Reading / Speaking), tal como salen los simuladores en PDF. Detecta las
//  secciones por su encabezado y arma un examen multi-sección completo.
// ========================================================================

const clean = (s: string): string => s.replace(/\s+/g, " ").trim();

function normalizeExamText(text: string): string {
  return text
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "\n") // marcadores de página "-- 1 of 30 --"
    .replace(/�/g, " ") // carácter de reemplazo (checkbox del PDF)
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/[ ]{2,}/g, " ");
}

type SectionKindStr = "WRITING" | "LISTENING" | "GRAMMAR" | "READING" | "SPEAKING";

function splitExamSections(text: string): { title: string; sections: Record<string, string> } {
  const re = /^\s*(WRITING|LISTENING|GRAMMAR|READING|SPEAKING)\s*$/gim;
  const marks: { kind: SectionKindStr; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    marks.push({ kind: m[1].toUpperCase() as SectionKindStr, start: m.index, end: re.lastIndex });
  }
  const head = marks.length ? text.slice(0, marks[0].start) : text;
  const title = head.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "Imported exam";

  const sections: Record<string, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const content = text.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : text.length);
    sections[marks[i].kind] = (sections[marks[i].kind] || "") + "\n" + content;
  }
  return { title, sections };
}

function parseWritingSection(content: string): WritingTask[] {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const prompts: string[] = [];
  let acc: string[] = [];
  for (const l of lines) {
    acc.push(l);
    if (/\?\s*$/.test(l)) {
      prompts.push(acc.join(" "));
      acc = [];
    }
  }
  if (acc.length) prompts.push(acc.join(" "));
  return prompts
    .map((p) => clean(p))
    .filter(Boolean)
    .map((prompt, i) => ({ id: `w${i + 1}`, prompt, minWords: prompt.length > 140 ? 150 : 20 }));
}

function parseListeningSection(content: string): McqItem[] {
  const blocks = content.split(/Audio\s*\d+/i).slice(1);
  const items: McqItem[] = [];
  blocks.forEach((b, i) => {
    const qi = b.search(/Question\s*:/i);
    const ai = b.search(/Answer\s*:/i);
    if (qi < 0 || ai < 0) return;
    const transcript = b.slice(0, qi).replace(/PARTE\s*\d+/gi, "").trim();
    const stem = clean(b.slice(qi, ai).replace(/Question\s*:/i, ""));
    const correct = clean(b.slice(ai).replace(/Answer\s*:/i, "").split("\n")[0]).replace(
      /^[^A-Za-z0-9¿¡"']+/,
      ""
    );
    if (stem && correct) {
      // Solo la respuesta correcta; los distractores se generan al crear el examen.
      items.push({ id: `l${i + 1}`, stem, options: [correct], correctIndex: 0, transcript });
    }
  });
  return items;
}

function parseGrammarSection(content: string): McqItem[] {
  const re =
    /(\d+)\.\s*([\s\S]*?)\bA\)\s*([\s\S]*?)\bB\)\s*([\s\S]*?)\bC\)\s*([\s\S]*?)\bD\)\s*([\s\S]*?)Answer key\s*:\s*([A-D])\)/gi;
  const items: McqItem[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(content))) {
    const [, , stem, a, b, c, d, correct] = m;
    items.push({
      id: `g${++i}`,
      stem: clean(stem),
      options: [a, b, c, d].map(clean),
      correctIndex: Math.max(0, "ABCD".indexOf(correct.toUpperCase())),
    });
  }
  return items;
}

function parseReadingSection(content: string): ReadingPassage[] {
  const re = /(Text|PACK)\s*\d+/gi;
  const marks: { type: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    marks.push({ type: m[1].toUpperCase(), start: m.index, end: re.lastIndex });
  }
  const isOpt = (l: string) => /^[A-D][.)]\s/.test(l);
  const isAns = (l: string) => /^Answer(\s*key)?\s*:/i.test(l);
  const passages: ReadingPassage[] = [];

  for (let i = 0; i < marks.length; i++) {
    if (marks[i].type !== "TEXT") continue; // PACK = preguntas por imagen: se omiten
    const block = content.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : content.length);
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const title = lines[0];

    // Separar el pasaje de las preguntas: el pasaje va hasta la primera línea
    // numerada ("1.") o una pregunta ("…?") seguida de opciones.
    let j = 1;
    const passageLines: string[] = [];
    while (j < lines.length) {
      const numbered = /^\d+\.\s/.test(lines[j]);
      const qmark = /\?\s*$/.test(lines[j]) && [1, 2].some((k) => lines[j + k] && isOpt(lines[j + k]));
      if ((numbered || qmark) && !isOpt(lines[j]) && !isAns(lines[j])) break;
      passageLines.push(lines[j]);
      j++;
    }

    const items: McqItem[] = [];
    let qn = 0;
    while (j < lines.length) {
      const stemLines: string[] = [];
      while (j < lines.length && !isOpt(lines[j])) {
        if (isAns(lines[j])) break;
        stemLines.push(lines[j]);
        j++;
      }
      const options: string[] = [];
      for (const L of ["A", "B", "C", "D"]) {
        if (j < lines.length && new RegExp(`^${L}[.)]\\s`).test(lines[j])) {
          options.push(lines[j].replace(/^[A-D][.)]\s*/, "").trim());
          j++;
        }
      }
      let correctIndex = 0;
      if (j < lines.length && isAns(lines[j])) {
        const mm = lines[j].match(/Answer(?:\s*key)?\s*:\s*([A-D])/i);
        if (mm) correctIndex = Math.max(0, "ABCD".indexOf(mm[1].toUpperCase()));
        j++;
      }
      const stem = clean(stemLines.join(" ").replace(/^\d+\.\s*/, ""));
      if (stem && options.length >= 2) {
        items.push({ id: `r${passages.length + 1}_${++qn}`, stem, options, correctIndex });
      } else if (!stem && !options.length) {
        j++; // salvavidas anti-bucle
      }
    }

    if (items.length) {
      passages.push({ id: `p${passages.length + 1}`, title, text: passageLines.join("\n"), items });
    }
  }
  return passages;
}

function parseSpeakingSection(content: string): SpeakingTask[] {
  return content
    .split(/Task\s*\d+/i)
    .slice(1)
    .map((b, i) => ({ id: `sp${i + 1}`, prompt: clean(b) }))
    .filter((t) => t.prompt);
}

export interface ParsedExam {
  title: string;
  sections: Section[];
}

// Parsea el texto completo de un simulador en su formato natural y devuelve las
// secciones que se hayan podido reconocer.
export function parseExam(rawText: string): ParsedExam {
  const text = normalizeExamText(rawText);
  const { title, sections: raw } = splitExamSections(text);
  const sections: Section[] = [];

  if (raw.WRITING) {
    const writingTasks = parseWritingSection(raw.WRITING);
    if (writingTasks.length) sections.push({ kind: "writing", title: "Writing", writingTasks });
  }
  if (raw.LISTENING) {
    const items = parseListeningSection(raw.LISTENING);
    if (items.length) sections.push({ kind: "listening", title: "Listening", items });
  }
  if (raw.GRAMMAR) {
    const items = parseGrammarSection(raw.GRAMMAR);
    if (items.length) sections.push({ kind: "grammar", title: "Grammar", items });
  }
  if (raw.READING) {
    const passages = parseReadingSection(raw.READING);
    if (passages.length) sections.push({ kind: "reading", title: "Reading", passages });
  }
  if (raw.SPEAKING) {
    const speakingTasks = parseSpeakingSection(raw.SPEAKING);
    if (speakingTasks.length) sections.push({ kind: "speaking", title: "Speaking", speakingTasks });
  }

  return { title, sections };
}

const FIELD = "(?:TYPE|TOPIC|PROMPT|FEEDBACK|MINWORDS)";

function field(block: string, key: string): string {
  const re = new RegExp(`${key}\\s*:\\s*([\\s\\S]*?)\\s*(?=${FIELD}\\s*:|\\[\\/TASK\\]|$)`, "i");
  const m = block.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

export interface ParsedTemplate {
  title: string;
  tasks: WritingTask[];
}

export function parseTemplate(text: string): ParsedTemplate {
  const titleMatch = text.match(/TITLE\s*:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : "Imported MET Writing";

  const blocks = [...text.matchAll(/\[TASK\]([\s\S]*?)\[\/TASK\]/gi)].map((m) => m[1]);

  const tasks: WritingTask[] = blocks
    .map((block, index): WritingTask | null => {
      const prompt = field(block, "PROMPT");
      if (!prompt) return null;
      const minWordsRaw = field(block, "MINWORDS");
      const minWords = parseInt(minWordsRaw, 10);
      return {
        id: `w${index + 1}`,
        prompt,
        feedbackGuide: field(block, "FEEDBACK"),
        minWords: Number.isFinite(minWords) ? minWords : 0,
      };
    })
    .filter((t): t is WritingTask => t !== null);

  return { title, tasks };
}
