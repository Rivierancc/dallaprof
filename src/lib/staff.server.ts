import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { validStaffVersion } from "@/lib/access";

export type GateFlags = { secure?: boolean; partitioned?: boolean };
export type StaffSession = { unlocked?: boolean; version?: string };
export function staffSessionConfig(flags: GateFlags = {}) {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("Accesso personale non configurato");
  const partitioned = !!flags.secure && !!flags.partitioned;
  return { password, name: "kitchen-gate", maxAge: 60 * 60 * 14,
    cookie: { httpOnly: true, secure: !!flags.secure, sameSite: partitioned ? "none" as const : "lax" as const,
      ...(partitioned ? { partitioned: true } : {}), path: "/" } };
}

export async function staffCredentials() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("staff_credentials").select("pin_hash,version").eq("id", 1).maybeSingle();
  if (error) throw new Error("Impossibile verificare il PIN del personale");
  return data;
}

export async function staffStatus() {
  const session = await useSession<StaffSession>(staffSessionConfig());
  if (!session.data.unlocked) return { unlocked: false };
  const credentials = await staffCredentials();
  return { unlocked: validStaffVersion(session.data, credentials?.version ?? "initial") };
}

export async function requireStaff() {
  if (!(await staffStatus()).unlocked) throw new Error("Inserisci il PIN del personale");
}

const equal = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
export async function hashPin(pin: string, salt: string = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return `${salt}:${Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function matchesStaffPin(pin: string, credentials: Awaited<ReturnType<typeof staffCredentials>>) {
  if (credentials) {
    const [salt] = credentials.pin_hash.split(":");
    return !!salt && equal(await hashPin(pin, salt), credentials.pin_hash);
  }
  const initial = process.env["KITCHEN_PIN"];
  if (!initial) throw new Error("PIN non configurato");
  return equal(pin, initial);
}