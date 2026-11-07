import { ThemeGreeting } from "@/components/theme-layer";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveOrders } from "@/hooks/use-orders";
import { NewsTicker } from "@/components/news-ticker";
import { useKitchenFeatures } from "@/components/kitchen-features";
import { Button } from "@/components/ui/button";
import { audioReady, playSound, unlockAudio } from "@/lib/sounds";
import { useEffect, useRef, useState } from "react";
import { DisplayBoard } from "@/components/display-board";

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

function Display() {
  const orders = useLiveOrders(["preparing", "ready"]);
  const { partial, readySound, partialSound } = useKitchenFeatures();
  // Suoneria: il browser la tiene muta finché non si tocca lo schermo.
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    const check = window.setInterval(() => setSoundOn(audioReady()), 1000);
    return () => window.clearInterval(check);
  }, []);
  const prep = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready").reverse();
  // Suona solo quando un ordine diventa pronto, non all'apertura della pagina.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(ready.map((o) => o.id));
    const previous = seen.current;
    if (previous && [...ids].some((id) => !previous.has(id))) playSound(readySound);
    seen.current = ids;
  }, [ready, readySound]);
  // Avviso «parzialmente pronto»: suona la suoneria scelta per lui quando arriva
  // una scritta nuova. Togliendo la scritta e rimettendola suona di nuovo.
  const seenNotes = useRef<Set<string> | null>(null);
  useEffect(() => {
    const keys = new Set(prep.flatMap((o) => (o.partial_notes ?? []).map((n) => `${o.id}:${n}`)));
    const previous = seenNotes.current;
    if (partial && previous && [...keys].some((k) => !previous.has(k))) playSound(partialSound);
    seenNotes.current = keys;
  }, [prep, partial, partialSound]);

  return (
    <div className="flex h-screen flex-col">
    <main className="relative grid min-h-0 flex-1 grid-cols-2 portrait:grid-cols-1 portrait:grid-rows-2">
      <div className="pointer-events-none absolute inset-x-0 top-4 z-30"><ThemeGreeting /></div>
      {!soundOn && (
        <Button type="button" onClick={() => { void unlockAudio().then((ok) => { setSoundOn(ok); if (ok) playSound(readySound === "nessuno" ? "campanello" : readySound); }); }}
          className="tap absolute left-1/2 top-1/2 z-40 h-auto w-max max-w-[90%] -translate-x-1/2 -translate-y-1/2 whitespace-normal rounded-lg px-6 py-6 text-center font-display text-3xl">
          🔔 Tocca per attivare la suoneria
        </Button>
      )}
      <Link to="/" className="tap absolute bottom-4 right-4 z-10 rounded-xl bg-secondary/70 px-4 py-2 text-lg font-bold text-muted-foreground">
        ← Totem
      </Link>
      <DisplayBoard orders={orders} partial={partial} />
    </main>
    <NewsTicker />
    </div>
  );
}
