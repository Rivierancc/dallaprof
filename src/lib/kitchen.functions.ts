import { createServerFn } from "@tanstack/react-start";
import { useSession, getRequest } from "@tanstack/react-start/server";
import type { PaymentMethod } from "@/lib/customer";
import { createHash, timingSafeEqual } from "node:crypto";

type KitchenSession = { unlocked?: boolean };
type GateFlags = { secure?: boolean; partitioned?: boolean };

// Il totem vive in un iframe (serve cookie partitioned), il tablet apre la pagina da sola
// (serve cookie normale) e spesso in http (dove Secure non viene accettato).
// I due flag li decide il browser, che è l'unico a conoscere il contesto reale.
const sessionConfig = (f: GateFlags = {}) => {
  const partitioned = !!f.secure && !!f.partitioned;
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "kitchen-gate",
    maxAge: 60 * 60 * 14,
    cookie: {
      httpOnly: true,
      secure: partitioned,
      sameSite: partitioned ? ("none" as const) : ("lax" as const),
      ...(partitioned ? { partitioned: true } : {}),
      path: "/",
    },
  };
};

const matches = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export const kitchenStatus = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<KitchenSession>(sessionConfig());
  return { unlocked: !!s.data.unlocked };
});

export const unlockKitchen = createServerFn({ method: "POST" })
  .inputValidator((d: { pin: string; secure?: boolean; partitioned?: boolean }) => ({
    pin: String(d.pin).slice(0, 20),
    secure: !!d.secure,
    partitioned: !!d.partitioned,
  }))
  .handler(async ({ data }) => {
    const expected = process.env["KITCHEN_PIN"];
    if (!expected) throw new Error("PIN non configurato");
    if (!matches(data.pin, expected)) return { ok: false as const };
    const s = await useSession<KitchenSession>(sessionConfig(data));
    await s.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockKitchen = createServerFn({ method: "POST" })
  .inputValidator((d: { secure?: boolean; partitioned?: boolean }) => ({
    secure: !!d.secure,
    partitioned: !!d.partitioned,
  }))
  .handler(async ({ data }) => {
    const s = await useSession<KitchenSession>(sessionConfig(data));
    await s.clear();
    return { ok: true as const };
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => {
    if (!["ready", "done"].includes(d.status)) throw new Error("Stato non valido");
    return { id: String(d.id), status: d.status };
  })
  .handler(async ({ data }) => {
    const s = await useSession<KitchenSession>(sessionConfig());
    if (!s.data.unlocked) throw new Error("Non autorizzato");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const s = await useSession<KitchenSession>(sessionConfig());
    if (!s.data.unlocked) throw new Error("Non autorizzato");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
