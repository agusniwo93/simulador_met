import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import Navbar from "@/components/layout/Navbar";
import { getTheme } from "@/lib/db";
import type { Lang } from "@/lib/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://metsimulatorenglishlearning.com"),
  title: "ExamBridge MET — Simulador del Michigan English Test",
  description:
    "Practica el examen completo del MET — Writing, Listening, Grammar, Reading y Speaking — con corrección automática y retroalimentación en tiempo real.",
  openGraph: {
    title: "ExamBridge MET — Simulador del Michigan English Test",
    description:
      "Practica el examen completo del MET — Writing, Listening, Grammar, Reading y Speaking — con corrección automática y retroalimentación en tiempo real.",
    url: "https://metsimulatorenglishlearning.com",
    siteName: "ExamBridge MET",
    locale: "es_PE",
    type: "website",
  },
};

// Luminancia relativa (sRGB) del color de fondo para decidir tema claro/oscuro.
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
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.5;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const initialLang: Lang = store.get("met_lang")?.value === "en" ? "en" : "es";
  const theme = getTheme();
  const mode = isLightBg(theme.bg) ? "light" : "dark";

  const themeCss = `:root{--bg:${theme.bg};--brand-from:${theme.brandFrom};--brand-to:${theme.brandTo};--grad-from:${theme.gradFrom};--grad-via:${theme.gradVia};--grad-to:${theme.gradTo};--accent:${theme.accent};}`;

  return (
    <html lang={initialLang} data-theme={mode}>
      <head>
        {/* Tema de colores editable desde el admin (SSR, sin parpadeo) */}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <I18nProvider initialLang={initialLang}>
          <Navbar />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
