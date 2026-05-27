import type {
  Exam,
  McqItem,
  McqGrade,
  SectionResult,
  WritingGrade,
  Lang,
} from "../types";
import { gradeWriting } from "./grammar";

export type AnswerMap = Record<string, string | number | null>;

export function gradeMcq(item: McqItem, selected: number | null): McqGrade {
  return {
    itemId: item.id,
    stem: item.stem,
    options: item.options,
    correctIndex: item.correctIndex,
    selectedIndex: selected,
    correct: selected === item.correctIndex,
  };
}

function mcqSectionScore(grades: McqGrade[]): number {
  if (grades.length === 0) return 0;
  const correct = grades.filter((g) => g.correct).length;
  return Math.round((correct / grades.length) * 100);
}

// Califica el examen completo: writing con LanguageTool, MCQ por comparación.
export async function gradeExam(
  exam: Exam,
  answers: AnswerMap,
  lang: Lang
): Promise<{ sectionResults: SectionResult[]; overallScore: number }> {
  const sectionResults: SectionResult[] = [];

  for (const section of exam.sections) {
    if (section.kind === "writing" && section.writingTasks) {
      const writingGrades: WritingGrade[] = await Promise.all(
        section.writingTasks.map((task) =>
          gradeWriting(task, String(answers[task.id] ?? ""), lang)
        )
      );
      const score = writingGrades.length
        ? Math.round(writingGrades.reduce((s, g) => s + g.score, 0) / writingGrades.length)
        : 0;
      sectionResults.push({ kind: section.kind, title: section.title, score, writingGrades });
    } else if ((section.kind === "grammar" || section.kind === "listening") && section.items) {
      const mcqGrades = section.items.map((item) =>
        gradeMcq(item, toIndex(answers[item.id]))
      );
      sectionResults.push({
        kind: section.kind,
        title: section.title,
        score: mcqSectionScore(mcqGrades),
        mcqGrades,
        correctCount: mcqGrades.filter((g) => g.correct).length,
        totalCount: mcqGrades.length,
      });
    } else if (section.kind === "reading" && section.passages) {
      const mcqGrades = section.passages.flatMap((p) =>
        p.items.map((item) => gradeMcq(item, toIndex(answers[item.id])))
      );
      sectionResults.push({
        kind: section.kind,
        title: section.title,
        score: mcqSectionScore(mcqGrades),
        mcqGrades,
        correctCount: mcqGrades.filter((g) => g.correct).length,
        totalCount: mcqGrades.length,
      });
    }
  }

  const overallScore = sectionResults.length
    ? Math.round(sectionResults.reduce((s, r) => s + r.score, 0) / sectionResults.length)
    : 0;

  return { sectionResults, overallScore };
}

function toIndex(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}
