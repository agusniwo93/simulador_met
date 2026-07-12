"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import Dialog from "@/components/ui/Dialog";
import { useT } from "@/lib/i18n/context";
import type { Exam, Analytics, ThemeSettings, ExamConfig, SectionKind } from "@/lib/types";
import { DEFAULT_THEME, DEFAULT_EXAM_CONFIG } from "@/lib/types";

type Banner = { kind: "success" | "error"; text: string } | null;

export default function AdminPage() {
  const t = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [confirmExam, setConfirmExam] = useState<Exam | null>(null);
  const [removingExam, setRemovingExam] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const [setsRes, anRes, thRes] = await Promise.all([
      fetch("/api/admin/sets"),
      fetch("/api/admin/analytics"),
      fetch("/api/admin/settings"),
    ]);
    if (setsRes.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (setsRes.ok) setExams((await setsRes.json()).exams);
    if (anRes.ok) setAnalytics((await anRes.json()).analytics);
    if (thRes.ok) setTheme((await thRes.json()).theme);
  }, [router]);

  useEffect(() => {
    (async () => {
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setBanner(null);
    const fd = new FormData();
    fd.append("file", file);
    if (title.trim()) fd.append("title", title.trim());
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setBanner({ kind: "success", text: t("admin.parsedOk", { n: data.parsedCount }) });
        setTitle("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        await loadData();
      } else {
        setBanner({ kind: "error", text: t("admin.parseError") });
      }
    } catch {
      setBanner({ kind: "error", text: t("admin.parseError") });
    } finally {
      setUploading(false);
    }
  };

  const doRemoveExam = async () => {
    if (!confirmExam) return;
    setRemovingExam(true);
    try {
      await fetch(`/api/admin/sets/${confirmExam.id}`, { method: "DELETE" });
      await loadData();
      setConfirmExam(null);
    } finally {
      setRemovingExam(false);
    }
  };

  const createExam = async () => {
    const res = await fetch("/api/admin/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { exam } = (await res.json()) as { exam: Exam };
      router.push(`/admin/exam/${exam.id}`);
    }
  };

  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center text-slate-400">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        {t("common.loading")}
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-slate-100 px-5 pt-20 pb-20 sm:px-6 sm:pt-24">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-veil" />

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              <span className="text-gradient">{t("admin.title")}</span>
            </h1>
            <p className="mt-2 text-slate-400">{t("admin.subtitle")}</p>
          </div>
          <button
            onClick={logout}
            className="glass rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors shrink-0"
          >
            {t("admin.logout")}
          </button>
        </div>

        {/* ====== ANALÍTICAS ====== */}
        <AnalyticsPanel analytics={analytics} t={t} onChange={loadData} />

        {/* ====== TEMA DE COLORES ====== */}
        <ExamConfigPanel t={t} />

        <ThemePanel theme={theme} onSaved={setTheme} />

        {/* ====== UPLOAD ====== */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 sm:p-8 mt-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{t("admin.uploadTitle")}</h2>
              <p className="mt-1 text-slate-400 text-sm">{t("admin.uploadDesc")}</p>
            </div>
            <a
              href="/plantilla-examen.txt"
              download
              className="glass rounded-xl px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-white/10 transition-colors shrink-0"
            >
              ⬇ {t("admin.downloadTemplate")}
            </a>
          </div>
          <form onSubmit={upload} className="mt-5 flex flex-col gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("admin.setTitle")}
              className="input-dark w-full px-4 py-3 rounded-xl"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="glass rounded-xl px-4 py-3 text-sm font-bold cursor-pointer hover:bg-white/10 transition-colors">
                {file ? file.name : t("admin.chooseFile")}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf,.txt,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                disabled={!file || uploading}
                className="btn-primary px-6 py-3 rounded-xl font-black uppercase tracking-tight text-sm"
              >
                {uploading ? t("admin.uploading") : t("admin.upload")}
              </button>
            </div>
            {banner && (
              <p
                className={`text-sm font-semibold rounded-xl px-4 py-3 ${
                  banner.kind === "success"
                    ? "text-emerald-300 bg-emerald-500/10"
                    : "text-rose-300 bg-rose-500/10"
                }`}
              >
                {banner.text}
              </p>
            )}
          </form>
        </motion.section>

        {/* ====== EXÁMENES ====== */}
        <section className="glass rounded-3xl p-6 sm:p-8 mt-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">{t("admin.setsTitle")}</h2>
            <button
              onClick={createExam}
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-tight"
            >
              + {t("admin.createExam")}
            </button>
          </div>
          {exams.length === 0 ? (
            <p className="text-slate-400">{t("admin.noSets")}</p>
          ) : (
            <ul className="space-y-3">
              {exams.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-2xl px-4 py-4 border border-white/5 sm:px-5"
                >
                  <div className="min-w-0">
                    <span className="font-bold break-words">{e.title}</span>
                    <span className="ml-3 text-slate-500 text-sm">
                      {e.sections.length} {t("admin.sections")} · {new Date(e.createdAt).toLocaleDateString()}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {e.sections.map((s, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/5 text-cyan-300/80 px-2 py-0.5"
                        >
                          {s.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => router.push(`/admin/exam/${e.id}/preview`)}
                      className="text-slate-300 hover:text-white font-bold text-sm"
                    >
                      {t("admin.preview")}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/exam/${e.id}`)}
                      className="text-cyan-300 hover:text-cyan-200 font-bold text-sm"
                    >
                      {t("admin.edit")}
                    </button>
                    <button
                      onClick={() => setConfirmExam(e)}
                      className="text-rose-400 hover:text-rose-300 font-bold text-sm"
                    >
                      {t("admin.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Confirmar borrado de examen (modal propio, no confirm del navegador) */}
      <Dialog
        open={!!confirmExam}
        onClose={() => !removingExam && setConfirmExam(null)}
        icon="🗑️"
        tone="danger"
        loading={removingExam}
        title={t("admin.confirmDeleteExamTitle")}
        description={confirmExam ? t("admin.confirmDeleteExam", { title: confirmExam.title }) : ""}
        confirmLabel={t("admin.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={doRemoveExam}
      />
    </main>
  );
}

// ===================== CONFIGURACIÓN DEL EXAMEN =====================

const SECTION_KINDS: { kind: SectionKind; label: string }[] = [
  { kind: "writing", label: "Writing" },
  { kind: "listening", label: "Listening" },
  { kind: "grammar", label: "Grammar" },
  { kind: "reading", label: "Reading" },
  { kind: "speaking", label: "Speaking" },
];

function ExamConfigPanel({ t }: { t: (k: string, p?: Record<string, string | number>) => string }) {
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_EXAM_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/exam-config");
      if (res.ok) setConfig((await res.json()).config);
      setLoaded(true);
    })();
  }, []);

  const setMinutes = (kind: SectionKind, value: number) => {
    setConfig((c) => ({ ...c, sectionMinutes: { ...c.sectionMinutes, [kind]: value } }));
    setSaved(false);
  };
  const setReplay = (v: boolean) => {
    setConfig((c) => ({ ...c, allowListeningReplay: v }));
    setSaved(false);
  };
  const setShuffle = (v: boolean) => {
    setConfig((c) => ({ ...c, shuffle: v }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/exam-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setConfig((await res.json()).config);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-6 sm:p-8 mt-6"
    >
      <h2 className="text-xl font-black">{t("admin.examCfgTitle")}</h2>
      <p className="mt-1 text-sm text-slate-400">{t("admin.examCfgDesc")}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_KINDS.map(({ kind, label }) => (
          <label
            key={kind}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <span className="text-sm font-semibold text-slate-200">{label}</span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={300}
                value={config.sectionMinutes[kind]}
                onChange={(e) => setMinutes(kind, Number(e.target.value))}
                className="input-dark w-20 rounded-lg px-3 py-2 text-right text-sm"
              />
              <span className="text-xs text-slate-500">min</span>
            </span>
          </label>
        ))}
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-sm font-semibold text-slate-200">{t("admin.allowReplay")}</span>
        <button
          type="button"
          onClick={() => setReplay(!config.allowListeningReplay)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            config.allowListeningReplay ? "bg-cyan-500" : "bg-white/15"
          }`}
          aria-pressed={config.allowListeningReplay}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              config.allowListeningReplay ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </label>

      <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-200">{t("admin.shuffleExams")}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{t("admin.shuffleExamsDesc")}</span>
        </span>
        <button
          type="button"
          onClick={() => setShuffle(!config.shuffle)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            config.shuffle ? "bg-cyan-500" : "bg-white/15"
          }`}
          aria-pressed={config.shuffle}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              config.shuffle ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !loaded}
          className="btn-primary px-6 py-3 rounded-xl font-black uppercase tracking-tight text-sm disabled:opacity-50"
        >
          {saving ? t("admin.saving") : t("admin.saveConfig")}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-300">✓ {t("admin.saved")}</span>}
      </div>
      <p className="mt-3 text-xs text-slate-500">{t("admin.examCfgNote")}</p>
    </motion.section>
  );
}

// ===================== TEMA DE COLORES =====================

const THEME_VARS: Record<keyof ThemeSettings, string> = {
  bg: "--bg",
  brandFrom: "--brand-from",
  brandTo: "--brand-to",
  gradFrom: "--grad-from",
  gradVia: "--grad-via",
  gradTo: "--grad-to",
  accent: "--accent",
};

const THEME_FIELDS: { key: keyof ThemeSettings; label: string }[] = [
  { key: "bg", label: "Fondo de la página" },
  { key: "brandFrom", label: "Botón · inicio" },
  { key: "brandTo", label: "Botón · fin" },
  { key: "accent", label: "Acento (focus)" },
  { key: "gradFrom", label: "Título · color 1" },
  { key: "gradVia", label: "Título · color 2" },
  { key: "gradTo", label: "Título · color 3" },
];

function isLightBg(hex: string): boolean {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return false;
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(full.slice(0, 2), 16));
  const g = toLin(parseInt(full.slice(2, 4), 16));
  const b = toLin(parseInt(full.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

function applyThemeLive(theme: ThemeSettings) {
  const root = document.documentElement;
  (Object.keys(THEME_VARS) as (keyof ThemeSettings)[]).forEach((k) => {
    root.style.setProperty(THEME_VARS[k], theme[k]);
  });
  // Voltea el tema claro/oscuro en vivo según la luminancia del fondo.
  root.dataset.theme = isLightBg(theme.bg) ? "light" : "dark";
}

function ThemePanel({
  theme,
  onSaved,
}: {
  theme: ThemeSettings | null;
  onSaved: (t: ThemeSettings) => void;
}) {
  const [draft, setDraft] = useState<ThemeSettings>(theme ?? DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (theme) setDraft(theme);
  }, [theme]);

  const set = (key: keyof ThemeSettings, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setSaved(false);
    applyThemeLive(next); // vista previa en vivo
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const data = (await res.json()) as { theme: ThemeSettings };
        onSaved(data.theme);
        applyThemeLive(data.theme);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(DEFAULT_THEME);
    applyThemeLive(DEFAULT_THEME);
    setSaved(false);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-6 sm:p-8 mt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Colores de la página</h2>
          <p className="mt-1 text-sm text-slate-400">
            Personaliza los colores del sitio. La vista previa se aplica al instante.
          </p>
        </div>
        <button
          onClick={reset}
          className="glass rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"
        >
          Restaurar por defecto
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_FIELDS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <input
              type="color"
              value={draft[key]}
              onChange={(e) => set(key, e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-200">{label}</span>
              <span className="block text-xs font-mono uppercase text-slate-500">{draft[key]}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary px-6 py-3 rounded-xl font-black uppercase tracking-tight text-sm disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar colores"}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-300">✓ Colores guardados</span>}
      </div>
    </motion.section>
  );
}

// ===================== ANALÍTICAS =====================

function AnalyticsPanel({
  analytics,
  t,
  onChange,
}: {
  analytics: Analytics | null;
  t: (k: string, p?: Record<string, string | number>) => string;
  onChange: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [deletingDel, setDeletingDel] = useState(false);

  if (!analytics) {
    return (
      <section className="glass rounded-3xl p-6 sm:p-8 mt-8">
        <h2 className="text-xl font-black mb-2">{t("admin.analyticsTitle")}</h2>
        <p className="text-slate-400">{t("admin.noData")}</p>
      </section>
    );
  }

  const { totalExams, averageScore, scoreBuckets, sectionAverages, recent, revenue } = analytics;
  const distTotal = scoreBuckets.excellent + scoreBuckets.good + scoreBuckets.needsWork || 1;

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-rose-400";

  const money = (n: number) => `${revenue.currency} ${n.toLocaleString()}`;
  const maxDay = Math.max(1, ...revenue.byDay.map((d) => d.amount));

  const doDel = async () => {
    if (!confirmDel) return;
    setDeletingDel(true);
    try {
      await fetch(`/api/admin/results/${confirmDel.id}`, { method: "DELETE" });
      onChange();
      setConfirmDel(null);
    } finally {
      setDeletingDel(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-6 sm:p-8 mt-8"
    >
      <h2 className="text-xl font-black mb-6">{t("admin.analyticsTitle")}</h2>

      {/* ===== INGRESOS ===== */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t("admin.revenue")}
        </h3>
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <div className="bg-emerald-500/10 rounded-2xl p-4 sm:p-6 border border-emerald-400/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
              {t("admin.revenueTotal")}
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-emerald-400">{money(revenue.total)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("admin.revenueMonth")}
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-slate-100">{money(revenue.month)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-2xl p-4 sm:p-6 border border-white/5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("admin.revenueToday")}
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-slate-100">{money(revenue.today)}</div>
          </div>
        </div>
        {/* Barras: ingresos por día (últimos 14) */}
        <div className="mt-5 flex h-24 items-end gap-1.5">
          {revenue.byDay.map((d) => (
            <div
              key={d.date}
              className="group relative flex-1 rounded-t bg-gradient-to-t from-cyan-500 to-indigo-500"
              style={{ height: `${Math.max(3, (d.amount / maxDay) * 100)}%` }}
              title={`${d.date}: ${money(d.amount)} (${d.count})`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {t("admin.revenueLast14")} · {revenue.count} {t("admin.payments")}
        </p>
      </div>

      {totalExams === 0 ? (
        <p className="text-slate-400">{t("admin.noExamsYet")}</p>
      ) : (
        <>
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white/[0.03] rounded-2xl p-5 sm:p-6 border border-white/5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("admin.totalExams")}
          </span>
          <div className="mt-1 text-4xl font-black text-cyan-400">{totalExams}</div>
        </div>
        <div className="bg-white/[0.03] rounded-2xl p-5 sm:p-6 border border-white/5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("admin.avgScore")}
          </span>
          <div className={`mt-1 text-4xl font-black ${scoreColor(averageScore)}`}>{averageScore}/100</div>
        </div>
      </div>

      {/* Distribución */}
      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t("admin.distribution")}
        </h3>
        <div className="space-y-2">
          {([
            ["excellent", scoreBuckets.excellent, "bg-emerald-400", t("results.excellent")],
            ["good", scoreBuckets.good, "bg-amber-400", t("results.good")],
            ["needsWork", scoreBuckets.needsWork, "bg-rose-400", t("results.needsWork")],
          ] as const).map(([key, val, color, label]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-sm text-slate-300">{label}</span>
              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${(val / distTotal) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-bold text-slate-300">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Promedio por sección */}
      {sectionAverages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            {t("admin.sectionPerformance")}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sectionAverages.map((sa) => (
              <div key={sa.kind} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {sa.title}
                </span>
                <div className={`mt-1 text-2xl font-black ${scoreColor(sa.averageScore)}`}>
                  {sa.averageScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exámenes recientes */}
      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t("admin.recentExams")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-2 pr-4">{t("admin.student")}</th>
                <th className="py-2 pr-4">{t("admin.score")}</th>
                <th className="py-2 pr-4">{t("admin.date")}</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-4 font-semibold text-slate-200">{r.studentName}</td>
                  <td className={`py-2.5 pr-4 font-black ${scoreColor(r.overallScore)}`}>{r.overallScore}/100</td>
                  <td className="py-2.5 pr-4 text-slate-400">{new Date(r.submittedAt).toLocaleString()}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <a
                      href={`/results/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-cyan-300 hover:text-cyan-200"
                    >
                      {t("admin.viewResult")}
                    </a>
                    <button
                      onClick={() => setConfirmDel({ id: r.id, name: r.studentName })}
                      className="ml-3 font-bold text-rose-400 hover:text-rose-300"
                    >
                      {t("admin.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Confirmar borrado de alumno (modal propio) */}
      <Dialog
        open={!!confirmDel}
        onClose={() => !deletingDel && setConfirmDel(null)}
        icon="🗑️"
        tone="danger"
        loading={deletingDel}
        title={t("admin.confirmDeleteStudentTitle")}
        description={confirmDel ? t("admin.confirmDeleteStudent", { name: confirmDel.name }) : ""}
        confirmLabel={t("admin.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={doDel}
      />
    </motion.section>
  );
}
