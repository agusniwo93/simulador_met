import { describe, it, expect } from "vitest";
import { expandListeningDistractors } from "@/lib/exam/distractors";
import type { Section } from "@/lib/types";

const short = (i: number) => `Short answer ${i}.`; // ~15 chars
const long = (i: number) =>
  `This is a considerably longer listening answer number ${i} with several extra descriptive words.`; // ~95 chars

describe("distractores de Listening por longitud parecida", () => {
  const items = [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      stem: `short q ${i}`,
      options: [short(i)],
      correctIndex: 0,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `l${i}`,
      stem: `long q ${i}`,
      options: [long(i)],
      correctIndex: 0,
    })),
  ];
  const section: Section = { kind: "listening", title: "Listening", items };
  const [out] = expandListeningDistractors([section]);
  const byId = Object.fromEntries((out.items ?? []).map((it) => [it.id, it]));

  it("cada pregunta queda con 4 opciones y la correcta presente", () => {
    for (const it of out.items ?? []) {
      expect(it.options.length).toBe(4);
      expect(it.correctIndex).toBeGreaterThanOrEqual(0);
      expect(it.correctIndex).toBeLessThan(4);
      expect(new Set(it.options).size).toBe(4); // sin duplicados
    }
  });

  it("una respuesta corta recibe distractores cortos", () => {
    const it = byId["s3"];
    const correct = it.options[it.correctIndex];
    const distractors = it.options.filter((_, i) => i !== it.correctIndex);
    expect(correct).toBe(short(3));
    // Ningún distractor debe ser una de las frases largas.
    for (const d of distractors) expect(d.length).toBeLessThan(40);
  });

  it("una respuesta larga recibe distractores largos", () => {
    const it = byId["l6"];
    const correct = it.options[it.correctIndex];
    const distractors = it.options.filter((_, i) => i !== it.correctIndex);
    expect(correct).toBe(long(6));
    for (const d of distractors) expect(d.length).toBeGreaterThan(40);
  });

  it("es determinista (misma entrada → mismas opciones)", () => {
    const [again] = expandListeningDistractors([section]);
    expect(again.items?.[0].options).toEqual(out.items?.[0].options);
  });
});
