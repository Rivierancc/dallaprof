import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { menuQueryOptions, type CartItem, type Order, type Product } from "@/lib/menu";
import { isStandaloneDrink, itemTitle, nextStep, splitMenu, type ItemStep } from "@/lib/order-lines";
import { loadPrinter, printTicket } from "@/lib/epson";
import type { KitchenFeatures } from "@/lib/menu.functions";

export type KitchenInfo = { partial_notes?: string[]; checked_items?: string[]; delivered_items?: string[] };

/**
 * Tabellone degli ordini in lavorazione, condiviso da Cucina e Cassa.
 * In Cassa si usa con compact: le schede stanno in colonna singola e i
 * riquadri ingredienti si aprono sotto l'ordine invece che a fianco.
 */
const KITCHEN_WIDTHS = [
  "grid-cols-[repeat(auto-fill,minmax(min(100%,24rem),1fr))]",
  "grid-cols-[repeat(auto-fill,minmax(min(100%,33rem),1fr))]",
  "grid-cols-[repeat(auto-fill,minmax(min(100%,43rem),1fr))]",
];

export function KitchenBoard({
  orders,
  features,
  onStatus,
  onInfo,
  compact = false,
  width = 0,
  twoCols = false,
  hideDrinks = false,
}: {
  orders: Order[];
  features: KitchenFeatures;
  onStatus: (id: string, status: string) => void;
  onInfo: (id: string, d: KitchenInfo) => void;
  compact?: boolean;
  /** Larghezza schede: 0 normale, 1 larga, 2 extra larga. */
  width?: number;
  /** Piatti su due colonne dentro la scheda. */
  twoCols?: boolean;
  /** Nasconde le bibite (resta il badge 🥤 N bibite, toccabile). */
  hideDrinks?: boolean;
}) {
  const [peek, setPeek] = useState<string[]>([]);
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

  return (
    <>
      {orders.length === 0 && <p className="text-3xl text-muted-foreground">Nessun ordine in attesa</p>}
      {picked.length > 0 ? (
        <div className="flex gap-5">
          {!compact && (
            <aside className="hidden w-1/6 shrink-0 space-y-3 lg:block">
              {orders.filter((o) => !selOrders.includes(o)).map((o) => (
                <button key={o.id} onClick={() => setSelList([])} className={`tap block w-full rounded-2xl border-4 bg-card p-3 text-left ${o.status === "ready" ? "border-success" : "border-accent"}`}>
                  <span className="font-display text-5xl leading-none">{String(o.order_number).padStart(2, "0")}</span>
                  <span className="block text-lg text-muted-foreground">{o.items.map((i) => `${i.qty}× ${itemTitle(i, dishOf(i))}`).join(", ")}</span>
                </button>
              ))}
            </aside>
          )}
          <div className={`grid min-w-0 flex-1 gap-5 ${compact ? "" : "md:grid-cols-[minmax(18rem,1fr)_2fr]"}`}>
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
        <div className={`grid gap-5 ${compact ? "grid-cols-1" : KITCHEN_WIDTHS[width] ?? KITCHEN_WIDTHS[0]}`}>
          {orders.map((o) => card(o))}
        </div>
      )}
    </>
  );

  function card(o: Order) {
    const delivered = o.delivered_items ?? [];
    const mainDelivered = delivered.filter((x) => !x.includes("#")).length;
    const allDelivered = o.items.length > 0 && mainDelivered >= o.items.length;
    const cats = menu?.categories ?? [];
    const drinkCount = o.items.reduce((n, i) => {
      if (isStandaloneDrink(productOf(i), cats)) return n + i.qty;
      return splitMenu(i, productOf(i), menu?.products ?? [], cats).drink.length > 0 ? n + i.qty : n;
    }, 0);
    const hidden = hideDrinks && !peek.includes(o.id);
    return (
      <article
        key={o.id}
        className={`animate-pop flex flex-col rounded-3xl border-4 bg-card p-6 ${o.status === "ready" ? "border-success" : "border-accent"}`}
      >
        <div className="flex items-baseline justify-between">
          <span className="font-display text-8xl leading-none">{String(o.order_number).padStart(2, "0")}</span>
          <span className="rounded-full bg-muted px-4 py-2 text-3xl font-bold uppercase text-foreground">{o.dine_option}</span>
        </div>
        <p className="text-2xl font-bold">
          🕒 {new Date(o.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {hideDrinks && drinkCount > 0 && (
          <button onClick={() => setPeek(peek.includes(o.id) ? peek.filter((x) => x !== o.id) : [...peek, o.id])} className="tap mt-2 self-start rounded-full bg-success px-4 py-1 text-2xl font-bold text-success-foreground">
            🥤 {drinkCount} {drinkCount === 1 ? "bibita" : "bibite"} {hidden ? "▸" : "▾"}
          </button>
        )}
        {features.delivery && (
          <p className={`text-xl font-bold ${allDelivered ? "text-success" : "text-muted-foreground"}`}>
            🚚 {mainDelivered}/{o.items.length} consegnati
          </p>
        )}
        {features.checklist && features.delivery && (
          <p className="text-base text-muted-foreground">Tocca il piatto: 1° ✓ pronto · 2° 🚚 consegnato · 3° annulla</p>
        )}
        {o.items.filter((i) => productOf(i)?.recipe_on !== false).length > 1 && (
          <button onClick={() => {
            const ids = o.items.filter((i) => productOf(i)?.recipe_on !== false).map((i) => ({ o: o.id, i: i.id }));
            setSelList([...sel.filter((s) => s.o !== o.id), ...ids]);
          }} className="tap mt-3 rounded-2xl bg-shared px-4 py-2 text-xl font-bold text-shared-foreground">📖 Apri tutti gli ingredienti</button>
        )}
        <ul className={`my-4 flex-1 text-4xl font-bold leading-tight [&>li]:py-3 ${twoCols ? "grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-x-6 [&>li]:border-b-2 [&>li]:border-border" : "divide-y-2 divide-border"}`}>
          {o.items.map((i) => {
            // Ogni parte del menu (piatto, contorno, bevanda) ha un suo stato: id, id#side, id#drink.
            const stepOf = (id: string): ItemStep => delivered.includes(id) ? "delivered" : (o.checked_items ?? []).includes(id) ? "ready" : "todo";
            const tapId = (id: string) => {
              const s = stepOf(id);
              const checked = (o.checked_items ?? []).filter((x) => x !== id);
              const dlv = delivered.filter((x) => x !== id);
              if (features.checklist && features.delivery) {
                const n = nextStep(s);
                onInfo(o.id, { checked_items: n === "todo" ? checked : [...checked, id], delivered_items: n === "delivered" ? [...dlv, id] : dlv });
              } else if (features.checklist) onInfo(o.id, { checked_items: s !== "todo" ? checked : [...checked, id] });
              else if (features.delivery) onInfo(o.id, { delivered_items: s === "delivered" ? dlv : [...dlv, id] });
            };
            const step = stepOf(i.id);
            const tap = () => tapId(i.id);
            const tappable = features.checklist || features.delivery;
            const part = (id: string, cls: string, text: string) => {
              const s = stepOf(id);
              return (
                <span
                  role={tappable ? "button" : undefined}
                  tabIndex={tappable ? 0 : undefined}
                  aria-label={tappable ? `${text}: ${s === "todo" ? "da fare" : s === "ready" ? "pronto" : "consegnato"}` : undefined}
                  onClick={tappable ? (e) => { e.stopPropagation(); tapId(id); } : undefined}
                  onKeyDown={tappable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); tapId(id); } } : undefined}
                  className={`mt-2 block rounded-xl pt-2 text-2xl font-bold ${cls} ${tappable ? "tap cursor-pointer select-none" : ""} ${s === "ready" ? "bg-success/15 px-2" : ""} ${s === "delivered" ? "line-through opacity-50" : ""}`}
                >
                  {text}
                  {s === "ready" && <span className="block text-lg text-success">✓ Pronto</span>}
                  {s === "delivered" && <span className="block text-lg text-muted-foreground">🚚 Consegnato</span>}
                </span>
              );
            };
            const drinkSolo = isStandaloneDrink(productOf(i), menu?.categories ?? []);
            if (hidden && drinkSolo) return null;
            return (
              <li key={i.id} className="flex items-start gap-3">
                <div
                  role={tappable ? "button" : undefined}
                  tabIndex={tappable ? 0 : undefined}
                  aria-label={tappable ? `${i.name}: ${step === "todo" ? "da fare" : step === "ready" ? "pronto" : "consegnato"}` : undefined}
                  onClick={tappable ? tap : undefined}
                  onKeyDown={tappable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(); } } : undefined}
                  className={`min-w-0 flex-1 rounded-xl ${tappable ? "tap cursor-pointer select-none" : ""} ${step === "ready" ? "bg-success/15 px-2" : ""} ${step === "delivered" ? "line-through opacity-50" : ""}`}
                >
                  <span className={drinkSolo ? "text-2xl text-kitchen-drink" : ""}>{i.qty} × {drinkSolo && "🥤 "}{itemTitle(i, dishOf(i))}</span>
                  {(() => { const m = splitMenu(i, productOf(i), menu?.products ?? [], menu?.categories ?? []); return <>
                    {m.dish.length > 0 && <span className="mt-1 block text-2xl font-bold text-accent">{m.dish.join(" · ")}</span>}
                    {m.side.length > 0 && part(`${i.id}#side`, "border-t-4 border-shared text-kitchen-side", `🍟 ${m.side.join(" · ")}`)}
                    {m.drink.length > 0 && !hidden && part(`${i.id}#drink`, "border-t-4 border-success text-success", `🥤 ${m.drink.join(" · ")}`)}
                  </>; })()}
                  {step === "ready" && <span className="block text-xl font-bold text-success no-underline">✓ Pronto</span>}
                  {step === "delivered" && <span className="block text-xl font-bold text-muted-foreground">🚚 Consegnato</span>}
                </div>
                {productOf(i)?.recipe_on !== false && !drinkSolo && (
                  <button onClick={() => toggleSel(o.id, i.id)} aria-label={`Ingredienti di ${i.name}`} className={`tap shrink-0 rounded-xl px-3 py-1 text-3xl ${isSel(o.id, i.id) ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>📖</button>
                )}
              </li>
            );
          })}
        </ul>
        {features.partial && o.status === "preparing" && <PartialNotes order={o} save={(n) => onInfo(o.id, { partial_notes: n })} />}
        <button
          onClick={() => printTicket(loadPrinter(), o as Order, menu).catch((e) => alert(`Stampa non riuscita: ${e.message}`))}
          className="tap mb-3 h-12 rounded-2xl bg-secondary text-xl font-bold"
        >
          🖨️ Ristampa comanda
        </button>
        {o.status === "preparing" ? (
          <button onClick={() => onStatus(o.id, "ready")} className="tap h-20 rounded-2xl bg-success font-display text-5xl text-success-foreground">
            Pronto
          </button>
        ) : (
          <button onClick={() => onStatus(o.id, "done")} className={`tap h-20 rounded-2xl font-display text-5xl ${features.delivery && allDelivered ? "bg-success text-success-foreground" : "bg-secondary"}`}>
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
