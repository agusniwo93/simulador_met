// Tipos del simulador MET multi-sección (sin cuentas)

export type Lang = "en" | "es";

export type SectionKind = "writing" | "listening" | "grammar" | "reading";

// ---- Contenido del examen ----

export interface WritingTask {
  id: string;
  prompt: string;
  minWords: number;
  feedbackGuide?: string;
}

// Pregunta de opción múltiple (grammar / reading / listening)
export interface McqItem {
  id: string;
  stem: string; // enunciado / pregunta
  options: string[]; // 2-4 opciones
  correctIndex: number;
  transcript?: string; // solo listening: texto que lee la voz (TTS)
}

export interface ReadingPassage {
  id: string;
  title?: string;
  text: string;
  items: McqItem[];
}

export interface Section {
  kind: SectionKind;
  title: string;
  intro?: string;
  writingTasks?: WritingTask[]; // kind === "writing"
  items?: McqItem[]; // kind === "grammar" | "listening"
  passages?: ReadingPassage[]; // kind === "reading"
}

export interface Exam {
  id: string;
  title: string;
  createdAt: string;
  durationMinutes: number;
  sourceFile?: string;
  sections: Section[];
}

// ---- Corrección ----

export type IssueCategory = "grammar" | "spelling" | "style" | "length" | "typography";

export interface GrammarIssue {
  category: IssueCategory;
  message: string;
  suggestion: string;
  context: string;
  offset: number;
  length: number;
}

export interface WritingGrade {
  taskId: string;
  prompt: string;
  answer: string;
  wordCount: number;
  minWords: number;
  meetsLength: boolean;
  issues: GrammarIssue[];
  issueCounts: Record<IssueCategory, number>;
  score: number; // 0..100
  tips: string[];
}

export interface McqGrade {
  itemId: string;
  stem: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  correct: boolean;
}

export interface SectionResult {
  kind: SectionKind;
  title: string;
  score: number; // 0..100
  writingGrades?: WritingGrade[];
  mcqGrades?: McqGrade[];
  correctCount?: number; // para secciones MCQ
  totalCount?: number;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentName: string;
  lang: Lang;
  sectionResults: SectionResult[];
  overallScore: number; // 0..100
  submittedAt: string;
  autoSubmitted: boolean;
}

// ---- Analítica (panel admin) ----

export interface Analytics {
  totalExams: number;
  averageScore: number;
  scoreBuckets: { excellent: number; good: number; needsWork: number };
  sectionAverages: { kind: SectionKind; title: string; averageScore: number; count: number }[];
  recent: { id: string; studentName: string; overallScore: number; submittedAt: string }[];
}
