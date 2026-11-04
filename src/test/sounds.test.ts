import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it("sblocca l'audio con resume e suona solo dopo che il browser lo ha riattivato", async () => {
  let state = "suspended";
  let finish: (() => void) | undefined;
  const start = vi.fn();
  const param = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  const context = {
    get state() { return state; }, currentTime: 0, destination: {},
    resume: vi.fn(() => new Promise<void>((resolve) => { finish = () => { state = "running"; resolve(); }; })),
    createOscillator: () => ({ frequency: param, connect: () => ({ connect: vi.fn() }), start, stop: vi.fn() }),
    createGain: () => ({ gain: param, connect: vi.fn() }),
  };
  vi.stubGlobal("AudioContext", class { constructor() { return context; } });
  const { unlockAudio, playSound, audioReady } = await import("@/lib/sounds");
  const unlocked = unlockAudio();
  expect(audioReady()).toBe(false);
  expect(start).not.toHaveBeenCalled();
  finish?.();
  expect(await unlocked).toBe(true);
  expect(audioReady()).toBe(true);
  start.mockClear();
  playSound("campanello");
  expect(start).toHaveBeenCalledTimes(2);
  start.mockClear();
  playSound("fischio");
  expect(start).toHaveBeenCalledTimes(3);
  start.mockClear();
  playSound("nessuno");
  expect(start).not.toHaveBeenCalled();
});