import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Exam, ExamResult, Analytics, Section, SectionKind, ThemeSettings, McqItem } from "./types";
import { DEFAULT_THEME } from "./types";
import { SEED_SECTIONS, SEED_TITLE, SEED_DURATION, SEED_ID, SEED_VERSION } from "./exam/seed-exam";

// Base de datos en archivo (demo). Exámenes y resultados — sin cuentas.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

interface DB {
  exams: Exam[];
  examResults: ExamResult[];
  theme?: ThemeSettings;
}

const EMPTY_DB: DB = { exams: [], examResults: [] };

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function read(): DB {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) return { ...EMPTY_DB };
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...EMPTY_DB, ...(JSON.parse(raw) as DB) };
  } catch {
    return { ...EMPTY_DB };
  }
}

function write(db: DB) {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function update<T>(fn: (db: DB) => T): T {
  const db = read();
  const result = fn(db);
  write(db);
  return result;
}

// ---------- Distractores de Listening ----------

// PRNG determinista a partir de una cadena (mulberry32).
function seededRandom(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Para listening, las preguntas vienen con solo la respuesta correcta.
// Generamos 3 distractores tomando respuestas de otras preguntas de la sección.
function expandListeningDistractors(sections: Section[]): Section[] {
  return sections.map((section) => {
    if (section.kind !== "listening" || !section.items) return section;
    const pool = Array.from(new Set(section.items.map((it) => it.options[0]).filter(Boolean)));
    const items = section.items.map((item) => {
      if (item.options.length >= 4) return item;
      const correct = item.options[0];
      const rng = seededRandom(item.id + correct);
      const candidates = pool.filter((a) => a !== correct);
      // Barajar candidatos de forma determinista y tomar 3.
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      const distractors = candidates.slice(0, 3);
      const options = [correct, ...distractors];
      // Barajar las opciones finales.
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return { ...item, options, correctIndex: options.indexOf(correct) };
    });
    return { ...section, items };
  });
}

// ---------- Exámenes ----------

export function listExams(): Exam[] {
  // Los exámenes "chocolateados" (generados por alumno) no se listan en el admin.
  return read().exams.filter((e) => !e.generated);
}

export function getExam(id: string): Exam | undefined {
  return read().exams.find((e) => e.id === id);
}

export function getRandomExam(): Exam | undefined {
  const exams = read().exams.filter((e) => !e.generated);
  if (exams.length === 0) return undefined;
  return exams[Math.floor(Math.random() * exams.length)];
}

// ---------- Examen "chocolateado" (mezcla de todos los subidos) ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Baraja las opciones de una pregunta MCQ y reubica el índice correcto.
function shuffleOptions(item: McqItem): McqItem {
  if (!item.options || item.options.length < 2) return item;
  const order = shuffle(item.options.map((_, i) => i));
  return {
    ...item,
    options: order.map((i) => item.options[i]),
    correctIndex: Math.max(0, order.indexOf(item.correctIndex)),
  };
}

// Construye un examen mezclando preguntas de TODOS los exámenes subidos:
// usa el primer examen como plantilla de estructura (secciones y cuántas
// preguntas por sección) y rellena cada sección tomando al azar del pozo común
// de esa clase, barajando además el orden y las opciones. Lo persiste para que
// la corrección por examId cuadre, y limpia los generados de más de 1 día.
export function buildShuffledExam(): Exam | undefined {
  const pool = read().exams.filter((e) => !e.generated);
  if (pool.length === 0) return undefined;

  const template = pool[0];

  const sections: Section[] = template.sections.map((tSec) => {
    const sameKind = pool.flatMap((e) => e.sections.filter((s) => s.kind === tSec.kind));

    if (tSec.kind === "writing") {
      const tasks = sameKind.flatMap((s) => s.writingTasks ?? []);
      const n = tSec.writingTasks?.length ?? tasks.length;
      return { ...tSec, writingTasks: shuffle(tasks).slice(0, n) };
    }
    if (tSec.kind === "speaking") {
      const tasks = sameKind.flatMap((s) => s.speakingTasks ?? []);
      const n = tSec.speakingTasks?.length ?? tasks.length;
      return { ...tSec, speakingTasks: shuffle(tasks).slice(0, n) };
    }
    if (tSec.kind === "reading") {
      const passages = sameKind.flatMap((s) => s.passages ?? []);
      const n = tSec.passages?.length ?? passages.length;
      // Se barajan las opciones de cada pregunta pero se conserva el orden
      // dentro del pasaje (las preguntas pueden referirse a párrafos por orden).
      const chosen = shuffle(passages)
        .slice(0, n)
        .map((p) => ({ ...p, items: p.items.map(shuffleOptions) }));
      return { ...tSec, passages: chosen };
    }
    // grammar | listening: preguntas independientes → se baraja también el orden.
    const items = sameKind.flatMap((s) => s.items ?? []);
    const n = tSec.items?.length ?? items.length;
    const chosen = shuffle(items).slice(0, n).map(shuffleOptions);
    return { ...tSec, items: chosen };
  });

  const exam: Exam = {
    id: randomUUID(),
    title: template.title,
    durationMinutes: template.durationMinutes,
    sections,
    createdAt: new Date().toISOString(),
    generated: true,
  };

  update((db) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    db.exams = db.exams.filter(
      (e) => !(e.generated && new Date(e.createdAt).getTime() < dayAgo)
    );
    db.exams.push(exam);
    return exam;
  });

  return exam;
}

export function createExam(input: { title: string; durationMinutes: number; sourceFile?: string; sections: Section[] }): Exam {
  return update((db) => {
    const exam: Exam = {
      id: randomUUID(),
      title: input.title,
      durationMinutes: input.durationMinutes,
      sourceFile: input.sourceFile,
      sections: expandListeningDistractors(input.sections),
      createdAt: new Date().toISOString(),
    };
    db.exams.push(exam);
    return exam;
  });
}

export function deleteExam(id: string): boolean {
  return update((db) => {
    const before = db.exams.length;
    db.exams = db.exams.filter((e) => e.id !== id);
    return db.exams.length < before;
  });
}

export function updateExam(
  id: string,
  patch: { title?: string; durationMinutes?: number; sections?: Section[] }
): Exam | undefined {
  return update((db) => {
    const idx = db.exams.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    const current = db.exams[idx];
    const updated: Exam = {
      ...current,
      title: patch.title ?? current.title,
      durationMinutes: patch.durationMinutes ?? current.durationMinutes,
      sections: patch.sections ? expandListeningDistractors(patch.sections) : current.sections,
    };
    db.exams[idx] = updated;
    return updated;
  });
}

// ---------- Resultados ----------

export function createExamResult(input: Omit<ExamResult, "id">): ExamResult {
  return update((db) => {
    const result: ExamResult = { ...input, id: randomUUID() };
    db.examResults.push(result);
    return result;
  });
}

export function getExamResult(id: string): ExamResult | undefined {
  return read().examResults.find((r) => r.id === id);
}

// ---------- Tema de colores ----------

export function getTheme(): ThemeSettings {
  return { ...DEFAULT_THEME, ...(read().theme ?? {}) };
}

export function saveTheme(theme: Partial<ThemeSettings>): ThemeSettings {
  return update((db) => {
    db.theme = { ...DEFAULT_THEME, ...(db.theme ?? {}), ...theme };
    return db.theme;
  });
}

// ---------- Analítica ----------

export function getAnalytics(): Analytics {
  const results = read().examResults;
  const total = results.length;

  if (total === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      scoreBuckets: { excellent: 0, good: 0, needsWork: 0 },
      sectionAverages: [],
      recent: [],
    };
  }

  const averageScore = Math.round(results.reduce((s, r) => s + r.overallScore, 0) / total);

  const scoreBuckets = { excellent: 0, good: 0, needsWork: 0 };
  for (const r of results) {
    if (r.overallScore >= 80) scoreBuckets.excellent++;
    else if (r.overallScore >= 60) scoreBuckets.good++;
    else scoreBuckets.needsWork++;
  }

  const secAgg = new Map<SectionKind, { title: string; sum: number; count: number }>();
  for (const r of results) {
    for (const s of r.sectionResults) {
      if (s.autoScored === false) continue; // Speaking no cuenta en promedios
      const cur = secAgg.get(s.kind) ?? { title: s.title, sum: 0, count: 0 };
      cur.sum += s.score;
      cur.count += 1;
      cur.title = s.title;
      secAgg.set(s.kind, cur);
    }
  }
  const sectionAverages = [...secAgg.entries()].map(([kind, v]) => ({
    kind,
    title: v.title,
    averageScore: Math.round(v.sum / v.count),
    count: v.count,
  }));

  const recent = [...results]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      studentName: r.studentName,
      overallScore: r.overallScore,
      submittedAt: r.submittedAt,
    }));

  return { totalExams: total, averageScore, scoreBuckets, sectionAverages, recent };
}

// ---------- Seed ----------

// Siembra / migra el examen de demostración con un id estable, sin duplicarlo
// ni tocar los exámenes subidos ni los resultados del usuario.
function seed() {
  update((db) => {
    // Elimina el seed antiguo (auto-sembrado sin versión) y versiones previas.
    db.exams = db.exams.filter(
      (e) =>
        !((e.id === SEED_ID || e.title === SEED_TITLE) &&
          (e.seedVersion == null || e.seedVersion < SEED_VERSION))
    );
    if (!db.exams.some((e) => e.id === SEED_ID)) {
      db.exams.unshift({
        id: SEED_ID,
        title: SEED_TITLE,
        durationMinutes: SEED_DURATION,
        sections: expandListeningDistractors(SEED_SECTIONS),
        createdAt: new Date().toISOString(),
        seedVersion: SEED_VERSION,
      });
    }
  });
}

seed();
