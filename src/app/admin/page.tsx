"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Background3D from "@/components/Background3D";
import { useT } from "@/lib/i18n/context";
import { TEMPLATE_GUIDE } from "@/lib/template-guide";
import type { QuestionSet, Analytics } from "@/lib/types";

type Banner = { kind: "success" | "error"; text: string } | null;

const LS_CODE = "met_admin_code";

export default function AdminPage() {
  const t = useT();

  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [gateError, setGateError] = useState(false);
  const [checking, setChecking] = useState(true);

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const adminFetch = useCallback(
    (url: string, c: string, opts: RequestInit = {}) =>
      fetch(url, { ...opts, headers: { ...(opts.headers || {}), "x-admin-code": c } }),
    []
  );

  const loadData = useCallback(
    async (c: string) => {
      const [setsRes, anRes] = await Promise.all([
        adminFetch("/api/admin/sets", c),
        adminFetch("/api/admin/analytics", c),
      ]);
      if (setsRes.ok) setSets((await setsRes.json()).sets);
      if (anRes.ok) setAnalytics((await anRes.json()).analytics);
    },
    [adminFetch]
  );

  // Validar código guardado al cargar.
  useEffect(() => {
    const stored = localStorage.getItem(LS_CODE);
    if (!stored) {
      setChecking(false);
      return;
    }
    (async () => {
      const res = await adminFetch("/api/admin/sets", stored);
      if (res.ok) {
        setCode(stored);
        await loadData(stored);
      } else {
        localStorage.removeItem(LS_CODE);
      }
      setChecking(false);
    })();
  }, [adminFetch, loadData]);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(false);
    const res = await adminFetch("/api/admin/sets", codeInput);
    if (res.ok) {
      localStorage.setItem(LS_CODE, codeInput);
      setCode(codeInput);
      await loadData(codeInput);
    } else {
      setGateError(true);
    }
  };

  const lock = () => {
    localStorage.removeItem(LS_CODE);
    setCode(null);
    setSets([]);
    setAnalytics(null);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !code) return;
    setUploading(true);
    setBanner(null);
    const fd = new FormData();
    fd.append("file", file);
    if (title.trim()) fd.append("title", title.trim());
    try {
      const res = await adminFetch("/api/admin/upload", code, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setBanner({ kind: "success", text: t("admin.parsedOk", { n: data.parsedCount }) });
        setTitle("");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        await loadData(code);
      } else {
        setBanner({ kind: "error", text: t("admin.parseError") });
      }
    } catch {
      setBanner({ kind: "error", text: t("admin.parseError") });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!code) return;
    await adminFetch(`/api/admin/sets/${id}`, code, { method: "DELETE" });
    await loadData(code);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_GUIDE], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "met-template.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Compuerta de código ----
  if (checking) {
    return (
      <main className="relative min-h-screen flex items-center justify-center text-slate-400">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        {t("common.loading")}
      </main>
    );
  }

  if (!code) {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-6 py-24">
        <Background3D variant="deep" className="fixed inset-0 -z-10" />
        <div className="fixed inset-0 -z-10 bg-[#020617]/50" />
        <motion.form
          onSubmit={submitCode}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass glow-ring rounded-[2.5rem] p-10 w-full max-w-md"
        >
          <h1 className="text-3xl font-black tracking-tight text-slate-100">{t("admin.gateTitle")}</h1>
          <p className="mt-2 text-slate-400">{t("admin.gateSubtitle")}</p>
          <input
            type="password"
            autoFocus
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={t("admin.gatePlaceholder")}
            className="input-dark mt-6 w-full px-5 py-4 rounded-2xl font-medium"
          />
          {gateError && (
            <p className="mt-3 text-rose-400 text-sm font-semibold bg-rose-500/10 rounded-xl px-4 py-3">
              {t("admin.gateError")}
            </p>
          )}
          <button type="submit" className="btn-primary mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-tight">
            {t("admin.gateEnter")}
          </button>
        </motion.form>
      </main>
    );
  }

  // ---- Panel ----
  return (
    <main className="relative min-h-screen text-slate-100 px-5 pt-20 pb-20 sm:px-6 sm:pt-24">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-[#020617]/60" />

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              <span className="text-gradient">{t("admin.title")}</span>
            </h1>
            <p className="mt-2 text-slate-400">{t("admin.subtitle")}</p>
          </div>
          <button
            onClick={lock}
            className="glass rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors shrink-0"
          >
            {t("admin.logout")}
          </button>
        </div>

        {/* ====== ANALÍTICAS ====== */}
        <AnalyticsPanel analytics={analytics} t={t} />

        {/* ====== UPLOAD ====== */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 sm:p-8 mt-6"
        >
          <h2 className="text-xl font-black">{t("admin.uploadTitle")}</h2>
          <p className="mt-1 text-slate-400 text-sm">{t("admin.uploadDesc")}</p>
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
                  accept="application/pdf,.pdf"
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

        {/* ====== TEMPLATE ====== */}
        <section className="glass rounded-3xl p-6 sm:p-8 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <h2 className="text-xl font-black">{t("admin.templateTitle")}</h2>
            <button
              onClick={downloadTemplate}
              className="glass rounded-xl px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-white/10 transition-colors"
            >
              {t("admin.downloadTemplate")}
            </button>
          </div>
          <pre className="mt-4 bg-black/30 border border-white/10 rounded-2xl p-5 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed">
            {TEMPLATE_GUIDE}
          </pre>
        </section>

        {/* ====== SETS ====== */}
        <section className="glass rounded-3xl p-6 sm:p-8 mt-6">
          <h2 className="text-xl font-black mb-5">{t("admin.setsTitle")}</h2>
          {sets.length === 0 ? (
            <p className="text-slate-400">{t("admin.noSets")}</p>
          ) : (
            <ul className="space-y-3">
              {sets.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-2xl px-4 py-4 border border-white/5 sm:px-5"
                >
                  <div className="min-w-0">
                    <span className="font-bold break-words">{s.title}</span>
                    <span className="ml-3 text-slate-500 text-sm">
                      {s.tasks.length} {t("admin.tasks")} · {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    className="shrink-0 text-rose-400 hover:text-rose-300 font-bold text-sm"
                  >
                    {t("admin.delete")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

// ===================== ANALÍTICAS =====================

function AnalyticsPanel({
  analytics,
  t,
}: {
  analytics: Analytics | null;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  if (!analytics || analytics.totalExams === 0) {
    return (
      <section className="glass rounded-3xl p-6 sm:p-8 mt-8">
        <h2 className="text-xl font-black mb-2">{t("admin.analyticsTitle")}</h2>
        <p className="text-slate-400">{t("admin.noData")}</p>
      </section>
    );
  }

  const { totalExams, averageScore, scoreBuckets, issueTotals, taskAverages, recent } = analytics;
  const distTotal = scoreBuckets.excellent + scoreBuckets.good + scoreBuckets.needsWork || 1;
  // Tipografía se agrupa dentro de "Estilo" (igual que en la página de resultados).
  const issueEntries: [string, number][] = [
    ["grammar", issueTotals.grammar],
    ["spelling", issueTotals.spelling],
    ["style", issueTotals.style + issueTotals.typography],
  ];
  const issueMax = Math.max(1, ...issueEntries.map(([, v]) => v));
  const issueLabel: Record<string, string> = {
    grammar: t("results.grammar"),
    spelling: t("results.spelling"),
    style: t("results.style"),
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-rose-400";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-6 sm:p-8 mt-8"
    >
      <h2 className="text-xl font-black mb-6">{t("admin.analyticsTitle")}</h2>

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

      {/* Errores comunes */}
      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t("admin.commonIssues")}
        </h3>
        <div className="space-y-2">
          {issueEntries.map(([cat, val]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="w-24 text-sm text-slate-300">{issueLabel[cat]}</span>
              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${(val / issueMax) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-bold text-slate-300">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rendimiento por tarea */}
      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t("admin.taskPerformance")}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {taskAverages.map((ta) => (
            <div key={ta.taskId} className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("exam.task")} {ta.taskId}
              </span>
              <div className={`mt-1 text-2xl font-black ${scoreColor(ta.averageScore)}`}>
                {ta.averageScore}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <th className="py-2">{t("admin.date")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-4 font-semibold text-slate-200">{r.studentName}</td>
                  <td className={`py-2.5 pr-4 font-black ${scoreColor(r.overallScore)}`}>{r.overallScore}/100</td>
                  <td className="py-2.5 text-slate-400">{new Date(r.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
