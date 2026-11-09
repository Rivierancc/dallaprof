import { supabase } from "@/integrations/supabase/client";
import { browserSlug, MAIN_VENUE } from "@/lib/venue";

const cache = new Map<string, Promise<string>>();

/** Identificativo del locale aperto nel browser. */
export function browserVenueId(): Promise<string> {
  const slug = browserSlug() ?? MAIN_VENUE;
  let p = cache.get(slug);
  if (!p) {
    p = Promise.resolve(supabase.from("venues").select("id").eq("slug", slug).maybeSingle()).then(({ data }) => {
      if (!data) { cache.delete(slug); throw new Error("Locale non trovato"); }
      return data.id;
    });
    cache.set(slug, p);
  }
  return p;
}
