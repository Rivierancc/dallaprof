/** Regole del programma clienti: condivise da totem, Admin e funzioni server. */
export type Loyalty = { on: boolean; pct: number; welcome_pct: number; birthday_pct: number; birthday_days: number };
export const DEFAULT_LOYALTY: Loyalty = { on: false, pct: 0, welcome_pct: 0, birthday_pct: 0, birthday_days: 0 };

const pct = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(50, Math.max(0, n)) : 0; };
export function cleanLoyalty(v: unknown): Loyalty {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const days = Math.round(Number(o["birthday_days"]));
  return { on: o["on"] === true, pct: pct(o["pct"]), welcome_pct: pct(o["welcome_pct"]), birthday_pct: pct(o["birthday_pct"]), birthday_days: Number.isFinite(days) ? Math.min(7, Math.max(0, days)) : 0 };
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
/** Si applica solo lo sconto più alto tra compleanno, benvenuto (primo ordine) e fedeltà. */
export function discountFor(rules: Loyalty, c: { firstOrder: boolean; birthday: boolean }, subtotal: number): { pct: number; reason: DiscountReason; amount: number } {
  if (!rules.on) return { pct: 0, reason: null, amount: 0 };
  const options: [number, DiscountReason][] = [[rules.pct, "member"]];
  if (c.firstOrder) options.push([rules.welcome_pct, "welcome"]);
  if (c.birthday) options.push([rules.birthday_pct, "birthday"]);
  const [best, reason] = options.reduce((a, b) => (b[0] > a[0] ? b : a));
  if (best <= 0) return { pct: 0, reason: null, amount: 0 };
  return { pct: best, reason, amount: Math.round(Math.max(0, subtotal) * best) / 100 };
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
