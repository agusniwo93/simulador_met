"use client";

import { useI18n } from "@/lib/i18n/context";

export default function LanguageToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n();
  const base = light ? "text-white/70" : "text-slate-500";
  const active = light ? "bg-white/20 text-white" : "bg-slate-900 text-white";

  return (
    <div
      className={`inline-flex items-center rounded-full p-1 text-xs font-bold ${
        light ? "bg-white/10 ring-1 ring-white/15" : "bg-slate-100 ring-1 ring-slate-200"
      }`}
      role="group"
      aria-label="Language selector"
    >
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-3 py-1 rounded-full uppercase tracking-wider transition-all ${
            lang === l ? active : `${base} hover:opacity-100`
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
