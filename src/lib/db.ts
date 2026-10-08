import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Exam,
  ExamResult,
  Analytics,
  Section,
  SectionKind,
  ThemeSettings,
  McqItem,
  Payment,
  RevenueStats,
  ExamConfig,
  DiscountCode,
  PendingOrder,
} from "./types";
import { DEFAULT_THEME, DEFAULT_EXAM_CONFIG } from "./types";
import { SEED_SECTIONS, SEED_TITLE, SEED_DURATION, SEED_ID, SEED_VERSION } from "./exam/seed-exam";
import { expandListeningDistractors } from "./exam/distractors";
import SEED_EXTRA from "./exam/seed-extra.json";
import { basePrice, canonicalCode, generateCode } from "./pay/discount";
import { discountedAmount } from "./pay/price";

// Exámenes semilla adicionales (SILUMADOR/SIMULADOR 1,2,3,5,6). El 4 lo cubre
// SEED_SECTIONS (con imágenes). Súbelo cuando cambie el contenido.
const SEED_EXTRA_VERSION = 4; // v4: distractores de Listening por longitud parecida
const SEED_EXTRA_EXAMS = SEED_EXTRA as unknown as {
  id: string;
  title: string;
  durationMinutes: number;
  sections: Section[];
}[];

// Base de datos en archivo (demo). Exámenes y resultados — sin cuentas.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

interface DB {
  exams: Exam[];
  examResults: ExamResult[];
  payments?: Payment[];
  discountCodes?: DiscountCode[];
  pendingOrders?: PendingOrder[];
  theme?: ThemeSettings;
  examConfig?: ExamConfig;
}

const EMPTY_DB: DB = { exams: [], examResults: [], payments: [] };

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function read(): DB {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) return { ...EMPTY_DB };
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...EMPTY_DB, ...(JSON.parse(raw) as DB) };
  } catch {
    return { ...EMPTY_DB };
  }
}

function write(db: DB) {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function update<T>(fn: (db: DB) => T): T {
  const db = read();
  const result = fn(db);
  write(db);
  return result;
}

// ---------- Exámenes ----------

export function listExams(): Exam[] {
  // Los exámenes "chocolateados" (generados por alumno) no se listan en el admin.
  return read().exams.filter((e) => !e.generated);
}

export function getExam(id: string): Exam | undefined {
  return read().exams.find((e) => e.id === id);
}

export function getRandomExam(): Exam | undefined {
  const exams = read().exams.filter((e) => !e.generated);
  if (exams.length === 0) return undefined;
  return exams[Math.floor(Math.random() * exams.length)];
}

// ---------- Examen "chocolateado" (mezcla de todos los subidos) ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Baraja las opciones de una pregunta MCQ y reubica el índice correcto.
function shuffleOptions(item: McqItem): McqItem {
  if (!item.options || item.options.length < 2) return item;
  const order = shuffle(item.options.map((_, i) => i));
  return {
    ...item,
    options: order.map((i) => item.options[i]),
    correctIndex: Math.max(0, order.indexOf(item.correctIndex)),
  };
}

// Construye un examen mezclando preguntas de TODOS los exámenes subidos:
// usa el primer examen como plantilla de estructura (secciones y cuántas
// preguntas por sección) y rellena cada sección tomando al azar del pozo común
// de esa clase, barajando además el orden y las opciones. Lo persiste para que
// la corrección por examId cuadre, y limpia los generados de más de 1 día.
export function buildShuffledExam(): Exam | undefined {
  const pool = read().exams.filter((e) => !e.generated);
  if (pool.length === 0) return undefined;

  const template = pool[0];

  const sections: Section[] = template.sections.map((tSec) => {
    const sameKind = pool.flatMap((e) => e.sections.filter((s) => s.kind === tSec.kind));

    if (tSec.kind === "writing") {
      const tasks = sameKind.flatMap((s) => s.writingTasks ?? []);
      const n = tSec.writingTasks?.length ?? tasks.length;
      return { ...tSec, writingTasks: shuffle(tasks).slice(0, n) };
    }
    if (tSec.kind === "speaking") {
      const tasks = sameKind.flatMap((s) => s.speakingTasks ?? []);
      const n = tSec.speakingTasks?.length ?? tasks.length;
      return { ...tSec, speakingTasks: shuffle(tasks).slice(0, n) };
    }
    if (tSec.kind === "reading") {
      const passages = sameKind.flatMap((s) => s.passages ?? []);
      const n = tSec.passages?.length ?? passages.length;
      // Se barajan las opciones de cada pregunta pero se conserva el orden
      // dentro del pasaje (las preguntas pueden referirse a párrafos por orden).
      const chosen = shuffle(passages)
        .slice(0, n)
        .map((p) => ({ ...p, items: p.items.map(shuffleOptions) }));
      return { ...tSec, passages: chosen };
    }
    // grammar | listening: preguntas independientes → se baraja también el orden.
    const items = sameKind.flatMap((s) => s.items ?? []);
    const n = tSec.items?.length ?? items.length;
    const chosen = shuffle(items).slice(0, n).map(shuffleOptions);
    return { ...tSec, items: chosen };
  });

  const exam: Exam = {
    id: randomUUID(),
    title: template.title,
    durationMinutes: template.durationMinutes,
    sections,
    createdAt: new Date().toISOString(),
    generated: true,
  };

  update((db) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    db.exams = db.exams.filter(
      (e) => !(e.generated && new Date(e.createdAt).getTime() < dayAgo)
    );
    db.exams.push(exam);
    return exam;
  });

  return exam;
}

export function createExam(input: { title: string; durationMinutes: number; sourceFile?: string; sections: Section[] }): Exam {
  return update((db) => {
    const exam: Exam = {
      id: randomUUID(),
      title: input.title,
      durationMinutes: input.durationMinutes,
      sourceFile: input.sourceFile,
      sections: expandListeningDistractors(input.sections),
      createdAt: new Date().toISOString(),
    };
    db.exams.push(exam);
    return exam;
  });
}

export function deleteExam(id: string): boolean {
  return update((db) => {
    const before = db.exams.length;
    db.exams = db.exams.filter((e) => e.id !== id);
    return db.exams.length < before;
  });
}

export function updateExam(
  id: string,
  patch: { title?: string; durationMinutes?: number; sections?: Section[] }
): Exam | undefined {
  return update((db) => {
    const idx = db.exams.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    const current = db.exams[idx];
    const updated: Exam = {
      ...current,
      title: patch.title ?? current.title,
      durationMinutes: patch.durationMinutes ?? current.durationMinutes,
      sections: patch.sections ? expandListeningDistractors(patch.sections) : current.sections,
    };
    db.exams[idx] = updated;
    return updated;
  });
}

// ---------- Resultados ----------

export function createExamResult(input: Omit<ExamResult, "id">): ExamResult {
  return update((db) => {
    const result: ExamResult = { ...input, id: randomUUID() };
    db.examResults.push(result);
    return result;
  });
}

export function getExamResult(id: string): ExamResult | undefined {
  return read().examResults.find((r) => r.id === id);
}

// Elimina un resultado (alumno que rindió el examen). Devuelve true si existía.
export function deleteExamResult(id: string): boolean {
  return update((db) => {
    const before = db.examResults.length;
    db.examResults = db.examResults.filter((r) => r.id !== id);
    return db.examResults.length < before;
  });
}

// ---------- Códigos de descuento ----------

// Un pago iniciado con código reserva un uso durante este tiempo, para que dos
// alumnos no se lleven a la vez el último. Es algo más que los 15 minutos que
// vive un formulario de pago de IziPay: pasado ese plazo ya no se puede pagar.
const RESERVE_MS = 20 * 60 * 1000;
// Pagos en curso que un mismo navegador puede tener abiertos con un código (para
// reintentar tras una tarjeta rechazada). Acota cuánto se puede exceder el límite
// de usos si alguien paga varios formularios abiertos a la vez.
const MAX_OPEN_PER_HOLDER = 3;
// Las órdenes pendientes se conservan un día por si la confirmación llega tarde.
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

// Por qué no se puede usar un código: no existe, está desactivado o agotado
// ("invalid"), o sus usos libres están reservados por pagos en curso ("busy").
export type CodeRejection = "invalid" | "busy";
export type CodeCheck = { ok: true; code: DiscountCode } | { ok: false; reason: CodeRejection };

// Pagos en curso (aún dentro del plazo de reserva) hechos con un código.
function openOrders(db: DB, codeId: string): PendingOrder[] {
  const now = Date.now();
  return (db.pendingOrders ?? []).filter(
    (o) => o.codeId === codeId && now - new Date(o.createdAt).getTime() < RESERVE_MS
  );
}

function checkCode(db: DB, input: string, holder?: string): CodeCheck {
  const wanted = canonicalCode(input);
  const code = (db.discountCodes ?? []).find((c) => canonicalCode(c.code) === wanted);
  if (!code || !code.active || code.usedCount >= code.maxUses) {
    return { ok: false, reason: "invalid" };
  }
  // Las reservas del propio navegador no cuentan: es el mismo alumno, que
  // recargó la página o reintenta el pago.
  const reservedByOthers = openOrders(db, code.id).filter((o) => o.holder !== holder).length;
  if (code.usedCount + reservedByOthers >= code.maxUses) return { ok: false, reason: "busy" };
  return { ok: true, code };
}

export function listDiscountCodes(): DiscountCode[] {
  return [...(read().discountCodes ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createDiscountCode(input: { percent: number; maxUses: number; note?: string }): DiscountCode {
  return update((db) => {
    db.discountCodes = db.discountCodes ?? [];
    let code = generateCode();
    while (db.discountCodes.some((c) => c.code === code)) code = generateCode();
    const created: DiscountCode = {
      id: randomUUID(),
      code,
      percent: input.percent,
      maxUses: input.maxUses,
      usedCount: 0,
      active: true,
      note: input.note || undefined,
      createdAt: new Date().toISOString(),
    };
    db.discountCodes.push(created);
    return created;
  });
}

export function setDiscountCodeActive(id: string, active: boolean): DiscountCode | undefined {
  return update((db) => {
    const code = (db.discountCodes ?? []).find((c) => c.id === id);
    if (code) code.active = active;
    return code;
  });
}

export function deleteDiscountCode(id: string): boolean {
  return update((db) => {
    const before = (db.discountCodes ?? []).length;
    db.discountCodes = (db.discountCodes ?? []).filter((c) => c.id !== id);
    return db.discountCodes.length < before;
  });
}

// Comprueba si un código se puede usar ahora mismo. Solo lee: no gasta ni reserva.
export function checkDiscountCode(input: string, holder?: string): CodeCheck {
  return checkCode(read(), input, holder);
}

export type ReserveResult =
  | { ok: true; amount: number; code: DiscountCode }
  | { ok: false; reason: CodeRejection | "free" };

// Inicia un pago con código de descuento: calcula el monto a cobrar y reserva un
// uso. El uso solo se gasta cuando el pago se confirma (completeOrder).
export function reserveCodeOrder(input: {
  orderId: string;
  code: string;
  holder: string;
  base: number;
  currency: string;
}): ReserveResult {
  // Se comprueba leyendo, sin escribir: un intento rechazado no reescribe la base.
  const current = read();
  const check = checkCode(current, input.code, input.holder);
  if (!check.ok) return check;
  const { code } = check;
  // Los códigos gratis no pasan por IziPay: se canjean con redeemFreeCode.
  if (code.percent === 100) return { ok: false, reason: "free" };
  const own = openOrders(current, code.id).filter((o) => o.holder === input.holder).length;
  if (own >= MAX_OPEN_PER_HOLDER) return { ok: false, reason: "busy" };

  const amount = discountedAmount(input.base, code.percent);
  update((db) => {
    const now = Date.now();
    db.pendingOrders = (db.pendingOrders ?? []).filter(
      (o) => now - new Date(o.createdAt).getTime() < PENDING_TTL_MS
    );
    db.pendingOrders.push({
      orderId: input.orderId,
      amount,
      currency: input.currency,
      codeId: code.id,
      code: code.code,
      percent: code.percent,
      holder: input.holder,
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true, amount, code };
}

// Libera la reserva de un pago que no llegó a crearse en IziPay.
export function cancelPendingOrder(orderId: string): void {
  update((db) => {
    db.pendingOrders = (db.pendingOrders ?? []).filter((o) => o.orderId !== orderId);
  });
}

// Canjea un código 100% gratis: gasta un uso y deja constancia (monto 0).
export function redeemFreeCode(input: string): boolean {
  const check = checkCode(read(), input);
  if (!check.ok || check.code.percent !== 100) return false;
  const { id } = check.code;
  return update((db) => {
    const code = (db.discountCodes ?? []).find((c) => c.id === id);
    if (!code) return false;
    code.usedCount += 1;
    db.payments = db.payments ?? [];
    db.payments.push({
      id: randomUUID(),
      amount: 0,
      currency: basePrice().currency,
      at: new Date().toISOString(),
      code: code.code,
      percent: code.percent,
    });
    return true;
  });
}

// ---------- Pagos (ingresos) ----------

// Pago confirmado por IziPay: registra el ingreso con el monto realmente cobrado
// y, si se pagó con código, gasta un uso. Cada orden se registra una sola vez:
// si la confirmación de esa orden ya se había recibido devuelve el pago original
// con `repeated: true`, sin volver a gastar el código ni sumar ingresos.
export function completeOrder(
  orderId: string | undefined,
  paid: { amount?: number; currency?: string }
): { payment: Payment; repeated: boolean } {
  if (orderId) {
    const existing = (read().payments ?? []).find((p) => p.orderId === orderId);
    if (existing) return { payment: existing, repeated: true };
  }
  return update((db) => {
    const pending = db.pendingOrders ?? [];
    const order = orderId ? pending.find((o) => o.orderId === orderId) : undefined;
    if (order) {
      db.pendingOrders = pending.filter((o) => o !== order);
      // El admin pudo borrar el código mientras tanto; el pago igual se registra.
      const code = (db.discountCodes ?? []).find((c) => c.id === order.codeId);
      if (code) code.usedCount += 1;
    }
    const base = basePrice();
    const payment: Payment = {
      id: randomUUID(),
      amount: paid.amount ?? order?.amount ?? base.amount,
      currency: paid.currency ?? order?.currency ?? base.currency,
      at: new Date().toISOString(),
      orderId,
      code: order?.code,
      percent: order?.percent,
    };
    db.payments = db.payments ?? [];
    db.payments.push(payment);
    return { payment, repeated: false };
  });
}

function computeRevenue(): RevenueStats {
  // Los accesos gratis (monto 0) no cuentan como pagos.
  const payments = (read().payments ?? []).filter((p) => p.amount > 0);
  const currency = payments[0]?.currency || process.env.PAY_CURRENCY || "USD";
  const total = payments.reduce((s, p) => s + p.amount, 0);

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const dayAmount = (d: string) => payments.filter((p) => p.at.slice(0, 10) === d);
  const today = dayAmount(todayKey).reduce((s, p) => s + p.amount, 0);
  const month = payments.filter((p) => p.at.slice(0, 7) === monthKey).reduce((s, p) => s + p.amount, 0);

  // Últimos 14 días.
  const byDay: RevenueStats["byDay"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    const ps = dayAmount(d);
    byDay.push({ date: d, amount: ps.reduce((s, p) => s + p.amount, 0), count: ps.length });
  }

  // Últimos 12 meses.
  const byMonth: RevenueStats["byMonth"] = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dt.toISOString().slice(0, 7);
    const ps = payments.filter((p) => p.at.slice(0, 7) === key);
    byMonth.push({ month: key, amount: ps.reduce((s, p) => s + p.amount, 0), count: ps.length });
  }

  return { total, currency, count: payments.length, today, month, byDay, byMonth };
}

// ---------- Tema de colores ----------

export function getTheme(): ThemeSettings {
  return { ...DEFAULT_THEME, ...(read().theme ?? {}) };
}

export function saveTheme(theme: Partial<ThemeSettings>): ThemeSettings {
  return update((db) => {
    db.theme = { ...DEFAULT_THEME, ...(db.theme ?? {}), ...theme };
    return db.theme;
  });
}

// ---------- Configuración del examen ----------

export function getExamConfig(): ExamConfig {
  const cfg = read().examConfig;
  return {
    sectionMinutes: { ...DEFAULT_EXAM_CONFIG.sectionMinutes, ...(cfg?.sectionMinutes ?? {}) },
    allowListeningReplay: cfg?.allowListeningReplay ?? DEFAULT_EXAM_CONFIG.allowListeningReplay,
    shuffle: cfg?.shuffle ?? DEFAULT_EXAM_CONFIG.shuffle,
  };
}

export function saveExamConfig(patch: Partial<ExamConfig>): ExamConfig {
  return update((db) => {
    const cur = getExamConfig();
    db.examConfig = {
      sectionMinutes: { ...cur.sectionMinutes, ...(patch.sectionMinutes ?? {}) },
      allowListeningReplay: patch.allowListeningReplay ?? cur.allowListeningReplay,
      shuffle: patch.shuffle ?? cur.shuffle,
    };
    return db.examConfig;
  });
}

// ---------- Analítica ----------

export function getAnalytics(): Analytics {
  const results = read().examResults;
  const total = results.length;

  if (total === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      scoreBuckets: { excellent: 0, good: 0, needsWork: 0 },
      sectionAverages: [],
      recent: [],
      revenue: computeRevenue(),
    };
  }

  const averageScore = Math.round(results.reduce((s, r) => s + r.overallScore, 0) / total);

  const scoreBuckets = { excellent: 0, good: 0, needsWork: 0 };
  for (const r of results) {
    if (r.overallScore >= 80) scoreBuckets.excellent++;
    else if (r.overallScore >= 60) scoreBuckets.good++;
    else scoreBuckets.needsWork++;
  }

  const secAgg = new Map<SectionKind, { title: string; sum: number; count: number }>();
  for (const r of results) {
    for (const s of r.sectionResults) {
      if (s.autoScored === false) continue; // Speaking no cuenta en promedios
      const cur = secAgg.get(s.kind) ?? { title: s.title, sum: 0, count: 0 };
      cur.sum += s.score;
      cur.count += 1;
      cur.title = s.title;
      secAgg.set(s.kind, cur);
    }
  }
  const sectionAverages = [...secAgg.entries()].map(([kind, v]) => ({
    kind,
    title: v.title,
    averageScore: Math.round(v.sum / v.count),
    count: v.count,
  }));

  const recent = [...results]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      studentName: r.studentName,
      overallScore: r.overallScore,
      submittedAt: r.submittedAt,
    }));

  return { totalExams: total, averageScore, scoreBuckets, sectionAverages, recent, revenue: computeRevenue() };
}

// ---------- Seed ----------

// Siembra / migra el examen de demostración con un id estable, sin duplicarlo
// ni tocar los exámenes subidos ni los resultados del usuario.
function seed() {
  update((db) => {
    // Elimina el seed antiguo (auto-sembrado sin versión) y versiones previas.
    db.exams = db.exams.filter(
      (e) =>
        !((e.id === SEED_ID || e.title === SEED_TITLE) &&
          (e.seedVersion == null || e.seedVersion < SEED_VERSION))
    );
    if (!db.exams.some((e) => e.id === SEED_ID)) {
      db.exams.unshift({
        id: SEED_ID,
        title: SEED_TITLE,
        durationMinutes: SEED_DURATION,
        sections: expandListeningDistractors(SEED_SECTIONS),
        createdAt: new Date().toISOString(),
        seedVersion: SEED_VERSION,
      });
    }

    // Semillas adicionales (1,2,3,5,6). Se migran por versión y no se duplican;
    // no tocan exámenes subidos por el admin ni los resultados.
    db.exams = db.exams.filter(
      (e) =>
        !(SEED_EXTRA_EXAMS.some((x) => x.id === e.id) &&
          (e.seedVersion == null || e.seedVersion < SEED_EXTRA_VERSION))
    );
    for (const x of SEED_EXTRA_EXAMS) {
      if (db.exams.some((e) => e.id === x.id)) continue;
      db.exams.push({
        id: x.id,
        title: x.title,
        durationMinutes: x.durationMinutes,
        sections: expandListeningDistractors(x.sections),
        createdAt: new Date().toISOString(),
        seedVersion: SEED_EXTRA_VERSION,
      });
    }
  });
}

seed();
