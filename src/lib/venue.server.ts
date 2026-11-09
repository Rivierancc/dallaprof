import { getRequest } from "@tanstack/react-start/server";
import { MAIN_VENUE, slugFromPath, validSlug, VENUE_HEADER } from "@/lib/venue";

/** Sigla del locale per la richiesta in corso: intestazione inviata dal browser, poi indirizzo della pagina. */
export function currentSlug(): string {
  try {
    const req = getRequest();
    const h = (req.headers.get(VENUE_HEADER) ?? "").toLowerCase();
    if (h && validSlug(h)) return h;
    const fromUrl = slugFromPath(new URL(req.url).pathname);
    if (fromUrl) return fromUrl;
    const ref = req.headers.get("referer");
    if (ref) { const r = slugFromPath(new URL(ref).pathname); if (r) return r; }
  } catch { /* fuori da una richiesta */ }
  return MAIN_VENUE;
}

const cache = new Map<string, { id: string; name: string; at: number }>();
export async function venueBySlug(slug: string) {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < 60_000) return hit;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("venues").select("id, name").eq("slug", slug).maybeSingle();
  if (!data) throw new Error("Locale non trovato");
  const v = { id: data.id, name: data.name, at: Date.now() };
  cache.set(slug, v);
  return v;
}
export const currentVenueId = async () => (await venueBySlug(currentSlug())).id;

const UNSCOPED = new Set(["venues"]);
const SINGLETON = new Set(["kiosk_banner", "license", "staff_credentials"]);

type Row = Record<string, unknown>;
const withVenue = (rows: Row | Row[], vid: string) => Array.isArray(rows) ? rows.map((r) => ({ ...r, venue_id: vid })) : { ...rows, venue_id: vid };

/** Client del database limitato a un solo locale: ogni lettura, modifica e inserimento resta nel suo locale. */
export function scoped<T extends object>(db: T, vid: string): T {
  return new Proxy(db, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (prop !== "from") return typeof value === "function" ? value.bind(target) : value;
      return (table: string) => {
        const qb = (target as unknown as { from: (t: string) => Record<string, (...a: unknown[]) => { eq: (c: string, v: string) => unknown }> }).from(table);
        if (UNSCOPED.has(table)) return qb;
        return {
          select: (...a: unknown[]) => qb["select"]!(...a).eq("venue_id", vid),
          update: (...a: unknown[]) => qb["update"]!(...a).eq("venue_id", vid),
          delete: (...a: unknown[]) => qb["delete"]!(...a).eq("venue_id", vid),
          insert: (rows: Row | Row[], opts?: unknown) => qb["insert"]!(withVenue(rows, vid), opts),
          upsert: (rows: Row | Row[], opts?: Row) => qb["upsert"]!(withVenue(rows, vid), opts ?? (SINGLETON.has(table) ? { onConflict: "venue_id" } : undefined)),
        };
      };
    },
  });
}

/** Database del servizio, già limitato al locale della richiesta. */
export async function venueAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return scoped(supabaseAdmin, await currentVenueId());
}
