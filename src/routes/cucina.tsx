import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useLiveOrders } from "@/hooks/use-orders";
import { PinPad } from "@/components/pin-pad";
import { kitchenStatus, lockKitchen, setOrderStatus } from "@/lib/kitchen.functions";
import { setOrderKitchenInfo } from "@/lib/menu.functions";
import { useKitchenFeatures } from "@/components/kitchen-features";
import { gateFlags } from "@/lib/gate";
import { menuQueryOptions, type CartItem, type Category, type Order, type Product } from "@/lib/menu";
import { useQuery } from "@tanstack/react-query";
import { loadPrinter, printTicket } from "@/lib/epson";
import { itemTitle, orderLines, splitMenu } from "@/lib/order-lines";
import { OrderNumberSettings } from "@/components/order-number-settings";
import { StaffDisplayPreview, StaffFullscreenButton } from "@/components/staff-display";
import { StaffCrossLink } from "@/components/staff-nav";

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
  const { data: menu } = useQuery(menuQueryOptions);
  // Piatto toccato: apre il riquadro ingredienti accanto al suo ordine.
  const [sel, setSelList] = useState<{ o: string; i: string }[]>([]);
  const productOf = (i: CartItem) => menu?.products.find((p) => p.id === i.productId) ?? menu?.products.find((p) => p.name.toLowerCase() === i.name.toLowerCase());
  // Nei menu con piatto a scelta: ingredienti e titolo del piatto preso dal cliente.
  const dishOf = (i: CartItem) => (i.dishId && menu?.products.find((p) => p.id === i.dishId)) || productOf(i);
  const isSel = (o: string, i: string) => sel.some((s) => s.o === o && s.i === i);
  const toggleSel = (o: string, i: string) => setSelList(isSel(o, i) ? sel.filter((s) => !(s.o === o && s.i === i)) : [...sel, { o, i }]);
  const picked = sel.flatMap((s) => {
    const o = orders.find((x) => x.id === s.o);
    const it = o?.items.find((x) => x.id === s.i);
    return o && it ? [{ o, it }] : [];
  });
  const selOrders = orders.filter((o) => picked.some((p) => p.o.id === o.id));
  // Ingredienti presenti in più piatti aperti: evidenziati in blu.
  const counts = new Map<string, number>();
  for (const p of picked) for (const g of new Set(itemIngredients(p.it, dishOf(p.it)))) counts.set(g, (counts.get(g) ?? 0) + 1);
  const shared = new Set([...counts].filter(([, n]) => n > 1).map(([g]) => g));
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
        <button
          onClick={() => {
            ctx.current ??= new AudioContext();
            ctx.current.resume();
            setSound(true);
            beep();
          }}
          aria-label={sound ? "Suono attivo" : "Attiva suono"}
          className={`${staffChipBase} ${sound ? chipTones.success : chipTones.primary}`}
        >
          {sound ? "🔔 Suono" : "🔇 Suono"}
        </button>
        {features.history && (
          <StaffChip onClick={() => setShowHistory(!showHistory)} aria-label={showHistory ? "Ordini aperti" : "Storico di oggi"}>
            {showHistory ? "🍳 Aperti" : "📋 Storico"}
          </StaffChip>
        )}
        <OrderNumberSettings />
        <StaffCrossLink page="cucina" />
        <Link to="/" className={staffChipClass}>← Totem</Link>
        <StaffChip onClick={logout} aria-label="Esci">🚪 Esci</StaffChip>
      </header>
      <StaffDisplayPreview page="cucina" />
      {showHistory && features.history ? <History /> : <>
      {orders.length === 0 && <p className="text-3xl text-muted-foreground">Nessun ordine in attesa</p>}
      {picked.length > 0 ? (
        <div className="flex gap-5">
          <aside className="hidden w-1/6 shrink-0 space-y-3 lg:block">
            {orders.filter((o) => !selOrders.includes(o)).map((o) => (
              <button key={o.id} onClick={() => setSelList([])} className={`tap block w-full rounded-2xl border-4 bg-card p-3 text-left ${o.status === "ready" ? "border-success" : "border-accent"}`}>
                <span className="font-display text-5xl leading-none">{String(o.order_number).padStart(2, "0")}</span>
                <span className="block text-lg text-muted-foreground">{o.items.map((i) => `${i.qty}× ${itemTitle(i, dishOf(i))}`).join(", ")}</span>
              </button>
            ))}
          </aside>
          <div className="grid min-w-0 flex-1 gap-5 md:grid-cols-[minmax(18rem,1fr)_2fr]">
            <div className="space-y-5">{selOrders.map((o) => card(o))}</div>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                {shared.size > 0 && <p className="rounded-2xl bg-shared px-4 py-2 text-2xl font-bold text-shared-foreground">🔵 In blu: ingredienti in comune, preparali insieme</p>}
                <button onClick={() => setSelList([])} className="tap ml-auto rounded-2xl bg-secondary px-5 py-3 text-2xl font-bold">✕ Chiudi tutte</button>
              </div>
              {picked.map((p) => (
                <RecipePanel split={splitMenu(p.it, productOf(p.it), menu?.products ?? [], menu?.categories ?? [])} key={p.o.id + p.it.id} order={p.o.order_number} item={p.it} product={dishOf(p.it)} shared={shared} close={() => toggleSel(p.o.id, p.it.id)} />
              ))}
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-5">
        {orders.map((o) => card(o))}
      </div>
      )}
      </>}
    </main>
  );

  function card(o: Order) {
          const delivered = o.delivered_items ?? [];
          const allDelivered = o.items.length > 0 && delivered.length >= o.items.length;
          return (
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
            {features.delivery && (
              <p className={`text-xl font-bold ${allDelivered ? "text-success" : "text-muted-foreground"}`}>
                🚚 {delivered.length}/{o.items.length} consegnati
              </p>
            )}
            {features.checklist && features.delivery && (
              <p className="text-base text-muted-foreground">✓ = preparato · 🚚 = consegnato</p>
            )}
            {o.items.filter((i) => productOf(i)?.recipe_on !== false).length > 1 && (
              <button onClick={() => {
                const ids = o.items.filter((i) => productOf(i)?.recipe_on !== false).map((i) => ({ o: o.id, i: i.id }));
                setSelList([...sel.filter((s) => s.o !== o.id), ...ids]);
              }} className="tap mt-3 rounded-2xl bg-shared px-4 py-2 text-xl font-bold text-shared-foreground">📖 Apri tutti gli ingredienti</button>
            )}
            <ul className="my-4 flex-1 space-y-2 text-2xl font-bold">
              {o.items.map((i) => {
                const done = (o.checked_items ?? []).includes(i.id);
                const gave = delivered.includes(i.id);
                const toggle = () => saveInfo(o.id, { checked_items: done ? (o.checked_items ?? []).filter((x) => x !== i.id) : [...(o.checked_items ?? []), i.id] });
                const toggleDelivered = () => saveInfo(o.id, { delivered_items: gave ? delivered.filter((x) => x !== i.id) : [...delivered, i.id] });
                return (
                <li key={i.id} className="flex items-start gap-3">
                  {features.checklist && (
                    <button onClick={toggle} aria-label={done ? "Togli spunta" : "Spunta piatto"} className={`tap mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-4 text-xl ${done ? "border-success bg-success text-success-foreground" : "border-muted-foreground"}`}>
                      {done ? "✓" : ""}
                    </button>
                  )}
                  {features.delivery && (
                    <button onClick={toggleDelivered} aria-label={gave ? `Togli consegna di ${i.name}` : `Segna ${i.name} come consegnato`} className={`tap mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-4 text-xl ${gave ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground"}`}>
                      {gave ? "🚚" : ""}
                    </button>
                  )}
                  <span className={`min-w-0 flex-1 ${features.checklist && done ? "text-muted-foreground line-through" : ""}`}>
                    {productOf(i)?.recipe_on !== false ? (
                      <button onClick={() => toggleSel(o.id, i.id)} className={`tap rounded-lg text-left underline decoration-dotted underline-offset-4 ${isSel(o.id, i.id) ? "bg-accent px-2 text-accent-foreground" : ""}`}>
                        {i.qty} × {itemTitle(i, dishOf(i))} 📖
                      </button>
                    ) : <>{i.qty} × {itemTitle(i, dishOf(i))}</>}
                    {(() => { const m = splitMenu(i, productOf(i), menu?.products ?? [], menu?.categories ?? []); return <>
                      {m.dish.length > 0 && <span className="block text-xl font-bold text-accent">{m.dish.join(" · ")}</span>}
                      {m.side.length > 0 && <span className="mt-2 block border-t-4 border-shared pt-2 text-xl font-bold text-kitchen-side">🍟 {m.side.join(" · ")}</span>}
                      {m.drink.length > 0 && <span className="mt-2 block border-t-4 border-success pt-2 text-xl font-bold text-success">🥤 {m.drink.join(" · ")}</span>}
                    </>; })()}
                    {features.delivery && gave && (
                      <span className="block text-xl font-bold text-success">✓ consegnato</span>
                    )}
                  </span>
                </li>
              );})}
            </ul>
            {features.partial && o.status === "preparing" && <PartialNotes order={o} save={(n) => saveInfo(o.id, { partial_notes: n })} />}
            <button
              onClick={() => printTicket(loadPrinter(), o as Order, menu).catch((e) => alert(`Stampa non riuscita: ${e.message}`))}
              className="tap mb-3 h-12 rounded-2xl bg-secondary text-xl font-bold"
            >
              🖨️ Ristampa comanda
            </button>
            {o.status === "preparing" ? (
              <button onClick={() => setStatus(o.id, "ready")} className="tap h-20 rounded-2xl bg-success font-display text-5xl text-success-foreground">
                Pronto
              </button>
            ) : (
              <button onClick={() => setStatus(o.id, "done")} className={`tap h-20 rounded-2xl font-display text-5xl ${features.delivery && allDelivered ? "bg-success text-success-foreground" : "bg-secondary"}`}>
                Consegnato
              </button>
            )}
          </article>
          );
  }
}

const QUICK = ["Bevande pronte", "Patatine pronte", "Panini pronti", "Dolce pronto"];

function PartialNotes({ order, save }: { order: Order; save: (n: string[]) => void }) {
  const [text, setText] = useState("");
  const notes = order.partial_notes ?? [];
  const add = (t: string) => { const v = t.trim(); if (v && !notes.includes(v)) save([...notes, v]); setText(""); };
  return (
    <div className="mb-3 rounded-2xl bg-muted/50 p-3">
      <p className="mb-2 text-lg font-bold">📣 Al tabellone:</p>
      {notes.map((n) => (
        <span key={n} className="mb-2 mr-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-lg font-bold text-accent-foreground">
          {n}<button aria-label={`Togli ${n}`} onClick={() => save(notes.filter((x) => x !== n))}>✕</button>
        </span>
      ))}
      <div className="flex flex-wrap gap-2">
        {QUICK.filter((q) => !notes.includes(q)).map((q) => (
          <button key={q} onClick={() => add(q)} className="tap rounded-xl bg-secondary px-3 py-2 text-base font-bold">+ {q}</button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(text); }}>
        <input value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="Altro messaggio…" className="min-w-0 flex-1 rounded-xl bg-background px-3 py-2 text-lg" />
        <button className="tap rounded-xl bg-primary px-4 text-lg font-bold text-primary-foreground">Invia</button>
      </form>
    </div>
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

// Ingredienti letti dalla descrizione del piatto (separati da virgola).
const descList = (d: string) => d.split(",").map((s) => s.trim()).filter(Boolean);

// Ingredienti effettivi (non tolti) di un piatto, in minuscolo, per trovare quelli in comune.
function itemIngredients(item: CartItem, product: Product | undefined) {
  const removed = (item.removed ?? []).map((r) => r.toLowerCase());
  const all = [...(product?.ingredients ?? []), ...(product ? descList(product.description) : [])].map((g) => g.toLowerCase());
  return all.filter((g) => !removed.includes(g));
}

function RecipePanel({ split, order, item, product, shared, close }: { split: ReturnType<typeof splitMenu>; order: number; item: CartItem; product: Product | undefined; shared: Set<string>; close: () => void }) {
  const removed = (item.removed ?? []).map((r) => r.toLowerCase());
  const combo = product?.combo_items ?? [];
  const main = product?.ingredients ?? [];
  const desc = product ? descList(product.description) : [];
  const onlyDesc = desc.filter((g) => !main.some((m) => m.toLowerCase() === g.toLowerCase()));
  const row = (g: string) => removed.includes(g.toLowerCase())
    ? <li key={g} className="text-destructive line-through">✕ {g} <span className="text-xl no-underline">(SENZA)</span></li>
    : shared.has(g.toLowerCase())
      ? <li key={g} className="rounded-lg bg-shared px-2 text-shared-foreground">🔵 {g}</li>
      : <li key={g}>• {g}</li>;
  return (
    <section className="animate-pop rounded-3xl border-4 border-primary bg-card p-6">
      <div className="mb-4 flex items-start gap-4">
        <h2 className="mr-auto font-display text-6xl leading-none"><span className="text-accent">#{String(order).padStart(2, "0")}</span> {item.qty} × {itemTitle(item, product)}</h2>
        <button onClick={close} className="tap rounded-2xl bg-secondary px-5 py-3 text-2xl font-bold">✕ Chiudi</button>
      </div>
      {main.length > 0 && <>
        <h3 className="mb-2 text-2xl font-bold text-muted-foreground">Ingredienti del piatto</h3>
        <ul className="mb-5 grid gap-2 text-3xl font-bold sm:grid-cols-2">{main.map(row)}</ul>
      </>}
      {onlyDesc.length > 0 && <>
        <h3 className="mb-2 text-2xl font-bold text-muted-foreground">Ingredienti (dalla descrizione)</h3>
        <ul className="mb-5 grid gap-2 text-3xl font-bold sm:grid-cols-2">{onlyDesc.map(row)}</ul>
      </>}
      {(item.removed ?? []).filter((r) => !product?.ingredients.some((g) => g.toLowerCase() === r.toLowerCase()) && !onlyDesc.some((g) => g.toLowerCase() === r.toLowerCase())).map((r) => (
        <p key={r} className="mb-2 text-3xl font-bold text-destructive">✕ senza {r}</p>
      ))}
      {split.dishExtras.length > 0 && <ul className="mb-5 space-y-2 text-3xl font-bold text-accent">
        {split.dishExtras.map((e) => <li key={e}>+ {e}</li>)}
      </ul>}
      {split.side.length > 0 && <div className="mb-5 border-t-4 border-shared pt-4 text-kitchen-side">
        <h3 className="mb-2 text-2xl font-bold">🍟 Contorno</h3>
        <ul className="space-y-2 text-3xl font-bold">{split.side.map((e) => <li key={e}>• {e}</li>)}</ul>
      </div>}
      {split.drink.length > 0 && <div className="mb-5 border-t-4 border-success pt-4 text-success">
        <h3 className="mb-2 text-2xl font-bold">🥤 Bevanda</h3>
        <ul className="space-y-2 text-3xl font-bold">{split.drink.map((e) => <li key={e}>• {e}</li>)}</ul>
      </div>}
      {combo.length > 0 && <p className="mb-5 text-2xl font-bold">🍱 Menu combinato: vedi gli articoli inclusi nell'ordine</p>}
      {product?.recipe.trim() && <>
        <h3 className="mb-2 text-2xl font-bold text-muted-foreground">Note di preparazione</h3>
        <p className="whitespace-pre-line text-2xl">{product.recipe}</p>
      </>}
      {!product && <p className="text-2xl text-muted-foreground">Questo piatto non è più nel menu: valgono solo le modifiche scritte nell'ordine.</p>}
    </section>
  );
}
