"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import { useI18n } from "@/lib/i18n/context";
import type {
  ExamResult,
  GrammarIssue,
  McqGrade,
  SectionResult,
  SpeakingResponse,
  WritingGrade,
} from "@/lib/types";

type Status = "loading" | "ok" | "error";
type Translate = (path: string, params?: Record<string, string | number>) => string;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function bandFor(score: number) {
  if (score >= 80) {
    return {
      color: "text-emerald-300",
      border: "border-emerald-400/30 bg-emerald-400/15",
      ring: "#34d399",
      label: "Strong",
    };
  }
  if (score >= 60) {
    return {
      color: "text-amber-300",
      border: "border-amber-400/30 bg-amber-400/15",
      ring: "#fbbf24",
      label: "Developing",
    };
  }
  return {
    color: "text-rose-300",
    border: "border-rose-400/30 bg-rose-400/15",
    ring: "#fb7185",
    label: "Needs work",
  };
}

function cefrLevel(score: number): { level: string; label: string; note: string } {
  if (score >= 85) return { level: "C1", label: "Advanced", note: "Handles complex academic and professional English." };
  if (score >= 70) return { level: "B2", label: "Upper-Intermediate", note: "Understands main ideas and communicates with good control." };
  if (score >= 55) return { level: "B1", label: "Intermediate", note: "Can manage familiar topics, but needs more accuracy." };
  if (score >= 40) return { level: "A2", label: "Elementary", note: "Understands simple language with limited range." };
  return { level: "A1", label: "Beginner", note: "Needs foundation work in vocabulary, grammar, and comprehension." };
}

function sectionAdvice(section: SectionResult): string {
  if (section.kind === "speaking") return "Speaking is saved for manual review. Use the recordings to check fluency, pronunciation, and task completion.";
  if (section.kind === "writing") {
    if (section.score >= 80) return "Writing is controlled and complete. Keep practicing organization and accuracy.";
    if (section.score >= 60) return "Writing shows partial control. Focus on grammar accuracy, clearer examples, and meeting the word count.";
    return "Writing needs more development. Build complete answers, reach the minimum length, and review sentence structure.";
  }
  if (section.score >= 80) return "Comprehension is strong. Keep practicing timed sets to stay consistent.";
  if (section.score >= 60) return "Performance is close, but some items are unstable. Review missed questions and patterns.";
  return "This section needs focused practice. Work slowly through missed items, then repeat with timing.";
}

function extOf(url: string): string {
  const match = url.match(/\.(webm|ogg|mp4|mp3|wav)(?:\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : ".webm";
}

function ScoreGauge({ score }: { score: number }) {
  const band = bandFor(score);
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
          stroke={band.ring}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-bold tabular-nums ${band.color}`}>{Math.round(clamped)}</span>
        <span className="text-sm text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function SectionSummary({ section, t }: { section: SectionResult; t: Translate }) {
  const band = bandFor(section.score);
  const isSpeaking = section.kind === "speaking" || section.autoScored === false;

  return (
    <div className="glass flex h-full flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{section.title}</p>
          {section.totalCount != null && (
            <p className="mt-0.5 text-xs text-slate-400">
              {t("results.correctOf", { correct: section.correctCount ?? 0, total: section.totalCount })}
            </p>
          )}
        </div>
        {isSpeaking ? (
          <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-indigo-300">
            {t("results.manualReview")}
          </span>
        ) : (
          <span className={`shrink-0 text-3xl font-bold tabular-nums ${band.color}`}>
            {Math.round(section.score)}
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{sectionAdvice(section)}</p>
    </div>
  );
}

function WritingGradeCard({ grade, t }: { grade: WritingGrade; t: Translate }) {
  const band = bandFor(grade.score);
  const counts = grade.issueCounts;
  const styleCount = (counts.style ?? 0) + (counts.typography ?? 0);
  const chips = [
    { label: t("results.grammar"), count: counts.grammar ?? 0 },
    { label: t("results.spelling"), count: counts.spelling ?? 0 },
    { label: t("results.style"), count: styleCount },
  ].filter((chip) => chip.count > 0);
  const visibleIssues = grade.issues.slice(0, 8);

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold leading-relaxed text-slate-100">{grade.prompt}</p>
          <p className="mt-2 text-xs text-slate-400">
            {grade.wordCount} {t("common.words")} / {t("common.minWords", { n: grade.minWords })}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${band.border} ${band.color}`}>
          {Math.round(grade.score)} / 100
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            grade.meetsLength
              ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
              : "border-amber-400/30 bg-amber-400/15 text-amber-300"
          }`}
        >
          {grade.meetsLength ? t("results.lengthOk") : t("results.lengthShort", { have: grade.wordCount, need: grade.minWords })}
        </span>
        {chips.map((chip) => (
          <span key={chip.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {chip.label}: <span className="font-semibold text-slate-100">{chip.count}</span>
          </span>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("results.yourAnswer")}</p>
        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200">
          {grade.answer.trim() ? grade.answer : "-"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("results.issuesFound", { n: grade.issues.length })}</p>
          {visibleIssues.length === 0 ? (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
              {t("results.noIssues")}
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleIssues.map((issue: GrammarIssue, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <p className="text-slate-200">{issue.message}</p>
                  {issue.context && <p className="mt-1 font-mono text-xs text-slate-500">{issue.context}</p>}
                  {issue.suggestion && (
                    <p className="mt-1 text-xs text-slate-400">
                      {t("results.suggestion")}: <span className="font-medium text-emerald-300">{issue.suggestion}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("results.tips")}</p>
          <ul className="space-y-2 text-sm text-slate-300">
            {grade.tips.map((tip, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function McqReviewCard({ grade, index, t }: { grade: McqGrade; index: number; t: Translate }) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const selected = grade.selectedIndex == null ? "-" : letters[grade.selectedIndex] ?? String(grade.selectedIndex + 1);
  const correct = letters[grade.correctIndex] ?? String(grade.correctIndex + 1);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-100">
          <span className="mr-1.5 text-slate-500">{index + 1}.</span>
          {grade.stem}
        </p>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
            grade.correct
              ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
              : "border-rose-400/30 bg-rose-400/15 text-rose-300"
          }`}
        >
          {grade.correct ? t("results.correct") : t("results.incorrect")}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-300">
          {t("results.yourChoice")}: <span className="font-semibold text-slate-100">{selected}</span>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
          {t("results.correctAnswer")}: <span className="font-semibold">{correct}. {grade.options[grade.correctIndex]}</span>
        </div>
      </div>
      {grade.selectedIndex == null && <p className="mt-2 text-xs font-semibold text-amber-300">{t("results.notAnswered")}</p>}
    </div>
  );
}

function SpeakingCard({ response, index, t }: { response: SpeakingResponse; index: number; t: Translate }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-medium leading-relaxed text-slate-100">
        <span className="mr-1.5 text-slate-500">{index + 1}.</span>
        {response.prompt}
      </p>
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("results.yourRecording")}</p>
        {response.audioUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <audio controls src={response.audioUrl} className="w-full max-w-md" />
            <a
              href={response.audioUrl}
              download={`speaking-task-${index + 1}${extOf(response.audioUrl)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              {t("results.download")}
            </a>
          </div>
        ) : (
          <p className="text-sm font-medium text-amber-300">{t("results.noRecording")}</p>
        )}
      </div>
    </div>
  );
}

function SectionDetail({ section, index, t }: { section: SectionResult; index: number; t: Translate }) {
  const correct = section.correctCount ?? section.mcqGrades?.filter((grade) => grade.correct).length ?? 0;
  const total = section.totalCount ?? section.mcqGrades?.length ?? 0;
  const missed = section.mcqGrades?.filter((grade) => !grade.correct).length ?? 0;

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25) }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/80">Detailed feedback</p>
          <h3 className="text-xl font-semibold text-slate-100">{section.title}</h3>
        </div>
        {section.autoScored === false ? (
          <span className="text-sm font-semibold text-indigo-300">{t("results.manualReview")}</span>
        ) : (
          <span className={`text-3xl font-bold tabular-nums ${bandFor(section.score).color}`}>{Math.round(section.score)}</span>
        )}
      </div>

      <div className="glass rounded-2xl p-4 text-sm leading-relaxed text-slate-300">
        {sectionAdvice(section)}
        {total > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
              Correct: {correct}/{total}
            </span>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-300">
              Review: {missed}
            </span>
          </div>
        )}
      </div>

      {section.kind === "writing" &&
        (section.writingGrades ?? []).map((grade) => <WritingGradeCard key={grade.taskId} grade={grade} t={t} />)}

      {(section.kind === "listening" || section.kind === "grammar" || section.kind === "reading") &&
        (section.mcqGrades ?? []).map((grade, i) => <McqReviewCard key={grade.itemId} grade={grade} index={i} t={t} />)}

      {section.kind === "speaking" &&
        (section.speakingResponses ?? []).map((response, i) => (
          <SpeakingCard key={response.taskId} response={response} index={i} t={t} />
        ))}
    </motion.section>
  );
}

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

  const scoredSections = useMemo(
    () => result?.sectionResults.filter((section) => section.autoScored !== false) ?? [],
    [result]
  );

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

  if (status === "error" || !result) {
    return (
      <main className="relative min-h-screen">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100">{t("results.notFound")}</h1>
          <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">
            {t("results.backToProfile")}
          </Link>
        </div>
      </main>
    );
  }

  const cefr = cefrLevel(result.overallScore);
  const overallBand = bandFor(result.overallScore);

  return (
    <main className="relative min-h-screen pb-20">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />

      <div className="mx-auto w-full max-w-5xl px-5 pt-20 sm:px-6 sm:pt-24">
        <motion.header variants={fadeUp} initial="hidden" animate="show" transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-gradient sm:text-4xl">{t("results.title")}</h1>
          <p className="mt-2 text-slate-400">{t("results.subtitle")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="font-medium text-slate-300">{result.studentName}</span>
            <span aria-hidden>-</span>
            <span>{new Date(result.submittedAt).toLocaleString()}</span>
          </div>
        </motion.header>

        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass glow-ring mt-8 grid gap-6 rounded-3xl p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("results.overall")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white">
                <span className="text-2xl font-black leading-none">{cefr.level}</span>
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{t("results.cefrLevel")}</p>
                <p className="text-lg font-bold text-slate-100">{cefr.label}</p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">{cefr.note}</p>
              </div>
            </div>
            <span className={`mt-5 inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold ${overallBand.border} ${overallBand.color}`}>
              {overallBand.label}
            </span>
          </div>
          <ScoreGauge score={result.overallScore} />
        </motion.section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">{t("results.sectionScores")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {result.sectionResults.map((section, i) => (
              <motion.div
                key={`${section.kind}-${i}`}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25) }}
              >
                <SectionSummary section={section} t={t} />
              </motion.div>
            ))}
          </div>
        </section>

        {scoredSections.length > 0 && (
          <section className="mt-8 glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100">Performance profile</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scoredSections.map((section) => (
                <div key={section.kind} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${Math.max(4, section.score)}%` }} />
                  </div>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${bandFor(section.score).color}`}>{Math.round(section.score)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 space-y-10">
          {result.sectionResults.map((section, i) => (
            <SectionDetail key={`detail-${section.kind}-${i}`} section={section} index={i} t={t} />
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <Link href="/" className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-center text-sm font-medium text-slate-200 transition hover:bg-white/10">
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
