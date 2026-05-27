import { describe, expect, it } from "vitest";
import { gradeMcq } from "@/lib/exam/grade";
import type { McqItem } from "@/lib/types";

const item: McqItem = {
  id: "g1",
  stem: "The cat ___ on the mat.",
  options: ["sit", "sits", "sitting", "sat"],
  correctIndex: 1,
};

describe("gradeMcq", () => {
  it("marks the correct option as correct", () => {
    const g = gradeMcq(item, 1);
    expect(g.correct).toBe(true);
    expect(g.selectedIndex).toBe(1);
    expect(g.correctIndex).toBe(1);
  });

  it("marks a wrong option as incorrect", () => {
    const g = gradeMcq(item, 0);
    expect(g.correct).toBe(false);
  });

  it("treats an unanswered item (null) as incorrect", () => {
    const g = gradeMcq(item, null);
    expect(g.correct).toBe(false);
    expect(g.selectedIndex).toBeNull();
  });
});
