"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Background3D from "@/components/visual/Background3D";
import Dialog from "@/components/ui/Dialog";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
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

  // Cierra el modal reseteando TODO el estado del pago. Es clave: si se cierra
  // (p. ej. clic fuera) dejando el formToken, al reabrir se muestra la caja de
  // tarjeta con el div vacío y el efecto no se re-ejecuta (mismo token) → vacío.
  const closePay = () => {
    if (paying) return;
    setPayOpen(false);
    setFormToken(null);
    setPublicKey(null);
    setPayError(false);
  };

  useEffect(() => {
    if (!formToken || !publicKey) return;
    let cancelled = false;

    const w = window as unknown as {
      KR?: {
        removeForms: () => Promise<unknown>;
        setFormToken: (t: string) => Promise<unknown>;
      };
    };

    // Un contenedor con la clase `.kr-embedded` es auto-renderizado por Krypton
    // en cuanto se fija el token con setFormToken(). Por eso NO llamamos a
    // renderElements() (eso sería un segundo render → error CLIENT_725
    // "un formulario ya está renderizado"). Camino único: limpiar el formulario
    // previo (por si se volvió atrás) → fijar el nuevo token (auto-renderiza).
    const render = () => {
      const KR = w.KR;
      if (!KR || cancelled) return;
      Promise.resolve(KR.removeForms())
        .catch(() => {})
        .then(() => KR.setFormToken(formToken))
        .catch((e) => console.error("IziPay render:", e));
    };

    if (w.KR) {
      render();
    } else {
      // Cargar la librería de Krypton una sola vez.
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic-reset.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js";
      script.setAttribute("kr-public-key", publicKey);
      script.setAttribute("kr-post-url-success", "/api/pay/confirm");
      script.onload = () => {
        // KR puede tardar un instante en estar listo tras cargar el script.
        const waitForKR = () => {
          if (cancelled) return;
          if (w.KR) render();
          else setTimeout(waitForKR, 60);
        };
        waitForKR();
      };
      document.head.appendChild(script);

      const themeScript = document.createElement("script");
      themeScript.src = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic.js";
      document.head.appendChild(themeScript);
    }

    // Al cerrar/volver atrás o cambiar de token, limpiamos el formulario de KR
    // para no dejar estado colgando (que dispararía el "ya está renderizado").
    return () => {
      cancelled = true;
      w.KR?.removeForms().catch(() => {});
    };
  }, [formToken, publicKey]);

  const features = [
    { title: t("landing.feature1Title"), desc: t("landing.feature1Desc"), icon: "◈" },
    { title: t("landing.feature2Title"), desc: t("landing.feature2Desc"), icon: "✓" },
    { title: t("landing.feature3Title"), desc: t("landing.feature3Desc"), icon: "↗" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <WhatsAppButton />
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

      <Dialog
        open={payOpen}
        onClose={closePay}
        icon="🎓"
        title={t("pay.title")}
        description={t("pay.subtitle")}
        size={formToken ? "lg" : "md"}
      >
        {!formToken ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("pay.oneTime")}
                </span>
                <span className="text-3xl font-black text-gradient sm:text-4xl">{t("pay.price")}</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {[t("pay.f1"), t("pay.f2"), t("pay.f3")].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ background: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
                      aria-hidden
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {payError && (
              <p className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-400">
                {t("pay.failed")}
              </p>
            )}

            <button
              onClick={startPayment}
              disabled={paying}
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-black uppercase tracking-tight disabled:opacity-50"
            >
              {paying ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  {t("pay.processing")}
                </>
              ) : (
                t("pay.payButton")
              )}
            </button>
            <button
              onClick={closePay}
              disabled={paying}
              className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-slate-200 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <span aria-hidden>🔒</span> {t("pay.demoNote")}
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] px-4 py-3.5">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <span aria-hidden>💳</span> {t("pay.cardDetails")}
              </span>
              <span className="text-xl font-black text-gradient">{t("pay.price")}</span>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-cyan-500/50 to-indigo-500/50 p-px shadow-2xl">
              <div className="rounded-[1.4rem] bg-white p-4 sm:p-5">
                <div className="kr-embedded"></div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setFormToken(null);
                  setPublicKey(null);
                }}
                className="rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                ← {t("pay.back")}
              </button>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span aria-hidden>🔒</span> {t("pay.demoNote")}
              </span>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
