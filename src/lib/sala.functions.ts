import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { cleanRestaurant } from "@/lib/restaurant";
import { cleanMode } from "@/lib/license";
import type { CartItem } from "@/lib/menu";

type Flags = { secure?: boolean; partitioned?: boolean };
type TabletSession = { id?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const flags = (d: Flags) => ({ secure: !!d?.secure, partitioned: !!d?.partitioned });

const db = createServerOnlyFn(async () => (await import("@/lib/venue.server")).venueAdmin());
const sessionCfg = createServerOnlyFn(async (f: Flags = {}) => {
  const { staffSessionConfig } = await import("@/lib/staff.server");
  const { currentSlug } = await import("@/lib/venue.server");
  return { ...staffSessionConfig(f), name: `sala-tablet-${currentSlug()}` };
});

/** Tablet collegato a questo dispositivo, se esiste ancora. */
const currentTablet = createServerOnlyFn(async () => {
  const s = await useSession<TabletSession>(await sessionCfg());
  if (!s.data.id) return null;
  const { data } = await (await db()).from("restaurant_tablets").select("id, label, waiter").eq("id", s.data.id).maybeSingle();
  return data ?? null;
});

/** Sala: serve un tablet collegato; la cassa (PIN personale) può leggere e chiudere i conti. */
const requireSala = createServerOnlyFn(async (allowStaff: boolean) => {
  const t = await currentTablet();
  if (t) return t;
  if (allowStaff) {
    const { staffStatus } = await import("@/lib/staff.server");
    if ((await staffStatus()).unlocked) return { id: "", label: "Cassa", waiter: "" };
  }
  throw new Error("Accedi con il PIN del tablet");
});

const restaurantOn = createServerOnlyFn(async () => {
  const q = await db();
  const [{ data: b }, { data: l }] = await Promise.all([
    q.from("kiosk_banner").select("restaurant").maybeSingle(),
    q.from("license").select("mode").maybeSingle(),
  ]);
  const mode = cleanMode(l?.mode);
  return { mode, settings: cleanRestaurant(b?.restaurant), on: mode !== "fast_food" };
});

export const salaStatus = createServerFn({ method: "GET" }).handler(async () => {
  const r = await restaurantOn();
  const { data } = await (await db()).from("restaurant_tablets").select("id, label, waiter").order("position").order("created_at");
  return { ...r, tablets: data ?? [], me: await currentTablet() };
});

export const salaLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; pin: string } & Flags) => {
    if (!UUID.test(String(d?.id))) throw new Error("Tablet non valido");
    return { id: d.id, pin: String(d.pin ?? "").slice(0, 8), ...flags(d) };
  })
  .handler(async ({ data }) => {
    const { hashPin } = await import("@/lib/staff.server");
    const { data: t } = await (await db()).from("restaurant_tablets").select("id, pin_hash").eq("id", data.id).maybeSingle();
    const salt = t?.pin_hash?.split(":")[0];
    if (!t || !salt || (await hashPin(data.pin, salt)) !== t.pin_hash) return { ok: false as const };
    const s = await useSession<TabletSession>(await sessionCfg(data));
    await s.update({ id: t.id });
    return { ok: true as const };
  });

export const salaLogout = createServerFn({ method: "POST" })
  .inputValidator((d: Flags) => flags(d))
  .handler(async ({ data }) => {
    const s = await useSession<TabletSession>(await sessionCfg(data));
    await s.clear();
    return { ok: true as const };
  });

export type TabOrder = { id: string; order_number: number; status: string; total: number; created_at: string; items: CartItem[]; waiter: string };
export type OpenTab = { id: string; label: string; covers: number; cover_price: number; waiter: string; opened_at: string; orders: TabOrder[]; total: number };

export const salaState = createServerFn({ method: "GET" }).handler(async (): Promise<OpenTab[]> => {
  await requireSala(true);
  const q = await db();
  const { data: tabs, error } = await q.from("restaurant_tabs").select("*").is("closed_at", null).order("opened_at");
  if (error) throw new Error(error.message);
  if (!tabs?.length) return [];
  const { data: orders } = await q.from("orders").select("id, order_number, status, total, created_at, items, tab_id, partial_notes")
    .in("tab_id", tabs.map((t) => t.id)).neq("status", "cancelled").order("created_at");
  return tabs.map((t) => {
    const mine = (orders ?? []).filter((o) => o.tab_id === t.id).map((o) => ({
      id: o.id, order_number: o.order_number, status: o.status, total: Number(o.total), created_at: o.created_at,
      items: (o.items ?? []) as unknown as CartItem[], waiter: String((o.partial_notes as string[] | null)?.[0] ?? ""),
    }));
    const covers = Number(t.covers) * Number(t.cover_price);
    return { id: t.id, label: t.label, covers: t.covers, cover_price: Number(t.cover_price), waiter: t.waiter, opened_at: t.opened_at,
      orders: mine, total: Math.round((mine.reduce((s, o) => s + o.total, 0) + covers) * 100) / 100 };
  });
});

export const openTab = createServerFn({ method: "POST" })
  .inputValidator((d: { label: string; covers: number }) => {
    const label = String(d?.label ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
    if (!label) throw new Error("Scegli il tavolo");
    const covers = Math.max(0, Math.min(99, Math.floor(Number(d?.covers) || 0)));
    return { label, covers };
  })
  .handler(async ({ data }) => {
    const t = await requireSala(false);
    const r = await restaurantOn();
    if (!r.on) throw new Error("Modalità ristorante non attiva");
    const q = await db();
    const { data: open } = await q.from("restaurant_tabs").select("id").is("closed_at", null).eq("label", data.label).maybeSingle();
    if (open) return { id: open.id as string };
    const { data: row, error } = await q.from("restaurant_tabs").insert({
      label: data.label, covers: data.covers, cover_price: r.settings.cover_on ? r.settings.cover_price : 0, waiter: t.waiter || t.label,
    } as never).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const setCovers = createServerFn({ method: "POST" })
  .inputValidator((d: { tabId: string; covers: number }) => {
    if (!UUID.test(String(d?.tabId))) throw new Error("Tavolo non valido");
    return { tabId: d.tabId, covers: Math.max(0, Math.min(99, Math.floor(Number(d.covers) || 0))) };
  })
  .handler(async ({ data }) => {
    await requireSala(false);
    const { error } = await (await db()).from("restaurant_tabs").update({ covers: data.covers } as never).eq("id", data.tabId).is("closed_at", null);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sendComanda = createServerFn({ method: "POST" })
  .inputValidator((d: { tabId: string; lines: { productId: string; qty: number; note?: string }[] }) => {
    if (!UUID.test(String(d?.tabId))) throw new Error("Tavolo non valido");
    const lines = (Array.isArray(d.lines) ? d.lines : []).slice(0, 60)
      .filter((l) => UUID.test(String(l?.productId)))
      .map((l) => ({ productId: l.productId, qty: Math.max(1, Math.min(50, Math.floor(Number(l.qty) || 1))), note: String(l.note ?? "").trim().slice(0, 80) }));
    if (!lines.length) throw new Error("La comanda è vuota");
    return { tabId: d.tabId, lines };
  })
  .handler(async ({ data }) => {
    const t = await requireSala(false);
    const q = await db();
    const { data: tab } = await q.from("restaurant_tabs").select("id, label, covers").eq("id", data.tabId).is("closed_at", null).maybeSingle();
    if (!tab) throw new Error("Il tavolo è già stato chiuso");
    const { data: prods } = await q.from("menu_products").select("id, name, price, sold_out").in("id", data.lines.map((l) => l.productId));
    const items: CartItem[] = data.lines.map((l, i) => {
      const p = (prods ?? []).find((x) => x.id === l.productId);
      if (!p || p.sold_out) throw new Error("Un piatto non è più disponibile");
      return { id: `${p.id}-${i}`, productId: p.id, name: p.name, price: Number(p.price), qty: l.qty, ...(l.note ? { extras: [`📝 ${l.note}`] } : {}) };
    });
    const total = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
    const label = /^\d+$/.test(tab.label) ? `Tavolo ${tab.label}` : tab.label;
    const { error } = await q.from("orders").insert({
      items: items as never, total, status: "preparing", tab_id: tab.id,
      dine_option: `🍽️ ${label}${tab.covers ? ` · ${tab.covers} pers.` : ""}`,
      partial_notes: [t.waiter || t.label] as never,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Il cameriere ha portato i piatti pronti al tavolo. */
export const markServed = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => { if (!UUID.test(String(d?.orderId))) throw new Error("Comanda non valida"); return { orderId: d.orderId }; })
  .handler(async ({ data }) => {
    await requireSala(false);
    const { error } = await (await db()).from("orders").update({ status: "done" }).eq("id", data.orderId).eq("status", "ready").not("tab_id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Cassa: chiude il conto del tavolo con contanti o carta. */
export const closeTab = createServerFn({ method: "POST" })
  .inputValidator((d: { tabId: string; method: "cash" | "card" }) => {
    if (!UUID.test(String(d?.tabId))) throw new Error("Tavolo non valido");
    if (!["cash", "card"].includes(d.method)) throw new Error("Pagamento non valido");
    return { tabId: d.tabId, method: d.method };
  })
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const q = await db();
    const { data: tab } = await q.from("restaurant_tabs").select("*").eq("id", data.tabId).is("closed_at", null).maybeSingle();
    if (!tab) throw new Error("Conto già chiuso");
    const { data: orders } = await q.from("orders").select("total").eq("tab_id", tab.id).neq("status", "cancelled");
    const now = new Date().toISOString();
    const total = Math.round(((orders ?? []).reduce((s, o) => s + Number(o.total), 0) + Number(tab.covers) * Number(tab.cover_price)) * 100) / 100;
    await q.from("orders").update({ paid_at: now, payment_method: data.method }).eq("tab_id", tab.id).neq("status", "cancelled");
    const { error } = await q.from("restaurant_tabs").update({ closed_at: now, payment_method: data.method, total } as never).eq("id", tab.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, total };
  });
