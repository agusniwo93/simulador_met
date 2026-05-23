import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el indicador flotante de desarrollo de Next.js (la "N" abajo a la izquierda).
  devIndicators: false,
  // pdf-parse (pdfjs) no debe ser empaquetado por webpack; se carga en runtime.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
