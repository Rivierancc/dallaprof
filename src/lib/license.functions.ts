import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { cleanDemo, cleanMode, cleanPublicLicense, PLANS } from "@/lib/license";
import { slugFromPath, validSlug } from "@/lib/venue";
import { MASTER_ACCESS_EXPIRED } from "@/lib/master-access";

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
  if (!hash || s.data.master !== hash.slice(-16)) throw new Error(MASTER_ACCESS_EXPIRED);
}

const venueDb = createServerOnlyFn(async () => (await import("@/lib/venue.server")).venueAdmin());
const venueId = createServerOnlyFn(async () => (await import("@/lib/venue.server")).currentVenueId());

export const getLicenseState = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await admin()).rpc("license_state_v", { v: await venueId() });
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
  .handler(async ({ data }) => { await (await useSession(await masterConfig(data))).clear(); return { ok: true }; });

const FIELDS = ["business_name", "owner_email", "company_name", "vat", "address", "city", "sdi", "pec", "phone", "notes"] as const;
export type LicenseRow = Record<(typeof FIELDS)[number], string> & { status: string; plan: string; mode: string; expires_at: string | null; demo: ReturnType<typeof cleanDemo> };

export const getLicense = createServerFn({ method: "GET" })
  .inputValidator((d: { venueId: string }) => ({ venueId: String(d.venueId) }))
  .handler(async ({ data: q }): Promise<LicenseRow> => {
  await requireMaster();
  const { data, error } = await (await admin()).from("license").select("*").eq("venue_id", q.venueId).single();
  if (error) throw new Error(error.message);
  const out = Object.fromEntries(FIELDS.map((f) => [f, String(data[f] ?? "")])) as unknown as LicenseRow;
  return { ...out, status: data.status, plan: data.plan, mode: cleanMode(data.mode), expires_at: data.expires_at, demo: cleanDemo(data.demo) };
});

export const saveLicense = createServerFn({ method: "POST" })
  .inputValidator((d: LicenseRow & { venueId: string }) => {
    const row = Object.fromEntries(FIELDS.map((f) => [f, String(d[f] ?? "").trim().slice(0, f === "notes" ? 4000 : 200)])) as unknown as LicenseRow;
    if (!row.business_name) throw new Error("Il nome del locale è obbligatorio");
    if (!/^\S+@\S+\.\S+$/.test(row.owner_email)) throw new Error("Email del titolare non valida");
    const status = ["active", "demo", "expired"].includes(d.status) ? d.status : "demo";
    const plan = d.plan in PLANS ? d.plan : "prova";
    const expires_at = d.expires_at && /^\d{4}-\d{2}-\d{2}$/.test(d.expires_at) ? d.expires_at : null;
    return { row: { ...row, status, plan, mode: cleanMode(d.mode), expires_at, demo: cleanDemo(d.demo) }, venueId: String(d.venueId) };
  })
  .handler(async ({ data }) => {
    await requireMaster();
    const { error } = await (await admin()).from("license").update({ ...data.row, updated_at: new Date().toISOString() }).eq("venue_id", data.venueId);
    await (await admin()).from("venues").update({ name: data.row.business_name }).eq("id", data.venueId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Usato da saveProduct: blocca nuovi piatti oltre il limite della demo. */
export async function assertProductAllowed() {
  const db = await venueDb();
  const { data } = await db.rpc("license_state_v", { v: await venueId() });
  const l = cleanPublicLicense(data);
  if (l.state !== "demo") return;
  const { count } = await db.from("menu_products").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= l.demo.max_products) throw new Error("Hai raggiunto il limite della versione demo. Passa alla versione completa per piatti illimitati.");
}

export type VenueListItem = { id: string; slug: string; name: string; status: string; plan: string; mode: string; expires_at: string | null; owner_email: string };

export const listVenues = createServerFn({ method: "GET" }).handler(async (): Promise<VenueListItem[]> => {
  await requireMaster();
  const db = await admin();
  const [{ data: venues, error }, { data: lic }] = await Promise.all([
    db.from("venues").select("id, slug, name").order("created_at"),
    db.from("license").select("venue_id, status, plan, mode, expires_at, owner_email"),
  ]);
  if (error) throw new Error(error.message);
  return (venues ?? []).map((v) => {
    const l = (lic ?? []).find((x) => x.venue_id === v.id);
    const expired = l?.status === "expired" || (!!l?.expires_at && l.expires_at < new Date().toISOString().slice(0, 10));
    return { ...v, status: expired ? "expired" : l?.status ?? "expired", plan: l?.plan ?? "", mode: cleanMode(l?.mode), expires_at: l?.expires_at ?? null, owner_email: l?.owner_email ?? "" };
  });
});

export const createVenue = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; name: string; email: string; pin: string; status: string; plan: string; expires_at: string | null }) => {
    const slug = String(d.slug ?? "").trim().toLowerCase();
    if (!validSlug(slug) || slugFromPath("/" + slug) !== slug) throw new Error("Nome breve non valido: usa solo lettere minuscole, numeri e trattini (almeno 2), e non una parola già usata dall'app");
    const name = String(d.name ?? "").trim().slice(0, 200);
    if (!name) throw new Error("Il nome del locale è obbligatorio");
    const email = String(d.email ?? "").trim().slice(0, 200);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email del titolare non valida");
    const pin = String(d.pin ?? "");
    if (!/^\d{4,12}$/.test(pin)) throw new Error("Il PIN del personale deve avere da 4 a 12 cifre");
    const status = ["active", "demo", "expired"].includes(d.status) ? d.status : "demo";
    const plan = d.plan in PLANS ? d.plan : "prova";
    const expires_at = d.expires_at && /^\d{4}-\d{2}-\d{2}$/.test(d.expires_at) ? d.expires_at : null;
    return { slug, name, email, pin, status, plan, expires_at };
  })
  .handler(async ({ data }) => {
    await requireMaster();
    const db = await admin();
    const { hashPin } = await import("@/lib/staff.server");
    const { data: v, error } = await db.from("venues").insert({ slug: data.slug, name: data.name }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "Questo nome breve è già usato da un altro locale" : error.message);
    const rows = await Promise.all([
      db.from("license").insert({ venue_id: v.id, business_name: data.name, owner_email: data.email, status: data.status, plan: data.plan, expires_at: data.expires_at }),
      db.from("kiosk_banner").insert({ venue_id: v.id, offers_title: "Menu in offerta" }),
      db.from("staff_credentials").insert({ venue_id: v.id, pin_hash: await hashPin(data.pin) }),
    ]);
    const bad = rows.find((r) => r.error);
    if (bad?.error) { await db.from("venues").delete().eq("id", v.id); throw new Error(bad.error.message); }
    return { id: v.id, slug: data.slug };
  });

export const resetVenuePin = createServerFn({ method: "POST" })
  .inputValidator((d: { venueId: string; pin: string }) => {
    const pin = String(d.pin ?? "");
    if (!/^[0-9]{4,12}$/.test(pin)) throw new Error("Il PIN deve avere da 4 a 12 cifre");
    return { venueId: String(d.venueId), pin };
  })
  .handler(async ({ data }) => {
    await requireMaster();
    const { hashPin } = await import("@/lib/staff.server");
    const db = await admin();
    const row = { pin_hash: await hashPin(data.pin), version: crypto.randomUUID(), updated_at: new Date().toISOString() };
    const up = await db.from("staff_credentials").update(row).eq("venue_id", data.venueId).select("id");
    if (up.error) throw new Error("PIN non salvato");
    if (!up.data?.length) {
      const ins = await db.from("staff_credentials").insert({ ...row, venue_id: data.venueId });
      if (ins.error) throw new Error("PIN non salvato");
    }
    return { ok: true };
  });

export const getSuperManual = createServerFn({ method: "GET" }).handler(async () => {
  await requireMaster();
  return (await import("@/lib/superadmin-manual.server")).superManual();
});

// ---- Accesso con Face ID / impronta (passkey) ----
async function rp() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  return { origin, rpID: new URL(origin).hostname };
}
async function challengeSession(flags: Flags = {}) {
  const { staffSessionConfig } = await import("@/lib/staff.server");
  return useSession<{ ch?: string }>({ ...staffSessionConfig(flags), name: "master-pk", maxAge: 300 });
}
type PkRow = { id: string; public_key: string; counter: number; transports: string[]; label: string };
async function passkeys(): Promise<PkRow[]> {
  const { data } = await (await admin()).from("master_passkeys").select("*");
  return (data ?? []) as PkRow[];
}

export const passkeyInfo = createServerFn({ method: "GET" }).handler(async () => {
  const list = await passkeys();
  return { count: list.length };
});

export const listPasskeys = createServerFn({ method: "GET" }).handler(async () => {
  await requireMaster();
  const { data } = await (await admin()).from("master_passkeys").select("id,label,created_at").order("created_at");
  return (data ?? []) as { id: string; label: string; created_at: string }[];
});

export const deletePasskey = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    await requireMaster();
    await (await admin()).from("master_passkeys").delete().eq("id", data.id);
    return { ok: true };
  });

export const passkeyRegisterStart = createServerFn({ method: "POST" })
  .inputValidator((d: Flags) => ({ secure: !!d.secure, partitioned: !!d.partitioned }))
  .handler(async ({ data }) => {
    await requireMaster();
    const { generateRegistrationOptions } = (await import("reflect-metadata"), await import("@simplewebauthn/server"));
    const { rpID } = await rp();
    const opts = await generateRegistrationOptions({
      rpName: "Super Admin", rpID, userName: "superadmin", userDisplayName: "Super Admin",
      excludeCredentials: (await passkeys()).map((p) => ({ id: p.id, transports: p.transports as never })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "required", authenticatorAttachment: "platform" },
    });
    await (await challengeSession(data)).update({ ch: opts.challenge });
    return JSON.stringify(opts);
  });

export const passkeyRegisterFinish = createServerFn({ method: "POST" })
  .inputValidator((d: { response: unknown; label: string } & Flags) => ({ response: d.response, label: String(d.label ?? "").slice(0, 60), secure: !!d.secure, partitioned: !!d.partitioned }))
  .handler(async ({ data }) => {
    await requireMaster();
    const { verifyRegistrationResponse } = (await import("reflect-metadata"), await import("@simplewebauthn/server"));
    const { isoBase64URL } = (await import("reflect-metadata"), await import("@simplewebauthn/server/helpers"));
    const s = await challengeSession(data); const ch = s.data.ch; await s.clear();
    if (!ch) return { ok: false as const, reason: "Tempo scaduto, riprova" };
    const { origin, rpID } = await rp();
    try {
      const v = await verifyRegistrationResponse({ response: data.response as never, expectedChallenge: ch, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
      if (!v.verified || !v.registrationInfo) return { ok: false as const, reason: "Verifica non riuscita" };
      const c = v.registrationInfo.credential;
      const { error } = await (await admin()).from("master_passkeys").insert({ id: c.id, public_key: isoBase64URL.fromBuffer(c.publicKey), counter: c.counter, transports: c.transports ?? [], label: data.label || "Dispositivo" });
      if (error) return { ok: false as const, reason: "Dispositivo già collegato" };
      return { ok: true as const, reason: "" };
    } catch { return { ok: false as const, reason: "Verifica non riuscita" }; }
  });

export const passkeyLoginStart = createServerFn({ method: "POST" })
  .inputValidator((d: Flags) => ({ secure: !!d.secure, partitioned: !!d.partitioned }))
  .handler(async ({ data }) => {
    const { generateAuthenticationOptions } = (await import("reflect-metadata"), await import("@simplewebauthn/server"));
    const { rpID } = await rp();
    const opts = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: (await passkeys()).map((p) => ({ id: p.id, transports: p.transports as never })) });
    await (await challengeSession(data)).update({ ch: opts.challenge });
    return JSON.stringify(opts);
  });

export const passkeyLoginFinish = createServerFn({ method: "POST" })
  .inputValidator((d: { response: { id?: string } } & Flags) => ({ response: d.response, secure: !!d.secure, partitioned: !!d.partitioned }))
  .handler(async ({ data }) => {
    const { verifyAuthenticationResponse } = (await import("reflect-metadata"), await import("@simplewebauthn/server"));
    const { isoBase64URL } = (await import("reflect-metadata"), await import("@simplewebauthn/server/helpers"));
    const s = await challengeSession(data); const ch = s.data.ch; await s.clear();
    if (!ch) return { ok: false as const, reason: "Tempo scaduto, riprova" };
    const hash = await masterHash();
    if (!hash) return { ok: false as const, reason: "Imposta prima la password Master" };
    const pk = (await passkeys()).find((p) => p.id === String(data.response?.id ?? ""));
    if (!pk) return { ok: false as const, reason: "Dispositivo non riconosciuto" };
    const { origin, rpID } = await rp();
    try {
      const v = await verifyAuthenticationResponse({ response: data.response as never, expectedChallenge: ch, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: pk.id, publicKey: isoBase64URL.toBuffer(pk.public_key), counter: Number(pk.counter), transports: pk.transports as never } });
      if (!v.verified) return { ok: false as const, reason: "Verifica non riuscita" };
      await (await admin()).from("master_passkeys").update({ counter: v.authenticationInfo.newCounter }).eq("id", pk.id);
    } catch { return { ok: false as const, reason: "Verifica non riuscita" }; }
    const m = await useSession<{ master?: string }>(await masterConfig(data));
    await m.update({ master: hash.slice(-16) });
    return { ok: true as const, reason: "" };
  });
