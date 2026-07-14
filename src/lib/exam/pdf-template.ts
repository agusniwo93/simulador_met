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
    .replace(/�/g, "✅") // el checkbox de respuesta del PDF llega como carácter de reemplazo
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

function splitExamSections(
  text: string
): { title: string; head: string; sections: Record<string, SectionSlice> } {
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
  return { title, head, sections };
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

// Limpia el guion de un audio (quita centinelas, "PARTE N" y el número de audio
// que a veces queda al inicio, p. ej. "1\n\nStudent: ..." → "Student: ...").
function cleanTranscript(s: string): string {
  return s
    .replace(/\n?@@P\d+@@\n?/g, "\n")
    .replace(/PARTE\s*\d+/gi, "")
    .replace(/^[\s\d.]+(?=[A-Za-z])/, "")
    .trim();
}

// Quita marcas de respuesta ("Answer:", "✅", checkbox) del inicio.
function stripAnswerMark(s: string): string {
  return clean(s.replace(/Answer\s*:/i, "")).replace(/^[^A-Za-z0-9¿¡"'(]+/, "");
}

// Parte 2/3: un audio con varias preguntas y respuestas (marcadas con ✅). El
// enunciado y la respuesta pueden ir en líneas separadas ("stem\n✅ answer") o
// en la misma línea ("stem?✅ answer"); se soportan ambos.
function parseMultiQA(qa: string): { stem: string; correct: string }[] {
  const lines = qa.split("\n").map((l) => l.replace(/@@P\d+@@/g, "").trim()).filter(Boolean);
  const out: { stem: string; correct: string }[] = [];
  let stemLines: string[] = [];
  const pushQA = (stemTail: string, answer: string) => {
    const stem = clean([...stemLines, stemTail].join(" "))
      .replace(/^\d+\s*[.)]\s*/, "")
      .replace(/^Question\s*\d*\s*:?\s*/i, "");
    const correct = stripAnswerMark(answer);
    if (stem && correct) out.push({ stem, correct });
    stemLines = [];
  };
  for (const line of lines) {
    const mark = line.indexOf("✅");
    if (mark >= 0) {
      // Antes del ✅ puede venir el enunciado (misma línea) y/o un "Answer:".
      const before = clean(line.slice(0, mark).replace(/Answer\s*:/i, ""));
      pushQA(before, line.slice(mark + 1));
    } else if (/^Answer\s*:/i.test(line)) {
      pushQA("", line);
    } else {
      stemLines.push(line);
    }
  }
  return out;
}

function parseListeningSection(content: string): McqItem[] {
  const items: McqItem[] = [];
  let idn = 0;
  // Divide en bloques de audio: Parte 1 ("Audio N") y Parte 2/3
  // ("Audio content N", "N Audio content").
  const blocks = content
    .split(/(?:\d+\s+Audio\s+content|Audio\s+content\s*\d*|Audio\s*\d+)/i)
    .slice(1);

  for (const b of blocks) {
    const checks = (b.match(/✅/g) || []).length;
    const multi = checks > 1 || /Questions?\s*and\s*answers/i.test(b);

    if (!multi) {
      // Parte 1: un audio, una pregunta.
      const qi = b.search(/Question\s*:/i);
      const ai = b.search(/Answer\s*:/i);
      if (qi < 0 || ai < 0) continue;
      const transcript = cleanTranscript(b.slice(0, qi));
      const stem = clean(b.slice(qi, ai).replace(/Question\s*:/i, ""));
      const correct = stripAnswerMark(b.slice(ai).split("\n")[0]);
      if (stem && correct) {
        items.push({ id: `l${++idn}`, stem, options: [correct], correctIndex: 0, transcript });
      }
      continue;
    }

    // Parte 2/3: un audio, varias preguntas. El guion se asigna solo a la 1ª
    // pregunta (para reproducir el audio una vez en el modo "audio completo").
    const split = b.search(/Questions?\s*and\s*answers|Question\s*\d+\s*:/i);
    const transcript = cleanTranscript(split >= 0 ? b.slice(0, split) : b);
    const qaPart = (split >= 0 ? b.slice(split) : b).replace(/Questions?\s*and\s*answers/i, "");
    const qs = parseMultiQA(qaPart);
    qs.forEach((q, k) => {
      items.push({
        id: `l${++idn}`,
        stem: q.stem,
        options: [q.correct],
        correctIndex: 0,
        ...(k === 0 && transcript ? { transcript } : {}),
      });
    });
  }
  return items;
}

function parseGrammarSection(content: string): McqItem[] {
  // Tolerante a: preguntas sin número, opciones pegadas ("A) xB) y") y el texto
  // de "Answer key: X) …" que se debe consumir para que no se filtre al stem.
  const re =
    /([\s\S]*?)A[).]\s*([\s\S]*?)B[).]\s*([\s\S]*?)C[).]\s*([\s\S]*?)D[).]\s*([\s\S]*?)Answer\s*key\s*:\s*([A-D])[).][^\n]*/gi;
  const items: McqItem[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(content))) {
    const [, stem, a, b, c, d, correct] = m;
    const cleanStem = clean(stem).replace(/^\d+\.\s*/, "");
    if (!cleanStem) continue;
    items.push({
      id: `g${++i}`,
      stem: cleanStem,
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

// Parsea un pasaje de texto (título + texto + preguntas) desde un bloque.
function parseTextPassage(block: string, idPrefix: string): ReadingPassage | null {
  const lines = block
    .split("\n")
    .map((l) => l.replace(/@@P\d+@@/g, "").trim())
    .filter(Boolean);
  if (!lines.length) return null;
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
  if (!items.length) return null;
  return { id: idPrefix, title, text: passageLines.join("\n"), items };
}

function parseReadingSection(
  content: string,
  startPage: number,
  imagesByPage: ImagesByPage
): ReadingPassage[] {
  const passages: ReadingPassage[] = [];

  // La parte de "pasajes de texto" va hasta el primer bloque por-imagen
  // (PACK / "PARTE 2" agrupada), que se maneja aparte (necesita imágenes).
  const cut = content.search(/PACK\s*\d|READING\s+PARTE|(?:^|\n)\s*PARTE\s*[23]/i);
  const textContent = cut >= 0 ? content.slice(0, cut) : content;

  // Fronteras de pasaje: "Text N" (título en la línea siguiente) o
  // "This passage is about…" (el título va incluido).
  type B = { markerStart: number; contentStart: number };
  const boundaries: B[] = [];
  const re = /(Text\s*\d+|This passage is about[^\n]*)/gi;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(textContent))) {
    const token = mm[1];
    if (/^Text/i.test(token)) {
      boundaries.push({ markerStart: mm.index, contentStart: mm.index + token.length });
    } else {
      boundaries.push({ markerStart: mm.index, contentStart: mm.index }); // incluye el título
    }
  }
  // Un "This passage is about" justo tras un "Text N" es el título de ese Text.
  const bounds: B[] = [];
  for (const b of boundaries) {
    const prev = bounds[bounds.length - 1];
    if (prev && b.contentStart === b.markerStart && b.markerStart - prev.contentStart < 40) continue;
    bounds.push(b);
  }
  // Pasaje inicial (empieza directo tras "READING", sin "Text N").
  if (!bounds.length || bounds[0].markerStart > 5) {
    bounds.unshift({ markerStart: 0, contentStart: 0 });
  }

  for (let i = 0; i < bounds.length; i++) {
    const blockEnd = i + 1 < bounds.length ? bounds[i + 1].markerStart : textContent.length;
    const block = textContent.slice(bounds[i].contentStart, blockEnd);
    const p = parseTextPassage(block, `p${passages.length + 1}`);
    if (p) passages.push(p);
  }

  // Bloques PACK (anuncios) con imagen — solo si hay imágenes (PDF).
  const packMarks = [...content.matchAll(/PACK\s*\d+/gi)];
  for (let i = 0; i < packMarks.length; i++) {
    const mk = packMarks[i];
    const start = (mk.index as number) + mk[0].length;
    const end = i + 1 < packMarks.length ? (packMarks[i + 1].index as number) : content.length;
    const page = pageInContent(content, mk.index as number, startPage);
    content.slice(start, end).split(/@@P\d+@@/).forEach((chunk, ci) => {
      const chunkLines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      const items = parseReadingQuestions(chunkLines, 0, `p${passages.length + 1}`);
      if (!items.length) return;
      const imageUrl = imagesByPage[page + ci]?.shift();
      if (imageUrl) passages.push({ id: `p${passages.length + 1}`, imageUrl, items });
    });
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
  const { title, head, sections: raw } = splitExamSections(text);
  const sections: Section[] = [];

  // Writing: por su encabezado, o (si falta) del contenido inicial cuando el
  // documento arranca directamente con los prompts (sin "WRITING").
  const writingSource = raw.WRITING?.content ?? (!raw.WRITING && head.trim().length > 30 ? head : "");
  if (writingSource) {
    const writingTasks = parseWritingSection(writingSource);
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
