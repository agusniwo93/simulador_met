"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import { useT } from "@/lib/i18n/context";

export default function AdminLoginPage() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(t(data.error === "rateLimited" ? "admin.rateLimited" : "admin.gateError"));
    } catch {
      setError(t("admin.gateError"));
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-24">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-[#020617]/50" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass glow-ring rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-10 w-full max-w-md text-slate-100"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 text-2xl ring-1 ring-white/10">
          🔒
        </div>
        <h1 className="text-3xl font-black tracking-tight">{t("admin.gateTitle")}</h1>
        <p className="mt-2 text-slate-400">{t("admin.gateSubtitle")}</p>
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("admin.gatePlaceholder")}
          className="input-dark mt-6 w-full px-5 py-4 rounded-2xl font-medium"
        />
        {error && (
          <p className="mt-3 text-rose-400 text-sm font-semibold bg-rose-500/10 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || code.length === 0}
          className="btn-primary mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-tight disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("admin.gateEnter")}
        </button>
      </motion.form>
    </main>
  );
}
