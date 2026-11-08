import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
        const { data } = await db.from("kiosk_banner").select("company_logo_path").eq("id", 1).maybeSingle();
        const path = data?.company_logo_path ?? "";
        if (!/^logo-[a-z0-9-]+\.png$/.test(path)) {
          return Response.redirect(new URL("/favicon.png", request.url).toString(), 302);
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
