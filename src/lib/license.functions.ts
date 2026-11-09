import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { cleanDemo, cleanPublicLicense, PLANS } from "@/lib/license";

type Flags = { secure?: boolean; partitioned?: boolean };
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function masterConfig(flags: Flags = {}) {
  const { staffSessionConfig } = await import("@/lib/staff.server");
  const c = staffSessionConfig(flags);
  return { ...c, name: "master-gate", maxAge: 60 * 60 * 4 };
}
async function masterHash() {
  const { data } = await (await admin()).from("license").select("master_hash").eq("id", 1).maybeSingle();
  return data?.master_hash ?? null;
}
async function requireMaster() {
  const s = await useSession<{ master?: string }>(await masterConfig());
  const hash = await masterHash();
  if (!hash || s.data.master !== hash.slice(-16)) throw new Error("Accesso riservato");
}

export const getLicenseState = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await admin()).rpc("license_state");
  if (error) throw new Error("Licenza non leggibile");
  return cleanPublicLicense(data);
});

export const masterStatus = createServerFn({ method: "GET" }).handler(async () => {
  const hash = await masterHash();
  if (!hash) return { configured: false, unlocked: false };
  try { await requireMaster(); return { configured: true, unlocked: true }; } catch { return { configured: true, unlocked: false }; }
});

export const masterLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; newPassword?: string } & Flags) => ({
    password: String(d.password ?? "").slice(0, 100), newPassword: d.newPassword ? String(d.newPassword).slice(0, 100) : "",
    secure: !!d.secure, partitioned: !!d.partitioned,
  }))
  .handler(async ({ data }) => {
    const { hashPin, staffStatus } = await import("@/lib/staff.server");
    let hash = await masterHash();
    if (!hash) {
      // Prima configurazione: serve essere già entrati col PIN del personale.
      if (!(await staffStatus()).unlocked) return { ok: false as const, reason: "Prima entra in Admin con il PIN del personale" };
      if (data.newPassword.length < 8) return { ok: false as const, reason: "La password deve avere almeno 8 caratteri" };
      hash = await hashPin(data.newPassword);
      const { error } = await (await admin()).from("license").update({ master_hash: hash }).eq("id", 1);
      if (error) throw new Error(error.message);
    } else {
      const [salt] = hash.split(":");
      if ((await hashPin(data.password, salt)) !== hash) return { ok: false as const, reason: "Password errata" };
      if (data.newPassword) {
        if (data.newPassword.length < 8) return { ok: false as const, reason: "La nuova password deve avere almeno 8 caratteri" };
        hash = await hashPin(data.newPassword);
        await (await admin()).from("license").update({ master_hash: hash }).eq("id", 1);
      }
    }
    const s = await useSession<{ master?: string }>(await masterConfig(data));
    await s.update({ master: hash.slice(-16) });
    return { ok: true as const, reason: "" };
  });

export const masterLogout = createServerFn({ method: "POST" })
  .inputValidator((d: Flags) => ({ secure: !!d.secure, partitioned: !!d.partitioned }))
  .handler(async ({ data }) => { (await useSession(await masterConfig(data))).clear(); return { ok: true }; });

const FIELDS = ["business_name", "owner_email", "company_name", "vat", "address", "city", "sdi", "pec", "phone", "notes"] as const;
export type LicenseRow = Record<(typeof FIELDS)[number], string> & { status: string; plan: string; expires_at: string | null; demo: ReturnType<typeof cleanDemo> };

export const getLicense = createServerFn({ method: "GET" }).handler(async (): Promise<LicenseRow> => {
  await requireMaster();
  const { data, error } = await (await admin()).from("license").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  const out = Object.fromEntries(FIELDS.map((f) => [f, String(data[f] ?? "")])) as LicenseRow;
  return { ...out, status: data.status, plan: data.plan, expires_at: data.expires_at, demo: cleanDemo(data.demo) };
});

export const saveLicense = createServerFn({ method: "POST" })
  .inputValidator((d: LicenseRow) => {
    const row = Object.fromEntries(FIELDS.map((f) => [f, String(d[f] ?? "").trim().slice(0, f === "notes" ? 4000 : 200)])) as LicenseRow;
    if (!row.business_name) throw new Error("Il nome del locale è obbligatorio");
    if (!/^\S+@\S+\.\S+$/.test(row.owner_email)) throw new Error("Email del titolare non valida");
    const status = ["active", "demo", "expired"].includes(d.status) ? d.status : "demo";
    const plan = d.plan in PLANS ? d.plan : "prova";
    const expires_at = d.expires_at && /^\d{4}-\d{2}-\d{2}$/.test(d.expires_at) ? d.expires_at : null;
    return { ...row, status, plan, expires_at, demo: cleanDemo(d.demo) };
  })
  .handler(async ({ data }) => {
    await requireMaster();
    const { error } = await (await admin()).from("license").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Usato da saveProduct: blocca nuovi piatti oltre il limite della demo. */
export async function assertProductAllowed() {
  const db = await admin();
  const { data } = await db.rpc("license_state");
  const l = cleanPublicLicense(data);
  if (l.state !== "demo") return;
  const { count } = await db.from("menu_products").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= l.demo.max_products) throw new Error("Hai raggiunto il limite della versione demo. Passa alla versione completa per piatti illimitati.");
}
