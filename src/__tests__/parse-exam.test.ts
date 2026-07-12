import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseExam } from "@/lib/exam/pdf-template";

const template = fs.readFileSync(
  path.join(process.cwd(), "public", "plantilla-examen.txt"),
  "utf-8"
);

describe("parseExam (formato natural)", () => {
  const { title, sections } = parseExam(template);

  it("lee el título", () => {
    expect(title).toBe("SIMULADOR DE EJEMPLO");
  });

  it("reconoce las 5 secciones", () => {
    const kinds = sections.map((s) => s.kind);
    expect(kinds).toEqual(["writing", "listening", "grammar", "reading", "speaking"]);
  });

  it("writing: 3 prompts", () => {
    const w = sections.find((s) => s.kind === "writing");
    expect(w?.writingTasks?.length).toBe(3);
  });

  it("listening: 2 audios con transcript y respuesta correcta", () => {
    const l = sections.find((s) => s.kind === "listening");
    expect(l?.items?.length).toBe(2);
    expect(l?.items?.[0].transcript).toContain("WOMAN:");
    expect(l?.items?.[0].options[l!.items![0].correctIndex]).toContain("teach cooking");
  });

  it("grammar: 2 preguntas con la correcta bien marcada", () => {
    const g = sections.find((s) => s.kind === "grammar");
    expect(g?.items?.length).toBe(2);
    expect(g?.items?.[0].options[g!.items![0].correctIndex]).toBe("to close");
    expect(g?.items?.[1].options[g!.items![1].correctIndex]).toBe("had");
  });

  it("reading: 1 pasaje con 2 preguntas y respuestas correctas", () => {
    const r = sections.find((s) => s.kind === "reading");
    expect(r?.passages?.length).toBe(1);
    const p = r!.passages![0];
    expect(p.items.length).toBe(2);
    expect(p.items[0].options[p.items[0].correctIndex]).toContain("recycling programs");
    expect(p.items[1].options[p.items[1].correctIndex]).toContain("saves money");
  });

  it("speaking: 2 tareas", () => {
    const s = sections.find((s) => s.kind === "speaking");
    expect(s?.speakingTasks?.length).toBe(2);
  });
});
