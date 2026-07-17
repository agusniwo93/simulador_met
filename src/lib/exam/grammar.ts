import type { WritingTask, GrammarIssue, IssueCategory, WritingGrade, Lang } from "../types";

// Corrección con LanguageTool (API pública gratuita) + puntuación + consejos de mejora.

interface LTMatch {
  message: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: { text: string; offset: number; length: number };
  rule: { category: { id: string } };
}

const CATEGORY_MAP: Record<string, IssueCategory> = {
  TYPOS: "spelling",
  GRAMMAR: "grammar",
  CASING: "grammar",
  TYPOGRAPHY: "typography",
  PUNCTUATION: "typography",
  STYLE: "style",
  REDUNDANCY: "style",
  COLLOCATIONS: "style",
  CONFUSED_WORDS: "grammar",
};

function mapCategory(id: string): IssueCategory {
  return CATEGORY_MAP[id] ?? "style";
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export async function checkText(text: string, ltLang = "en-US"): Promise<GrammarIssue[]> {
  if (!text.trim()) return [];
  const endpoint = process.env.LANGUAGETOOL_API || "https://api.languagetool.org/v2/check";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: ltLang }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { matches: LTMatch[] };
    return data.matches.map((m) => ({
      category: mapCategory(m.rule.category.id),
      message: m.message,
      suggestion: m.replacements[0]?.value ?? "",
      context: m.context.text,
      offset: m.offset,
      length: m.length,
    }));
  } catch {
    // Si LanguageTool falla, devolvemos sin issues (no rompemos la corrección).
    return [];
  }
}

function emptyCounts(): Record<IssueCategory, number> {
  return { grammar: 0, spelling: 0, style: 0, length: 0, typography: 0 };
}

const TIPS: Record<Lang, Record<IssueCategory | "lengthShort" | "great", string>> = {
  en: {
    grammar:
      "Review verb tenses and subject–verb agreement. Read each sentence aloud to catch grammar slips.",
    spelling: "Double-check spelling of key words; small typos lower your score on the real exam.",
    style: "Vary sentence length and avoid repetition. Use linking words (however, therefore, although).",
    typography: "Mind punctuation and capitalization — start sentences with a capital and end with a period.",
    length: "",
    lengthShort: "Develop your ideas further with examples and reasons to reach the required length.",
    great: "Strong response — keep practicing to stay consistent.",
  },
  es: {
    grammar:
      "Revisa los tiempos verbales y la concordancia sujeto–verbo. Lee cada oración en voz alta para detectar errores.",
    spelling: "Verifica la ortografía de las palabras clave; los pequeños errores bajan tu puntaje real.",
    style: "Varía la longitud de las oraciones y evita repetir. Usa conectores (however, therefore, although).",
    typography: "Cuida la puntuación y las mayúsculas: empieza con mayúscula y termina con punto.",
    length: "",
    lengthShort: "Desarrolla más tus ideas con ejemplos y razones para alcanzar la extensión requerida.",
    great: "Respuesta sólida: sigue practicando para mantener la consistencia.",
  },
};

function invalidAnswerTip(lang: Lang): string {
  return lang === "es"
    ? "Escribe una respuesta real conectada con la pregunta. Letras al azar o palabras sin relacion reciben muy poco o ningun credito."
    : "Write a real answer connected to the question. Random letters or unrelated words receive little or no credit.";
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function hasRepeatedRun(word: string): boolean {
  return /(.)\1{3,}/.test(word);
}

function vowelRatio(word: string): number {
  if (!word) return 0;
  const vowels = word.match(/[aeiou]/g)?.length ?? 0;
  return vowels / word.length;
}

function promptKeywords(prompt: string): Set<string> {
  const stop = new Set([
    "about",
    "and",
    "are",
    "buy",
    "does",
    "for",
    "how",
    "like",
    "that",
    "the",
    "there",
    "visit",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "would",
    "you",
    "your",
  ]);
  return new Set(tokenize(prompt).filter((word) => word.length > 2 && !stop.has(word)));
}

function isLikelyInvalidAnswer(answer: string, prompt: string, wordCount: number): boolean {
  const words = tokenize(answer);
  if (wordCount === 0 || words.length === 0) return false;

  const longWords = words.filter((word) => word.length >= 4);
  const repeatedRunCount = words.filter(hasRepeatedRun).length;
  const lowVowelCount = longWords.filter((word) => vowelRatio(word) < 0.18).length;
  const veryLongOddCount = words.filter((word) => word.length >= 12 && (hasRepeatedRun(word) || vowelRatio(word) < 0.25)).length;
  const uniqueRatio = new Set(words).size / words.length;
  const alphabeticChars = words.join("").length;
  const promptHits = words.filter((word) => promptKeywords(prompt).has(word)).length;

  const severeTokenProblem =
    repeatedRunCount >= Math.max(1, Math.ceil(words.length * 0.25)) ||
    lowVowelCount >= Math.max(2, Math.ceil(longWords.length * 0.5)) ||
    veryLongOddCount >= 1;

  const tooLittleLanguage = alphabeticChars < 18 && wordCount < 6;
  const disconnectedShortAnswer = wordCount < 8 && promptHits === 0 && severeTokenProblem;
  const repeatedGarbage = uniqueRatio < 0.45 && words.length >= 4 && severeTokenProblem;

  return tooLittleLanguage || disconnectedShortAnswer || repeatedGarbage || severeTokenProblem;
}

export async function gradeWriting(task: WritingTask, answer: string, uiLang: Lang): Promise<WritingGrade> {
  const issues = await checkText(answer);
  const wordCount = countWords(answer);
  const meetsLength = wordCount >= task.minWords;
  const invalidAnswer = isLikelyInvalidAnswer(answer, task.prompt, wordCount);

  const issueCounts = emptyCounts();
  for (const i of issues) issueCounts[i.category]++;

  // Puntuación 0..100
  let score = 100;
  score -= Math.min(issueCounts.grammar * 6, 40);
  score -= Math.min(issueCounts.spelling * 4, 25);
  score -= Math.min(issueCounts.typography * 2, 15);
  score -= Math.min(issueCounts.style * 2, 15);

  let severelyShort = false;
  if (!meetsLength && task.minWords > 0) {
    const ratio = Math.min(1, wordCount / task.minWords);
    // Penalización fuerte por no alcanzar la extensión (hasta 55 pts).
    score -= Math.round((1 - ratio) * 55);
    severelyShort = ratio < 0.25;
  }

  if (wordCount === 0) score = 0;
  if (invalidAnswer) score = Math.min(score, wordCount < 8 ? 10 : 20);
  // Una respuesta muy por debajo del mínimo no puede aprobar.
  if (severelyShort) score = Math.min(score, invalidAnswer ? 10 : 40);
  score = Math.max(0, Math.min(100, score));

  // Consejos accionables según lo que falló
  const tips: string[] = [];
  const tipSet = TIPS[uiLang];
  if (invalidAnswer) tips.push(invalidAnswerTip(uiLang));
  if (!meetsLength && task.minWords > 0) tips.push(tipSet.lengthShort);
  if (issueCounts.grammar > 0) tips.push(tipSet.grammar);
  if (issueCounts.spelling > 0) tips.push(tipSet.spelling);
  if (issueCounts.typography > 0) tips.push(tipSet.typography);
  if (issueCounts.style > 0) tips.push(tipSet.style);
  if (tips.length === 0 && wordCount > 0) tips.push(tipSet.great);

  return {
    taskId: task.id,
    prompt: task.prompt,
    answer,
    wordCount,
    minWords: task.minWords,
    meetsLength,
    issues,
    issueCounts,
    score,
    tips,
  };
}
