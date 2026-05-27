import { describe, expect, it } from "vitest";
import { parseTemplate } from "@/lib/exam/pdf-template";

const VALID_TEMPLATE = `TITLE: Spring MET Practice Set

[TASK]
TYPE: scenario
TOPIC: Workplace
PROMPT: Write an email to your manager requesting time off.
FEEDBACK: Should include a greeting, reason, and closing.
MINWORDS: 120
[/TASK]

[TASK]
TYPE: essay
TOPIC: Technology
PROMPT: Discuss the impact of social media on society.
FEEDBACK: Should present a clear opinion with examples.
MINWORDS: 200
[/TASK]
`;

describe("parseTemplate", () => {
  it("parses the title and two tasks", () => {
    const result = parseTemplate(VALID_TEMPLATE);

    expect(result.title).toBe("Spring MET Practice Set");
    expect(result.tasks).toHaveLength(2);
  });

  it("parses the fields of each task correctly", () => {
    const { tasks } = parseTemplate(VALID_TEMPLATE);

    expect(tasks[0].id).toBe("w1");
    expect(tasks[0].prompt).toBe("Write an email to your manager requesting time off.");
    expect(tasks[0].feedbackGuide).toBe("Should include a greeting, reason, and closing.");
    expect(tasks[0].minWords).toBe(120);

    expect(tasks[1].id).toBe("w2");
    expect(tasks[1].minWords).toBe(200);
  });

  it("falls back to a default title when none is present", () => {
    const { title } = parseTemplate("[TASK]\nPROMPT: Hi.\n[/TASK]");
    expect(title).toBe("Imported MET Writing");
  });

  it("skips a block missing a PROMPT", () => {
    const text = `TITLE: Mixed Set

[TASK]
TYPE: essay
TOPIC: Health
MINWORDS: 100
[/TASK]

[TASK]
TYPE: scenario
PROMPT: Reply to a customer complaint.
MINWORDS: 80
[/TASK]
`;
    const { tasks } = parseTemplate(text);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].prompt).toBe("Reply to a customer complaint.");
    // id is derived from the original block index (the 2nd block), not the
    // post-filter position, so the surviving task keeps id "w2".
    expect(tasks[0].id).toBe("w2");
  });

  it("defaults minWords to 0 when not a number", () => {
    const { tasks } = parseTemplate("[TASK]\nPROMPT: Something.\n[/TASK]");
    expect(tasks[0].minWords).toBe(0);
  });
});
