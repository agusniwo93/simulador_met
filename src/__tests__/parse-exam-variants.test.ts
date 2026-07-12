import { describe, it, expect } from "vitest";
import { parseExam } from "@/lib/exam/pdf-template";

// Variantes reales de formato que el parser debe tolerar.

describe("parseExam — variantes de formato", () => {
  it("Writing sin encabezado WRITING (arranca con los prompts)", () => {
    const text = `What is your favorite store?
Why do you like it?

LISTENING
Audio 1
WOMAN: You should perform in public.
MAN: Playing in public is not my thing.
Question: What does the man say?
Answer: ✅ He doesn't like to play in public.`;
    const { sections } = parseExam(text);
    const writing = sections.find((s) => s.kind === "writing");
    expect(writing?.writingTasks?.length).toBeGreaterThanOrEqual(2);
    const listening = sections.find((s) => s.kind === "listening");
    expect(listening?.items?.[0].options[0]).toContain("play in public");
  });

  it("Reading con pasajes sin 'Text N' (título directo / 'This passage is about')", () => {
    const text = `READING
The Philadelphia Waterworks
Philadelphia built the first municipal water supply along the river.
1. What is the passage about?
A. a city water system
B. a river
C. a park
D. a hotel
Answer: A. a city water system

This passage is about dolphins.
Dolphins sleep with one half of the brain at a time.
1. How do dolphins sleep?
A. fully unconscious
B. one hemisphere at a time
C. never
D. underwater only
Answer: B. one hemisphere at a time`;
    const { sections } = parseExam(text);
    const reading = sections.find((s) => s.kind === "reading");
    expect(reading?.passages?.length).toBe(2);
    expect(reading?.passages?.[0].items[0].options[reading!.passages![0].items[0].correctIndex]).toContain(
      "water system"
    );
    expect(reading?.passages?.[1].title).toMatch(/dolphins/i);
  });
});
