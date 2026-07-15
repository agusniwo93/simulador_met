import type { Section } from "../types";

// PRNG determinista a partir de una cadena (mulberry32).
export function seededRandom(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nº de distractores a generar (para llegar a 4 opciones) y tamaño de la ventana
// de candidatos "de longitud parecida" entre los que se elige.
const DISTRACTORS = 3;
const WINDOW = 9;

// Para el Listening las preguntas vienen con solo la respuesta correcta. Se
// generan 3 distractores tomando respuestas de OTRAS preguntas de la misma
// sección, eligiendo las de LONGITUD parecida a la correcta para que la correcta
// no se delate por ser mucho más corta o más larga (Parte 1 vs Parte 2/3).
export function expandListeningDistractors(sections: Section[]): Section[] {
  return sections.map((section) => {
    if (section.kind !== "listening" || !section.items) return section;
    const pool = Array.from(new Set(section.items.map((it) => it.options[0]).filter(Boolean)));
    const items = section.items.map((item) => {
      if (item.options.length >= 4) return item;
      const correct = item.options[0];
      const rng = seededRandom(item.id + correct);
      const candidates = pool.filter((a) => a !== correct);

      // Ordena por cercanía de longitud (desempate aleatorio determinista) y
      // baraja una ventana de los más cercanos → distractores de largo similar
      // pero con variedad entre exámenes.
      const scored = candidates
        .map((c) => ({ c, d: Math.abs(c.length - correct.length), r: rng() }))
        .sort((a, b) => a.d - b.d || a.r - b.r);
      const window = scored.slice(0, Math.min(scored.length, WINDOW));
      for (let i = window.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [window[i], window[j]] = [window[j], window[i]];
      }
      const distractors = window.slice(0, DISTRACTORS).map((x) => x.c);

      const options = [correct, ...distractors];
      // Baraja las opciones finales y reubica el índice correcto.
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return { ...item, options, correctIndex: options.indexOf(correct) };
    });
    return { ...section, items };
  });
}
