import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useLiveOrders } from "@/hooks/use-orders";
import { PinPad } from "@/components/pin-pad";
import { kitchenStatus, lockKitchen, setOrderStatus } from "@/lib/kitchen.functions";
import { gateFlags } from "@/lib/gate";

export const Route = createFileRoute("/cucina")({
  loader: () => kitchenStatus(),
  head: () => ({
    meta: [
      { title: "Cucina — Totem Burger" },
      { name: "description", content: "Pannello cucina riservato al personale." },
      { property: "og:title", content: "Cucina — Totem Burger" },
      { property: "og:description", content: "Pannello cucina riservato al personale." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KitchenGate,
});

function KitchenGate() {
  const { unlocked } = Route.useLoaderData();
  return unlocked ? <Kitchen /> : <PinPad />;
}


function Kitchen() {
  const router = useRouter();
  const update = useServerFn(setOrderStatus);
  const lock = useServerFn(lockKitchen);
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

  const setStatus = (id: string, status: string) =>
    update({ data: { id, status } }).catch(() => router.invalidate());
  const logout = async () => {
    await lock({ data: gateFlags() });
    router.invalidate();
  };

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
        <button onClick={logout} className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold">
          Esci
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
