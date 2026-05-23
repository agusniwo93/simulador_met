import { afterEach, describe, expect, it, vi } from "vitest";
import { countWords, gradeAnswer } from "@/lib/grammar";
import type { ExamTask } from "@/lib/types";

const task = (minWords: number): ExamTask => ({
  id: 1,
  type: "essay",
  topic: "General",
  prompt: "Write about your weekend.",
  feedbackGuide: "",
  minWords,
});

/** Build a fake fetch returning a LanguageTool-style response. */
function mockFetch(matches: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ matches }),
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("countWords", () => {
  it("returns 0 for an empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("counts simple words", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("collapses irregular whitespace", () => {
    expect(countWords("  a  b  c ")).toBe(3);
  });
});

describe("gradeAnswer", () => {
  it("gives a perfect score for a long, clean answer", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    const answer = Array(30).fill("word").join(" "); // 30 words
    const grade = await gradeAnswer(task(20), answer, "en");

    expect(grade.score).toBe(100);
    expect(grade.meetsLength).toBe(true);
    expect(grade.issues).toEqual([]);
    expect(grade.wordCount).toBe(30);
  });

  it("returns score 0 for an empty answer", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    const grade = await gradeAnswer(task(20), "", "en");

    expect(grade.score).toBe(0);
    expect(grade.wordCount).toBe(0);
    expect(grade.meetsLength).toBe(false);
  });

  it("caps the score at 40 for a severely short answer", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    const grade = await gradeAnswer(task(20), "too short", "en"); // 2 words

    expect(grade.score).toBeLessThanOrEqual(40);
    expect(grade.meetsLength).toBe(false);
    expect(grade.tips.some((t) => t.length > 0)).toBe(true);
  });

  it("increments grammar issue count and lowers the score", async () => {
    const grammarMatch = {
      message: "Possible grammar error.",
      replacements: [{ value: "is" }],
      offset: 5,
      length: 3,
      context: { text: "this are wrong", offset: 5, length: 3 },
      rule: { category: { id: "GRAMMAR" } },
    };
    vi.stubGlobal("fetch", mockFetch([grammarMatch]));
    const answer = Array(30).fill("word").join(" ");
    const grade = await gradeAnswer(task(20), answer, "en");

    expect(grade.issueCounts.grammar).toBe(1);
    expect(grade.issues).toHaveLength(1);
    expect(grade.issues[0].category).toBe("grammar");
    expect(grade.score).toBeLessThan(100);
  });
});
