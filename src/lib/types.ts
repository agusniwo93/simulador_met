// Tipos del simulador MET multi-sección (sin cuentas)

export type Lang = "en" | "es";

export type SectionKind = "writing" | "listening" | "grammar" | "reading" | "speaking";

// ---- Contenido del examen ----

export interface WritingTask {
  id: string;
  prompt: string;
  minWords: number;
  feedbackGuide?: string;
}

// Tarea de Speaking: el alumno graba su respuesta en voz (no auto-calificada).
export interface SpeakingTask {
  id: string;
  prompt: string;
  imageUrl?: string; // p. ej. "describe la imagen" (Task 1)
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
  text?: string; // pasaje en texto (opcional si es imagen)
  imageUrl?: string; // pasaje como imagen (p. ej. anuncios/artículos escaneados)
  items: McqItem[];
}

export interface Section {
  kind: SectionKind;
  title: string;
  intro?: string;
  writingTasks?: WritingTask[]; // kind === "writing"
  items?: McqItem[]; // kind === "grammar" | "listening"
  passages?: ReadingPassage[]; // kind === "reading"
  speakingTasks?: SpeakingTask[]; // kind === "speaking"
}

export interface Exam {
  id: string;
  title: string;
  createdAt: string;
  durationMinutes: number;
  sourceFile?: string;
  sections: Section[];
  seedVersion?: number; // marca de versión para el examen sembrado
  generated?: boolean; // examen "chocolateado" para un alumno (no editable/listable)
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

export interface SpeakingResponse {
  taskId: string;
  prompt: string;
  audioUrl: string | null; // grabación subida por el alumno
}

export interface SectionResult {
  kind: SectionKind;
  title: string;
  score: number; // 0..100
  autoScored?: boolean; // false en Speaking (revisión manual, no cuenta al total)
  writingGrades?: WritingGrade[];
  mcqGrades?: McqGrade[];
  speakingResponses?: SpeakingResponse[];
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

// ---- Tema de colores (editable desde el admin) ----

export interface ThemeSettings {
  bg: string; // fondo de la página
  brandFrom: string; // inicio del degradado de botones
  brandTo: string; // fin del degradado de botones
  gradFrom: string; // degradado de títulos (1)
  gradVia: string; // degradado de títulos (2)
  gradTo: string; // degradado de títulos (3)
  accent: string; // color de acento (focus/resaltados)
}

export const DEFAULT_THEME: ThemeSettings = {
  bg: "#020617",
  brandFrom: "#06b6d4",
  brandTo: "#6366f1",
  gradFrom: "#67e8f9",
  gradVia: "#818cf8",
  gradTo: "#a78bfa",
  accent: "#22d3ee",
};

// ---- Analítica (panel admin) ----

export interface Analytics {
  totalExams: number;
  averageScore: number;
  scoreBuckets: { excellent: number; good: number; needsWork: number };
  sectionAverages: { kind: SectionKind; title: string; averageScore: number; count: number }[];
  recent: { id: string; studentName: string; overallScore: number; submittedAt: string }[];
}
