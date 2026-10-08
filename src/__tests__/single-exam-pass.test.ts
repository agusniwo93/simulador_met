import fs from "fs";
import os from "os";
import path from "path";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Cada pase de acceso (pago o código) vale por UN examen.

const mocks = vi.hoisted(() => ({
  // Cookies que "envía" el navegador en cada petición.
  cookieJar: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.cookieJar.has(name) ? { name, value: mocks.cookieJar.get(name) as string } : undefined,
  }),
}));

// La corrección real llama a LanguageTool por red; aquí no hace falta.
vi.mock("@/lib/exam/grade", () => ({
  gradeExam: async () => ({ sectionResults: [], overallScore: 0 }),
}));

const originalCwd = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "met-pass-"));

let db: typeof import("@/lib/db");
let access: typeof import("@/lib/auth/access");
let passLib: typeof import("@/lib/auth/pass");
let setRoute: typeof import("@/app/api/exam/set/route");
let submitRoute: typeof import("@/app/api/exam/submit/route");
let audioRoute: typeof import("@/app/api/exam/audio/route");
let ttsRoute: typeof import("@/app/api/exam/tts/route");

beforeAll(async () => {
  process.chdir(tmp); // db.ts guarda en <cwd>/data
  db = await import("@/lib/db");
  access = await import("@/lib/auth/access");
  passLib = await import("@/lib/auth/pass");
  setRoute = await import("@/app/api/exam/set/route");
  submitRoute = await import("@/app/api/exam/submit/route");
  audioRoute = await import("@/app/api/exam/audio/route");
  ttsRoute = await import("@/app/api/exam/tts/route");
});

beforeEach(() => {
  mocks.cookieJar.clear();
});

afterAll(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

// El navegador recibe un pase nuevo (como tras pagar o canjear un código).
async function newPass() {
  const token = await access.signAccessPass();
  mocks.cookieJar.set("met_access", token);
  return token;
}

async function loadExam() {
  const res = await setRoute.GET();
  const data = (await res.json()) as { exam?: { id: string } };
  return { status: res.status, examId: data.exam?.id };
}

async function submit(examId: string) {
  const res = await submitRoute.POST(
    new Request("http://localhost/api/exam/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examId, studentName: "Ana Pérez", lang: "es", answers: {} }),
    })
  );
  const data = (await res.json()) as { resultId?: string };
  return { status: res.status, resultId: data.resultId, cookie: res.cookies.get("met_access") };
}

const examsTaken = () => db.getAnalytics().totalExams;

describe("one exam per access pass", () => {
  it("gives every pass its own identity, even when issued at the same instant", async () => {
    const [a, b] = await Promise.all([access.signAccessPass(), access.signAccessPass()]);
    const idA = (await access.readAccessPass(a))?.id;
    const idB = (await access.readAccessPass(b))?.id;
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
    expect(await access.readAccessPass("garbage")).toBeNull();
  });

  it("refuses the exam without a pass", async () => {
    expect((await loadExam()).status).toBe(402);
    expect((await submit("seed-met-4")).status).toBe(402);
  });

  it("gives a pass the same exam every time it asks", async () => {
    await newPass();
    const first = await loadExam();
    expect(first.status).toBe(200);
    // Hay varios exámenes y se reparten al azar: sin la asignación, repetir
    // la petición iría cambiando de examen.
    expect(db.listExams().length).toBeGreaterThan(1);
    for (let i = 0; i < 12; i++) {
      expect(await loadExam()).toEqual({ status: 200, examId: first.examId });
    }
  });

  it("spends the pass when the exam is submitted", async () => {
    const token = await newPass();
    const { examId } = await loadExam();
    const before = examsTaken();

    const sent = await submit(examId as string);
    expect(sent.status).toBe(200);
    expect(sent.resultId).toBeTruthy();
    expect(examsTaken()).toBe(before + 1);
    // La respuesta retira el pase del navegador.
    expect(sent.cookie).toMatchObject({ value: "", maxAge: 0 });

    // Aunque alguien conserve una copia del pase, ya no abre otro examen...
    mocks.cookieJar.set("met_access", token);
    expect(await access.hasValidAccess(token)).toBe(true); // la firma sigue siendo válida
    expect(await passLib.usableAccessPass(token)).toBeNull(); // pero está gastado
    expect((await loadExam()).status).toBe(402);

    // ...ni sirve para volver a entregar: devuelve el mismo resultado, sin
    // corregir ni registrar un examen más.
    const again = await submit(examId as string);
    expect(again).toMatchObject({ status: 200, resultId: sent.resultId });
    expect(examsTaken()).toBe(before + 1);

    // Tampoco para subir grabaciones o generar audio.
    const upload = await audioRoute.POST(new Request("http://localhost/api/exam/audio", { method: "POST" }));
    expect(upload.status).toBe(402);
    const voice = await ttsRoute.POST(
      new Request("http://localhost/api/exam/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      })
    );
    expect(voice.status).toBe(402);
  });

  it("lets a new pass take another exam", async () => {
    await newPass();
    const first = await loadExam();
    expect((await submit(first.examId as string)).status).toBe(200);

    mocks.cookieJar.clear(); // el navegador ya no tiene pase
    expect((await loadExam()).status).toBe(402);

    await newPass(); // paga de nuevo o usa otro código
    const second = await loadExam();
    expect(second.status).toBe(200);
    expect((await submit(second.examId as string)).status).toBe(200);
  });

  it("applies the same rule to passes issued before they carried an id", async () => {
    const legacy = await new SignJWT({ paid: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(access.getSigningKey());
    expect((await access.readAccessPass(legacy))?.id).toMatch(/^sig:/);

    mocks.cookieJar.set("met_access", legacy);
    const { status, examId } = await loadExam();
    expect(status).toBe(200);
    expect((await submit(examId as string)).status).toBe(200);
    expect((await loadExam()).status).toBe(402);
  });

  it("still lets a student who never submitted come back to the same exam", async () => {
    const token = await newPass();
    const { examId } = await loadExam();
    expect(await passLib.usableAccessPass(token)).not.toBeNull();
    expect(await loadExam()).toEqual({ status: 200, examId });
  });
});
