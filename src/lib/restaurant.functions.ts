import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { cleanRestaurant, validTabletPin } from "@/lib/restaurant";
import { cleanMode } from "@/lib/license";

const db = createServerOnlyFn(async () => (await import("@/lib/venue.server")).venueAdmin());
const staffOnly = createServerOnlyFn(async () => { const { requireStaff } = await import("@/lib/staff.server"); await requireStaff(); });
const hash = createServerOnlyFn(async (pin: string) => (await import("@/lib/staff.server")).hashPin(pin));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txt = (v: unknown, n = 40) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n);

/** Impostazioni ristorante + modalità decisa dal Super Admin (sola lettura per il locale). */
export const getRestaurant = createServerFn({ method: "GET" }).handler(async () => {
  const q = await db();
  const [{ data: b }, { data: l }] = await Promise.all([
    q.from("kiosk_banner").select("restaurant").maybeSingle(),
    q.from("license").select("mode").maybeSingle(),
  ]);
  return { mode: cleanMode(l?.mode), settings: cleanRestaurant(b?.restaurant) };
});

export const saveRestaurant = createServerFn({ method: "POST" })
  .inputValidator((d: { settings: unknown }) => ({ settings: cleanRestaurant(d?.settings) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await db()).from("kiosk_banner").update({ restaurant: data.settings as never });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type Tablet = { id: string; label: string; waiter: string; fullscreen: boolean };

export const listTablets = createServerFn({ method: "GET" }).handler(async (): Promise<Tablet[]> => {
  await staffOnly();
  const { data, error } = await (await db()).from("restaurant_tablets").select("id, label, waiter, fullscreen").order("position").order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addTablet = createServerFn({ method: "POST" })
  .inputValidator((d: { label: string; waiter: string; pin: string }) => {
    const label = txt(d?.label);
    if (!label) throw new Error("Scrivi il nome del tablet");
    if (!validTabletPin(d?.pin)) throw new Error("Il PIN deve avere 4 cifre");
    return { label, waiter: txt(d?.waiter), pin: d.pin };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await db()).from("restaurant_tablets").insert({ label: data.label, waiter: data.waiter, pin_hash: await hash(data.pin), position: Date.now() % 1e9 } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateTablet = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; label: string; waiter: string; pin?: string; fullscreen?: boolean }) => {
    if (!UUID.test(String(d?.id))) throw new Error("Tablet non valido");
    const label = txt(d.label);
    if (!label) throw new Error("Scrivi il nome del tablet");
    if (d.pin && !validTabletPin(d.pin)) throw new Error("Il PIN deve avere 4 cifre");
    return { id: d.id, label, waiter: txt(d.waiter), pin: d.pin || "", fullscreen: d.fullscreen === true };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const patch: { label: string; waiter: string; fullscreen: boolean; pin_hash?: string } = { label: data.label, waiter: data.waiter, fullscreen: data.fullscreen };
    if (data.pin) patch.pin_hash = await hash(data.pin);
    const { error } = await (await db()).from("restaurant_tablets").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteTablet = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => { if (!UUID.test(String(d?.id))) throw new Error("Tablet non valido"); return { id: d.id }; })
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await db()).from("restaurant_tablets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
