"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import { useI18n } from "@/lib/i18n/context";
import type {
  ExamResult,
  SectionResult,
  WritingGrade,
  McqGrade,
  GrammarIssue,
} from "@/lib/types";

// ---- Helpers de color según el puntaje (mismas franjas en toda la página) ----

type Band = {
  ring: string; // color del trazo del gauge
  text: string; // clase de color de texto Tailwind
  chipBg: string; // fondo de la píldora
  chipText: string;
  badgeKey: "results.excellent" | "results.good" | "results.needsWork";
};

function bandFor(score: number): Band {
  if (score >= 80) {
    return {
      ring: "#34d399", // emerald-400
      text: "text-emerald-400",
      chipBg: "bg-emerald-400/15 border-emerald-400/30",
      chipText: "text-emerald-300",
      badgeKey: "results.excellent",
    };
  }
  if (score >= 60) {
    return {
      ring: "#fbbf24", // amber-400
      text: "text-amber-400",
      chipBg: "bg-amber-400/15 border-amber-400/30",
      chipText: "text-amber-300",
      badgeKey: "results.good",
    };
  }
  return {
    ring: "#fb7185", // rose-400
    text: "text-rose-400",
    chipBg: "bg-rose-400/15 border-rose-400/30",
    chipText: "text-rose-300",
    badgeKey: "results.needsWork",
  };
}

const MAX_VISIBLE_ISSUES = 8;

type Translate = (path: string, params?: Record<string, string | number>) => string;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ---- Gauge circular SVG proporcional al puntaje ----

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold tabular-nums" style={{ color }}>
          {Math.round(clamped)}
        </span>
        <span className="text-sm text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

// ---- Detalle de una tarea de Writing ----

function WritingGradeCard({ grade, t }: { grade: WritingGrade; t: Translate }) {
  const band = bandFor(grade.score);

  // typography se pliega dentro de "style" (no hay clave i18n propia).
  const counts = grade.issueCounts;
  const styleCount = (counts.style ?? 0) + (counts.typography ?? 0);
  const chips: { label: string; count: number }[] = [
    { label: t("results.grammar"), count: counts.grammar ?? 0 },
    { label: t("results.spelling"), count: counts.spelling ?? 0 },
    { label: t("results.style"), count: styleCount },
  ].filter((c) => c.count > 0);

  const visibleIssues = grade.issues.slice(0, MAX_VISIBLE_ISSUES);
  const hiddenCount = grade.issues.length - visibleIssues.length;

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      {/* Encabezado: prompt + pill de puntaje */}
      <div className="flex items-start justify-between gap-4">
        <p className="flex-1 text-sm leading-relaxed text-slate-300">{grade.prompt}</p>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${band.chipBg} ${band.chipText}`}
        >
          {Math.round(grade.score)} / 100
        </span>
      </div>

      {/* Estado de extensión */}
      <p className="mt-3 text-sm font-medium">
        {grade.meetsLength ? (
          <span className="text-emerald-400">{t("results.lengthOk")}</span>
        ) : (
          <span className="text-amber-400">
            {t("results.lengthShort", { have: grade.wordCount, need: grade.minWords })}
          </span>
        )}
      </p>

      {/* Chips de categorías (solo > 0) */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
            >
              {c.label}: <span className="font-semibold text-slate-100">{c.count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Respuesta del estudiante */}
      <div className="mt-5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("results.yourAnswer")}
        </p>
        <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200">
          {grade.answer.trim() ? grade.answer : "—"}
        </div>
      </div>

      {/* Lista de problemas */}
      <div className="mt-5">
        {grade.issues.length === 0 ? (
          <p className="text-sm font-medium text-emerald-400">{t("results.noIssues")}</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold text-slate-200">
              {t("results.issuesFound", { n: grade.issues.length })}
            </p>
            <ul className="space-y-3">
              {visibleIssues.map((issue: GrammarIssue, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <p className="text-slate-200">{issue.message}</p>
                  {issue.context && (
                    <p className="mt-1 font-mono text-xs text-slate-500">{issue.context}</p>
                  )}
                  {issue.suggestion && (
                    <p className="mt-1 text-xs text-slate-400">
                      {t("results.suggestion")}:{" "}
                      <span className="font-medium text-emerald-400">{issue.suggestion}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && <p className="mt-2 text-xs text-slate-500">+{hiddenCount} more</p>}
          </>
        )}
      </div>

      {/* Tips */}
      {grade.tips.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("results.tips")}
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            {grade.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Detalle de una pregunta MCQ (grammar / listening / reading) ----

function McqGradeCard({ grade, index, t }: { grade: McqGrade; index: number; t: Translate }) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const notAnswered = grade.selectedIndex == null;

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-100 sm:text-base">
          <span className="mr-1.5 text-slate-500">{index + 1}.</span>
          {grade.stem}
        </p>
        {grade.correct ? (
          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
            ✓ {t("results.correct")}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-rose-400/30 bg-rose-400/15 px-3 py-1 text-xs font-bold text-rose-300">
            ✕ {t("results.incorrect")}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {grade.options.map((option, idx) => {
          const isCorrect = idx === grade.correctIndex;
          const isChosenWrong = idx === grade.selectedIndex && !grade.correct;

          let cls =
            "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-slate-300 border-white/10 bg-white/[0.02]";
          if (isCorrect) {
            cls =
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
          } else if (isChosenWrong) {
            cls =
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm border-rose-400/40 bg-rose-400/10 text-rose-100";
          }

          return (
            <div key={idx} className={cls}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCorrect
                    ? "bg-emerald-500/30 text-emerald-200"
                    : isChosenWrong
                    ? "bg-rose-500/30 text-rose-200"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {letters[idx] ?? idx + 1}
              </span>
              <span className="flex-1 pt-0.5 leading-relaxed">{option}</span>
              {isCorrect && (
                <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  {t("results.correctAnswer")}
                </span>
              )}
              {isChosenWrong && (
                <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-rose-300">
                  {t("results.yourChoice")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {notAnswered && (
        <p className="mt-3 text-xs font-semibold text-amber-300">{t("results.notAnswered")}</p>
      )}
    </div>
  );
}

// ---- Tarjeta de detalle por sección ----

function SectionDetail({
  section,
  index,
  t,
}: {
  section: SectionResult;
  index: number;
  t: Translate;
}) {
  const isWriting = section.kind === "writing";
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{section.title}</h3>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${bandFor(section.score).chipBg} ${
            bandFor(section.score).chipText
          }`}
        >
          {Math.round(section.score)} / 100
        </span>
      </div>

      {isWriting
        ? (section.writingGrades ?? []).map((g) => (
            <WritingGradeCard key={g.taskId} grade={g} t={t} />
          ))
        : (section.mcqGrades ?? []).map((g, i) => (
            <McqGradeCard key={g.itemId} grade={g} index={i} t={t} />
          ))}
    </motion.section>
  );
}

type Status = "loading" | "ok" | "error";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    (async () => {
      try {
        const res = await fetch(`/api/results/${id}`);
        if (!res.ok) {
          if (active) setStatus("error");
          return;
        }
        const data: { result: ExamResult } = await res.json();
        if (active) {
          setResult(data.result);
          setStatus("ok");
        }
      } catch {
        if (active) setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  // ---- Estado de carga ----
  if (status === "loading") {
    return (
      <main className="relative min-h-screen">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <div className="flex min-h-screen items-center justify-center px-6">
          <p className="text-slate-400">{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  // ---- No encontrado ----
  if (status === "error" || !result) {
    return (
      <main className="relative min-h-screen">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100">{t("results.notFound")}</h1>
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            {t("results.backToProfile")}
          </Link>
        </div>
      </main>
    );
  }

  const overall = bandFor(result.overallScore);

  return (
    <main className="relative min-h-screen pb-20">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />

      <div className="mx-auto w-full max-w-4xl px-5 pt-20 sm:px-6 sm:pt-24">
        {/* Header */}
        <motion.header variants={fadeUp} initial="hidden" animate="show" transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-gradient sm:text-4xl">
            {t("results.title")}
          </h1>
          <p className="mt-2 text-slate-400">{t("results.subtitle")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="font-medium text-slate-300">{result.studentName}</span>
            <span aria-hidden>•</span>
            <span>{new Date(result.submittedAt).toLocaleString()}</span>
          </div>
        </motion.header>

        {/* Hero de puntaje general */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass glow-ring mt-8 flex flex-col items-center gap-6 rounded-3xl p-6 sm:flex-row sm:justify-between sm:p-8"
        >
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t("results.overall")}
            </p>
            <div className="mt-3">
              <span
                className={`inline-block rounded-full border px-4 py-1.5 text-sm font-semibold ${overall.chipBg} ${overall.chipText}`}
              >
                {t(overall.badgeKey)}
              </span>
            </div>
          </div>
          <ScoreGauge score={result.overallScore} color={overall.ring} />
        </motion.section>

        {/* Puntajes por sección (resumen) */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">{t("results.sectionScores")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {result.sectionResults.map((s, i) => {
              const band = bandFor(s.score);
              const isMcq = s.kind !== "writing";
              return (
                <motion.div
                  key={`${s.kind}-${i}`}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25) }}
                  className="glass flex items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">{s.title}</p>
                    {isMcq && s.totalCount != null && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {t("results.correctOf", {
                          correct: s.correctCount ?? 0,
                          total: s.totalCount,
                        })}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-2xl font-bold tabular-nums ${band.text}`}>
                    {Math.round(s.score)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Detalle por sección */}
        <div className="mt-10 space-y-10">
          {result.sectionResults.map((s, i) => (
            <SectionDetail key={`detail-${s.kind}-${i}`} section={s} index={i} t={t} />
          ))}
        </div>

        {/* Acciones de pie */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-center text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            {t("results.backToProfile")}
          </Link>
          <Link href="/exam" className="btn-primary rounded-xl px-6 py-2.5 text-center text-sm font-semibold">
            {t("results.retake")}
          </Link>
        </div>
      </div>
    </main>
  );
}
