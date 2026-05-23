"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import LanguageToggle from "./LanguageToggle";

export default function Navbar() {
  const t = useT();
  const pathname = usePathname();

  // El examen a pantalla completa tiene su propia cabecera.
  if (pathname?.startsWith("/exam/run")) return null;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#020617]/70 border-b border-white/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2 text-white">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="font-black italic text-lg sm:text-xl tracking-tighter truncate">
            ExamBridge <span className="font-light not-italic text-cyan-400">MET</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 text-sm font-semibold">
          <Link
            href="/exam"
            className="px-2 py-2 sm:px-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            {t("nav.exam")}
          </Link>
          <Link
            href="/admin"
            className="px-2 py-2 sm:px-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            {t("nav.admin")}
          </Link>
          <div className="ml-1 sm:ml-2">
            <LanguageToggle light />
          </div>
        </div>
      </nav>
    </header>
  );
}
