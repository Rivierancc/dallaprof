import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { birthdayNear, cleanLoyalty, favourites, normalizePhone, PAID_STATUSES, validBirthday, validPhone } from "@/lib/loyalty";

// Ogni query passa da venueAdmin(): i clienti di un locale non sono mai visibili negli altri.
const db = createServerOnlyFn(async () => (await import("@/lib/venue.server")).venueAdmin());
const staffOnly = createServerOnlyFn(async () => { const { requireStaff } = await import("@/lib/staff.server"); await requireStaff(); });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getLoyalty = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await (await db()).from("kiosk_banner").select("loyalty").maybeSingle();
  return cleanLoyalty(data?.loyalty);
});

export const saveLoyalty = createServerFn({ method: "POST" })
  .inputValidator((d: { loyalty: unknown }) => ({ loyalty: cleanLoyalty(d?.loyalty) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await db()).from("kiosk_banner").update({ loyalty: data.loyalty as never });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

type Found = { id: string; firstName: string; favourites: string[]; firstOrder: boolean; birthday: boolean; greet: boolean; gifts: string[] };
type Gift = { year: number; ids: string[]; used: boolean };
const cleanGift = (v: unknown): Gift | null => { const o = v as Partial<Gift> | null; return o && typeof o === "object" && Array.isArray(o.ids) ? { year: Number(o.year) || 0, ids: o.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 10), used: o.used === true } : null; };
const giftYear = () => new Date().getFullYear();
/** Anno in cui il cliente ha già usato lo sconto compleanno (salvato accanto al regalo). */
const discYear = (v: unknown) => Number((v as { disc_year?: unknown } | null)?.disc_year) || 0;
async function profile(c: { id: string; name: string; birth_day: number | null; birth_month: number | null; birthday_gift?: unknown }): Promise<Found> {
  const rules = cleanLoyalty((await (await db()).from("kiosk_banner").select("loyalty").maybeSingle()).data?.loyalty);
  const { data: orders } = await (await db()).from("orders").select("items").eq("customer_id", c.id).in("status", PAID_STATUSES).order("created_at", { ascending: false }).limit(50);
  // Benvenuto una sola volta: basta un qualsiasi ordine già collegato (anche non ancora pagato).
  const near = birthdayNear(c.birth_day, c.birth_month, rules.birthday_days);
  const { count } = await (await db()).from("orders").select("id", { count: "exact", head: true }).eq("customer_id", c.id);
  return { id: c.id, firstName: c.name.trim().split(/\s+/)[0] ?? "", favourites: favourites(orders ?? []), firstOrder: !count, birthday: near && discYear(c.birthday_gift) !== giftYear(), greet: birthdayNear(c.birth_day, c.birth_month, 0) || (near && discYear(c.birthday_gift) !== giftYear()), gifts: giftsFor(c, rules.birthday_days) };
}
/** Regali scelti dal ristoratore: valgono solo nei giorni del compleanno di quest'anno e una volta sola. */
function giftsFor(c: { birth_day: number | null; birth_month: number | null; birthday_gift?: unknown }, days: number) {
  const g = cleanGift(c.birthday_gift);
  return g && !g.used && g.year === giftYear() && birthdayNear(c.birth_day, c.birth_month, days) ? g.ids : [];
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase().slice(0, 254);
/** Chi si iscrive solo con l'email ha un cellulare segnaposto unico, mai mostrato né cercato. */
const mailKey = (e: string) => `mail:${e}`;
const COLS = "id, name, birth_day, birth_month, birthday_gift";

/** Il totem riconosce il cliente dal cellulare o dall'email, solo dentro questo locale. */
export const findCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { phone?: string; email?: string }) => ({ phone: normalizePhone(d?.phone ?? ""), email: cleanEmail(d?.email) }))
  .handler(async ({ data }) => {
    const q = await db();
    if (EMAIL.test(data.email)) {
      const { data: c } = await q.from("venue_customers").select(COLS).ilike("email", data.email).maybeSingle();
      return c ? profile(c) : null;
    }
    if (!validPhone(data.phone)) return null;
    const { data: c } = await q.from("venue_customers").select(COLS).eq("phone", data.phone).maybeSingle();
    return c ? profile(c) : null;
  });

export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { phone?: string; email?: string; name: string; surname?: string; day?: unknown; month?: unknown; consent: boolean }) => {
    const rawPhone = normalizePhone(d?.phone ?? "");
    const email = cleanEmail(d?.email);
    const name = String(d?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    const surname = String(d?.surname ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (rawPhone && !validPhone(rawPhone)) throw new Error("Numero di cellulare non valido");
    if (email && !EMAIL.test(email)) throw new Error("Email non valida");
    if (!rawPhone && !email) throw new Error("Serve il cellulare o l'email");
    if (name.length < 2) throw new Error("Scrivi il tuo nome");
    if (d?.consent !== true) throw new Error("Serve il consenso privacy");
    const b = d.day || d.month ? validBirthday(d.day, d.month) : null;
    if ((d.day || d.month) && !b) throw new Error("Data di nascita non valida");
    return { phone: rawPhone, email, name, surname, b };
  })
  .handler(async ({ data }) => {
    const q = await db();
    if (data.phone) { const { data: e } = await q.from("venue_customers").select(COLS).eq("phone", data.phone).maybeSingle(); if (e) return profile(e); }
    if (data.email) { const { data: e } = await q.from("venue_customers").select(COLS).ilike("email", data.email).maybeSingle(); if (e) return profile(e); }
    const { data: c, error } = await q.from("venue_customers").insert({ phone: data.phone || mailKey(data.email), email: data.email, name: data.name, surname: data.surname, birth_day: data.b?.day ?? null, birth_month: data.b?.month ?? null } as never).select(COLS).single();
    if (error || !c) throw new Error("Registrazione non riuscita");
    return profile(c);
  });

/** Collega al cliente l'ordine appena creato dal totem (solo se nuovo e non ancora pagato). */
export const linkOrderCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; customerId: string }) => {
    if (!UUID.test(d?.orderId) || !UUID.test(d?.customerId)) throw new Error("Dati non validi");
    return d;
  })
  .handler(async ({ data }) => {
    const q = await db();
    const { data: c } = await q.from("venue_customers").select("id, birth_day, birth_month, birthday_gift").eq("id", data.customerId).maybeSingle();
    if (!c) return { ok: false };
    const { data: linked } = await q.from("orders").update({ customer_id: c.id }).eq("id", data.orderId).is("customer_id", null).eq("status", "awaiting_payment").gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()).select("items, discount");
    const g = cleanGift(c.birthday_gift);
    const usedGift = (linked ?? []).some((o) => (Array.isArray(o.items) ? o.items : []).some((i) => (i as { gift?: unknown }).gift === true));
    const rules = cleanLoyalty((await q.from("kiosk_banner").select("loyalty").maybeSingle()).data?.loyalty);
    // Nel periodo del compleanno lo sconto è sempre quello di compleanno: un ordine scontato lo consuma per quest'anno.
    const usedDisc = rules.birthday_pct > 0 && discYear(c.birthday_gift) !== giftYear() && birthdayNear(c.birth_day, c.birth_month, rules.birthday_days) && (linked ?? []).some((o) => Number(o.discount) > 0);
    if ((g && usedGift) || usedDisc) {
      const raw = (c.birthday_gift && typeof c.birthday_gift === "object" ? c.birthday_gift : {}) as Record<string, unknown>;
      await q.from("venue_customers").update({ birthday_gift: { ...raw, ...(g ? { ...g, used: g.used || usedGift } : { ids: [] }), ...(usedDisc ? { disc_year: giftYear() } : {}) } as never }).eq("id", c.id);
    }
    return { ok: true };
  });

export type CustomerRow = { id: string; name: string; surname: string; phone: string; email: string; birth_day: number | null; birth_month: number | null; created_at: string; gift: Gift | null; bdayUsed: boolean; orders: number; spent: number; last: string | null; history: { at: string; total: number; items: { name: string; qty: number }[] }[]; top: { name: string; qty: number }[] };

export const listCustomers = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerRow[]> => {
  await staffOnly();
  const q = await db();
  const { data: cs } = await q.from("venue_customers").select("id, name, surname, phone, email, birth_day, birth_month, created_at, birthday_gift").order("created_at", { ascending: false });
  const { data: os } = await q.from("orders").select("customer_id, items, total, created_at").not("customer_id", "is", null).in("status", PAID_STATUSES).order("created_at", { ascending: false });
  return (cs ?? []).map((c) => {
    const mine = (os ?? []).filter((o) => o.customer_id === c.id);
    const counts = new Map<string, number>();
    const history = mine.map((o) => {
      const items = (Array.isArray(o.items) ? o.items : []).map((i) => ({ name: String((i as { name?: unknown }).name ?? ""), qty: Number((i as { qty?: unknown }).qty) || 1 }));
      items.forEach((i) => counts.set(i.name, (counts.get(i.name) ?? 0) + i.qty));
      return { at: o.created_at, total: Number(o.total), items };
    });
    const { birthday_gift, ...rest } = c;
    return { ...rest, phone: rest.phone.startsWith("mail:") ? "" : rest.phone, gift: cleanGift(birthday_gift), bdayUsed: discYear(birthday_gift) === giftYear(), orders: mine.length, spent: Math.round(mine.reduce((s, o) => s + Number(o.total), 0) * 100) / 100, last: mine[0]?.created_at ?? null, history: history.slice(0, 30), top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })) };
  });
});

/** Cancellazione su richiesta del cliente (diritto all'oblio): gli ordini restano ma senza nome. */
export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => { if (!UUID.test(d?.id)) throw new Error("Cliente non valido"); return d; })
  .handler(async ({ data }) => {
    await staffOnly();
    const q = await db();
    await q.from("orders").update({ customer_id: null }).eq("customer_id", data.id);
    const { error } = await q.from("venue_customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Il ristoratore sceglie i prodotti da regalare al compleanno di quest'anno (nessuno = nessun regalo). */
export const setBirthdayGift = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; ids: string[] }) => {
    if (!UUID.test(d?.id)) throw new Error("Dati non validi");
    return { id: d.id, ids: (Array.isArray(d.ids) ? d.ids : []).filter((x) => typeof x === "string" && UUID.test(x)).slice(0, 10) };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const { data: cur } = await (await db()).from("venue_customers").select("birthday_gift").eq("id", data.id).maybeSingle();
    const dy = discYear(cur?.birthday_gift);
    const gift = data.ids.length ? { year: giftYear(), ids: data.ids, used: false, ...(dy ? { disc_year: dy } : {}) } : dy ? { ids: [], year: 0, used: true, disc_year: dy } : null;
    const { error } = await (await db()).from("venue_customers").update({ birthday_gift: gift as never }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
