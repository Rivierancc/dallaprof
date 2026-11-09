// Ogni locale ha un indirizzo dedicato: /<sigla>/cucina, /<sigla>/cassa, ...
// Senza sigla si apre il locale principale.
export const MAIN_VENUE = "dallaprof";
export const VENUE_HEADER = "x-venue";

const RESERVED = new Set([
  "cucina", "cassa", "display", "menu", "admin", "manuale", "ordine-confermato", "superadmin",
  "api", "_serverFn", "assets", "src", "node_modules", "@vite", "@id", "@fs", "@react-refresh",
]);

export const validSlug = (s: string) => /^[a-z0-9][a-z0-9-]{1,39}$/.test(s);

/** Sigla presente in testa al percorso, oppure null. */
export function slugFromPath(path: string): string | null {
  const seg = path.split("/")[1] ?? "";
  if (!seg || RESERVED.has(seg) || seg.includes(".")) return null;
  const s = decodeURIComponent(seg).toLowerCase();
  return validSlug(s) ? s : null;
}

/** Sigla del locale aperto nel browser (null sul server). */
export function browserSlug(): string | null {
  if (typeof window === "undefined") return null;
  return slugFromPath(window.location.pathname);
}

/** Toglie la sigla dal percorso, così le pagine restano le stesse per tutti i locali. */
export function stripSlug(path: string): { slug: string | null; path: string } {
  const slug = slugFromPath(path);
  if (!slug) return { slug: null, path };
  const raw = path.split("/")[1]!;
  return { slug, path: path.slice(raw.length + 1) || "/" };
}
