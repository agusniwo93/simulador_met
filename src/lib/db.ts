import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { QuestionSet, ExamResult, Analytics, IssueCategory } from "./types";

// Base de datos en archivo (demo). Solo preguntas y resultados — sin cuentas.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

interface DB {
  questionSets: QuestionSet[];
  examResults: ExamResult[];
}

const EMPTY_DB: DB = { questionSets: [], examResults: [] };

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function read(): DB {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    write(EMPTY_DB);
    seed();
    return read();
  }
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

// ---------- Sets de preguntas ----------

export function listQuestionSets(): QuestionSet[] {
  return read().questionSets;
}

export function getQuestionSet(id: string): QuestionSet | undefined {
  return read().questionSets.find((q) => q.id === id);
}

export function getRandomQuestionSet(): QuestionSet | undefined {
  const sets = read().questionSets;
  if (sets.length === 0) return undefined;
  return sets[Math.floor(Math.random() * sets.length)];
}

export function createQuestionSet(input: Omit<QuestionSet, "id" | "createdAt">): QuestionSet {
  return update((db) => {
    const set: QuestionSet = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    db.questionSets.push(set);
    return set;
  });
}

export function deleteQuestionSet(id: string): boolean {
  return update((db) => {
    const before = db.questionSets.length;
    db.questionSets = db.questionSets.filter((q) => q.id !== id);
    return db.questionSets.length < before;
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

// ---------- Analítica ----------

export function getAnalytics(): Analytics {
  const results = read().examResults;
  const total = results.length;

  const emptyIssues = (): Record<IssueCategory, number> => ({
    grammar: 0,
    spelling: 0,
    style: 0,
    length: 0,
    typography: 0,
  });

  if (total === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      scoreBuckets: { excellent: 0, good: 0, needsWork: 0 },
      issueTotals: emptyIssues(),
      taskAverages: [],
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

  const issueTotals = emptyIssues();
  const taskAgg = new Map<number, { prompt: string; sum: number; count: number }>();
  for (const r of results) {
    for (const g of r.grades) {
      (Object.keys(issueTotals) as IssueCategory[]).forEach((k) => {
        issueTotals[k] += g.issueCounts[k] ?? 0;
      });
      const cur = taskAgg.get(g.taskId) ?? { prompt: g.prompt, sum: 0, count: 0 };
      cur.sum += g.score;
      cur.count += 1;
      cur.prompt = g.prompt;
      taskAgg.set(g.taskId, cur);
    }
  }

  const taskAverages = [...taskAgg.entries()]
    .map(([taskId, v]) => ({
      taskId,
      prompt: v.prompt,
      averageScore: Math.round(v.sum / v.count),
      count: v.count,
    }))
    .sort((a, b) => a.taskId - b.taskId);

  const recent = [...results]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      studentName: r.studentName,
      overallScore: r.overallScore,
      submittedAt: r.submittedAt,
    }));

  return { totalExams: total, averageScore, scoreBuckets, issueTotals, taskAverages, recent };
}

// ---------- Seed (set demo en el primer arranque) ----------

function seed() {
  const db = read();
  if (db.questionSets.length === 0) {
    db.questionSets.push({
      id: randomUUID(),
      title: "MET Writing — Demo Set",
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: 1,
          type: "scenario",
          topic: "Daily Routine",
          prompt: "What time do you usually wake up?",
          feedbackGuide: "Mention a specific time and a short reason. Use the present simple correctly.",
          minWords: 20,
        },
        {
          id: 2,
          type: "scenario",
          topic: "Daily Routine",
          prompt: "Why do you wake up at that specific time?",
          feedbackGuide: "Give a clear cause-effect explanation using 'because' and a reason.",
          minWords: 20,
        },
        {
          id: 3,
          type: "scenario",
          topic: "Daily Routine",
          prompt: "Is it difficult for you to wake up at that time? Why or why not?",
          feedbackGuide: "State an opinion and justify it. Use linking words (because, so, although).",
          minWords: 20,
        },
        {
          id: 4,
          type: "essay",
          topic: "Education",
          prompt:
            "Some people argue that students should focus only on academic subjects like math and science, while others believe that music and art are equally important for a well-rounded education. What is your opinion? Give reasons to support your answer.",
          feedbackGuide:
            "Write a structured essay: introduction with a clear thesis, 2 body paragraphs with examples, and a conclusion. Aim for 150+ words.",
          minWords: 150,
        },
      ],
    });
    write(db);
  }
}

// Forzar seed al cargar el módulo (idempotente).
read();
