import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { closeTab, salaState } from "@/lib/sala.functions";
import { getRestaurant } from "@/lib/restaurant.functions";
import { euro } from "@/lib/menu";

/** Cassa in modalità ristorante: conti aperti dei tavoli con totale progressivo. */
export function OpenTabs() {
  const info = useServerFn(getRestaurant);
  const state = useServerFn(salaState);
  const close = useServerFn(closeTab);
  const qc = useQueryClient();
  const { data: r } = useQuery({ queryKey: ["restaurant"], queryFn: () => info() });
  const on = !!r && r.mode !== "fast_food";
  const { data: tabs = [] } = useQuery({ queryKey: ["sala"], queryFn: () => state(), refetchInterval: 5000, enabled: on });
  const [open, setOpen] = useState<string | null>(null);
  if (!on) return null;
  const pay = async (id: string, method: "cash" | "card") => {
    if (!confirm(method === "cash" ? "Chiudere il conto in contanti?" : "Chiudere il conto con carta?")) return;
    try { await close({ data: { tabId: id, method } }); qc.invalidateQueries({ queryKey: ["sala"] }); }
    catch (e) { alert((e as Error).message); }
  };
  return (
    <section className="mb-6 rounded-3xl bg-card p-4">
      <h2 className="mb-3 font-display text-4xl">🍽️ Tavoli aperti</h2>
      {tabs.length === 0 && <p className="text-xl text-muted-foreground">Nessun tavolo aperto</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {tabs.map((t) => (
          <article key={t.id} className="rounded-2xl bg-muted p-4">
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-baseline gap-3 text-left">
              <span className="font-display text-4xl">{/^\d+$/.test(t.label) ? `Tavolo ${t.label}` : t.label}</span>
              <span className="text-lg">👥 {t.covers}</span>
              <span className="ml-auto text-2xl font-bold">{euro(t.total)}</span>
            </button>
            {open === t.id && (
              <ul className="mt-2 text-lg">
                {t.orders.flatMap((o) => o.items).map((i, k) => <li key={k}>{i.qty} × {i.name} — {euro(i.price * i.qty)}</li>)}
                {t.covers > 0 && t.cover_price > 0 && <li>Coperto × {t.covers} — {euro(t.covers * t.cover_price)}</li>}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => pay(t.id, "cash")} className="tap h-12 rounded-xl bg-secondary font-bold">💶 Contanti</button>
              <button onClick={() => pay(t.id, "card")} className="tap h-12 rounded-xl bg-primary font-bold text-primary-foreground">💳 Carta</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
