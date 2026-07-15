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

  it("Listening Parte 2/3: un audio con varias preguntas (✅ en misma línea)", () => {
    const text = `LISTENING
Audio 1
WOMAN: Nice bag.
Question: What does the woman like?
Answer: ✅ The bag.

Parte 2
Audio content 1
Student: Is the movie night still on?
Coordinator: Yes, unless it storms.
Questions and answers
Why is the student calling?✅ To ask if the event is still happening.
What happens if it storms?✅ It will be postponed.`;
    const { sections } = parseExam(text);
    const listening = sections.find((s) => s.kind === "listening");
    // 1 (Parte 1) + 2 (Parte 2) = 3 preguntas.
    expect(listening?.items?.length).toBe(3);
    expect(listening?.items?.[1].stem).toMatch(/why is the student calling/i);
    expect(listening?.items?.[1].options[listening!.items![1].correctIndex]).toContain(
      "still happening"
    );
    // El guion del audio va SOLO en la primera pregunta del grupo.
    expect(listening?.items?.[1].transcript).toMatch(/Student: Is the movie/);
    expect(listening?.items?.[2].transcript).toBeUndefined();
  });

  it("Listening Parte 3: preguntas numeradas con respuesta en la línea siguiente", () => {
    const text = `LISTENING
Parte 3
Audio content 1
Speaker: Welcome, new volunteers. Here is your schedule.
Questions and answers
1. What is the speaker's main purpose?
✅ to explain the volunteers' responsibilities
2. What will the volunteers do first?
✅ tour the building`;
    const { sections } = parseExam(text);
    const listening = sections.find((s) => s.kind === "listening");
    expect(listening?.items?.length).toBe(2);
    expect(listening?.items?.[0].stem).toMatch(/main purpose/i);
    expect(listening?.items?.[0].options[0]).toContain("responsibilities");
    expect(listening?.items?.[1].options[0]).toContain("tour the building");
  });

  it("Writing: separa cada pregunta guía en una tarea y el ensayo aparte", () => {
    const text = `WRITING
What is your favorite movie? How many times have you watched it?
Why do you like it? Why?
Tell us about the last time you watched it.
Some people prefer to plan every detail of a trip in advance, while others prefer to be spontaneous and decide day by day. Which travel style is better and why?

LISTENING
Audio 1
WOMAN: Nice.
Question: What?
Answer: ✅ A bag.`;
    const { sections } = parseExam(text);
    const writing = sections.find((s) => s.kind === "writing");
    const tasks = writing?.writingTasks ?? [];
    // 4 preguntas cortas + 1 ensayo (el "Why?" suelto se une a la anterior).
    const shorts = tasks.filter((t) => t.minWords === 20);
    const essays = tasks.filter((t) => t.minWords >= 150);
    expect(essays.length).toBe(1);
    expect(essays[0].prompt).toMatch(/travel style/i);
    expect(shorts.length).toBe(4);
    expect(tasks.every((t) => t.prompt.trim().length > 3)).toBe(true);
    // No debe quedar un "Why?" como tarea propia.
    expect(tasks.some((t) => /^why\??$/i.test(t.prompt.trim()))).toBe(false);
  });

  it("Reading/Speaking del .docx: anuncios con imagen (marcador @@IMG@@) y opciones apelmazadas", () => {
    const text = `READING
This passage is about cats.
Cats sleep a lot during the day.
1. What do cats do a lot?
A. sleep
B. run
C. swim
D. fly
Answer: A. sleep

READING PARTE 2
@@IMG:/seed/x/ad1.webp@@
1. What is the advertisement for?
A. a guided beach walk B. a city museum C. a running race D. a music concert
Answer: A. a guided beach walk
2. When does it take place?
A. on Monday B. on Saturday C. on Sunday D. on Friday
Answer: B. on Saturday

SPEAKING
@@IMG:/seed/x/photo.webp@@
Task 2
Tell me about your favorite place.`;
    const { sections } = parseExam(text);
    const reading = sections.find((s) => s.kind === "reading");
    // 1 pasaje de texto + 1 anuncio con imagen.
    expect(reading?.passages?.length).toBe(2);
    const ad = reading?.passages?.find((p) => p.imageUrl);
    expect(ad?.imageUrl).toBe("/seed/x/ad1.webp");
    expect(ad?.items.length).toBe(2);
    // Opciones apelmazadas divididas en 4.
    expect(ad?.items[0].options.length).toBe(4);
    expect(ad?.items[0].options[ad!.items[0].correctIndex]).toContain("beach walk");
    expect(ad?.items[1].options[ad!.items[1].correctIndex]).toContain("Saturday");
    // El marcador no debe filtrarse al texto del enunciado.
    expect(ad?.items[0].stem).not.toContain("@@");
    // Speaking: la foto (marcador no usado por Reading) es la tarea 1.
    const speaking = sections.find((s) => s.kind === "speaking");
    expect(speaking?.speakingTasks?.[0].imageUrl).toBe("/seed/x/photo.webp");
    expect(speaking?.speakingTasks?.some((t) => t.prompt.includes("favorite place"))).toBe(true);
  });

  it("Listening del PDF: el checkbox llega como carácter de reemplazo (�)", () => {
    // En el PDF real el ✅ se extrae como U+FFFD; el parser lo normaliza.
    const text = `LISTENING
Audio content 1
Professor: Let's talk about your homework.
Questions and answers
1. What is the conversation about?
�\t� a request to stop doing some work
2. What does the professor allow?
�\t� skipping the homework`;
    const { sections } = parseExam(text);
    const listening = sections.find((s) => s.kind === "listening");
    expect(listening?.items?.length).toBe(2);
    expect(listening?.items?.[0].options[0]).toContain("stop doing some work");
    expect(listening?.items?.[1].options[0]).toContain("skipping the homework");
  });
});
