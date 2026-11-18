import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { kitchenStatus } from "@/lib/kitchen.functions";
import { PinPad } from "@/components/pin-pad";
import { staffChipClass } from "@/components/staff-nav";
import { venuePageTitle } from "@/lib/page-title";
import { menuQueryOptions } from "@/lib/menu";
import type { MenuProduct } from "@/lib/menu.functions";
import { filterDishes } from "@/lib/dish-search";

export const Route = createFileRoute("/cerca-piatti")({
  loader: () => kitchenStatus(),
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Cerca piatti", matches) }, { name: "description", content: "Cerca i piatti del menu per fascia di prezzo e ingrediente." },
    { property: "og:title", content: venuePageTitle("Cerca piatti", matches) }, { property: "og:description", content: "Cerca i piatti del menu per fascia di prezzo e ingrediente." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Gate,
});

function Gate() {
  if (!Route.useLoaderData().unlocked) return <PinPad title="Cerca piatti" />;
  return <CercaPiatti />;
}

const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

function CercaPiatti() {
  const { data: menu } = useQuery(menuQueryOptions);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [ing, setIng] = useState("");
  const products = (menu?.products ?? []) as MenuProduct[];
  const cats = new Map((menu?.categories ?? []).map((c) => [c.id, c.name]));
  const ingNames = useMemo(() => {
    const s = new Set<string>();
    for (const i of menu?.ingredients ?? []) s.add(i.name);
    for (const p of products) { p.ingredients.forEach((x) => s.add(x)); p.extras.forEach((e) => s.add(e.name)); p.choice_groups.forEach((g) => g.options.forEach((o) => s.add(o.name))); }
    return [...s].filter(Boolean).sort((a, b) => a.localeCompare(b, "it"));
  }, [menu, products]);
  const results = filterDishes(products, { min: min === "" ? null : Number(min.replace(",", ".")), max: max === "" ? null : Number(max.replace(",", ".")), ingredient: ing });

  return <main className="mx-auto min-h-screen max-w-6xl p-6">
    <header className="mb-4 flex flex-wrap items-center gap-3">
      <h1 className="mr-auto font-display text-6xl text-accent">🔍 Cerca piatti</h1>
      <Link to="/menu" className={staffChipClass}>🍔 Gestione menu</Link>
      <Link to="/scorte" className={staffChipClass}>📦 Scorte</Link>
      <Link to="/cassa" className={staffChipClass}>💶 Cassa</Link>
      <Link to="/admin" className={staffChipClass}>⚙️ Admin</Link>
    </header>
    <div className="mb-4 grid gap-3 rounded-2xl bg-card p-4 md:grid-cols-3">
      <label className="text-lg font-bold">Prezzo da €<input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" className="mt-1 w-full rounded-xl bg-muted px-4 py-3 text-xl outline-none" /></label>
      <label className="text-lg font-bold">Prezzo fino a €<input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="qualsiasi" className="mt-1 w-full rounded-xl bg-muted px-4 py-3 text-xl outline-none" /></label>
      <IngredientPicker value={ing} onChange={setIng} names={ingNames} />
    </div>
    <div className="mb-3 flex items-center gap-3 text-xl"><span className="font-bold">{results.length} piatti trovati</span>
      {(min || max || ing) && <button onClick={() => { setMin(""); setMax(""); setIng(""); }} className={staffChipClass}>✕ Azzera filtri</button>}</div>
    <ul className="divide-y divide-border rounded-2xl bg-card">
      {results.map((r) => <li key={r.product.id} className="flex flex-wrap items-baseline gap-3 p-4">
        <div className="mr-auto min-w-0"><p className="text-2xl font-bold">{r.product.name}{r.product.sold_out && <span className="ml-2 text-lg text-destructive">(esaurito)</span>}</p>
          <p className="text-lg text-muted-foreground">{cats.get(r.product.category_id) ?? ""}{r.where.length > 0 && ` · trovato in: ${r.where.join(", ")}`}</p></div>
        <span className="text-2xl font-bold text-accent">{euro(r.product.price)}</span>
      </li>)}
      {results.length === 0 && <li className="p-6 text-xl text-muted-foreground">Nessun piatto corrisponde ai filtri.</li>}
    </ul>
  </main>;
}

function IngredientPicker({ value, onChange, names }: { value: string; onChange: (v: string) => void; names: string[] }) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const q = typing ? value.trim().toLowerCase() : "";
  const list = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
  return <div className="relative text-lg font-bold">Ingrediente
    <div className="mt-1 flex gap-2">
      <input value={value} onFocus={(e) => { setTyping(false); setOpen(true); e.currentTarget.select(); }} onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => { onChange(e.target.value); setTyping(true); setOpen(true); }}
        placeholder="es. Mortadella" className="w-full rounded-xl bg-muted px-4 py-3 text-xl outline-none" />
      {value && <button type="button" aria-label="Cancella ingrediente" onClick={() => onChange("")} className="rounded-xl bg-muted px-4 text-xl">✕</button>}
    </div>
    {open && list.length > 0 && <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
      {list.map((n) => <li key={n}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(n); setTyping(false); setOpen(false); }}
        className={`w-full px-4 py-2 text-left text-xl font-normal hover:bg-muted ${n === value ? "bg-muted font-bold" : ""}`}>{n}</button></li>)}
    </ul>}
  </div>;
}
