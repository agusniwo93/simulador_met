"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import { useT } from "@/lib/i18n/context";

export default function ExamIntroPage() {
  const t = useT();
  const rules = [t("exam.rule1"), t("exam.rule2"), t("exam.rule3")];

  return (
    <main className="relative min-h-screen flex items-center justify-center px-5 py-20 text-slate-100 sm:px-6 sm:py-24">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-[#020617]/50" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass glow-ring rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 md:p-14 w-full max-w-3xl"
      >
        <span className="text-cyan-400 font-black uppercase tracking-[0.2em] text-xs">
          {t("exam.sectionTitle")}
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">{t("exam.introTitle")}</h1>

        <div className="mt-8 bg-white/[0.03] border border-white/5 rounded-3xl p-5 sm:p-8">
          <p className="text-cyan-300 font-black uppercase tracking-tight text-sm mb-5">
            {t("exam.rulesTitle")}
          </p>
          <ul className="space-y-4">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-3 text-slate-200 text-base sm:text-lg">
                <span className="mt-2 w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              {t("exam.statusLabel")}
            </span>
            <span className="text-emerald-400 font-black text-sm uppercase tracking-tight">
              ● {t("exam.ready")}
            </span>
          </div>
          <Link
            href="/exam/run"
            className="btn-primary px-8 py-4 sm:px-10 sm:py-5 rounded-2xl font-black text-base sm:text-lg uppercase tracking-tight flex items-center justify-center gap-3"
          >
            {t("exam.startNow")} <span className="text-2xl">→</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
