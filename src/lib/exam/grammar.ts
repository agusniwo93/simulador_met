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

const TIPS: Record<Lang, Record<IssueCategory | "lengthShort" | "great" | "levelUp", string>> = {
  en: {
    grammar:
      "Review verb tenses and subject–verb agreement. Read each sentence aloud to catch grammar slips.",
    spelling: "Double-check spelling of key words; small typos lower your score on the real exam.",
    style: "Vary sentence length and avoid repetition. Use linking words (however, therefore, although).",
    typography: "Mind punctuation and capitalization — start sentences with a capital and end with a period.",
    length: "",
    lengthShort: "Develop your ideas further with examples and reasons to reach the required length.",
    great: "Strong response — keep practicing to stay consistent.",
    levelUp:
      "To reach a higher level, combine ideas into longer, complex sentences, use linking words (however, although, therefore, moreover) and richer vocabulary.",
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
    levelUp:
      "Para subir de nivel: une ideas en oraciones más largas y complejas, usa conectores (however, although, therefore, moreover) y vocabulario más variado.",
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

// ---------------------------------------------------------------------------
//  Estimación de NIVEL (CEFR) del texto — corrección estricta.
//  No basta con escribir "sin errores": el puntaje refleja el nivel real de
//  inglés (riqueza léxica, complejidad de oraciones, conectores, cohesión).
//  Anclas de calibración (puntaje aproximado):  B1 ≈ 52 · B2 ≈ 70 · C1 ≈ 90-100.
// ---------------------------------------------------------------------------

// Conectores / marcadores del discurso (señal de nivel B2+).
const CONNECTORS = new Set([
  "however", "therefore", "moreover", "furthermore", "nevertheless", "nonetheless",
  "consequently", "meanwhile", "whereas", "although", "though", "despite", "instead",
  "additionally", "besides", "thus", "hence", "accordingly", "conversely", "similarly",
  "firstly", "secondly", "finally", "overall", "indeed", "specifically", "namely",
  "otherwise", "likewise", "subsequently", "ultimately",
]);
// Subordinantes/relativos AVANZADOS (oraciones complejas de nivel B2+). No se
// cuentan los básicos (because, when, if, after, that) que ya usa un A2/B1.
const SUBORDINATORS = new Set([
  "although", "though", "whereas", "despite", "unless", "albeit", "whilst",
  "notwithstanding", "which", "who", "whose", "whom",
]);
// Marcadores de varias palabras.
const MULTIWORD = [
  "for example", "for instance", "on the other hand", "in addition", "as a result",
  "in conclusion", "in contrast", "such as", "in order to", "even though", "as well as",
  "rather than", "due to", "in spite of", "not only", "in particular",
];

interface Prose {
  wordCount: number;
  sentCount: number;
  avgSentenceLen: number;
  longWordRatio: number;
  uniqueRatio: number;
  connectors: number;
  subordinators: number;
}

function analyzeProse(text: string): Prose {
  const words = tokenize(text);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const sentCount = Math.max(1, sentences.length);
  const longWords = words.filter((w) => w.length >= 7).length;
  const lower = " " + text.toLowerCase() + " ";
  let connectors = 0;
  let subordinators = 0;
  for (const w of words) {
    if (CONNECTORS.has(w)) connectors++;
    if (SUBORDINATORS.has(w)) subordinators++;
  }
  for (const p of MULTIWORD) if (lower.includes(" " + p + " ")) connectors++;
  return {
    wordCount,
    sentCount,
    avgSentenceLen: wordCount / sentCount,
    longWordRatio: wordCount ? longWords / wordCount : 0,
    uniqueRatio: wordCount ? new Set(words).size / wordCount : 0,
    connectors,
    subordinators,
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Índice de dominio 0..1 a partir de las señales lingüísticas.
function proficiencyIndex(a: Prose, hardErrors: number): number {
  const errorRate = a.wordCount ? hardErrors / a.wordCount : 1;
  const ACC = clamp01(1 - errorRate / 0.12); // 0% errores → 1 ; 12% → 0
  const LEX = clamp01((a.longWordRatio - 0.08) / (0.24 - 0.08)); // palabras largas
  const SYN = clamp01((Math.min(a.avgSentenceLen, 22) - 7) / (20 - 7)); // oraciones largas
  const SUB = clamp01(a.subordinators / a.sentCount / 0.6); // subordinación
  const COH = clamp01((a.wordCount ? (a.connectors / a.wordCount) * 100 : 0) / 6); // conectores
  const DIV = clamp01((a.uniqueRatio - 0.55) / (0.85 - 0.55)); // variedad léxica
  return clamp01(0.15 * ACC + 0.24 * LEX + 0.22 * SYN + 0.15 * SUB + 0.18 * COH + 0.06 * DIV);
}

// Mapea el índice 0..1 a puntaje 0..100 con anclas CEFR (interpolación lineal).
function indexToScore(p: number): number {
  const anchors: [number, number][] = [
    [0, 30],
    [0.2, 42], // A2
    [0.48, 52], // B1
    [0.79, 72], // B2
    [0.9, 88], // C1
    [1, 100], // C1 alto (organización/riqueza → 90-100)
  ];
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (p <= x1) return Math.round(y0 + ((p - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}

export function cefrLabel(score: number): string {
  if (score >= 90) return "C1";
  if (score >= 70) return "B2";
  if (score >= 52) return "B1";
  if (score >= 38) return "A2";
  return "A1";
}

// Puntaje del texto por su NIVEL (sin la parte de red / LanguageTool). Puro y
// testeable. `hardErrors` = errores de gramática + ortografía + puntuación.
export function scoreWritingProse(
  answer: string,
  hardErrors: number
): { score: number; level: string; index: number } {
  const a = analyzeProse(answer);
  const index = proficiencyIndex(a, hardErrors);
  const score = indexToScore(index);
  return { score, level: cefrLabel(score), index };
}

export async function gradeWriting(task: WritingTask, answer: string, uiLang: Lang): Promise<WritingGrade> {
  const issues = await checkText(answer);
  const wordCount = countWords(answer);
  const meetsLength = wordCount >= task.minWords;
  const invalidAnswer = isLikelyInvalidAnswer(answer, task.prompt, wordCount);

  const issueCounts = emptyCounts();
  for (const i of issues) issueCounts[i.category]++;

  // Puntuación por NIVEL (CEFR): la complejidad y riqueza del texto determinan
  // el puntaje; los errores lo bajan (van dentro del índice de dominio).
  const hardErrors = issueCounts.grammar + issueCounts.spelling + issueCounts.typography;
  const prose = scoreWritingProse(answer, hardErrors);
  let score = prose.score;

  // No alcanzar la extensión mínima impide demostrar el nivel → penaliza
  // proporcionalmente (hasta -55%).
  let severelyShort = false;
  if (!meetsLength && task.minWords > 0) {
    const ratio = Math.min(1, wordCount / task.minWords);
    score = Math.round(score * (0.45 + 0.55 * ratio));
    severelyShort = ratio < 0.25;
  }

  if (wordCount === 0) score = 0;
  if (invalidAnswer) score = Math.min(score, wordCount < 8 ? 8 : 18);
  // Una respuesta muy por debajo del mínimo no puede aprobar.
  if (severelyShort) score = Math.min(score, invalidAnswer ? 8 : 35);
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
  // Consejo de nivel: si la respuesta es válida pero aún no llega a C1, indica
  // cómo subir de nivel (oraciones complejas, conectores, léxico más rico).
  if (!invalidAnswer && wordCount > 0 && score < 88) tips.push(tipSet.levelUp);
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
