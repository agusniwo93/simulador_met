import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRange, sniffAudioType } from "@/lib/media";

// Grabaciones de Speaking: se guardan con su formato real y se sirven por
// tramos (Safari no reproduce audio sin eso).

const mocks = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.cookieJar.has(name) ? { name, value: mocks.cookieJar.get(name) as string } : undefined,
  }),
}));

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));
// Cabeceras reales de cada formato, seguidas de relleno.
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(600).fill(7)]);
const MP4 = new Uint8Array([0, 0, 0, 0x1c, ...ascii("ftypM4A "), ...new Array(600).fill(9)]);

describe("audio format detection", () => {
  it("recognises the formats browsers record in", () => {
    expect(sniffAudioType(WEBM)).toBe("audio/webm");
    expect(sniffAudioType(MP4)).toBe("audio/mp4");
    expect(sniffAudioType(ascii("OggS\0\0\0\0"))).toBe("audio/ogg");
    expect(sniffAudioType(ascii("RIFF\0\0\0\0WAVE"))).toBe("audio/wav");
    expect(sniffAudioType(ascii("ID3\u0004"))).toBe("audio/mpeg");
    expect(sniffAudioType(bytes(0xff, 0xfb, 0x90))).toBe("audio/mpeg");
    expect(sniffAudioType(ascii("hello world!"))).toBeUndefined();
    expect(sniffAudioType(bytes())).toBeUndefined();
  });
});

describe("byte ranges", () => {
  it("reads the ranges audio players ask for", () => {
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=100-", 1000)).toEqual({ start: 100, end: 999 });
    expect(parseRange("bytes=-10", 1000)).toEqual({ start: 990, end: 999 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("rejects ranges outside the file and ignores ones it does not understand", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=5-2", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=0-1,5-6", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
  });
});

describe("recordings on the server", () => {
  const originalCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "met-media-"));
  let uploads: string;
  let access: typeof import("@/lib/auth/access");
  let mediaRoute: typeof import("@/app/api/media/[name]/route");
  let audioRoute: typeof import("@/app/api/exam/audio/route");

  beforeAll(async () => {
    process.chdir(tmp); // db.ts guarda en <cwd>/data
    const db = await import("@/lib/db");
    uploads = db.UPLOAD_DIR;
    fs.mkdirSync(uploads, { recursive: true });
    access = await import("@/lib/auth/access");
    mediaRoute = await import("@/app/api/media/[name]/route");
    audioRoute = await import("@/app/api/exam/audio/route");
  });

  beforeEach(() => {
    mocks.cookieJar.clear();
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const get = (name: string, range?: string) =>
    mediaRoute.GET(
      new Request(`http://localhost/api/media/${name}`, { headers: range ? { range } : {} }),
      { params: Promise.resolve({ name }) }
    );

  it("serves a recording in pieces, as Safari requires", async () => {
    fs.writeFileSync(path.join(uploads, "audio-a.webm"), WEBM);

    const full = await get("audio-a.webm");
    expect(full.status).toBe(200);
    expect(full.headers.get("accept-ranges")).toBe("bytes");
    expect(full.headers.get("content-length")).toBe(String(WEBM.length));
    expect(full.headers.get("content-type")).toBe("audio/webm");
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(WEBM);

    const first = await get("audio-a.webm", "bytes=0-1");
    expect(first.status).toBe(206);
    expect(first.headers.get("content-range")).toBe(`bytes 0-1/${WEBM.length}`);
    expect(first.headers.get("content-length")).toBe("2");
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(bytes(0x1a, 0x45));

    const outside = await get("audio-a.webm", `bytes=${WEBM.length}-`);
    expect(outside.status).toBe(416);
    expect(outside.headers.get("content-range")).toBe(`bytes */${WEBM.length}`);
  });

  it("serves a recording with its real format even if its name says otherwise", async () => {
    // Grabación de iPhone (MP4) guardada antes con extensión .webm.
    fs.writeFileSync(path.join(uploads, "audio-b.webm"), MP4);
    expect((await get("audio-b.webm")).headers.get("content-type")).toBe("audio/mp4");
  });

  it("keeps serving images as before", async () => {
    fs.writeFileSync(path.join(uploads, "img-a.png"), bytes(0x89, 0x50, 0x4e, 0x47));
    const res = await get("img-a.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect((await get("../secret.png")).status).toBe(400);
  });

  const upload = (content: Uint8Array, declaredType: string) => {
    const form = new FormData();
    form.append("file", new Blob([content], { type: declaredType }), "recording");
    return audioRoute.POST(new Request("http://localhost/api/exam/audio", { method: "POST", body: form }));
  };

  it("saves each recording with the extension of its real format", async () => {
    mocks.cookieJar.set("met_access", await access.signAccessPass());

    const fromIphone = await upload(MP4, "audio/webm"); // tipo declarado equivocado
    expect(fromIphone.status).toBe(200);
    expect(((await fromIphone.json()) as { url: string }).url).toMatch(/^\/api\/media\/audio-.*\.mp4$/);

    const fromChrome = await upload(WEBM, "audio/webm;codecs=opus");
    expect(((await fromChrome.json()) as { url: string }).url).toMatch(/\.webm$/);
  });

  it("refuses empty recordings and uploads without a pass", async () => {
    mocks.cookieJar.set("met_access", await access.signAccessPass());
    expect((await upload(bytes(1, 2, 3), "audio/webm")).status).toBe(400);

    mocks.cookieJar.clear();
    expect((await upload(WEBM, "audio/webm")).status).toBe(402);
  });
});
