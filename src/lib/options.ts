// Regole condivise tra pannello e totem: scelte obbligatorie, limite extra, menu combinati, suggeriti.
export type ChoiceOption = { name: string; price: number };
export type ChoiceGroup = { name: string; min: number; max: number; options: ChoiceOption[] };
// price = prezzo d'offerta (0 = omaggio, null = prezzo normale); min = spesa minima (0 = sempre).
export type Suggest = { on: boolean; price: number | null; min: number };

const num = (v: unknown) => Number(String(v ?? "").replace(",", "."));
const money = (v: unknown) => { const n = num(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; };
const int = (v: unknown, lo: number, hi: number) => { const n = Math.round(num(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };

export const cleanMaxExtras = (v: unknown) => int(v, 0, 20);

export function cleanGroups(v: unknown): ChoiceGroup[] {
  return (Array.isArray(v) ? v : []).slice(0, 8).map((g) => {
    const o = (g ?? {}) as Record<string, unknown>;
    const options = (Array.isArray(o.options) ? o.options : []).slice(0, 20)
      .map((x) => { const r = (x ?? {}) as Record<string, unknown>; return { name: String(r.name ?? "").trim().slice(0, 40), price: money(r.price) }; })
      .filter((x) => x.name);
    const max = int(o.max, 1, Math.max(1, options.length || 1));
    return { name: String(o.name ?? "").trim().slice(0, 40), min: int(o.min, 0, max), max, options };
  }).filter((g) => g.name);
}

export const cleanCombo = (v: unknown): string[] =>
  [...new Set((Array.isArray(v) ? v : []).map((x) => String(x ?? "")).filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 10);

export function cleanSuggest(v: unknown): Suggest {
  const o = (v ?? {}) as Record<string, unknown>;
  const raw = o.price;
  return { on: !!o.on, price: raw === null || raw === undefined || raw === "" ? null : money(raw), min: money(o.min) };
}

// Ogni gruppo deve avere tra min e max scelte; finché non è così il piatto non si aggiunge.
export const groupsValid = (groups: ChoiceGroup[], picks: Record<string, string[]>) =>
  groups.every((g) => { const n = (picks[g.name] ?? []).length; return n >= g.min && n <= g.max; });

// 0 = senza limite.
export const canAddExtra = (max: number, chosen: number) => max === 0 || chosen < max;

// Prezzo del suggerito in base alla spesa del resto del carrello.
export function suggestPrice(normal: number, s: Suggest, spent: number) {
  if (s.price === null || spent < s.min) return normal;
  return Math.min(normal, s.price);
}
