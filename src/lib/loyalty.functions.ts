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

type Found = { id: string; firstName: string; favourites: string[]; firstOrder: boolean; birthday: boolean; gifts: string[] };
type Gift = { year: number; ids: string[]; used: boolean };
const cleanGift = (v: unknown): Gift | null => { const o = v as Partial<Gift> | null; return o && typeof o === "object" && Array.isArray(o.ids) ? { year: Number(o.year) || 0, ids: o.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 10), used: o.used === true } : null; };
const giftYear = () => new Date().getFullYear();
async function profile(c: { id: string; name: string; birth_day: number | null; birth_month: number | null; birthday_gift?: unknown }): Promise<Found> {
  const rules = cleanLoyalty((await (await db()).from("kiosk_banner").select("loyalty").maybeSingle()).data?.loyalty);
  const { data: orders } = await (await db()).from("orders").select("items").eq("customer_id", c.id).in("status", PAID_STATUSES).order("created_at", { ascending: false }).limit(50);
  return { id: c.id, firstName: c.name.trim().split(/\s+/)[0] ?? "", favourites: favourites(orders ?? []), firstOrder: !orders?.length, birthday: birthdayNear(c.birth_day, c.birth_month, rules.birthday_days), gifts: giftsFor(c, rules.birthday_days) };
}
/** Regali scelti dal ristoratore: valgono solo nei giorni del compleanno di quest'anno e una volta sola. */
function giftsFor(c: { birth_day: number | null; birth_month: number | null; birthday_gift?: unknown }, days: number) {
  const g = cleanGift(c.birthday_gift);
  return g && !g.used && g.year === giftYear() && birthdayNear(c.birth_day, c.birth_month, days) ? g.ids : [];
}

/** Il totem riconosce il cliente dal cellulare, solo dentro questo locale. */
export const findCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => ({ phone: normalizePhone(d?.phone) }))
  .handler(async ({ data }) => {
    if (!validPhone(data.phone)) return null;
    const { data: c } = await (await db()).from("venue_customers").select("id, name, birth_day, birth_month, birthday_gift").eq("phone", data.phone).maybeSingle();
    return c ? profile(c) : null;
  });

export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; name: string; day?: unknown; month?: unknown; consent: boolean }) => {
    const phone = normalizePhone(d?.phone);
    const name = String(d?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!validPhone(phone)) throw new Error("Numero di cellulare non valido");
    if (name.length < 2) throw new Error("Scrivi il tuo nome");
    if (d?.consent !== true) throw new Error("Serve il consenso privacy");
    const b = d.day || d.month ? validBirthday(d.day, d.month) : null;
    if ((d.day || d.month) && !b) throw new Error("Data di nascita non valida");
    return { phone, name, b };
  })
  .handler(async ({ data }) => {
    const q = await db();
    const { data: existing } = await q.from("venue_customers").select("id, name, birth_day, birth_month, birthday_gift").eq("phone", data.phone).maybeSingle();
    if (existing) return profile(existing);
    const { data: c, error } = await q.from("venue_customers").insert({ phone: data.phone, name: data.name, birth_day: data.b?.day ?? null, birth_month: data.b?.month ?? null } as never).select("id, name, birth_day, birth_month, birthday_gift").single();
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
    const { data: c } = await q.from("venue_customers").select("id, birthday_gift").eq("id", data.customerId).maybeSingle();
    if (!c) return { ok: false };
    const { data: linked } = await q.from("orders").update({ customer_id: c.id }).eq("id", data.orderId).is("customer_id", null).eq("status", "awaiting_payment").gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()).select("items");
    const g = cleanGift(c.birthday_gift);
    const usedGift = (linked ?? []).some((o) => (Array.isArray(o.items) ? o.items : []).some((i) => (i as { gift?: unknown }).gift === true));
    if (g && usedGift) await q.from("venue_customers").update({ birthday_gift: { ...g, used: true } as never }).eq("id", c.id);
    return { ok: true };
  });

export type CustomerRow = { id: string; name: string; phone: string; birth_day: number | null; birth_month: number | null; created_at: string; gift: Gift | null; orders: number; spent: number; last: string | null; history: { at: string; total: number; items: { name: string; qty: number }[] }[]; top: { name: string; qty: number }[] };

export const listCustomers = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerRow[]> => {
  await staffOnly();
  const q = await db();
  const { data: cs } = await q.from("venue_customers").select("id, name, phone, birth_day, birth_month, created_at, birthday_gift").order("created_at", { ascending: false });
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
    return { ...rest, gift: cleanGift(birthday_gift), orders: mine.length, spent: Math.round(mine.reduce((s, o) => s + Number(o.total), 0) * 100) / 100, last: mine[0]?.created_at ?? null, history: history.slice(0, 30), top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })) };
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
    const gift = data.ids.length ? { year: giftYear(), ids: data.ids, used: false } : null;
    const { error } = await (await db()).from("venue_customers").update({ birthday_gift: gift as never }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
