import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveOrders } from "@/hooks/use-orders";

export const Route = createFileRoute("/cucina")({
  head: () => ({
    meta: [
      { title: "Cucina — Totem Burger" },
      { name: "description", content: "Pannello cucina con ordini in arrivo in tempo reale." },
      { property: "og:title", content: "Cucina — Totem Burger" },
      { property: "og:description", content: "Pannello cucina con ordini in arrivo in tempo reale." },
    ],
  }),
  component: Kitchen,
});

function Kitchen() {
  const [sound, setSound] = useState(false);
  const ctx = useRef<AudioContext | null>(null);

  const beep = () => {
    const ac = ctx.current;
    if (!ac) return;
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.4, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.2);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t);
      o.stop(ac.currentTime + t + 0.22);
    });
  };

  const orders = useLiveOrders(["preparing", "ready"], () => beep());

  const setStatus = (id: string, status: string) => supabase.from("orders").update({ status }).eq("id", id);

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-7xl text-accent">Cucina</h1>
        <button
          onClick={() => {
            ctx.current ??= new AudioContext();
            ctx.current.resume();
            setSound(true);
            beep();
          }}
          className={`tap rounded-2xl px-6 py-4 text-2xl font-bold ${sound ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}
        >
          {sound ? "🔔 Suono attivo" : "🔇 Attiva suono"}
        </button>
      </header>
      {orders.length === 0 && <p className="text-3xl text-muted-foreground">Nessun ordine in attesa</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {orders.map((o) => (
          <article
            key={o.id}
            className={`animate-pop flex flex-col rounded-3xl border-4 bg-card p-5 ${o.status === "ready" ? "border-success" : "border-accent"}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-8xl leading-none">{String(o.order_number).padStart(2, "0")}</span>
              <span className="rounded-full bg-muted px-4 py-1 text-xl font-bold uppercase">{o.dine_option}</span>
            </div>
            <p className="text-lg text-muted-foreground">
              {new Date(o.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <ul className="my-4 flex-1 space-y-1 text-2xl font-bold">
              {o.items.map((i) => (
                <li key={i.id}>{i.qty} × {i.name}</li>
              ))}
            </ul>
            {o.status === "preparing" ? (
              <button onClick={() => setStatus(o.id, "ready")} className="tap h-20 rounded-2xl bg-success font-display text-5xl text-success-foreground">
                Pronto
              </button>
            ) : (
              <button onClick={() => setStatus(o.id, "done")} className="tap h-20 rounded-2xl bg-secondary font-display text-5xl">
                Consegnato
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
