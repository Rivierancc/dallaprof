import { ThemeGreeting } from "@/components/theme-layer";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveOrders } from "@/hooks/use-orders";
import { NewsTicker } from "@/components/news-ticker";
import { useKitchenFeatures } from "@/components/kitchen-features";
import { playReadySound } from "@/lib/sounds";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Display ordini — Totem Burger" },
      { name: "description", content: "Stato degli ordini: in preparazione e pronti." },
      { property: "og:title", content: "Display ordini — Totem Burger" },
      { property: "og:description", content: "Stato degli ordini: in preparazione e pronti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Display,
});

const pad = (n: number) => String(n).padStart(2, "0");

function Display() {
  const orders = useLiveOrders(["preparing", "ready"]);
  const { partial, readySound } = useKitchenFeatures();
  const prep = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready").reverse();
  // Suona solo quando un ordine diventa pronto, non all'apertura della pagina.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(ready.map((o) => o.id));
    if (seen.current && [...ids].some((id) => !seen.current!.has(id))) playReadySound(readySound);
    seen.current = ids;
  }, [ready, readySound]);

  return (
    <div className="flex h-screen flex-col">
    <main className="relative grid min-h-0 flex-1 grid-cols-2 portrait:grid-cols-1 portrait:grid-rows-2">
      <div className="pointer-events-none absolute inset-x-0 top-4 z-30"><ThemeGreeting /></div>
      <Link to="/" className="tap absolute bottom-4 right-4 z-10 rounded-xl bg-secondary/70 px-4 py-2 text-lg font-bold text-muted-foreground">
        ← Totem
      </Link>
      <section className="flex flex-col p-8">
        <h2 className="mb-8 font-display text-8xl text-muted-foreground">In preparazione</h2>
        <div className="grid grid-cols-3 content-start gap-5">
          {prep.map((o) => (
            <div key={o.id} className="rounded-3xl bg-card py-6 text-center">
              <div className="font-display text-8xl">{pad(o.order_number)}</div>
              {partial && (o.partial_notes ?? []).map((n, i) => (
                <p key={i} className="animate-pop mx-2 mt-2 rounded-xl bg-accent px-2 py-1 text-xl font-bold text-accent-foreground">✓ {n}</p>
              ))}
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col bg-success p-8 text-success-foreground">
        <h2 className="mb-8 font-display text-8xl">Pronto ✓</h2>
        <div className="grid grid-cols-2 content-start gap-5">
          {ready.map((o) => (
            <div key={o.id} className="animate-pop rounded-3xl bg-background py-8 text-center font-display text-9xl text-success">
              {pad(o.order_number)}
            </div>
          ))}
        </div>
      </section>
    </main>
    <NewsTicker />
    </div>
  );
}
