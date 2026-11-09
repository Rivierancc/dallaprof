import { queryOptions } from "@tanstack/react-query";

export type LicenseState = "active" | "demo" | "expired";
export type DemoRules = { max_products: number; orders: "real" | "simulate"; badge: boolean };
export type PublicLicense = { state: LicenseState; plan: string; expires_at: string | null; demo: DemoRules; business_name: string };
export const PLANS = { prova: "Prova", mensile: "Mensile", stagionale: "Stagionale", annuale: "Annuale" } as const;

export function cleanDemo(raw: unknown): DemoRules {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = Math.trunc(Number(r.max_products));
  return {
    max_products: Number.isFinite(n) && n >= 0 ? Math.min(n, 999) : 6,
    orders: r.orders === "real" ? "real" : "simulate",
    badge: r.badge !== false,
  };
}

export function cleanPublicLicense(raw: unknown): PublicLicense {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const state: LicenseState = r.state === "demo" || r.state === "expired" ? r.state : "active";
  return { state, plan: String(r.plan ?? ""), expires_at: r.expires_at ? String(r.expires_at) : null, demo: cleanDemo(r.demo), business_name: String(r.business_name ?? "") };
}

/** Quanti piatti si possono ancora aggiungere: null = nessun limite. */
export function productsLeft(l: PublicLicense, current: number): number | null {
  if (l.state !== "demo") return null;
  return Math.max(0, l.demo.max_products - current);
}
/** Il totem può mandare ordini veri in cassa? */
export const realOrders = (l: PublicLicense) => l.state === "active" || (l.state === "demo" && l.demo.orders === "real");

export const licenseQueryOptions = queryOptions({
  queryKey: ["license"],
  queryFn: async () => (await import("@/lib/license.functions")).getLicenseState(),
  staleTime: 30_000,
  refetchInterval: 60_000,
});
