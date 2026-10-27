// Utilidades para servir y guardar los archivos subidos (imágenes y grabaciones).

// Extensión con la que se guarda cada tipo de audio.
export const AUDIO_EXT: Record<string, string> = {
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mp4": ".mp4",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
};

// Tipo real de un audio según sus primeros bytes. El tipo que declara el
// navegador al grabar no siempre coincide con el contenido (algunos iPhone
// graban MP4 sin decirlo), y un tipo equivocado impide reproducirlo.
export function sniffAudioType(head: Uint8Array): string | undefined {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return "audio/webm";
  }
  if (head.length >= 8 && ascii(4, 8) === "ftyp") return "audio/mp4";
  if (head.length >= 4 && ascii(0, 4) === "OggS") return "audio/ogg";
  if (head.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio/wav";
  if (head.length >= 3 && ascii(0, 3) === "ID3") return "audio/mpeg";
  if (head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return undefined;
}

// Interpreta una cabecera `Range: bytes=...` para un archivo de `size` bytes.
// Devuelve el tramo pedido, "unsatisfiable" si queda fuera del archivo, o null
// si no hay cabecera o no se entiende (entonces se envía el archivo completo).
// Safari exige que el servidor responda por tramos para reproducir audio.
export function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null; // varios tramos u otro formato
  let start: number;
  let end: number;
  if (m[1] === "") {
    // "bytes=-N": los últimos N bytes.
    const n = Number(m[2]);
    if (n === 0) return "unsatisfiable";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
