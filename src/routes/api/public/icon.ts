import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MAIN_VENUE, slugFromPath } from "@/lib/venue";

// Icona dell'app (preferiti del browser, schermata Home): serve sempre il logo
// aziendale corrente, così cambiandolo da Admin l'icona si aggiorna da sola.
// Dato pubblico per scelta: lo stesso logo è già visibile nella pagina iniziale.
export const Route = createFileRoute("/api/public/icon")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const url = new URL(request.url);
        let seg = url.searchParams.get("v") ?? "";
        if (!url.searchParams.has("v")) {
          try { seg = new URL(request.headers.get("referer") ?? "").pathname.split("/")[1] ?? ""; } catch { seg = ""; }
        }
        const slug = slugFromPath("/" + seg) ?? MAIN_VENUE;
        const { data: venue } = await db.from("venues").select("id").eq("slug", slug).maybeSingle();
        const venueId = venue?.id ?? "00000000-0000-0000-0000-000000000001";
        const { data } = await db.from("kiosk_banner").select("company_logo_path").eq("venue_id", venueId).maybeSingle();
        const path = data?.company_logo_path ?? "";
        if (!/^logo-[a-z0-9-]+\.png$/.test(path)) {
          if (slug === MAIN_VENUE) return Response.redirect(new URL("/favicon.png", request.url).toString(), 302);
          // Locale senza logo: icona neutra, mai il logo di un altro locale.
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2a211a"/><text x="32" y="44" font-size="34" text-anchor="middle">🍔</text></svg>`;
          return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: file, error } = await supabaseAdmin.storage.from("menu-photos").download(path);
        if (error || !file) return new Response("Icona non trovata", { status: 404 });
        return new Response(await file.arrayBuffer(), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
