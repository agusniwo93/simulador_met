"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import LanguageToggle from "@/components/ui/LanguageToggle";
import Dialog from "@/components/ui/Dialog";
import { useI18n } from "@/lib/i18n/context";
import type { Exam, Section, McqItem } from "@/lib/types";

type TFn = (path: string, params?: Record<string, string | number>) => string;

// ----- Claves de almacenamiento -----
const LS_EXAM = "met_exam";
const LS_ANSWERS = "met_exam_answers";
const LS_END = "met_exam_end";
const LS_NAME = "met_student_name";

// Cuenta palabras: recorta y separa por espacios; vacío = 0.
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// Formatea segundos. Usa H:MM:SS cuando el examen dura >= 60 min, si no M:SS.
function formatTime(totalSeconds: number, showHours: boolean): string {
  const s = Math.max(0, totalSeconds);
  if (showHours) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type Phase = "loading" | "no-exam" | "name-gate" | "exam";

// Valor de una respuesta: texto (writing) o índice de opción (mcq).
type AnswerValue = string | number;

export default function ExamRunPage() {
  const router = useRouter();
  const { lang, t } = useI18n();

  const [phase, setPhase] = useState<Phase>("loading");
  const [exam, setExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [activeSection, setActiveSection] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Refs para evitar dependencias inestables en intervalos / auto-submit.
  const submittingRef = useRef(false);
  const autoSubmitFiredRef = useRef(false);
  const submitRef = useRef<(auto: boolean) => void>(() => {});

  // ¿Soporta el navegador la Web Speech API? (se calcula tras montar)
  const [ttsSupported, setTtsSupported] = useState(true);
  useEffect(() => {
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // ---------- 1) Carga del examen ----------
  useEffect(() => {
    let cancelled = false;

    function isValidExam(value: unknown): value is Exam {
      return (
        !!value &&
        typeof value === "object" &&
        Array.isArray((value as Exam).sections) &&
        (value as Exam).sections.length > 0 &&
        typeof (value as Exam).durationMinutes === "number"
      );
    }

    function bootstrap(ex: Exam) {
      setExam(ex);

      // Restaurar respuestas guardadas.
      try {
        const savedAnswers = localStorage.getItem(LS_ANSWERS);
        if (savedAnswers) {
          const parsed = JSON.parse(savedAnswers) as Record<string, AnswerValue>;
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

    async function load() {
      // Reusar examen persistido para mantener las MISMAS preguntas tras refrescar.
      try {
        const cached = localStorage.getItem(LS_EXAM);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (isValidExam(parsed)) {
            if (!cancelled) bootstrap(parsed);
            return;
          }
        }
      } catch {
        // Cache corrupto: continuar con el fetch.
      }

      try {
        const res = await fetch("/api/exam/set", { cache: "no-store" });

        if (res.status === 402) {
          router.replace("/");
          return;
        }
        if (res.status === 404 || !res.ok) {
          if (!cancelled) setPhase("no-exam");
          return;
        }

        const data = (await res.json()) as { exam: Exam };
        if (!isValidExam(data?.exam)) {
          if (!cancelled) setPhase("no-exam");
          return;
        }

        try {
          localStorage.setItem(LS_EXAM, JSON.stringify(data.exam));
        } catch {
          /* ignore quota errors */
        }
        if (!cancelled) bootstrap(data.exam);
      } catch {
        if (!cancelled) setPhase("no-exam");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
    if (phase !== "exam" || !exam) return;

    const durationS = exam.durationMinutes * 60;

    // Establece el fin absoluto la primera vez que se muestra el examen.
    let endTs: number;
    const stored = localStorage.getItem(LS_END);
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed) && stored) {
      // Ya existe (vigente o expirado): respetarlo.
      endTs = parsed;
    } else {
      endTs = Date.now() + durationS * 1000;
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
  }, [phase, exam]);

  // ---------- Manejo de respuestas ----------
  const setWriting = useCallback((taskId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [taskId]: value }));
  }, []);

  const setChoice = useCallback((itemId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [itemId]: optionIndex }));
  }, []);

  const setSpeaking = useCallback((taskId: string, url: string) => {
    setAnswers((prev) => ({ ...prev, [taskId]: url }));
  }, []);

  // ---------- Web Speech API (listening) ----------
  const speak = useCallback(
    (itemId: string, transcript: string) => {
      if (!ttsSupported || !transcript) return;
      try {
        const u = new SpeechSynthesisUtterance(transcript);
        u.lang = "en-US";
        u.rate = 0.95;
        u.onend = () => setSpeakingId((cur) => (cur === itemId ? null : cur));
        u.onerror = () => setSpeakingId((cur) => (cur === itemId ? null : cur));
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
        setSpeakingId(itemId);
      } catch {
        setSpeakingId(null);
      }
    },
    [ttsSupported]
  );

  // Detener cualquier locución al desmontar / cambiar de sección.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, [activeSection]);

  // ---------- 6) Envío del examen ----------
  const submitExam = useCallback(
    async (autoSubmitted: boolean) => {
      if (submittingRef.current) return; // guard doble-submit
      if (!exam) return;

      submittingRef.current = true;
      setSubmitting(true);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }

      try {
        const res = await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: exam.id,
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
          localStorage.removeItem(LS_EXAM);
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
    [exam, studentName, lang, answers, router]
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

  // ---------- Conteo de respuestas por sección (para el indicador) ----------
  const sectionAnswered = useCallback(
    (section: Section): { answered: number; total: number } => {
      if (section.kind === "writing") {
        const tasks = section.writingTasks ?? [];
        const answered = tasks.filter((tk) => countWords(String(answers[tk.id] ?? "")) > 0).length;
        return { answered, total: tasks.length };
      }
      if (section.kind === "reading") {
        const items = (section.passages ?? []).flatMap((p) => p.items);
        const answered = items.filter((it) => answers[it.id] != null).length;
        return { answered, total: items.length };
      }
      if (section.kind === "speaking") {
        const tasks = section.speakingTasks ?? [];
        const answered = tasks.filter((tk) => typeof answers[tk.id] === "string" && answers[tk.id]).length;
        return { answered, total: tasks.length };
      }
      const items = section.items ?? [];
      const answered = items.filter((it) => answers[it.id] != null).length;
      return { answered, total: items.length };
    },
    [answers]
  );

  const totalSections = exam?.sections.length ?? 0;
  const current = exam?.sections[activeSection] ?? null;
  const showHours = (exam?.durationMinutes ?? 0) >= 60;
  const lowTime = secondsRemaining != null && secondsRemaining < 300; // < 5 min

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

  // ---- No hay examen ----
  if (phase === "no-exam") {
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
          <h1 className="text-xl font-bold text-slate-100">{t("exam.noSetsTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t("exam.noSetsDesc")}</p>
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
            <span className="text-slate-300 not-italic text-base font-medium align-middle">MET</span>
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
  return (
    <main className="relative min-h-screen pb-12">
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
              <p className="hidden truncate text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                {exam?.title}
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
              <span>{formatTime(secondsRemaining ?? 0, showHours)}</span>
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

        {/* Tab bar de secciones */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-3 pb-3 sm:px-6">
          <div className="flex gap-2">
            {exam?.sections.map((s, i) => {
              const isActive = i === activeSection;
              const { answered, total } = sectionAnswered(s);
              const done = total > 0 && answered >= total;
              return (
                <button
                  key={`${s.kind}-${i}`}
                  onClick={() => setActiveSection(i)}
                  aria-pressed={isActive}
                  className={`group flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.7)]"
                      : "glass text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      done ? "bg-emerald-400" : isActive ? "bg-white/80" : "bg-amber-400"
                    }`}
                    aria-hidden
                  />
                  <span className="max-w-[8rem] truncate sm:max-w-[12rem]">{s.title}</span>
                  <span className={isActive ? "text-white/70" : "text-slate-500"}>
                    {answered}/{total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ===== Cuerpo ===== */}
      <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-7">
        <AnimatePresence mode="wait">
          {current && (
            <motion.section
              key={activeSection}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {/* Encabezado de sección */}
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
                {t("exam.section")} {activeSection + 1} / {totalSections}
              </p>
              <h2 className="mt-1.5 text-xl font-bold text-slate-100 sm:text-2xl">{current.title}</h2>
              {current.intro && (
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{current.intro}</p>
              )}

              {/* ----- WRITING ----- */}
              {current.kind === "writing" && (
                <div className="mt-6 space-y-7">
                  {(current.writingTasks ?? []).map((task, n) => {
                    const value = String(answers[task.id] ?? "");
                    const words = countWords(value);
                    const meets = words >= task.minWords;
                    return (
                      <div key={task.id} className="glass glow-ring rounded-3xl p-5 sm:p-7">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
                          {t("exam.task")} {n + 1}
                        </h3>
                        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 sm:p-5">
                          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                            {task.prompt}
                          </p>
                        </div>
                        <textarea
                          value={value}
                          onChange={(e) => setWriting(task.id, e.target.value)}
                          placeholder={t("exam.placeholder")}
                          spellCheck={false}
                          className="input-dark mt-4 min-h-[200px] w-full resize-y rounded-2xl px-4 py-3.5 text-sm leading-relaxed sm:min-h-[280px]"
                        />
                        <div className="mt-3 flex justify-end">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                              meets
                                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
                                : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30"
                            }`}
                          >
                            <span aria-hidden>{meets ? "✓" : "•"}</span>
                            <span className="tabular-nums">
                              {words} {t("common.words")}
                            </span>
                            <span className="opacity-70">
                              ({t("common.minWords", { n: task.minWords })})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ----- GRAMMAR ----- */}
              {current.kind === "grammar" && (
                <div className="mt-6 space-y-5">
                  {(current.items ?? []).map((item, n) => (
                    <McqCard
                      key={item.id}
                      item={item}
                      number={n + 1}
                      selected={typeof answers[item.id] === "number" ? (answers[item.id] as number) : null}
                      onSelect={(idx) => setChoice(item.id, idx)}
                      questionLabel={t("exam.question")}
                      chooseLabel={t("exam.chooseOption")}
                    />
                  ))}
                </div>
              )}

              {/* ----- LISTENING ----- */}
              {current.kind === "listening" && (
                <div className="mt-6">
                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-sm text-slate-300">
                    🎧 {t("exam.listenHint")}
                    {!ttsSupported && (
                      <span className="mt-2 block font-medium text-amber-300">
                        {t("exam.ttsUnsupported")}
                      </span>
                    )}
                  </div>
                  <div className="mt-5 space-y-5">
                    {(current.items ?? []).map((item, n) => {
                      const isSpeaking = speakingId === item.id;
                      return (
                        <McqCard
                          key={item.id}
                          item={item}
                          number={n + 1}
                          selected={
                            typeof answers[item.id] === "number" ? (answers[item.id] as number) : null
                          }
                          onSelect={(idx) => setChoice(item.id, idx)}
                          questionLabel={t("exam.question")}
                          chooseLabel={t("exam.chooseOption")}
                          hideStem={false}
                          audio={
                            ttsSupported && item.transcript ? (
                              <button
                                onClick={() => speak(item.id, item.transcript!)}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.7)] transition hover:brightness-110 active:scale-95"
                              >
                                {isSpeaking ? (
                                  <>
                                    <span className="flex items-end gap-0.5" aria-hidden>
                                      <span className="h-2 w-0.5 animate-pulse bg-white" />
                                      <span className="h-3 w-0.5 animate-pulse bg-white [animation-delay:120ms]" />
                                      <span className="h-1.5 w-0.5 animate-pulse bg-white [animation-delay:240ms]" />
                                    </span>
                                    {t("exam.listenPlaying")}
                                  </>
                                ) : (
                                  <>
                                    <span aria-hidden>▶</span>
                                    {answers[item.id] != null || speakingId
                                      ? t("exam.listenReplay")
                                      : t("exam.listenPlay")}
                                  </>
                                )}
                              </button>
                            ) : null
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ----- READING ----- */}
              {current.kind === "reading" && (
                <div className="mt-6 space-y-8">
                  {(current.passages ?? []).map((passage) => (
                    <div key={passage.id} className="space-y-5">
                      <div className="glass rounded-3xl p-5 sm:p-6">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
                          {t("exam.readPassage")}
                        </p>
                        {passage.title && (
                          <h3 className="mt-1 text-lg font-bold text-slate-100">{passage.title}</h3>
                        )}
                        {passage.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={passage.imageUrl}
                            alt={passage.title ?? t("exam.readPassage")}
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-white"
                          />
                        )}
                        {passage.text && (
                          <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-line rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200">
                            {passage.text}
                          </div>
                        )}
                      </div>
                      <div className="space-y-5">
                        {passage.items.map((item, n) => (
                          <McqCard
                            key={item.id}
                            item={item}
                            number={n + 1}
                            selected={
                              typeof answers[item.id] === "number" ? (answers[item.id] as number) : null
                            }
                            onSelect={(idx) => setChoice(item.id, idx)}
                            questionLabel={t("exam.question")}
                            chooseLabel={t("exam.chooseOption")}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ----- SPEAKING ----- */}
              {current.kind === "speaking" && (
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-sm text-slate-300">
                    🎙️ {t("exam.speakingHint")}
                  </div>
                  {(current.speakingTasks ?? []).map((task, n) => (
                    <div key={task.id} className="glass glow-ring rounded-3xl p-5 sm:p-7">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">
                        {t("exam.task")} {n + 1}
                      </h3>
                      <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 sm:p-5">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                          {task.prompt}
                        </p>
                      </div>
                      {task.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={task.imageUrl}
                          alt={task.prompt}
                          className="mt-4 w-full rounded-2xl border border-white/10 bg-white"
                        />
                      )}
                      <SpeakingRecorder
                        existingUrl={
                          typeof answers[task.id] === "string" ? (answers[task.id] as string) : null
                        }
                        onUploaded={(url) => setSpeaking(task.id, url)}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* ----- Navegación prev/next ----- */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  onClick={() => setActiveSection((i) => Math.max(0, i - 1))}
                  disabled={activeSection === 0}
                  className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-200 glass transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span aria-hidden>←</span> {t("exam.prev")}
                </button>

                {activeSection < totalSections - 1 ? (
                  <button
                    onClick={() => setActiveSection((i) => Math.min(totalSections - 1, i + 1))}
                    className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold"
                  >
                    {t("exam.next")} <span aria-hidden>→</span>
                  </button>
                ) : (
                  <button
                    onClick={handleFinish}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.7)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    🏁 {t("exam.finish")}
                  </button>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
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

// ---- Tarjeta MCQ reutilizable (grammar / listening / reading) ----
function McqCard({
  item,
  number,
  selected,
  onSelect,
  questionLabel,
  chooseLabel,
  hideStem = false,
  audio,
}: {
  item: McqItem;
  number: number;
  selected: number | null;
  onSelect: (index: number) => void;
  questionLabel: string;
  chooseLabel: string;
  hideStem?: boolean;
  audio?: React.ReactNode;
}) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  return (
    <div className="glass glow-ring rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-cyan-400/80">
          {questionLabel} {number}
        </span>
        {audio}
      </div>

      {/* En listening NO se muestra el transcript: solo el enunciado de la pregunta. */}
      {!hideStem && (
        <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-100 sm:text-base">
          {item.stem}
        </p>
      )}

      <p className="mt-3 text-xs font-semibold text-slate-400">{chooseLabel}</p>
      <div className="mt-2 space-y-2.5" role="radiogroup">
        {item.options.map((option, idx) => {
          const isSel = selected === idx;
          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isSel}
              onClick={() => onSelect(idx)}
              className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                isSel
                  ? "border-cyan-400/60 bg-cyan-400/10 text-slate-100 ring-1 ring-cyan-400/40"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isSel ? "bg-gradient-to-br from-cyan-500 to-indigo-600 text-white" : "bg-white/10 text-slate-400"
                }`}
              >
                {letters[idx] ?? idx + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Grabador de voz para Speaking (MediaRecorder + subida al servidor) ----
type RecState = "idle" | "recording" | "uploading" | "error";

function SpeakingRecorder({
  existingUrl,
  onUploaded,
  t,
}: {
  existingUrl: string | null;
  onUploaded: (url: string) => void;
  t: TFn;
}) {
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Limpieza al desmontar (p. ej. al cambiar de sección).
  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      stopStream();
    };
  }, [stopStream]);

  const upload = useCallback(
    async (blob: Blob) => {
      setState("uploading");
      try {
        const fd = new FormData();
        fd.append("file", blob, "recording");
        const res = await fetch("/api/exam/audio", { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload failed");
        const data = (await res.json()) as { url: string };
        onUploaded(data.url);
        setState("idle");
      } catch {
        setState("error");
      }
    },
    [onUploaded]
  );

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        stopStream();
        void upload(blob);
      };
      mr.start();
      recorderRef.current = mr;
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      // Permiso denegado o sin micrófono.
      setState("error");
      stopStream();
    }
  }, [supported, stopStream, upload]);

  const stop = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!supported) {
    return (
      <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300">
        {t("exam.micUnsupported")}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {state === "recording" ? (
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(244,63,94,0.7)] transition hover:brightness-110 active:scale-95"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-white" aria-hidden />
            {t("exam.stop")} · {fmt(elapsed)}
          </button>
        ) : state === "uploading" ? (
          <span className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-bold text-slate-300">
            <span className="h-4 w-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            {t("exam.savingAudio")}
          </span>
        ) : (
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.7)] transition hover:brightness-110 active:scale-95"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" aria-hidden />
            {existingUrl ? t("exam.rerecord") : t("exam.record")}
          </button>
        )}

        {existingUrl && state !== "recording" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
            <span aria-hidden>✓</span> {t("exam.recorded")}
          </span>
        )}
      </div>

      {state === "error" && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
          {t("exam.micDenied")}
        </p>
      )}

      {existingUrl && state !== "recording" && (
        <audio controls src={existingUrl} className="w-full max-w-md" />
      )}
    </div>
  );
}
