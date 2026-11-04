import type { ReadySound } from "@/lib/kitchen";

// Suonerie generate dal browser: niente file audio da caricare.
// Ogni nota è [frequenza, inizio, durata, forma d'onda, frequenza finale].
// Con la frequenza finale la nota «scivola» da un tono all'altro: serve per il fischio.
type Note = [freq: number, start: number, dur: number, type?: OscillatorType, endFreq?: number];

const TUNES: Record<Exclude<ReadySound, "nessuno">, Note[]> = {
  campanello: [[1318, 0, 0.6, "sine"], [1318, 0.7, 0.6, "sine"]],
  dingdong: [[880, 0, 0.7, "sine"], [698, 0.6, 1, "sine"]],
  trillo: Array.from({ length: 8 }, (_, i) => [i % 2 ? 1568 : 1319, i * 0.08, 0.08, "square"] as Note),
  fanfara: [[523, 0, 0.15, "triangle"], [659, 0.15, 0.15, "triangle"], [784, 0.3, 0.15, "triangle"], [1047, 0.45, 0.6, "triangle"]],
  sirena: [[600, 0, 0.3, "sawtooth"], [900, 0.3, 0.3, "sawtooth"], [600, 0.6, 0.3, "sawtooth"], [900, 0.9, 0.3, "sawtooth"]],
  // Fischio: due salite rapide e una discesa, come un fischietto da arbitro.
  fischio: [[1100, 0, 0.22, "sine", 2700], [1100, 0.28, 0.22, "sine", 2700], [2200, 0.56, 0.45, "sine", 750]],
};

let ctx: AudioContext | null = null;
export function playSound(sound: ReadySound) {
  if (sound === "nessuno" || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    for (const [f, s, d, type = "sine", endFreq] of TUNES[sound]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0 + s);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + s + d);
      g.gain.setValueAtTime(0.0001, t0 + s);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + s); o.stop(t0 + s + d + 0.05);
    }
  } catch { /* audio non disponibile */ }
}

// Nome storico: la suoneria «pronto» e quella «parzialmente pronto» usano la stessa funzione.
export const playReadySound = playSound;
