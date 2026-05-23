"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Background3D from "@/components/Background3D";
import LanguageToggle from "@/components/LanguageToggle";
import Dialog from "@/components/Dialog";
import { useI18n } from "@/lib/i18n/context";
import type { QuestionSet, ExamTask } from "@/lib/types";

// ----- Constantes de almacenamiento y tiempo -----
const EXAM_DURATION_S = 45 * 60; // 45 minutos
const LS_SET = "met_exam_set";
const LS_ANSWERS = "met_exam_answers";
const LS_END = "met_exam_end";
const LS_NAME = "met_student_name";

// Cuenta palabras: recorta y separa por espacios; vacío = 0.
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// Formatea segundos a M:SS
function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Phase = "loading" | "no-sets" | "name-gate" | "exam";

export default function ExamRunPage() {
  const router = useRouter();
  const { lang, t } = useI18n();

  const [phase, setPhase] = useState<Phase>("loading");
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [studentName, setStudentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(EXAM_DURATION_S);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);

  // Refs para evitar dependencias inestables en intervalos / auto-submit.
  const submittingRef = useRef(false);
  const autoSubmitFiredRef = useRef(false);
  const submitRef = useRef<(auto: boolean) => void>(() => {});

  // ---------- 1) Carga del set de preguntas ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Reusar set persistido para mantener las MISMAS preguntas tras refrescar.
      try {
        const cached = localStorage.getItem(LS_SET);
        if (cached) {
          const parsed = JSON.parse(cached) as QuestionSet;
          if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
            if (!cancelled) bootstrap(parsed);
            return;
          }
        }
      } catch {
        // Cache corrupto: continuar con el fetch.
      }

      try {
        const res = await fetch("/api/exam/set", { cache: "no-store" });

        if (res.status === 404) {
          if (!cancelled) setPhase("no-sets");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setPhase("no-sets");
          return;
        }

        const data = (await res.json()) as { set: QuestionSet };
        if (!data?.set || !Array.isArray(data.set.tasks) || data.set.tasks.length === 0) {
          if (!cancelled) setPhase("no-sets");
          return;
        }

        try {
          localStorage.setItem(LS_SET, JSON.stringify(data.set));
        } catch {
          /* ignore quota errors */
        }
        if (!cancelled) bootstrap(data.set);
      } catch {
        if (!cancelled) setPhase("no-sets");
      }
    }

    // Prepara el estado a partir de un set válido.
    function bootstrap(qs: QuestionSet) {
      setSet(qs);
      setActiveTaskId(qs.tasks[0].id);

      // Restaurar respuestas guardadas.
      try {
        const savedAnswers = localStorage.getItem(LS_ANSWERS);
        if (savedAnswers) {
          const parsed = JSON.parse(savedAnswers) as Record<string, string>;
          if (parsed && typeof parsed === "object") setAnswers(parsed);
        }
      } catch {
        /* ignore */
      }

      // Restaurar nombre.
      const savedName = localStorage.getItem(LS_NAME) ?? "";
      if (savedName.trim().length >= 3) {
        setStudentName(savedName);
        setPhase("exam");
      } else {
        setPhase("name-gate");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Auto-guardado de respuestas ----------
  useEffect(() => {
    if (phase !== "exam") return;
    try {
      localStorage.setItem(LS_ANSWERS, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, phase]);

  // ---------- 3) Temporizador con timestamp absoluto ----------
  useEffect(() => {
    if (phase !== "exam") return;

    // Establece el fin absoluto la primera vez que se muestra el examen.
    let endTs: number;
    const stored = localStorage.getItem(LS_END);
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      endTs = parsed;
    } else if (Number.isFinite(parsed) && parsed <= Date.now() && stored) {
      // Ya expiró: mantener para que remaining sea 0 y dispare auto-submit.
      endTs = parsed;
    } else {
      endTs = Date.now() + EXAM_DURATION_S * 1000;
      try {
        localStorage.setItem(LS_END, String(endTs));
      } catch {
        /* ignore */
      }
    }

    const tick = () => {
      const remaining = Math.max(0, Math.round((endTs - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0 && !autoSubmitFiredRef.current && !submittingRef.current) {
        autoSubmitFiredRef.current = true;
        submitRef.current(true);
      }
    };

    tick(); // primer cálculo inmediato
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // NO incluir secondsRemaining en deps: un único intervalo.
  }, [phase]);

  // ---------- Tarea activa y conteo de palabras ----------
  const activeTask: ExamTask | null = useMemo(() => {
    if (!set || activeTaskId == null) return null;
    return set.tasks.find((tk) => tk.id === activeTaskId) ?? set.tasks[0];
  }, [set, activeTaskId]);

  const activeAnswer = activeTask ? answers[String(activeTask.id)] ?? "" : "";
  const wordCount = countWords(activeAnswer);
  const meetsLength = activeTask ? wordCount >= activeTask.minWords : false;

  const handleAnswerChange = useCallback(
    (value: string) => {
      if (!activeTask) return;
      setAnswers((prev) => ({ ...prev, [String(activeTask.id)]: value }));
    },
    [activeTask]
  );

  // ---------- 6) Envío del examen ----------
  const submitExam = useCallback(
    async (autoSubmitted: boolean) => {
      if (submittingRef.current) return; // 7) guard doble-submit
      if (!set) return;

      submittingRef.current = true;
      setSubmitting(true);

      try {
        const res = await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionSetId: set.id,
            studentName,
            lang,
            answers,
            autoSubmitted,
          }),
        });

        if (!res.ok) throw new Error("submit failed");

        const data = (await res.json()) as { resultId: string };
        if (!data?.resultId) throw new Error("missing resultId");

        // Limpieza de almacenamiento al terminar.
        try {
          localStorage.removeItem(LS_SET);
          localStorage.removeItem(LS_ANSWERS);
          localStorage.removeItem(LS_END);
          localStorage.removeItem(LS_NAME);
        } catch {
          /* ignore */
        }

        router.push(`/results/${data.resultId}`);
      } catch {
        // Permite reintentar.
        submittingRef.current = false;
        autoSubmitFiredRef.current = false;
        setSubmitting(false);
        setErrorOpen(true);
      }
    },
    [set, studentName, lang, answers, router]
  );

  // Mantener la ref del submit actualizada para el temporizador.
  useEffect(() => {
    submitRef.current = submitExam;
  }, [submitExam]);

  const handleFinish = useCallback(() => {
    if (submittingRef.current) return;
    setConfirmOpen(true);
  }, []);

  const confirmFinish = useCallback(() => {
    setConfirmOpen(false);
    submitExam(false);
  }, [submitExam]);

  const handleStart = useCallback(() => {
    const name = nameInput.trim();
    if (name.length < 3) return;
    try {
      localStorage.setItem(LS_NAME, name);
    } catch {
      /* ignore */
    }
    setStudentName(name);
    setPhase("exam");
  }, [nameInput]);

  // =========================================================
  // RENDERING
  // =========================================================

  // ---- Estado de carga ----
  if (phase === "loading") {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-6">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <div className="glass glow-ring rounded-3xl px-10 py-8 flex items-center gap-4 animate-float-up">
          <span className="h-6 w-6 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <span className="text-slate-300 font-medium">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  // ---- No hay sets ----
  if (phase === "no-sets") {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-6">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass glow-ring rounded-3xl max-w-md w-full px-8 py-10 text-center"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-white/10 text-2xl">
            📭
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            {lang === "es" ? "No hay exámenes disponibles" : "No exams available"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {lang === "es"
              ? "Aún no se ha cargado ningún set de preguntas. Vuelve más tarde o contacta a tu administrador."
              : "No question sets have been created yet. Please check back later or contact your administrator."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-200 glass hover:bg-white/10 transition"
          >
            {t("results.backToProfile")}
          </button>
        </motion.div>
      </main>
    );
  }

  // ---- Compuerta de nombre ----
  if (phase === "name-gate") {
    const valid = nameInput.trim().length >= 3;
    return (
      <main className="relative min-h-screen flex items-center justify-center px-6">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <div className="absolute top-6 right-6 z-10">
          <LanguageToggle light />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass glow-ring rounded-3xl max-w-md w-full px-8 py-10"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/80">
            {t("exam.sectionTitle")}
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            <span className="text-gradient">ExamBridge</span>{" "}
            <span className="text-slate-300 not-italic text-base font-medium align-middle">
              Writing Section
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">{t("exam.enterName")}</p>

          <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("exam.yourName")}
          </label>
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) handleStart();
            }}
            placeholder={t("common.name")}
            className="input-dark mt-2 w-full rounded-2xl px-4 py-3 text-sm"
          />

          <button
            onClick={handleStart}
            disabled={!valid}
            className="btn-primary mt-6 w-full rounded-2xl px-5 py-3 text-sm font-bold"
          >
            {t("exam.startExam")}
          </button>
        </motion.div>
      </main>
    );
  }

  // ---- Vista de examen ----
  const lowTime = secondsRemaining < 300; // < 5 min

  return (
    <main className="relative min-h-screen">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />

      {/* ===== Header sticky ===== */}
      <header className="glass sticky top-0 z-20 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
          {/* Marca */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="leading-tight">
              <span className="text-base font-bold italic text-slate-100 sm:text-lg">
                Exam<span className="text-cyan-400">Bridge</span>{" "}
                <span className="not-italic text-cyan-400">MET</span>
              </span>
              <p className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                Writing Section
              </p>
            </div>
          </div>

          {/* Controles derecha */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageToggle light />

            {/* Pill del temporizador */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-bold tabular-nums glass sm:gap-2 sm:px-3.5 ${
                lowTime ? "text-red-500 animate-pulse ring-1 ring-red-500/40" : "text-slate-200"
              }`}
              title={t("exam.timeRemaining")}
            >
              <span className={lowTime ? "text-red-500" : "text-cyan-400"} aria-hidden>
                ⏱
              </span>
              <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {t("exam.timeRemaining")}
              </span>
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            {/* Finalizar */}
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-3 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.7)] transition hover:brightness-110 active:scale-95 disabled:opacity-50 sm:px-4"
            >
              {t("exam.finish")}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Cuerpo: sidebar + panel ===== */}
      <div className="mx-auto flex max-w-7xl gap-3 px-3 py-5 sm:gap-6 sm:px-6 sm:py-6">
        {/* Sidebar de tareas */}
        <nav className="flex flex-col gap-2 sm:gap-3" aria-label="Tasks">
          {set?.tasks.map((tk) => {
            const isActive = tk.id === activeTaskId;
            const taskWords = countWords(answers[String(tk.id)] ?? "");
            const done = taskWords >= tk.minWords;
            return (
              <button
                key={tk.id}
                onClick={() => setActiveTaskId(tk.id)}
                aria-pressed={isActive}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold transition-all duration-200 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-lg ${
                  isActive
                    ? "scale-110 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)]"
                    : "glass text-slate-300 hover:bg-white/10"
                }`}
              >
                {tk.id}
                {/* Indicador de progreso */}
                <span
                  className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-[#020617] ${
                    done ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </nav>

        {/* Panel principal */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {activeTask && (
              <motion.section
                key={activeTask.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="glass glow-ring rounded-3xl p-5 sm:p-8"
              >
                {/* Título + tópico */}
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
                  {activeTask.topic}
                </p>
                <h2 className="mt-1.5 text-xl font-bold text-slate-100 sm:text-2xl">
                  {activeTask.type === "essay"
                    ? `${t("exam.task")} ${activeTask.id} — ${t("exam.essay")}`
                    : `${t("exam.task")} ${activeTask.id}`}
                </h2>

                {/* Prompt en caja resaltada */}
                <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 sm:p-5">
                  <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                    {activeTask.prompt}
                  </p>
                </div>

                {/* Textarea */}
                <textarea
                  value={activeAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={t("exam.placeholder")}
                  spellCheck={false}
                  className="input-dark mt-5 min-h-[220px] w-full resize-y rounded-2xl px-4 py-3.5 text-sm leading-relaxed sm:min-h-[340px]"
                />

                {/* Footer: estudiante + estado / conteo */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <span className="text-slate-400">
                      {t("exam.student")}:{" "}
                      <span className="font-semibold text-slate-200">{studentName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      {t("exam.saving")}
                    </span>
                  </div>

                  {/* Pill de conteo de palabras */}
                  <div
                    className={`inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-xs font-semibold sm:self-auto ${
                      meetsLength
                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
                        : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30"
                    }`}
                  >
                    <span aria-hidden>{meetsLength ? "✓" : "•"}</span>
                    <span className="text-slate-300/90">{t("exam.wordCount")}:</span>
                    <span className="tabular-nums">
                      {wordCount} {t("common.words")}
                    </span>
                    <span className="text-slate-400/70">
                      ({t("common.minWords", { n: activeTask.minWords })})
                    </span>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== Overlay de envío ===== */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass glow-ring mx-5 flex flex-col items-center gap-5 rounded-3xl px-8 py-10 text-center sm:mx-0 sm:px-12"
            >
              <span className="h-12 w-12 rounded-full border-[3px] border-cyan-400/25 border-t-cyan-400 animate-spin" />
              <p className="text-lg font-bold text-gradient">{t("exam.submitting")}</p>
              <p className="max-w-xs text-xs text-slate-400">{t("common.poweredBy")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmar finalizar */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        icon="🏁"
        title={t("exam.finishTitle")}
        description={t("exam.confirmFinish")}
        confirmLabel={t("exam.finish")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmFinish}
        tone="danger"
      />

      {/* Error de envío */}
      <Dialog
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        icon="⚠️"
        title={t("exam.errorTitle")}
        description={t("exam.submitError")}
        confirmLabel={t("common.ok")}
        onConfirm={() => setErrorOpen(false)}
      />
    </main>
  );
}
