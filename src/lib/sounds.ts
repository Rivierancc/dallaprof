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

/** I browser tengono l'audio muto finché qualcuno non tocca la pagina: va chiamata dentro un tocco. */
export async function unlockAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    ctx ??= new AudioContext();
    if (ctx.state !== "running") await ctx.resume();
    // Un suono silenzioso sblocca anche Safari su tablet.
    const o = ctx.createOscillator(), g = ctx.createGain();
    g.gain.value = 0.0001; o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.05);
    return ctx.state === "running";
  } catch { return false; }
}

export const audioReady = () => ctx?.state === "running";

export function playSound(sound: ReadySound) {
  if (sound === "nessuno" || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    if (c.state !== "running") { void c.resume().then(() => schedule(c, sound)).catch(() => {}); return; }
    schedule(c, sound);
  } catch { /* audio non disponibile */ }
}

function schedule(ctx: AudioContext, sound: Exclude<ReadySound, "nessuno">) {
  try {
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

// «Tanti auguri a te»: note in Do maggiore [frequenza, battiti].
const HB: [number, number][] = [[392,.75],[392,.25],[440,1],[392,1],[523,1],[494,2],[392,.75],[392,.25],[440,1],[392,1],[587,1],[523,2],[392,.75],[392,.25],[784,1],[659,1],[523,1],[494,1],[440,2],[698,.75],[698,.25],[659,1],[523,1],[587,1],[523,2]];
export function playBirthdaySong() {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    const run = () => { let t = c.currentTime + 0.05; for (const [f, b] of HB) { const d = b * 0.42; const o = c.createOscillator(), g = c.createGain(); o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.95); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d); t += d; } };
    if (c.state !== "running") void c.resume().then(run).catch(() => {}); else run();
  } catch { /* audio non disponibile */ }
}

function withAudio(fn: (c: AudioContext) => void) {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    if (c.state !== "running") void c.resume().then(() => fn(c)).catch(() => {});
    else fn(c);
  } catch { /* audio non disponibile */ }
}

/** Suono di vetro che si crepa: colpi secchi + tintinnio ad alta frequenza. */
export function playGlassCrack() {
  withAudio((c) => {
    const t0 = c.currentTime + 0.01;
    const len = Math.floor(c.sampleRate * 0.35);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.06));
    const src = c.createBufferSource();
    src.buffer = buf;
    const hp = c.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.55, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
    src.connect(hp).connect(g).connect(c.destination);
    src.start(t0);
    for (const [f, s] of [[3100, 0], [4200, 0.04], [2500, 0.09], [5100, 0.14]] as const) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(f, t0 + s);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t0 + s + 0.09);
      og.gain.setValueAtTime(0.18, t0 + s); og.gain.exponentialRampToValueAtTime(0.0001, t0 + s + 0.09);
      o.connect(og).connect(c.destination); o.start(t0 + s); o.stop(t0 + s + 0.1);
    }
  });
}

/** Breve morso stile Pac-Man (waka). */
export function playPacmanChomp(atOffset = 0) {
  withAudio((c) => {
    const t = c.currentTime + 0.01 + atOffset;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(480, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.11);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.13);
  });
}

/** Rutto comico sintetizzato alla fine della mangiata del panino. */
export function playBurp() {
  withAudio((c) => {
    const t0 = c.currentTime + 0.02;
    const o = c.createOscillator(), lfo = c.createOscillator(), lfoG = c.createGain(), bp = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(92, t0); o.frequency.exponentialRampToValueAtTime(52, t0 + 0.65);
    lfo.type = "sine"; lfo.frequency.value = 26; lfoG.gain.value = 18;
    lfo.connect(lfoG).connect(o.frequency);
    bp.type = "bandpass"; bp.frequency.setValueAtTime(340, t0); bp.frequency.exponentialRampToValueAtTime(170, t0 + 0.65); bp.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.06);
    g.gain.setValueAtTime(0.4, t0 + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);
    o.connect(bp).connect(g).connect(c.destination);
    lfo.start(t0); o.start(t0); lfo.stop(t0 + 0.75); o.stop(t0 + 0.75);
  });
}
