"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  // Botón de confirmación (si se omite, no se muestra)
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  icon?: string;
}

// Cuadro de diálogo reutilizable (reemplaza alert/confirm del navegador).
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  cancelLabel,
  tone = "default",
  loading = false,
  icon,
}: DialogProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, loading]);

  const confirmClasses =
    tone === "danger"
      ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.7)]"
      : "btn-primary";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          onClick={() => !loading && onClose()}
        >
          <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="glass glow-ring relative w-full max-w-md rounded-3xl p-6 text-slate-100 sm:p-8"
          >
            {icon && (
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 text-2xl ring-1 ring-white/10">
                {icon}
              </div>
            )}
            {title && <h2 className="text-2xl font-black tracking-tight">{title}</h2>}
            {description && <p className="mt-2 text-slate-400 leading-relaxed">{description}</p>}

            {children && <div className="mt-5">{children}</div>}

            {(confirmLabel || cancelLabel) && (
              <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                {cancelLabel && (
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="glass rounded-xl px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {cancelLabel}
                  </button>
                )}
                {confirmLabel && (
                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`rounded-xl px-6 py-3 text-sm font-black uppercase tracking-tight transition disabled:opacity-50 ${confirmClasses}`}
                  >
                    {confirmLabel}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
