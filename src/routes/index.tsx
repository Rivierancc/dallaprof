import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { euro, itemNotes, menuQueryOptions, type CartItem, type Product } from "@/lib/menu";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQueryOptions),
  head: () => ({
    meta: [
      { title: "Ordina qui — Totem Burger" },
      { name: "description", content: "Ordina al totem: scegli, paga e ritira il tuo numero." },
      { property: "og:title", content: "Ordina qui — Totem Burger" },
      { property: "og:description", content: "Ordina al totem: scegli, paga e ritira il tuo numero." },
    ],
  }),
  component: Kiosk,
});

type Step = "where" | "menu" | "checkout" | "done";

function Kiosk() {
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const [step, setStep] = useState<Step>("where");
  const [dine, setDine] = useState<"qui" | "asporto">("qui");
  const [catId, setCatId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paying, setPaying] = useState(false);
  const [orderNo, setOrderNo] = useState<number | null>(null);
  const [custom, setCustom] = useState<Product | null>(null);

  const activeCat = menu.categories.find((c) => c.id === catId) ?? menu.categories[0];
  const shown = menu.products.filter((p) => p.category_id === activeCat?.id && !p.sold_out);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const add = (p: Product, extras: string[] = [], removed: string[] = []) => {
    const unit = p.price + p.extras.filter((e) => extras.includes(e.name)).reduce((s, e) => s + e.price, 0);
    const key = [p.id, ...[...extras].sort(), "|", ...[...removed].sort()].join("~");
    setCart((c) => {
      const f = c.find((i) => i.id === key);
      return f
        ? c.map((i) => (i.id === key ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { id: key, productId: p.id, name: p.name, price: Math.round(unit * 100) / 100, qty: 1, extras, removed }];
    });
  };
  const pick = (p: Product) => (p.extras.length || p.ingredients.length ? setCustom(p) : add(p));
  const change = (id: string, d: number) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));

  const reset = () => {
    setCart([]);
    setOrderNo(null);
    setCatId("");
    setCustom(null);
    setStep("where");
  };

  const pay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1500));
    const { data, error } = await supabase
      .from("orders")
      .insert({ dine_option: dine, items: cart, total })
      .select("order_number")
      .single();
    setPaying(false);
    if (error || !data) return alert("Errore, riprova");
    setOrderNo(data.order_number);
    setStep("done");
  };

  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(reset, 15000);
    return () => clearTimeout(t);
  }, [step]);

  if (step === "where")
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-16 p-12">
        <h1 className="font-display text-[9rem] leading-none text-accent">Dove mangi?</h1>
        <div className="grid w-full max-w-4xl gap-10">
          {(["qui", "asporto"] as const).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDine(d);
                setStep("menu");
              }}
              className="tap glow flex h-80 flex-col items-center justify-center rounded-3xl bg-primary text-primary-foreground"
            >
              <span className="text-8xl">{d === "qui" ? "🍽️" : "🛍️"}</span>
              <span className="mt-4 font-display text-8xl">{d === "qui" ? "Mangio qui" : "Asporto"}</span>
            </button>
          ))}
        </div>
      </main>
    );

  if (step === "done")
    return (
      <main onClick={reset} className="flex min-h-screen flex-col items-center justify-center gap-8 p-12 text-center">
        <p className="font-display text-7xl text-muted-foreground">Il tuo numero</p>
        <div className="animate-pop glow flex h-[30rem] w-[30rem] items-center justify-center rounded-full bg-accent font-display text-[20rem] leading-none text-accent-foreground">
          {String(orderNo).padStart(2, "0")}
        </div>
        <p className="text-4xl font-bold">Grazie! Segui il numero sul display.</p>
        <p className="text-2xl text-muted-foreground">Tocca per un nuovo ordine</p>
      </main>
    );

  const cartPanel = (
    <aside className="flex w-[380px] shrink-0 flex-col border-l bg-card">
      <div className="border-b p-6">
        <h2 className="font-display text-6xl">Carrello</h2>
        <p className="text-xl text-muted-foreground">{dine === "qui" ? "Mangio qui" : "Asporto"} · {count} articoli</p>
      </div>
      <ul className="flex-1 space-y-4 overflow-y-auto p-6">
        {cart.length === 0 && <li className="text-2xl text-muted-foreground">Ancora vuoto</li>}
        {cart.map((i) => (
          <li key={i.id} className="rounded-2xl bg-muted p-4">
            <div className="flex justify-between text-2xl font-bold">
              <span>{i.name}</span>
            </div>
            {itemNotes(i).length > 0 && (
              <p className="mt-1 text-lg font-semibold text-accent">{itemNotes(i).join(" · ")}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => change(i.id, -1)} className="tap h-16 w-16 rounded-full bg-secondary text-4xl font-bold">−</button>
                <span className="w-8 text-center text-3xl font-bold">{i.qty}</span>
                <button onClick={() => change(i.id, 1)} className="tap h-16 w-16 rounded-full bg-primary text-4xl font-bold text-primary-foreground">+</button>
              </div>
              <span className="text-2xl font-bold">{euro(i.price * i.qty)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-4 border-t p-6">
        <div className="flex justify-between font-display text-6xl">
          <span>Totale</span>
          <span className="text-accent">{euro(total)}</span>
        </div>
        {step === "menu" ? (
          <button
            disabled={!cart.length}
            onClick={() => setStep("checkout")}
            className="tap h-28 w-full rounded-3xl bg-accent font-display text-6xl text-accent-foreground disabled:opacity-30"
          >
            Ordina
          </button>
        ) : (
          <button onClick={() => setStep("menu")} className="tap h-24 w-full rounded-3xl bg-secondary font-display text-5xl">
            ← Modifica
          </button>
        )}
        <button onClick={reset} className="tap h-16 w-full rounded-2xl text-2xl text-muted-foreground">Annulla ordine</button>
      </div>
    </aside>
  );

  if (step === "checkout")
    return (
      <main className="flex h-screen">
        <section className="flex flex-1 flex-col justify-center gap-10 p-10">
          <h1 className="font-display text-9xl text-accent">Riepilogo</h1>
          <ul className="space-y-3 text-3xl">
            {cart.map((i) => (
              <li key={i.id} className="flex justify-between border-b pb-3">
                <span>
                  {i.qty} × {i.name}
                  {itemNotes(i).length > 0 && (
                    <span className="block text-2xl text-accent">{itemNotes(i).join(" · ")}</span>
                  )}
                </span>
                <span className="font-bold">{euro(i.qty * i.price)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-display text-8xl">
            <span>Totale</span>
            <span>{euro(total)}</span>
          </div>
          <button
            onClick={pay}
            disabled={paying}
            className="tap glow h-48 rounded-3xl bg-primary font-display text-9xl text-primary-foreground disabled:opacity-60"
          >
            {paying ? "Pagamento..." : "💳 Paga"}
          </button>
          <p className="text-center text-2xl text-muted-foreground">Avvicina la carta al lettore (simulato)</p>
        </section>
        {cartPanel}
      </main>
    );

  if (!menu.categories.length)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-12 text-center">
        <h1 className="font-display text-8xl text-accent">Menu in aggiornamento</h1>
        <p className="text-3xl text-muted-foreground">Torna tra un momento.</p>
      </main>
    );

  return (
    <main className="flex h-screen">
      <section className="flex flex-1 flex-col overflow-hidden">
        <nav
          className="grid gap-3 p-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(menu.categories.length, 4)}, minmax(0, 1fr))` }}
        >
          {menu.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatId(c.id)}
              className={`tap overflow-hidden rounded-2xl border-4 ${activeCat?.id === c.id ? "border-accent bg-accent text-accent-foreground" : "border-transparent bg-card"}`}
            >
              {c.image && (
                <img src={c.image} alt={c.name} width={1024} height={1024} className="aspect-square w-full object-cover" />
              )}
              <span className="block py-2 font-display text-4xl">{c.name}</span>
            </button>
          ))}
        </nav>
        <div className="grid flex-1 grid-cols-2 content-start gap-5 overflow-y-auto p-4 pb-10">
          {shown.map((p) => (
            <button key={p.id} onClick={() => pick(p)} className="tap overflow-hidden rounded-3xl bg-card text-left">
              {p.image && (
                <img src={p.image} alt={p.name} loading="lazy" width={1024} height={1024} className="aspect-square w-full object-cover" />
              )}
              <div className="p-5">
                <p className="text-3xl font-extrabold">{p.name}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-5xl text-accent">{euro(p.price)}</span>
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-6xl font-bold text-primary-foreground">+</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      {cartPanel}
      {custom && (
        <Customize
          p={custom}
          onClose={() => setCustom(null)}
          onAdd={(extras, removed) => {
            add(custom, extras, removed);
            setCustom(null);
          }}
        />
      )}
    </main>
  );
}

function Customize({
  p,
  onClose,
  onAdd,
}: {
  p: Product;
  onClose: () => void;
  onAdd: (extras: string[], removed: string[]) => void;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const unit = p.price + p.extras.filter((e) => extras.includes(e.name)).reduce((s, e) => s + e.price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Personalizza ${p.name}`}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-card"
      >
        <div className="flex items-center gap-6 border-b p-6">
          {p.image && <img src={p.image} alt={p.name} width={160} height={160} className="h-40 w-40 rounded-2xl object-cover" />}
          <div className="flex-1">
            <h2 className="font-display text-7xl leading-none">{p.name}</h2>
            <p className="mt-2 font-display text-5xl text-accent">{euro(p.price)}</p>
          </div>
        </div>
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {p.extras.length > 0 && (
            <section>
              <h3 className="mb-4 font-display text-5xl">Aggiungi extra</h3>
              <div className="grid grid-cols-2 gap-4">
                {p.extras.map((e) => {
                  const on = extras.includes(e.name);
                  return (
                    <button
                      key={e.name}
                      aria-pressed={on}
                      onClick={() => toggle(extras, setExtras, e.name)}
                      className={`tap flex h-24 items-center justify-between rounded-2xl border-4 px-5 text-3xl font-bold ${on ? "border-accent bg-accent text-accent-foreground" : "border-transparent bg-muted"}`}
                    >
                      <span>{on ? "✓ " : "+ "}{e.name}</span>
                      <span>{euro(e.price)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {p.ingredients.length > 0 && (
            <section>
              <h3 className="mb-4 font-display text-5xl">Togli ingredienti</h3>
              <div className="grid grid-cols-2 gap-4">
                {p.ingredients.map((g) => {
                  const off = removed.includes(g);
                  return (
                    <button
                      key={g}
                      aria-pressed={off}
                      onClick={() => toggle(removed, setRemoved, g)}
                      className={`tap h-24 rounded-2xl border-4 px-5 text-left text-3xl font-bold ${off ? "border-destructive bg-destructive/20 text-muted-foreground line-through" : "border-transparent bg-muted"}`}
                    >
                      {off ? "✕ " : "✓ "}{g}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-4 border-t p-6">
          <button onClick={onClose} className="tap h-28 rounded-3xl bg-secondary font-display text-5xl">Annulla</button>
          <button onClick={() => onAdd(extras, removed)} className="tap glow h-28 rounded-3xl bg-primary font-display text-5xl text-primary-foreground">
            Aggiungi · {euro(unit)}
          </button>
        </div>
      </div>
    </div>
  );
}
