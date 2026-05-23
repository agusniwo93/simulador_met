import type { ExamTask, TaskType } from "./types";

// Parser de la PLANTILLA FIJA de preguntas en PDF.
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

const FIELD = "(?:TYPE|TOPIC|PROMPT|FEEDBACK|MINWORDS)";

function field(block: string, key: string): string {
  const re = new RegExp(`${key}\\s*:\\s*([\\s\\S]*?)\\s*(?=${FIELD}\\s*:|\\[\\/TASK\\]|$)`, "i");
  const m = block.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function normalizeType(raw: string): TaskType {
  return /essay/i.test(raw) ? "essay" : "scenario";
}

export interface ParsedTemplate {
  title: string;
  tasks: ExamTask[];
}

export function parseTemplate(text: string): ParsedTemplate {
  const titleMatch = text.match(/TITLE\s*:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : "Imported MET Set";

  const blocks = [...text.matchAll(/\[TASK\]([\s\S]*?)\[\/TASK\]/gi)].map((m) => m[1]);

  const tasks: ExamTask[] = blocks
    .map((block, index): ExamTask | null => {
      const prompt = field(block, "PROMPT");
      if (!prompt) return null;
      const minWordsRaw = field(block, "MINWORDS");
      const minWords = parseInt(minWordsRaw, 10);
      return {
        id: index + 1,
        type: normalizeType(field(block, "TYPE")),
        topic: field(block, "TOPIC") || "General",
        prompt,
        feedbackGuide: field(block, "FEEDBACK"),
        minWords: Number.isFinite(minWords) ? minWords : 0,
      };
    })
    .filter((t): t is ExamTask => t !== null);

  return { title, tasks };
}
