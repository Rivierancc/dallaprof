import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useLiveOrders } from "@/hooks/use-orders";
import { PinPad } from "@/components/pin-pad";
import { kitchenStatus, lockKitchen, setOrderStatus } from "@/lib/kitchen.functions";
import { setOrderKitchenInfo } from "@/lib/menu.functions";
import { useKitchenFeatures } from "@/components/kitchen-features";
import { gateFlags } from "@/lib/gate";
import { menuQueryOptions, type Order } from "@/lib/menu";
import { useQuery } from "@tanstack/react-query";
import { orderLines } from "@/lib/order-lines";
import { OrderNumberSettings } from "@/components/order-number-settings";
import { StaffDisplayPreview, StaffFullscreenButton } from "@/components/staff-display";
import { StaffChip, StaffCrossLink, staffChipClass } from "@/components/staff-nav";
import { KitchenBoard } from "@/components/kitchen-board";

export const Route = createFileRoute("/cucina")({
  loader: () => kitchenStatus(),
  head: () => ({
    meta: [
      { title: "Cucina — Totem Burger" },
      { name: "description", content: "Pannello cucina riservato al personale." },
      { property: "og:title", content: "Cucina — Totem Burger" },
      { property: "og:description", content: "Pannello cucina riservato al personale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const features = useKitchenFeatures();
  const info = useServerFn(setOrderKitchenInfo);
  const [showHistory, setShowHistory] = useState(false);

  const saveInfo = (id: string, d: { partial_notes?: string[]; checked_items?: string[]; delivered_items?: string[] }) =>
    info({ data: { id, ...d } }).catch((e) => alert(`Non salvato: ${e.message}`));

  const setStatus = (id: string, status: string) =>
    update({ data: { id, status } }).catch(() => router.invalidate());
  const logout = async () => {
    await lock({ data: gateFlags() });
    router.invalidate();
  };

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-display text-7xl text-accent">Cucina</h1>
        <StaffFullscreenButton />
        <StaffChip
          onClick={() => {
            ctx.current ??= new AudioContext();
            ctx.current.resume();
            setSound(true);
            beep();
          }}
          aria-label={sound ? "Suono attivo" : "Attiva suono"}
          tone={sound ? "success" : "primary"}
        >
          {sound ? "🔔 Suono" : "🔇 Suono"}
        </StaffChip>
        {features.history && (
          <StaffChip onClick={() => setShowHistory(!showHistory)} aria-label={showHistory ? "Ordini aperti" : "Storico di oggi"}>
            {showHistory ? "🍳 Aperti" : "📋 Storico"}
          </StaffChip>
        )}
        <OrderNumberSettings />
        <StaffCrossLink page="cucina" />
        {!restaurantOnly && <Link to="/" className={staffChipClass}>← Totem</Link>}{restaurantOnly && <Link to="/sala" className={staffChipClass}>🍽️ Sala</Link>}
        <StaffChip onClick={logout} aria-label="Esci">🚪 Esci</StaffChip>
      </header>
      <StaffDisplayPreview page="cucina" />
      {showHistory && features.history ? <History /> : (
        <KitchenBoard orders={orders} features={features} onStatus={setStatus} onInfo={saveInfo} />
      )}
    </main>
  );
}

const STATUS: Record<string, string> = { awaiting_payment: "Da pagare", preparing: "In preparazione", ready: "Pronto", done: "Consegnato", cancelled: "Annullato" };

function History() {
  const { data: menu } = useQuery(menuQueryOptions);
  const all = useLiveOrders(["awaiting_payment", "preparing", "ready", "done", "cancelled"]);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const today = all.filter((o) => new Date(o.created_at) >= start).reverse();
  const paid = today.filter((o) => o.status !== "cancelled" && o.status !== "awaiting_payment");
  const total = paid.reduce((s, o) => s + Number(o.total), 0);
  const time = (d: string) => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return (
    <section>
      <p className="mb-4 text-2xl">Oggi: <b>{paid.length}</b> ordini pagati · <b>€ {total.toFixed(2).replace(".", ",")}</b></p>
      {today.length === 0 && <p className="text-3xl text-muted-foreground">Nessun ordine oggi</p>}
      <div className="space-y-3">
        {today.map((o) => (
          <article key={o.id} className="rounded-2xl bg-card p-4">
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="font-display text-5xl">{String(o.order_number).padStart(2, "0")}</span>
              <span className="text-xl text-muted-foreground">{time(o.created_at)}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-lg font-bold uppercase">{o.dine_option}</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-lg font-bold">{STATUS[o.status] ?? o.status}</span>
              <span className="ml-auto text-2xl font-bold">€ {Number(o.total).toFixed(2).replace(".", ",")}</span>
            </div>
            <ul className="mt-2 text-xl">
              {o.items.map((i) => { const l = orderLines(i, menu); return <li key={i.id}>{i.qty} × {l.title}{l.dish.length > 0 && <span className="text-accent"> · {l.dish.join(" · ")}</span>}{l.side.length > 0 && <span> · 🍟 {l.side.join(" · ")}</span>}{l.drink.length > 0 && <span> · 🥤 {l.drink.join(" · ")}</span>}</li>; })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
