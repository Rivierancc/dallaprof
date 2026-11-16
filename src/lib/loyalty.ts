/** Regole del programma clienti: condivise da totem, Admin e funzioni server. */
/** pct = vecchio sconto fedeltà in %; step_off € di sconto ogni step_every € di spesa (dal 2° ordine). */
export type Loyalty = { on: boolean; pct: number; welcome_pct: number; birthday_pct: number; birthday_days: number; step_off: number; step_every: number; birthday_msg: string; birthday_song: boolean };
export const DEFAULT_LOYALTY: Loyalty = { on: false, pct: 0, welcome_pct: 0, birthday_pct: 0, birthday_days: 0, step_off: 0, step_every: 10, birthday_msg: "Tanti auguri di buon compleanno!", birthday_song: true };
const money = (v: unknown, min: number, max: number, def: number) => { const n = Math.round(Number(v) * 100) / 100; return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

const pct = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(50, Math.max(0, n)) : 0; };
export function cleanLoyalty(v: unknown): Loyalty {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const days = Math.round(Number(o["birthday_days"]));
  return { on: o["on"] === true, pct: pct(o["pct"]), welcome_pct: pct(o["welcome_pct"]), birthday_pct: pct(o["birthday_pct"]), birthday_days: Number.isFinite(days) ? Math.min(7, Math.max(0, days)) : 0, step_off: money(o["step_off"], 0, 100, 0), step_every: money(o["step_every"] ?? 10, 1, 1000, 10), birthday_msg: typeof o["birthday_msg"] === "string" && o["birthday_msg"].trim() ? o["birthday_msg"].trim().slice(0, 80) : DEFAULT_LOYALTY.birthday_msg, birthday_song: o["birthday_song"] !== false };
}

/** Solo cifre; il prefisso +39/0039 viene tolto così lo stesso numero non si registra due volte. */
export function normalizePhone(raw: string) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0039")) d = d.slice(4); else if (d.startsWith("39") && d.length > 10) d = d.slice(2);
  return d;
}
export const validPhone = (p: string) => /^\d{9,13}$/.test(p);

export function validBirthday(day: unknown, month: unknown): { day: number; month: number } | null {
  const d = Number(day), m = Number(month);
  if (!Number.isInteger(d) || !Number.isInteger(m) || m < 1 || m > 12 || d < 1) return null;
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
  return d <= max ? { day: d, month: m } : null;
}

/** Il compleanno cade oggi o nei prossimi `days` giorni (0 = solo oggi). */
export function birthdayNear(day: number | null, month: number | null, days: number, now = new Date()) {
  if (!day || !month) return false;
  for (let i = 0; i <= days; i++) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (t.getDate() === day && t.getMonth() + 1 === month) return true;
  }
  return false;
}

export type DiscountReason = "birthday" | "welcome" | "member" | null;
/** Si applica solo lo sconto più alto (in euro) tra compleanno, benvenuto (solo primo ordine, in %) e fedeltà (% e/o X € ogni Y € di spesa). */
export function discountFor(rules: Loyalty, c: { firstOrder: boolean; birthday: boolean }, subtotal: number): { pct: number; reason: DiscountReason; amount: number; step: boolean } {
  const none = { pct: 0, reason: null, amount: 0, step: false };
  if (!rules.on) return none;
  const sub = Math.max(0, subtotal);
  const byPct = (p: number) => Math.round(sub * p) / 100;
  const steps = rules.step_off > 0 && rules.step_every > 0 ? Math.round(Math.floor(sub / rules.step_every + 1e-9) * rules.step_off * 100) / 100 : 0;
  // Il compleanno (una volta all'anno) prevale sempre e non si somma mai agli altri sconti.
  if (c.birthday && rules.birthday_pct > 0) { const a = Math.min(byPct(rules.birthday_pct), sub); return a > 0 ? { pct: rules.birthday_pct, reason: "birthday", amount: a, step: false } : none; }
  const options: { pct: number; reason: DiscountReason; amount: number; step: boolean }[] = [];
  if (c.firstOrder) options.push({ pct: rules.welcome_pct, reason: "welcome", amount: byPct(rules.welcome_pct), step: false });
  else {
    options.push({ pct: rules.pct, reason: "member", amount: byPct(rules.pct), step: false });
    options.push({ pct: 0, reason: "member", amount: steps, step: true });
  }
  const best = options.reduce((a, b) => (b.amount > a.amount ? b : a), none);
  return best.amount > 0 ? { ...best, amount: Math.min(best.amount, sub) } : none;
}

/** Piatti più ordinati dal cliente, dal più frequente. */
export function favourites(orders: { items: unknown }[], limit = 3) {
  const count = new Map<string, number>();
  for (const o of orders) for (const it of Array.isArray(o.items) ? o.items : []) {
    const id = (it as { productId?: unknown })?.productId;
    if (typeof id === "string") count.set(id, (count.get(id) ?? 0) + Math.max(1, Number((it as { qty?: unknown }).qty) || 1));
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}

export const PAID_STATUSES = ["preparing", "ready", "done"];
