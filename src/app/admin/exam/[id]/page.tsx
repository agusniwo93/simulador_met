"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Background3D from "@/components/visual/Background3D";
import type { Exam, Section, McqItem, WritingTask, ReadingPassage, SpeakingTask } from "@/lib/types";

type Banner = { kind: "success" | "error"; text: string } | null;

function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

function emptyMcq(): McqItem {
  return { id: newId("q"), stem: "", options: ["", ""], correctIndex: 0 };
}

const SECTION_LABELS: Record<Section["kind"], string> = {
  writing: "Writing",
  listening: "Listening",
  grammar: "Grammar",
  reading: "Reading",
  speaking: "Speaking",
};

function blankSection(kind: Section["kind"]): Section {
  const base = { kind, title: SECTION_LABELS[kind] };
  switch (kind) {
    case "writing":
      return { ...base, writingTasks: [{ id: newId("w"), prompt: "", minWords: 20, feedbackGuide: "" }] };
    case "reading":
      return { ...base, passages: [{ id: newId("p"), title: "", text: "", items: [emptyMcq()] }] };
    case "speaking":
      return { ...base, speakingTasks: [{ id: newId("sp"), prompt: "" }] };
    default: // grammar | listening
      return { ...base, items: [emptyMcq()] };
  }
}

export default function ExamEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/sets/${id}`);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (res.ok) {
        setExam((await res.json()).exam as Exam);
      }
      setLoading(false);
    })();
  }, [id, router]);

  // --- Actualizadores inmutables ---
  const patchExam = useCallback((patch: Partial<Exam>) => {
    setExam((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const patchSection = useCallback((idx: number, updater: (s: Section) => Section) => {
    setExam((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s, i) => (i === idx ? updater(s) : s));
      return { ...prev, sections };
    });
  }, []);

  const removeSection = useCallback((idx: number) => {
    setExam((prev) => (prev ? { ...prev, sections: prev.sections.filter((_, i) => i !== idx) } : prev));
  }, []);

  const addSection = useCallback((kind: Section["kind"]) => {
    setExam((prev) => (prev ? { ...prev, sections: [...prev.sections, blankSection(kind)] } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!exam) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/sets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exam.title,
          durationMinutes: exam.durationMinutes,
          sections: exam.sections,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { exam: Exam };
      setExam(data.exam);
      setBanner({ kind: "success", text: "Cambios guardados correctamente." });
    } catch {
      setBanner({ kind: "error", text: "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  }, [exam, id]);

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

  return (
    <main className="relative min-h-screen text-slate-100 px-5 pt-20 pb-32 sm:px-6 sm:pt-24">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-[#020617]/70" />

      <div className="max-w-4xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              onClick={() => router.push("/admin")}
              className="text-sm font-bold text-slate-400 hover:text-slate-200"
            >
              ← Volver al panel
            </button>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              <span className="text-gradient">Editar examen</span>
            </h1>
          </div>
          <button
            onClick={() => router.push(`/admin/exam/${id}/preview`)}
            className="glass shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            👁 Vista previa
          </button>
        </div>

        {/* Datos generales */}
        <section className="glass rounded-3xl p-6 mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Título del examen
            </label>
            <input
              value={exam.title}
              onChange={(e) => patchExam({ title: e.target.value })}
              className="input-dark w-full px-4 py-3 rounded-xl"
            />
          </div>
          <div className="max-w-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Duración (minutos)
            </label>
            <input
              type="number"
              min={1}
              value={exam.durationMinutes}
              onChange={(e) => patchExam({ durationMinutes: Number(e.target.value) || 1 })}
              className="input-dark w-full px-4 py-3 rounded-xl"
            />
          </div>
        </section>

        {/* Secciones */}
        <div className="mt-6 space-y-6">
          {exam.sections.map((section, sIdx) => (
            <SectionEditor
              key={`${section.kind}-${sIdx}`}
              section={section}
              onChange={(updater) => patchSection(sIdx, updater)}
              onRemove={() => removeSection(sIdx)}
            />
          ))}

          {/* Añadir sección */}
          <div className="glass rounded-3xl p-5">
            <p className="mb-3 text-sm font-bold text-slate-300">Añadir sección</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SECTION_LABELS) as Section["kind"][]).map((kind) => (
                <button
                  key={kind}
                  onClick={() => addSection(kind)}
                  className="glass rounded-xl px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-white/10"
                >
                  + {SECTION_LABELS[kind]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de guardado fija */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#020617]/90 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
          {banner ? (
            <span
              className={`text-sm font-semibold ${
                banner.kind === "success" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {banner.text}
            </span>
          ) : (
            <span className="text-sm text-slate-500">Edita las preguntas y guarda los cambios.</span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary px-6 py-3 rounded-xl font-black uppercase tracking-tight text-sm disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// Editor por sección
// ============================================================
function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: Section;
  onChange: (updater: (s: Section) => Section) => void;
  onRemove: () => void;
}) {
  const count =
    section.kind === "writing"
      ? section.writingTasks?.length ?? 0
      : section.kind === "speaking"
        ? section.speakingTasks?.length ?? 0
        : section.kind === "reading"
          ? (section.passages ?? []).reduce((n, p) => n + p.items.length, 0)
          : section.items?.length ?? 0;

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <input
            value={section.title}
            onChange={(e) => onChange((s) => ({ ...s, title: e.target.value }))}
            className="input-dark rounded-lg px-3 py-1.5 text-lg font-black"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300/70">
            {section.kind}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{count} preguntas</span>
          <button
            onClick={onRemove}
            className="text-rose-400 hover:text-rose-300 text-xs font-bold"
          >
            Eliminar sección
          </button>
        </div>
      </div>

      {section.kind === "writing" && <WritingEditor section={section} onChange={onChange} />}
      {(section.kind === "grammar" || section.kind === "listening") && (
        <McqListEditor section={section} onChange={onChange} listening={section.kind === "listening"} />
      )}
      {section.kind === "reading" && <ReadingEditor section={section} onChange={onChange} />}
      {section.kind === "speaking" && <SpeakingEditor section={section} onChange={onChange} />}
    </section>
  );
}

// ============================================================
// Writing
// ============================================================
function WritingEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (updater: (s: Section) => Section) => void;
}) {
  const tasks = section.writingTasks ?? [];

  const setTasks = (next: WritingTask[]) => onChange((s) => ({ ...s, writingTasks: next }));
  const patchTask = (i: number, patch: Partial<WritingTask>) =>
    setTasks(tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addTask = () =>
    setTasks([...tasks, { id: newId("w"), prompt: "", minWords: 20, feedbackGuide: "" }]);
  const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {tasks.map((task, i) => (
        <div key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Tarea {i + 1}
            </span>
            <button
              onClick={() => removeTask(i)}
              className="text-rose-400 hover:text-rose-300 text-xs font-bold"
            >
              Eliminar
            </button>
          </div>
          <textarea
            value={task.prompt}
            onChange={(e) => patchTask(i, { prompt: e.target.value })}
            placeholder="Enunciado / consigna"
            className="input-dark w-full px-3 py-2.5 rounded-xl text-sm min-h-[70px]"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Mín. palabras
              </label>
              <input
                type="number"
                min={0}
                value={task.minWords}
                onChange={(e) => patchTask(i, { minWords: Number(e.target.value) || 0 })}
                className="input-dark w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Guía de retroalimentación
              </label>
              <input
                value={task.feedbackGuide ?? ""}
                onChange={(e) => patchTask(i, { feedbackGuide: e.target.value })}
                placeholder="Qué debe incluir una buena respuesta"
                className="input-dark w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addTask}
        className="glass rounded-xl px-4 py-2.5 text-sm font-bold text-cyan-300 hover:bg-white/10"
      >
        + Añadir tarea
      </button>
    </div>
  );
}

// ============================================================
// Speaking (tareas con prompt e imagen opcional)
// ============================================================
function SpeakingEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (updater: (s: Section) => Section) => void;
}) {
  const tasks = section.speakingTasks ?? [];
  const setTasks = (next: SpeakingTask[]) => onChange((s) => ({ ...s, speakingTasks: next }));
  const patchTask = (i: number, patch: Partial<SpeakingTask>) =>
    setTasks(tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addTask = () => setTasks([...tasks, { id: newId("sp"), prompt: "" }]);
  const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Speaking se graba en voz y no se califica automáticamente (revisión manual).
      </p>
      {tasks.map((task, i) => (
        <SpeakingTaskEditor
          key={task.id}
          task={task}
          number={i + 1}
          onChange={(patch) => patchTask(i, patch)}
          onRemove={() => removeTask(i)}
        />
      ))}
      <button
        onClick={addTask}
        className="glass rounded-xl px-4 py-2.5 text-sm font-bold text-cyan-300 hover:bg-white/10"
      >
        + Añadir tarea de speaking
      </button>
    </div>
  );
}

function SpeakingTaskEditor({
  task,
  number,
  onChange,
  onRemove,
}: {
  task: SpeakingTask;
  number: number;
  onChange: (patch: Partial<SpeakingTask>) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = (await res.json()) as { url: string };
        onChange({ imageUrl: url });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Tarea {number}</span>
        <button onClick={onRemove} className="text-rose-400 hover:text-rose-300 text-xs font-bold">
          Eliminar
        </button>
      </div>
      <textarea
        value={task.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        placeholder="Consigna de la tarea de speaking"
        className="input-dark w-full px-3 py-2.5 rounded-xl text-sm min-h-[70px]"
      />
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="glass rounded-lg px-3 py-2 text-xs font-bold cursor-pointer hover:bg-white/10">
            {uploading ? "Subiendo…" : task.imageUrl ? "Cambiar imagen" : "Subir imagen (opcional)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
          </label>
          {task.imageUrl && (
            <button
              onClick={() => onChange({ imageUrl: undefined })}
              className="text-rose-400 hover:text-rose-300 text-xs font-bold"
            >
              Quitar imagen
            </button>
          )}
        </div>
        {task.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={task.imageUrl}
            alt="Imagen de la tarea"
            className="mt-3 max-h-56 w-auto rounded-lg border border-white/10 bg-white"
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// MCQ list (grammar / listening)
// ============================================================
function McqListEditor({
  section,
  onChange,
  listening,
}: {
  section: Section;
  onChange: (updater: (s: Section) => Section) => void;
  listening: boolean;
}) {
  const items = section.items ?? [];
  const setItems = (next: McqItem[]) => onChange((s) => ({ ...s, items: next }));

  const patchItem = (i: number, patch: Partial<McqItem>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems([...items, emptyMcq()]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <McqItemEditor
          key={item.id}
          item={item}
          number={i + 1}
          listening={listening}
          onChange={(patch) => patchItem(i, patch)}
          onRemove={() => removeItem(i)}
        />
      ))}
      <button
        onClick={addItem}
        className="glass rounded-xl px-4 py-2.5 text-sm font-bold text-cyan-300 hover:bg-white/10"
      >
        + Añadir pregunta
      </button>
    </div>
  );
}

// ============================================================
// Reading (passages con texto o imagen)
// ============================================================
function ReadingEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (updater: (s: Section) => Section) => void;
}) {
  const passages = section.passages ?? [];
  const setPassages = (next: ReadingPassage[]) => onChange((s) => ({ ...s, passages: next }));

  const patchPassage = (i: number, patch: Partial<ReadingPassage>) =>
    setPassages(passages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addPassage = () =>
    setPassages([...passages, { id: newId("p"), title: "", text: "", items: [emptyMcq()] }]);
  const removePassage = (i: number) => setPassages(passages.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      {passages.map((passage, pi) => (
        <PassageEditor
          key={passage.id}
          passage={passage}
          number={pi + 1}
          onChange={(patch) => patchPassage(pi, patch)}
          onRemove={() => removePassage(pi)}
        />
      ))}
      <button
        onClick={addPassage}
        className="glass rounded-xl px-4 py-2.5 text-sm font-bold text-cyan-300 hover:bg-white/10"
      >
        + Añadir pasaje
      </button>
    </div>
  );
}

function PassageEditor({
  passage,
  number,
  onChange,
  onRemove,
}: {
  passage: ReadingPassage;
  number: number;
  onChange: (patch: Partial<ReadingPassage>) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const setItems = (next: McqItem[]) => onChange({ items: next });
  const patchItem = (i: number, patch: Partial<McqItem>) =>
    setItems(passage.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems([...passage.items, emptyMcq()]);
  const removeItem = (i: number) => setItems(passage.items.filter((_, idx) => idx !== i));

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = (await res.json()) as { url: string };
        onChange({ imageUrl: url });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-cyan-300/80">
          Pasaje {number}
        </span>
        <button onClick={onRemove} className="text-rose-400 hover:text-rose-300 text-xs font-bold">
          Eliminar pasaje
        </button>
      </div>

      <input
        value={passage.title ?? ""}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Título del pasaje (opcional)"
        className="input-dark w-full px-3 py-2 rounded-xl text-sm"
      />

      {/* Imagen */}
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="glass rounded-lg px-3 py-2 text-xs font-bold cursor-pointer hover:bg-white/10">
            {uploading ? "Subiendo…" : passage.imageUrl ? "Cambiar imagen" : "Subir imagen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
          </label>
          {passage.imageUrl && (
            <button
              onClick={() => onChange({ imageUrl: undefined })}
              className="text-rose-400 hover:text-rose-300 text-xs font-bold"
            >
              Quitar imagen
            </button>
          )}
          <span className="text-[11px] text-slate-500">
            El pasaje puede ser una imagen (anuncio/artículo) y/o texto.
          </span>
        </div>
        {passage.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={passage.imageUrl}
            alt={passage.title ?? "Pasaje"}
            className="mt-3 max-h-64 w-auto rounded-lg border border-white/10 bg-white"
          />
        )}
      </div>

      {/* Texto */}
      <textarea
        value={passage.text ?? ""}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Texto del pasaje (opcional si usas imagen)"
        className="input-dark mt-3 w-full px-3 py-2.5 rounded-xl text-sm min-h-[90px]"
      />

      {/* Preguntas del pasaje */}
      <div className="mt-4 space-y-3">
        {passage.items.map((item, i) => (
          <McqItemEditor
            key={item.id}
            item={item}
            number={i + 1}
            listening={false}
            onChange={(patch) => patchItem(i, patch)}
            onRemove={() => removeItem(i)}
          />
        ))}
      </div>
      <button
        onClick={addItem}
        className="mt-3 glass rounded-lg px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-white/10"
      >
        + Añadir pregunta
      </button>
    </div>
  );
}

// ============================================================
// Editor de una pregunta MCQ (reutilizable)
// ============================================================
function McqItemEditor({
  item,
  number,
  listening,
  onChange,
  onRemove,
}: {
  item: McqItem;
  number: number;
  listening: boolean;
  onChange: (patch: Partial<McqItem>) => void;
  onRemove: () => void;
}) {
  const letters = ["A", "B", "C", "D", "E", "F"];

  const setOption = (idx: number, value: string) =>
    onChange({ options: item.options.map((o, i) => (i === idx ? value : o)) });
  const addOption = () => {
    if (item.options.length >= 6) return;
    onChange({ options: [...item.options, ""] });
  };
  const removeOption = (idx: number) => {
    if (item.options.length <= 2) return;
    const options = item.options.filter((_, i) => i !== idx);
    let correctIndex = item.correctIndex;
    if (idx === correctIndex) correctIndex = 0;
    else if (idx < correctIndex) correctIndex -= 1;
    onChange({ options, correctIndex });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Pregunta {number}
        </span>
        <button onClick={onRemove} className="text-rose-400 hover:text-rose-300 text-xs font-bold">
          Eliminar
        </button>
      </div>

      <textarea
        value={item.stem}
        onChange={(e) => onChange({ stem: e.target.value })}
        placeholder="Enunciado de la pregunta"
        className="input-dark w-full px-3 py-2 rounded-xl text-sm min-h-[56px]"
      />

      {listening && (
        <div className="mt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            Transcripción (lo que lee la voz — el alumno no lo ve)
          </label>
          <textarea
            value={item.transcript ?? ""}
            onChange={(e) => onChange({ transcript: e.target.value })}
            placeholder="Diálogo / audio a leer por TTS"
            className="input-dark w-full px-3 py-2 rounded-xl text-sm min-h-[80px]"
          />
        </div>
      )}

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Opciones (marca la correcta)
      </p>
      <div className="mt-1.5 space-y-2">
        {item.options.map((option, idx) => {
          const isCorrect = item.correctIndex === idx;
          return (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ correctIndex: idx })}
                title="Marcar como correcta"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  isCorrect
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-400/50"
                    : "bg-white/10 text-slate-400 hover:bg-white/20"
                }`}
              >
                {letters[idx] ?? idx + 1}
              </button>
              <input
                value={option}
                onChange={(e) => setOption(idx, e.target.value)}
                placeholder={`Opción ${letters[idx] ?? idx + 1}`}
                className={`input-dark flex-1 px-3 py-2 rounded-xl text-sm ${
                  isCorrect ? "ring-1 ring-emerald-400/40" : ""
                }`}
              />
              <button
                onClick={() => removeOption(idx)}
                disabled={item.options.length <= 2}
                className="text-slate-500 hover:text-rose-300 text-lg leading-none px-1 disabled:opacity-30"
                title="Quitar opción"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {item.options.length < 6 && (
        <button
          onClick={addOption}
          className="mt-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
        >
          + Añadir opción
        </button>
      )}
    </div>
  );
}
