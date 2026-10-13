import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type KitchenSession = { unlocked?: boolean };

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "kitchen-gate",
  maxAge: 60 * 60 * 14,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
});

const matches = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export const kitchenStatus = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<KitchenSession>(sessionConfig());
  return { unlocked: !!s.data.unlocked };
});

export const unlockKitchen = createServerFn({ method: "POST" })
  .inputValidator((d: { pin: string }) => ({ pin: String(d.pin).slice(0, 20) }))
  .handler(async ({ data }) => {
    const expected = process.env["KITCHEN_PIN"];
    if (!expected) throw new Error("PIN non configurato");
    if (!matches(data.pin, expected)) return { ok: false as const };
    const s = await useSession<KitchenSession>(sessionConfig());
    await s.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockKitchen = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<KitchenSession>(sessionConfig());
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
