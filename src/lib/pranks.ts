/** Configurazione e logica degli scherzetti opzionali sul totem (schermo crepato e burger Pac-Man). */
export type PrankKind = "crack" | "pacman";

export type PrankRule = {
  on: boolean;
  /** Ogni quanti ordini scatta a sorpresa (1 = ogni ordine, 5 = 1 volta a caso ogni 5 ordini). */
  everyOrders: number;
  /** A quale tocco dell'ordine scatta lo scherzetto (1..20). */
  clicks: number;
};

export type PranksConfig = {
  crack: PrankRule;
  pacman: PrankRule;
};

export type PrankCounter = {
  /** Indice corrente nel blocco 0..everyOrders-1. */
  pos: number;
  /** Indice estratto a sorte nel blocco corrente in cui lo scherzetto scatta. */
  target: number;
  /** Valore di everyOrders usato quando è stato estratto il blocco. */
  blockSize: number;
};

export type PrankCounters = Record<PrankKind, PrankCounter>;

export const DEFAULT_PRANKS: PranksConfig = {
  crack: { on: false, everyOrders: 5, clicks: 3 },
  pacman: { on: false, everyOrders: 5, clicks: 3 },
};

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function cleanRule(raw: unknown, fallback: PrankRule): PrankRule {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const r = raw as Record<string, unknown>;
  return {
    on: r["on"] === true,
    everyOrders: clampInt(r["everyOrders"], fallback.everyOrders, 1, 30),
    clicks: clampInt(r["clicks"], fallback.clicks, 1, 20),
  };
}

export function cleanPranks(settings: Record<string, unknown> | null | undefined): PranksConfig {
  const raw = settings && typeof settings === "object" ? settings["pranks"] : undefined;
  if (!raw || typeof raw !== "object") return { crack: { ...DEFAULT_PRANKS.crack }, pacman: { ...DEFAULT_PRANKS.pacman } };
  const p = raw as Record<string, unknown>;
  return {
    crack: cleanRule(p["crack"], DEFAULT_PRANKS.crack),
    pacman: cleanRule(p["pacman"], DEFAULT_PRANKS.pacman),
  };
}

function stepCounter(prev: PrankCounter | undefined, everyOrders: number, rand: () => number): { hit: boolean; next: PrankCounter } {
  const n = Math.max(1, Math.round(everyOrders));
  const reset = !prev || prev.blockSize !== n || prev.pos >= n;
  const pos = reset ? 0 : prev.pos;
  const target = reset ? Math.floor(Math.min(0.999999, Math.max(0, rand())) * n) : prev.target;
  const hit = pos === target;
  const nextPos = pos + 1;
  return {
    hit,
    next: nextPos >= n ? { pos: 0, target: Math.floor(Math.min(0.999999, Math.max(0, rand())) * n), blockSize: n } : { pos: nextPos, target, blockSize: n },
  };
}

/**
 * Chiamata all'avvio di una nuova sessione d'ordine sul totem.
 * Garantisce al massimo 1 scherzetto per ordine; se entrambi estratti nello stesso ordine ne sceglie uno a caso.
 */
export function pickSessionPrank(
  cfg: PranksConfig,
  counters: Partial<PrankCounters>,
  rand: () => number = Math.random,
): { selected: { kind: PrankKind; clicks: number } | null; counters: Partial<PrankCounters> } {
  const next: Partial<PrankCounters> = { ...counters };
  const hits: PrankKind[] = [];

  for (const kind of ["crack", "pacman"] as const) {
    const rule = cfg[kind];
    if (!rule.on) continue;
    const step = stepCounter(counters[kind], rule.everyOrders, rand);
    next[kind] = step.next;
    if (step.hit) hits.push(kind);
  }

  if (hits.length === 0) return { selected: null, counters: next };
  const chosen = hits.length === 1 ? hits[0]! : hits[rand() < 0.5 ? 0 : 1]!;
  return { selected: { kind: chosen, clicks: cfg[chosen].clicks }, counters: next };
}