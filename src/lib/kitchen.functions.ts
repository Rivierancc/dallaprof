import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import type { PaymentMethod } from "@/lib/customer";
import { validatePinChange } from "@/lib/access";

export const kitchenStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { staffStatus } = await import("@/lib/staff.server");
  return staffStatus();
});

export const unlockKitchen = createServerFn({ method: "POST" })
  .inputValidator((d: { pin: string; secure?: boolean; partitioned?: boolean }) => ({
    pin: String(d.pin).slice(0, 20),
    secure: !!d.secure,
    partitioned: !!d.partitioned,
  }))
  .handler(async ({ data }) => {
    const { staffCredentials, matchesStaffPin, staffSessionConfig } = await import("@/lib/staff.server");
    const credentials = await staffCredentials();
    if (!await matchesStaffPin(data.pin, credentials)) return { ok: false as const };
    const s = await useSession<{ unlocked?: boolean; version?: string }>(staffSessionConfig(data));
    await s.update({ unlocked: true, version: credentials?.version ?? "initial" });
    return { ok: true as const };
  });

export const lockKitchen = createServerFn({ method: "POST" })
  .inputValidator((d: { secure?: boolean; partitioned?: boolean }) => ({
    secure: !!d.secure,
    partitioned: !!d.partitioned,
  }))
  .handler(async ({ data }) => {
    const { staffSessionConfig } = await import("@/lib/staff.server");
    const s = await useSession(staffSessionConfig(data));
    await s.clear();
    return { ok: true as const };
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => {
    if (!["ready", "done"].includes(d.status)) throw new Error("Stato non valido");
    return { id: String(d.id), status: d.status };
  })
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const supabaseAdmin = await (await import("@/lib/venue.server")).venueAdmin();
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Cassa: solo dopo il pagamento SumUp l'ordine passa in cucina.
export const settleOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; paid: boolean; method?: PaymentMethod }) => {
    if (d.method && !["cash", "card"].includes(d.method)) throw new Error("Pagamento non valido");
    return { id: String(d.id), paid: !!d.paid, method: d.method ?? "card" };
  })
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const supabaseAdmin = await (await import("@/lib/venue.server")).venueAdmin();
    const patch = data.paid
      ? { status: "preparing", paid_at: new Date().toISOString(), payment_method: data.method }
      : { status: "cancelled" };
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", data.id)
      .eq("status", "awaiting_payment")
      .select("*");
    if (error) throw new Error(error.message);
    return { ok: true, order: rows?.[0] ?? null };
  });

export const changeStaffPin = createServerFn({ method: "POST" })
  .inputValidator((data: { current: string; next: string; confirmation: string; secure?: boolean; partitioned?: boolean }) => {
    validatePinChange(data.current, data.next, data.confirmation);
    return { current: data.current, next: data.next, secure: !!data.secure, partitioned: !!data.partitioned };
  })
  .handler(async ({ data }) => {
    const { requireStaff, staffCredentials, matchesStaffPin, hashPin, staffSessionConfig } = await import("@/lib/staff.server");
    await requireStaff();
    const credentials = await staffCredentials();
    if (!await matchesStaffPin(data.current, credentials)) throw new Error("PIN attuale errato");
    const supabaseAdmin = await (await import("@/lib/venue.server")).venueAdmin();
    const version = crypto.randomUUID();
    const row = { pin_hash: await hashPin(data.next), version, updated_at: new Date().toISOString() };
    // Compare the previous version so simultaneous changes cannot overwrite each other.
    const result = credentials
      ? await supabaseAdmin.from("staff_credentials").update(row).eq("version", credentials.version).select("id")
      : await supabaseAdmin.from("staff_credentials").insert(row).select("id");
    if (result.error || !result.data?.length) throw new Error("PIN non modificato. Riprova con il codice attuale.");
    const session = await useSession<{ unlocked?: boolean; version?: string }>(staffSessionConfig(data));
    await session.update({ unlocked: true, version });
    return { ok: true };
  });
