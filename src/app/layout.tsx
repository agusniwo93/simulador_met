import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import Navbar from "@/components/layout/Navbar";
import type { Lang } from "@/lib/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ExamBridge MET — Writing Simulator",
  description:
    "Simulador de Writing del Michigan English Test (MET) con corrección automática y retroalimentación personalizada.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const initialLang: Lang = store.get("met_lang")?.value === "en" ? "en" : "es";

  return (
    <html lang={initialLang}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#020617]`}>
        <I18nProvider initialLang={initialLang}>
          <Navbar />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
