"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import Dialog from "@/components/ui/Dialog";
import { useT } from "@/lib/i18n/context";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

interface Props {
  hasAccess: boolean;
  autoPay?: boolean;
  payFailed?: boolean;
}

export default function LandingClient({ hasAccess, autoPay = false, payFailed = false }: Props) {
  const t = useT();
  const router = useRouter();
  
  const [payOpen, setPayOpen] = useState(() => !hasAccess && (autoPay || payFailed));
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(payFailed);

  const [formToken, setFormToken] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const onStart = () => {
    if (hasAccess) router.push("/exam");
    else setPayOpen(true);
  };

  const startPayment = async () => {
    setPaying(true);
    setPayError(false);
    try {
      const res = await fetch("/api/pay/create", { method: "POST" });
      const data = await res.json();
      
      if (res.ok && data.formToken && data.publicKey) {
        setFormToken(data.formToken);
        setPublicKey(data.publicKey);
        setPaying(false);
        return;
      }
      setPayError(true);
      setPaying(false);
    } catch {
      setPayError(true);
      setPaying(false);
    }
  };

  useEffect(() => {
    if (formToken && publicKey) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic-reset.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js";
      script.setAttribute("kr-public-key", publicKey);
      script.setAttribute("kr-post-url-success", "/pago-exitoso");
      document.head.appendChild(script);

      const themeScript = document.createElement("script");
      themeScript.src = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic.js";
      document.head.appendChild(themeScript);
    }
  }, [formToken, publicKey]);

  const features = [
    { title: t("landing.feature1Title"), desc: t("landing.feature1Desc"), icon: "◈" },
    { title: t("landing.feature2Title"), desc: t("landing.feature2Desc"), icon: "✓" },
    { title: t("landing.feature3Title"), desc: t("landing.feature3Desc"), icon: "↗" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <Background3D variant="deep" className="fixed inset-0 -z-10" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-[#020617]/40 to-[#020617]" />

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center sm:pt-24 sm:pb-20">
        <motion.span
          custom={0}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="inline-block glass rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300"
        >
          {t("landing.badge")}
        </motion.span>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-8 text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-[0.95]"
        >
          {t("landing.heroTitle")} <span className="text-gradient">{t("landing.heroHighlight")}</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed"
        >
          {t("landing.heroSubtitle")}
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <button
            onClick={onStart}
            className="btn-primary px-8 py-4 sm:px-10 sm:py-5 rounded-2xl font-black text-base sm:text-lg uppercase tracking-tight inline-flex items-center gap-3"
          >
            {t("landing.ctaPrimary")} <span className="text-2xl">→</span>
          </button>
          {!hasAccess && (
            <span className="text-sm text-slate-500 font-semibold">
              {t("pay.oneTime")} · {t("pay.price")}
            </span>
          )}
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 sm:pb-28 grid md:grid-cols-3 gap-5 sm:gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            custom={i + 4}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="glass rounded-3xl p-6 sm:p-8 hover:bg-white/[0.07] transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 flex items-center justify-center text-cyan-300 text-2xl font-black mb-5">
              {f.icon}
            </div>
            <h3 className="text-xl font-black mb-2">{f.title}</h3>
            <p className="text-slate-400 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
          {t("landing.footer")}
        </p>
      </footer>

      <Dialog open={payOpen} onClose={() => !paying && setPayOpen(false)} icon="🎓" title={t("pay.title")} description={t("pay.subtitle")}>
        {!formToken ? (
          <>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("pay.oneTime")}
                </span>
                <span className="text-3xl font-black text-gradient">{t("pay.price")}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {[t("pay.f1"), t("pay.f2"), t("pay.f3")].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-cyan-400 font-black">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {payError && (
              <p className="mt-4 text-rose-400 text-sm font-semibold bg-rose-500/10 rounded-xl px-4 py-3">
                {t("pay.failed")}
              </p>
            )}

            <button
              onClick={startPayment}
              disabled={paying}
              className="btn-primary mt-5 w-full py-4 rounded-2xl font-black uppercase tracking-tight flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {paying ? "Conectando con IziPay..." : "PAGAR CON IZIPAY"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">Pago 100% seguro.</p>
          </>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center bg-white rounded-xl p-4 min-h-[300px]">
             <div className="kr-embedded" {...{ "kr-form-token": formToken }}></div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
