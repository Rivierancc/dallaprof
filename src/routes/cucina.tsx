import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useLiveOrders } from "@/hooks/use-orders";
import { kitchenStatus, unlockKitchen, lockKitchen, setOrderStatus } from "@/lib/kitchen.functions";

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

function PinPad() {
  const router = useRouter();
  const unlock = useServerFn(unlockKitchen);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pin || busy) return;
    setBusy(true);
    const r = await unlock({ data: { pin } }).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) router.invalidate();
    else {
      setError(true);
      setPin("");
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="font-display text-7xl text-accent">Accesso personale</h1>
      <div className="flex h-20 w-80 items-center justify-center rounded-2xl bg-card font-display text-6xl tracking-[0.5em]">
        {"•".repeat(pin.length) || <span className="text-3xl tracking-normal text-muted-foreground">Inserisci PIN</span>}
      </div>
      {error && <p className="text-2xl font-bold text-destructive">PIN errato</p>}
      <div className="grid grid-cols-3 gap-4">
        {keys.map((k) => (
          <button
            key={k}
            disabled={busy}
            onClick={() => {
              setError(false);
              if (k === "C") setPin("");
              else if (k === "OK") submit();
              else setPin((p) => (p.length < 12 ? p + k : p));
            }}
            className={`tap h-24 w-24 rounded-2xl font-display text-5xl ${k === "OK" ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {k}
          </button>
        ))}
      </div>
    </main>
  );
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
    await lock();
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
