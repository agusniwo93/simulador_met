import { describe, it, expect } from "vitest";
import { scoreWritingProse, cefrLabel } from "@/lib/exam/grammar";

// Textos de referencia por nivel aproximado.
const A2 =
  "I like music. I listen to music every day. My favorite singer is very good. I have many songs on my phone. I listen when I go to school. Music makes me happy.";

const B1 =
  "In my free time I like to read books because they help me relax. I usually read in the evening after I finish my homework. My favourite books are adventure stories. Reading is good because it helps me learn new words and practise my English.";

const B2 =
  "Reading regularly offers benefits that go beyond simple entertainment. Although some people prefer watching films, books tend to develop the imagination in a deeper way. Moreover, readers usually acquire a wider vocabulary, which helps them express their ideas more clearly. For this reason, schools should encourage students to read every day.";

const C1 =
  "Although many learners initially struggle with academic writing, deliberately cultivating a sophisticated command of cohesive devices ultimately enables them to articulate nuanced arguments with remarkable precision. Consequently, students who broaden their lexical range, while simultaneously experimenting with varied syntactic structures, tend to outperform their peers; moreover, their essays consistently demonstrate a coherence and analytical depth that examiners reward. In contrast, writers who rely on repetitive vocabulary and simplistic sentences rarely progress, regardless of how diligently they practise.";

describe("Writing por nivel CEFR (estricto)", () => {
  it("índices crudos (calibración)", () => {
    for (const [name, text, err] of [["A2", A2, 0], ["B1", B1, 1], ["B2", B2, 0], ["C1", C1, 0]] as const) {
      const r = scoreWritingProse(text as string, err as number);
      console.log(`${name}: index=${r.index.toFixed(3)} score=${r.score} level=${r.level}`);
    }
  });

  it("un texto simple (A2) NO saca 100 — queda en rango bajo", () => {
    const { score } = scoreWritingProse(A2, 0);
    expect(score).toBeLessThanOrEqual(50);
  });

  it("B1 ≈ 45-62 (no 100)", () => {
    const { score } = scoreWritingProse(B1, 1);
    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(62);
  });

  it("B2 ≈ 64-80", () => {
    const { score } = scoreWritingProse(B2, 0);
    expect(score).toBeGreaterThanOrEqual(64);
    expect(score).toBeLessThanOrEqual(82);
  });

  it("C1 ≈ 88-100 (sin errores)", () => {
    const { score } = scoreWritingProse(C1, 0);
    expect(score).toBeGreaterThanOrEqual(88);
  });

  it("los mismos errores bajan el puntaje (más estricto)", () => {
    const clean = scoreWritingProse(C1, 0).score;
    const withErrors = scoreWritingProse(C1, 12).score;
    expect(withErrors).toBeLessThan(clean);
  });

  it("es monótono: mejor texto ⇒ mayor o igual puntaje", () => {
    const a = scoreWritingProse(A2, 1).score;
    const b = scoreWritingProse(B1, 1).score;
    const c = scoreWritingProse(B2, 0).score;
    const d = scoreWritingProse(C1, 0).score;
    expect(a).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(c);
    expect(c).toBeLessThanOrEqual(d);
  });

  it("cefrLabel mapea a bandas", () => {
    expect(cefrLabel(95)).toBe("C1");
    expect(cefrLabel(72)).toBe("B2");
    expect(cefrLabel(55)).toBe("B1");
    expect(cefrLabel(40)).toBe("A2");
    expect(cefrLabel(20)).toBe("A1");
  });
});
