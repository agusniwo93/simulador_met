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

// Quita centinelas de página y normaliza espacios.
const clean = (s: string): string => s.replace(/@@P\d+@@/g, " ").replace(/\s+/g, " ").trim();

function normalizeExamText(text: string): string {
  return text
    .replace(/--\s*(\d+)\s*of\s*\d+\s*--/gi, "\n@@P$1@@\n") // página → centinela @@Pn@@
    .replace(/�/g, " ") // carácter de reemplazo (checkbox del PDF)
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/[ ]{2,}/g, " ");
}

// Nº de página de un desplazamiento dentro de una sección (cuenta los centinelas
// @@Pn@@ que hay antes, sumados a la página donde arranca la sección).
function pageInContent(content: string, localOffset: number, startPage: number): number {
  const re = /@@P\d+@@/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) && m.index < localOffset) count++;
  return startPage + count;
}

export interface PdfImage {
  page: number;
  buffer: Buffer;
  ext: string;
}

// Imágenes del examen ya guardadas y servibles, agrupadas por nº de página.
export type ImagesByPage = Record<number, string[]>;

// Extrae las imágenes embebidas del PDF con su nº de página.
export async function extractPdfImages(buffer: Buffer): Promise<PdfImage[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const res = (await parser.getImage()) as {
      pages?: { pageNumber?: number; images?: { dataUrl?: string }[] }[];
    };
    const out: PdfImage[] = [];
    (res.pages || []).forEach((p, i) => {
      const page = p.pageNumber ?? i + 1;
      for (const img of p.images || []) {
        const mm = /^data:image\/(\w+);base64,(.+)$/.exec(img.dataUrl || "");
        if (!mm) continue;
        const ext = mm[1].toLowerCase() === "jpg" ? "jpeg" : mm[1].toLowerCase();
        out.push({ page, buffer: Buffer.from(mm[2], "base64"), ext });
      }
    });
    return out;
  } catch {
    return [];
  } finally {
    await parser.destroy();
  }
}

type SectionKindStr = "WRITING" | "LISTENING" | "GRAMMAR" | "READING" | "SPEAKING";

interface SectionSlice {
  content: string;
  startPage: number;
}

function splitExamSections(text: string): { title: string; sections: Record<string, SectionSlice> } {
  const re = /^\s*(WRITING|LISTENING|GRAMMAR|READING|SPEAKING)\s*$/gim;
  const marks: { kind: SectionKindStr; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    marks.push({ kind: m[1].toUpperCase() as SectionKindStr, start: m.index, end: re.lastIndex });
  }
  const head = marks.length ? text.slice(0, marks[0].start) : text;
  const title = head.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "Imported exam";

  // Índices de los centinelas para calcular la página de inicio de cada sección.
  const sentinels = [...text.matchAll(/@@P\d+@@/g)].map((x) => x.index as number);
  const pageAt = (off: number) => sentinels.filter((i) => i < off).length + 1;

  const sections: Record<string, SectionSlice> = {};
  for (let i = 0; i < marks.length; i++) {
    const content = text.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : text.length);
    if (!sections[marks[i].kind]) {
      sections[marks[i].kind] = { content, startPage: pageAt(marks[i].end) };
    } else {
      sections[marks[i].kind].content += "\n" + content;
    }
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
    const transcript = b
      .slice(0, qi)
      .replace(/PARTE\s*\d+/gi, "")
      .replace(/\n?@@P\d+@@\n?/g, "\n")
      .trim();
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

const isOpt = (l: string) => /^[A-D][.)]\s/.test(l);
const isAns = (l: string) => /^Answer(\s*key)?\s*:/i.test(l);

// Extrae preguntas MCQ de un bloque de líneas de Reading a partir de startIdx.
function parseReadingQuestions(lines: string[], startIdx: number, idPrefix: string): McqItem[] {
  const items: McqItem[] = [];
  let j = startIdx;
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
      items.push({ id: `${idPrefix}_${++qn}`, stem, options, correctIndex });
    } else if (!stem && !options.length) {
      j++; // salvavidas anti-bucle
    }
  }
  return items;
}

function parseReadingSection(
  content: string,
  startPage: number,
  imagesByPage: ImagesByPage
): ReadingPassage[] {
  const marks = [...content.matchAll(/(Text|PACK)\s*\d+/gi)].map((m) => ({
    type: m[1].toUpperCase(),
    start: m.index as number,
    end: (m.index as number) + m[0].length,
  }));
  const passages: ReadingPassage[] = [];

  for (let i = 0; i < marks.length; i++) {
    const block = content.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : content.length);
    const page = pageInContent(content, marks[i].start, startPage);

    // PACK = preguntas basadas en anuncios (una imagen por página). Se divide en
    // sub-bloques por página y se asocia a cada uno el anuncio de esa página.
    if (marks[i].type === "PACK") {
      block.split(/@@P\d+@@/).forEach((chunk, ci) => {
        const chunkLines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
        const items = parseReadingQuestions(chunkLines, 0, `r${passages.length + 1}`);
        if (!items.length) return; // sin preguntas, no consumir imagen
        const imageUrl = imagesByPage[page + ci]?.shift();
        if (imageUrl) passages.push({ id: `p${passages.length + 1}`, imageUrl, items });
      });
      continue;
    }

    const lines = block
      .split("\n")
      .map((l) => l.replace(/@@P\d+@@/g, "").trim())
      .filter(Boolean);
    if (!lines.length) continue;
    const idPrefix = `r${passages.length + 1}`;

    // Text = pasaje con título + texto + preguntas.
    const title = lines[0];
    let j = 1;
    const passageLines: string[] = [];
    while (j < lines.length) {
      const numbered = /^\d+\.\s/.test(lines[j]);
      const qmark = /\?\s*$/.test(lines[j]) && [1, 2].some((k) => lines[j + k] && isOpt(lines[j + k]));
      if ((numbered || qmark) && !isOpt(lines[j]) && !isAns(lines[j])) break;
      passageLines.push(lines[j]);
      j++;
    }
    const items = parseReadingQuestions(lines, j, idPrefix);
    if (items.length) {
      passages.push({ id: `p${passages.length + 1}`, title, text: passageLines.join("\n"), items });
    }
  }
  return passages;
}

function parseSpeakingSection(
  content: string,
  startPage: number,
  imagesByPage: ImagesByPage
): SpeakingTask[] {
  const marks = [...content.matchAll(/Task\s*\d+/gi)].map((m) => ({
    start: m.index as number,
    end: (m.index as number) + m[0].length,
  }));
  const tasks: SpeakingTask[] = [];
  for (let i = 0; i < marks.length; i++) {
    const block = content.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : content.length);
    const prompt = clean(block);
    if (!prompt) continue;
    const page = pageInContent(content, marks[i].start, startPage);
    const imageUrl = imagesByPage[page]?.shift();
    tasks.push({ id: `sp${tasks.length + 1}`, prompt, ...(imageUrl ? { imageUrl } : {}) });
  }
  return tasks;
}

export interface ParsedExam {
  title: string;
  sections: Section[];
}

// Parsea el texto completo de un simulador en su formato natural y devuelve las
// secciones reconocidas. `imagesByPage` asocia las imágenes del PDF a Reading
// (anuncios) y Speaking (foto) por su nº de página.
export function parseExam(rawText: string, imagesByPage: ImagesByPage = {}): ParsedExam {
  // Clonamos para poder consumir las imágenes (shift) sin mutar el original.
  const images: ImagesByPage = {};
  for (const [k, v] of Object.entries(imagesByPage)) images[Number(k)] = [...v];

  const text = normalizeExamText(rawText);
  const { title, sections: raw } = splitExamSections(text);
  const sections: Section[] = [];

  if (raw.WRITING) {
    const writingTasks = parseWritingSection(raw.WRITING.content);
    if (writingTasks.length) sections.push({ kind: "writing", title: "Writing", writingTasks });
  }
  if (raw.LISTENING) {
    const items = parseListeningSection(raw.LISTENING.content);
    if (items.length) sections.push({ kind: "listening", title: "Listening", items });
  }
  if (raw.GRAMMAR) {
    const items = parseGrammarSection(raw.GRAMMAR.content);
    if (items.length) sections.push({ kind: "grammar", title: "Grammar", items });
  }
  if (raw.READING) {
    const passages = parseReadingSection(raw.READING.content, raw.READING.startPage, images);
    if (passages.length) sections.push({ kind: "reading", title: "Reading", passages });
  }
  if (raw.SPEAKING) {
    const speakingTasks = parseSpeakingSection(raw.SPEAKING.content, raw.SPEAKING.startPage, images);
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
