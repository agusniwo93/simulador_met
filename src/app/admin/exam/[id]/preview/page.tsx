"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Background3D from "@/components/visual/Background3D";
import { speakDialogue, stopAudio } from "@/lib/tts/player";
import type { Exam, Section, McqItem } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function ExamPreviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/sets/${id}`);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (res.ok) setExam((await res.json()).exam as Exam);
      setLoading(false);
    })();
  }, [id, router]);

  const speak = useCallback((itemId: string, text: string) => {
    if (!text) return;
    setSpeakingId(itemId);
    // Misma reproducción que el examen real: ElevenLabs (dos voces) con respaldo
    // a la voz del navegador con voces de mujer/hombre.
    speakDialogue(text, () => setSpeakingId((c) => (c === itemId ? null : c)));
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
      if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, []);

  // Al cambiar de sección: detener cualquier locución.
  useEffect(() => {
    stopAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    setSpeakingId(null);
  }, [active]);

  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center text-slate-400">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        Cargando…
      </main>
    );
  }

  if (!exam) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center gap-4 text-slate-300">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <p>No se encontró el examen.</p>
        <button
          onClick={() => router.push("/admin")}
          className="glass rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          ← Volver al panel
        </button>
      </main>
    );
  }

  const current = exam.sections[active];

  return (
    <main className="relative min-h-screen pb-16 text-slate-100">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-veil" />

      {/* Barra superior */}
      <header className="glass sticky top-0 z-20 border-b border-white/10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold italic sm:text-lg">
                Learning<span className="not-italic font-light text-cyan-400">English</span>
              </span>
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                Vista previa
              </span>
            </div>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {exam.title} · {exam.durationMinutes} min
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/admin/exam/${exam.id}`)}
              className="glass rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-white/10"
            >
              Editar
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="glass rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
            >
              ← Panel
            </button>
          </div>
        </div>

        {/* Tabs de secciones */}
        <div className="mx-auto max-w-4xl overflow-x-auto px-4 pb-3 sm:px-6">
          <div className="flex gap-2">
            {exam.sections.map((s, i) => (
              <button
                key={`${s.kind}-${i}`}
                onClick={() => setActive(i)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  i === active
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white"
                    : "glass text-slate-300 hover:bg-white/10"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Nota */}
      <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-6">
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-200/90">
          Así ve el alumno el examen. En la vista previa se resaltan en verde las respuestas correctas
          (el alumno no las ve) y en Listening se muestra la transcripción.
        </p>
      </div>

      {/* Cuerpo de la sección */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {current && <SectionPreview section={current} speak={speak} speakingId={speakingId} />}

        {/* Navegación */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => setActive((i) => Math.max(0, i - 1))}
            disabled={active === 0}
            className="glass rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setActive((i) => Math.min(exam.sections.length - 1, i + 1))}
            disabled={active >= exam.sections.length - 1}
            className="btn-primary rounded-2xl px-6 py-2.5 text-sm font-bold disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </main>
  );
}

function SectionPreview({
  section,
  speak,
  speakingId,
}: {
  section: Section;
  speak: (id: string, text: string) => void;
  speakingId: string | null;
}) {
  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">Sección</p>
      <h2 className="mt-1 text-xl font-bold sm:text-2xl">{section.title}</h2>
      {section.intro && <p className="mt-2 text-sm leading-relaxed text-slate-400">{section.intro}</p>}

      {/* WRITING */}
      {section.kind === "writing" && (
        <div className="mt-6 space-y-5">
          {(section.writingTasks ?? []).map((task, n) => (
            <div key={task.id} className="glass rounded-3xl p-5 sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Task {n + 1}</h3>
              <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{task.prompt}</p>
              </div>
              <div className="input-dark mt-4 min-h-[120px] rounded-2xl px-4 py-3 text-sm text-slate-500">
                (student's answer area)
              </div>
              <p className="mt-2 text-xs text-slate-500">Min. {task.minWords} words</p>
              {task.feedbackGuide && (
                <p className="mt-1 text-xs text-emerald-300/80">Guía: {task.feedbackGuide}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GRAMMAR */}
      {section.kind === "grammar" && (
        <div className="mt-6 space-y-4">
          {(section.items ?? []).map((item, n) => (
            <McqPreview key={item.id} item={item} number={n + 1} />
          ))}
        </div>
      )}

      {/* LISTENING */}
      {section.kind === "listening" && (
        <div className="mt-6 space-y-4">
          {(section.items ?? []).map((item, n) => (
            <McqPreview
              key={item.id}
              item={item}
              number={n + 1}
              audio={
                item.transcript ? (
                  <button
                    onClick={() => speak(item.id, item.transcript!)}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                  >
                    {speakingId === item.id ? "♪ Playing…" : "▶ Listen"}
                  </button>
                ) : null
              }
              transcript={item.transcript}
            />
          ))}
        </div>
      )}

      {/* READING */}
      {section.kind === "reading" && (
        <div className="mt-6 space-y-8">
          {(section.passages ?? []).map((p) => (
            <div key={p.id} className="space-y-4">
              <div className="glass rounded-3xl p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
                  Texto de lectura
                </p>
                {p.title && <h3 className="mt-1 text-lg font-bold">{p.title}</h3>}
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.title ?? "Pasaje"}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white"
                  />
                )}
                {p.text && (
                  <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-line rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200">
                    {p.text}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {p.items.map((item, n) => (
                  <McqPreview key={item.id} item={item} number={n + 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SPEAKING */}
      {section.kind === "speaking" && (
        <div className="mt-6 space-y-5">
          {(section.speakingTasks ?? []).map((task, n) => (
            <div key={task.id} className="glass rounded-3xl p-5 sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300">Task {n + 1}</h3>
              <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{task.prompt}</p>
              </div>
              {task.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.imageUrl}
                  alt={task.prompt}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white"
                />
              )}
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
                🎙️ The student records a voice answer
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function McqPreview({
  item,
  number,
  audio,
  transcript,
}: {
  item: McqItem;
  number: number;
  audio?: React.ReactNode;
  transcript?: string;
}) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-cyan-400/80">Question {number}</span>
        {audio}
      </div>

      {transcript && (
        <p className="mt-3 whitespace-pre-line rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs italic leading-relaxed text-slate-400">
          Transcript (admin only): {transcript}
        </p>
      )}

      <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-100 sm:text-base">
        {item.stem}
      </p>

      <div className="mt-3 space-y-2.5">
        {item.options.map((option, idx) => {
          const isCorrect = idx === item.correctIndex;
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                isCorrect
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.02] text-slate-300"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCorrect ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10 text-slate-400"
                }`}
              >
                {LETTERS[idx] ?? idx + 1}
              </span>
              <span className="flex-1 pt-0.5 leading-relaxed">{option}</span>
              {isCorrect && (
                <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                  Correcta
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
