import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useLiveOrders } from "@/hooks/use-orders";
import { PinPad } from "@/components/pin-pad";
import { kitchenStatus, lockKitchen, settleOrder } from "@/lib/kitchen.functions";
import { gateFlags } from "@/lib/gate";
import { euro, itemNotes, type Order } from "@/lib/menu";
import { loadPrinter, printTicket, savePrinter, type PrinterCfg } from "@/lib/epson";

export const Route = createFileRoute("/cassa")({
  loader: () => kitchenStatus(),
  head: () => ({
    meta: [
      { title: "Cassa — Totem Burger" },
      { name: "description", content: "Incasso con POS SumUp e invio degli ordini in cucina." },
      { property: "og:title", content: "Cassa — Totem Burger" },
      { property: "og:description", content: "Incasso con POS SumUp e invio degli ordini in cucina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (Route.useLoaderData().unlocked ? <Cassa /> : <PinPad title="Cassa" />),
});

function Cassa() {
  const router = useRouter();
  const settle = useServerFn(settleOrder);
  const lock = useServerFn(lockKitchen);
  const orders = useLiveOrders(["awaiting_payment"]);
  const [cfg, setCfg] = useState<PrinterCfg>({ ip: "", https: true, auto: true });
  const [showCfg, setShowCfg] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setCfg(loadPrinter()), []);
  const update = (c: PrinterCfg) => {
    setCfg(c);
    savePrinter(c);
  };

  const print = async (o: Order) => {
    try {
      await printTicket(cfg, o);
      setMsg(`Comanda ${String(o.order_number).padStart(2, "0")} stampata`);
    } catch (e) {
      setMsg(`⚠ Stampa non riuscita: ${(e as Error).message}. L'ordine è comunque in cucina.`);
    }
  };

  const act = async (o: Order, paid: boolean) => {
    setBusy(o.id);
    try {
      const r = await settle({ data: { id: o.id, paid } });
      if (paid && r.order && cfg.auto && cfg.ip) await print(r.order as unknown as Order);
      else if (paid) setMsg(`Ordine ${String(o.order_number).padStart(2, "0")} inviato in cucina`);
    } catch {
      router.invalidate();
    }
    setBusy(null);
  };

  const test = () =>
    print({ id: "t", order_number: 0, dine_option: "qui", items: [{ id: "t", name: "PROVA STAMPA", price: 0, qty: 1 }], total: 0, status: "", created_at: new Date().toISOString() });

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="mr-auto font-display text-7xl text-accent">Cassa</h1>
        <button onClick={() => setShowCfg(!showCfg)} className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold">
          🖨️ Stampante {cfg.ip ? "✓" : "—"}
        </button>
        <Link to="/" className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold">← Totem</Link>
        <button
          onClick={async () => {
            await lock({ data: gateFlags() });
            router.invalidate();
          }}
          className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold"
        >
          Esci
        </button>
      </header>

      {showCfg && (
        <section className="mb-6 grid gap-4 rounded-3xl bg-card p-6 text-2xl">
          <label className="grid gap-2">
            <span className="font-bold">Indirizzo della stampante Epson (es. 192.168.1.50)</span>
            <input
              value={cfg.ip}
              onChange={(e) => update({ ...cfg, ip: e.target.value.trim() })}
              className="rounded-xl bg-muted px-4 py-3 select-text"
              inputMode="decimal"
            />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-8 w-8" checked={cfg.auto} onChange={(e) => update({ ...cfg, auto: e.target.checked })} />
            Stampa la comanda in automatico dopo il pagamento
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="h-8 w-8" checked={cfg.https} onChange={(e) => update({ ...cfg, https: e.target.checked })} />
            Collegamento sicuro (lasciare attivo)
          </label>
          <button onClick={test} className="tap h-16 rounded-2xl bg-primary font-bold text-primary-foreground">Stampa di prova</button>
        </section>
      )}

      {msg && <p className="mb-4 rounded-2xl bg-muted p-4 text-2xl font-bold">{msg}</p>}
      {orders.length === 0 && <p className="text-3xl text-muted-foreground">Nessun ordine da incassare</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-5">
        {orders.map((o) => (
          <article key={o.id} className="animate-pop flex flex-col rounded-3xl border-4 border-primary bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-8xl leading-none">{String(o.order_number).padStart(2, "0")}</span>
              <span className="rounded-full bg-muted px-4 py-1 text-xl font-bold uppercase">{o.dine_option}</span>
            </div>
            <ul className="my-4 flex-1 space-y-1 text-xl">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.qty} × {i.name}
                  {itemNotes(i).length > 0 && <span className="block pl-6 text-lg text-accent">{itemNotes(i).join(" · ")}</span>}
                </li>
              ))}
            </ul>
            <p className="mb-4 font-display text-6xl text-accent">{euro(Number(o.total))}</p>
            <button
              disabled={busy === o.id}
              onClick={() => act(o, true)}
              className="tap h-20 rounded-2xl bg-success font-display text-4xl text-success-foreground disabled:opacity-50"
            >
              Pagato con SumUp → Cucina
            </button>
            <button disabled={busy === o.id} onClick={() => act(o, false)} className="tap mt-3 h-14 rounded-2xl bg-secondary text-xl font-bold">
              Annulla ordine
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
