// Tipos compartidos de toda la plataforma (simulador sin cuentas)

export type Lang = "en" | "es";

export type TaskType = "scenario" | "essay";

export interface ExamTask {
  id: number; // 1..4 dentro del set
  type: TaskType;
  topic: string;
  prompt: string;
  feedbackGuide: string; // qué debe incluir una buena respuesta
  minWords: number;
}

export interface QuestionSet {
  id: string;
  title: string;
  createdAt: string;
  sourceFile?: string; // nombre del PDF original
  tasks: ExamTask[];
}

// ---- Corrección ----

export type IssueCategory = "grammar" | "spelling" | "style" | "length" | "typography";

export interface GrammarIssue {
  category: IssueCategory;
  message: string;
  suggestion: string; // reemplazo sugerido (si hay)
  context: string; // fragmento del texto donde ocurre
  offset: number;
  length: number;
}

export interface TaskGrade {
  taskId: number;
  prompt: string;
  answer: string;
  wordCount: number;
  minWords: number;
  meetsLength: boolean;
  issues: GrammarIssue[];
  issueCounts: Record<IssueCategory, number>;
  score: number; // 0..100
  tips: string[]; // sugerencias de mejora accionables
}

export interface ExamResult {
  id: string;
  questionSetId: string;
  studentName: string;
  lang: Lang;
  answers: Record<string, string>; // taskId -> texto
  grades: TaskGrade[];
  overallScore: number; // 0..100
  submittedAt: string;
  autoSubmitted: boolean;
}

// ---- Analítica (panel admin) ----

export interface Analytics {
  totalExams: number;
  averageScore: number;
  scoreBuckets: { excellent: number; good: number; needsWork: number }; // >=80 / 60-79 / <60
  issueTotals: Record<IssueCategory, number>;
  taskAverages: { taskId: number; prompt: string; averageScore: number; count: number }[];
  recent: { id: string; studentName: string; overallScore: number; submittedAt: string }[];
}
