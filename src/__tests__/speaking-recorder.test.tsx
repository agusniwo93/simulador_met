// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SpeakingRecorder from "@/components/exam/SpeakingRecorder";

// Grabador del Speaking: que el alumno siempre llegue a grabar y que una subida
// fallida no le haga perder la grabación.

const tts = vi.hoisted(() => ({ playTTS: vi.fn() }));
vi.mock("@/lib/tts/player", () => ({
  playTTS: tts.playTTS,
  stopAudio: vi.fn(),
  unlockAudio: vi.fn(),
}));

// Grabadora simulada: entrega un audio al detenerse.
class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static isTypeSupported = (type: string) => type === "audio/mp4";
  state = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? "audio/webm";
    FakeRecorder.instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob([new Uint8Array(2048)], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const t = (key: string) => key;
const PROMPT = "Describe a place in your city that you like to visit and explain why"; // 14 palabras
let getUserMedia: ReturnType<typeof vi.fn>;
let speak: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  FakeRecorder.instances = [];
  getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));
  speak = vi.fn(); // voz del navegador que nunca avisa que terminó
  fetchMock = vi.fn();
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("SpeechSynthesisUtterance", class {
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  });
  vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup(onUploaded = vi.fn()) {
  render(
    <SpeakingRecorder existingUrl={null} onUploaded={onUploaded} promptText={PROMPT} limitSeconds={60} t={t} />
  );
  return onUploaded;
}

async function pressStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /exam\.speakStart/ }));
  });
}

const recording = () => screen.queryByRole("button", { name: /exam\.stop/ });

describe("speaking recorder", () => {
  it("starts recording even if the question is never read to the end", async () => {
    // Ni la voz del servidor ni la del navegador terminan nunca (celulares).
    tts.playTTS.mockReturnValue(new Promise(() => {}));
    setup();
    await pressStart();
    expect(screen.getByText("exam.speakReading")).toBeInTheDocument();
    expect(recording()).toBeNull();

    // 14 palabras × 0,5 s + 5 s = 12 s de espera máxima.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });
    expect(recording()).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(recording()).toBeInTheDocument();
    // Graba en MP4, que se reproduce en cualquier equipo (también iPhone).
    expect(FakeRecorder.instances[0].mimeType).toBe("audio/mp4");
  });

  it("lets the student start recording right away while the question is read", async () => {
    tts.playTTS.mockRejectedValue(new Error("tts 503")); // cae a la voz del navegador
    setup();
    await pressStart();
    expect(speak).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /exam\.recordNow/ }));
    });
    expect(recording()).toBeInTheDocument();
    expect(FakeRecorder.instances).toHaveLength(1);

    // Si después la voz avisa que terminó, no se abre una segunda grabación.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(FakeRecorder.instances).toHaveLength(1);
  });

  it("keeps the recording when the upload fails so it can be retried", async () => {
    tts.playTTS.mockResolvedValue(undefined); // la pregunta se lee y termina bien
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: "/api/media/audio-1.mp4" }) });
    const onUploaded = setup();
    await pressStart();
    expect(recording()).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(recording() as HTMLElement); // detener → se sube
    });
    expect(screen.getByRole("alert")).toHaveTextContent("exam.uploadFailed");
    expect(onUploaded).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /exam\.retryUpload/ }));
    });
    expect(onUploaded).toHaveBeenCalledWith("/api/media/audio-1.mp4");
    // Se reintentó la misma grabación: no se volvió a pedir el micrófono.
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("explains when the microphone was not allowed", async () => {
    getUserMedia.mockRejectedValue(new Error("NotAllowedError"));
    setup();
    await pressStart();
    expect(screen.getByRole("alert")).toHaveTextContent("exam.micDenied");
  });
});
