import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { kitchenStatus } from "@/lib/kitchen.functions";
import { PinPad } from "@/components/pin-pad";
import { staffChipClass } from "@/components/staff-nav";
import { venuePageTitle } from "@/lib/page-title";
import { menuQueryOptions } from "@/lib/menu";
import { saveIngredient, saveIngredientInfo, type MenuIngredient, type MenuProduct } from "@/lib/menu.functions";
import { bannerQueryOptions } from "@/components/display-banner";
import { ALLERGENS, infoFlags } from "@/lib/allergens";

export const Route = createFileRoute("/scorte")({
  loader: () => kitchenStatus(),
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Scorte e allergeni", matches) }, { name: "description", content: "Ingredienti del menu: scorte, allergeni e prodotti surgelati." },
    { property: "og:title", content: venuePageTitle("Scorte e allergeni", matches) }, { property: "og:description", content: "Ingredienti del menu: scorte, allergeni e prodotti surgelati." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ScorteGate,
});

function ScorteGate() {
  if (!Route.useLoaderData().unlocked) return <PinPad title="Scorte" />;
  return <Scorte />;
}

const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Operazione non riuscita");
const usedNames = (p: MenuProduct) => [...p.ingredients, ...p.extras.map((e) => e.name), ...p.choice_groups.flatMap((g) => g.options.map((o) => o.name))];

function Scorte() {
  const { data: menu } = useQuery(menuQueryOptions);
  const { data: banner } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<string | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu"] });
  const lib = (menu?.ingredients ?? []) as MenuIngredient[];
  const products = (menu?.products ?? []) as MenuProduct[];
  const usedIn = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of products) for (const n of new Set(usedNames(p).map((x) => x.toLowerCase()))) m.set(n, [...(m.get(n) ?? []), p.name]);
    return m;
  }, [products]);
  const missing = useMemo(() => {
    const have = new Set(lib.map((g) => g.name.toLowerCase()));
    const dishNames = new Set(products.map((p) => p.name.toLowerCase()));
    const out = new Map<string, string>();
    for (const p of products) for (const n of p.ingredients) if (!have.has(n.toLowerCase()) && !dishNames.has(n.toLowerCase())) out.set(n.toLowerCase(), n);
    return [...out.values()].sort((a, b) => a.localeCompare(b));
  }, [lib, products]);
  const flags = infoFlags(banner);
  if (!menu) return <main className="p-8 text-2xl">Caricamento…</main>;

  const low = (g: MenuIngredient) => g.stock_mode === "pezzi" ? g.stock_qty <= g.stock_min : g.stock_state !== "ok";
  const list = lib
    .filter((g) => !q || g.name.toLowerCase().includes(q.toLowerCase()))
    .filter((g) => !only || (only === "gelo" ? g.frozen : g.allergens.includes(only)))
    .filter((g) => !onlyLow || low(g));
  const allGroups = [...new Set(lib.map((g) => g.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const groups = [...new Set(list.map((g) => g.group || "Altro"))].sort((a, b) => a.localeCompare(b));
  const save = async (g: MenuIngredient, d: Info) => {
    try { await saveIngredientInfo({ data: { ...d, id: g.id } }); await refresh(); } catch (e) { err(e); }
  };

  return <main className="mx-auto min-h-screen max-w-6xl p-6">
    <header className="mb-4 flex flex-wrap items-center gap-3">
      <h1 className="mr-auto font-display text-6xl text-accent">📦 Scorte e allergeni</h1>
      <Link to="/menu" className={staffChipClass}>🍔 Gestione menu</Link>
      <Link to="/cucina" className={staffChipClass}>🍳 Cucina</Link>
      <Link to="/admin" className={staffChipClass}>⚙️ Admin</Link>
    </header>
    {!flags.stock && <p className="mb-4 rounded-2xl bg-muted p-4 text-xl">La gestione scorte è spenta per questo locale: accendila in Admin → «Scorte, allergeni e prodotti gelo».</p>}
    <div className="mb-3 flex flex-wrap gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Cerca ingrediente" className="min-w-60 flex-1 rounded-xl bg-muted px-4 py-3 text-xl outline-none" />
      <button onClick={() => setOnlyLow((v) => !v)} className={`tap rounded-xl px-4 py-3 text-xl font-bold ${onlyLow ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>⚠️ Da riordinare</button>
    </div>
    <div className="mb-6 flex flex-wrap gap-2">
      <button onClick={() => setOnly(null)} className={`tap rounded-full px-4 py-2 text-lg font-bold ${!only ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Tutti</button>
      {ALLERGENS.map((a) => <button key={a.id} onClick={() => setOnly(only === a.id ? null : a.id)} className={`tap rounded-full px-4 py-2 text-lg font-bold ${only === a.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{a.icon} {a.IT}</button>)}
      <button onClick={() => setOnly(only === "gelo" ? null : "gelo")} className={`tap rounded-full px-4 py-2 text-lg font-bold ${only === "gelo" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>❄️ Gelo</button>
    </div>
    {groups.map((grp) => <section key={grp} className="mb-8">
      <h2 className="mb-3 font-display text-4xl text-muted-foreground">{grp}</h2>
      <ul className="space-y-3">{list.filter((g) => (g.group || "Altro") === grp).map((g) => <Row key={g.id} groupsAll={allGroups} g={g} low={low(g)} used={usedIn.get(g.name.toLowerCase()) ?? []} save={(d) => save(g, d)} />)}</ul>
    </section>)}
    {!list.length && <p className="text-xl text-muted-foreground">Nessun ingrediente trovato.</p>}
    {missing.length > 0 && !only && !q && <section className="mt-10 rounded-2xl bg-card p-4">
      <h2 className="font-display text-4xl">Ingredienti dei piatti non ancora in archivio</h2>
      <p className="mb-3 text-lg text-muted-foreground">Aggiungili per segnare allergeni, gelo e scorte.</p>
      <div className="flex flex-wrap gap-2">{missing.map((n) => <button key={n} onClick={async () => { try { await saveIngredient({ data: { name: n, kind: "salato", price: 0 } }); await refresh(); toast.success(`${n} aggiunto`); } catch (e) { err(e); } }} className="tap rounded-full bg-secondary px-4 py-2 text-lg font-bold">+ {n}</button>)}</div>
    </section>}
  </main>;
}

type Info = Omit<Parameters<typeof saveIngredientInfo>[0]["data"], "id">;
function Row({ g, low, used, save, groupsAll }: { groupsAll: string[]; g: MenuIngredient; low: boolean; used: string[]; save: (d: Info) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const toggleA = (id: string) => save({ allergens: g.allergens.includes(id) ? g.allergens.filter((x) => x !== id) : [...g.allergens, id] });
  const btn = "tap rounded-xl px-4 py-2 text-lg font-bold";
  return <li className={`rounded-2xl p-4 ${low ? "border-2 border-destructive bg-card" : "bg-card"} ${g.available ? "" : "opacity-60"}`}>
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-48 flex-1">
        <p className="text-2xl font-bold">{g.frozen && <span title="Gelo / surgelato">❄️ </span>}{g.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">{ALLERGENS.filter((a) => g.allergens.includes(a.id)).map((a) => <span key={a.id} className="rounded-full bg-accent px-3 py-0.5 text-base font-bold text-accent-foreground">{a.icon} {a.IT}</span>)}</div>
        {used.length > 0 && <p className="mt-1 text-base text-muted-foreground">Usato in: {used.join(", ")}</p>}
      </div>
      <div className="flex rounded-xl bg-muted p-1">
        <button onClick={() => save({ stock_mode: "pezzi" })} className={`${btn} ${g.stock_mode === "pezzi" ? "bg-primary text-primary-foreground" : ""}`}>A pezzi</button>
        <button onClick={() => save({ stock_mode: "vista" })} className={`${btn} ${g.stock_mode === "vista" ? "bg-primary text-primary-foreground" : ""}`}>A vista</button>
      </div>
      {g.stock_mode === "pezzi" ? <div className="flex items-center gap-2">
        <button onClick={() => save({ stock_qty: g.stock_qty - 1 })} className={`${btn} bg-secondary text-2xl`}>−</button>
        <input aria-label={`Pezzi ${g.name}`} key={g.stock_qty} defaultValue={g.stock_qty} inputMode="numeric" onBlur={(e) => { const v = Number(e.target.value); if (v !== g.stock_qty) void save({ stock_qty: v }); }} className="w-20 rounded-xl bg-muted px-2 py-2 text-center text-2xl font-bold" />
        <button onClick={() => save({ stock_qty: g.stock_qty + 1 })} className={`${btn} bg-secondary text-2xl`}>+</button>
        <label className="text-base">min <input aria-label={`Soglia ${g.name}`} key={`m${g.stock_min}`} defaultValue={g.stock_min} inputMode="numeric" onBlur={(e) => { const v = Number(e.target.value); if (v !== g.stock_min) void save({ stock_min: v }); }} className="w-14 rounded-lg bg-muted px-1 py-1 text-center text-lg" /></label>
      </div> : <div className="flex gap-1">
        {([["ok", "🟢 Disponibile", "bg-success text-success-foreground"], ["low", "🟡 Sta finendo", "bg-accent text-accent-foreground"], ["out", "🔴 Finito", "bg-destructive text-destructive-foreground"]] as const).map(([v, l, c]) =>
          <button key={v} onClick={() => save({ stock_state: v })} className={`${btn} ${g.stock_state === v ? c : "bg-secondary"}`}>{l}</button>)}
      </div>}
      <button onClick={() => save({ frozen: !g.frozen })} className={`${btn} ${g.frozen ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>❄️ {g.frozen ? "Gelo" : "Fresco"}</button>
      <select aria-label={`Categoria ${g.name}`} value={g.group || ""} onChange={(e) => { let v = e.target.value; if (v === "__new") { v = (prompt("Nome della nuova categoria") || "").trim(); if (!v) return; } void save({ group: v }); }} className="rounded-xl bg-secondary px-3 py-2 text-lg font-bold">
        <option value="">📂 Altro</option>
        {groupsAll.map((x) => <option key={x} value={x}>📂 {x}</option>)}
        <option value="__new">＋ Nuova categoria…</option>
      </select>
      <button onClick={() => setOpen((o) => !o)} className={`${btn} bg-secondary`}>Allergeni {open ? "▲" : "▼"}</button>
    </div>
    {open && <div className="mt-3 flex flex-wrap gap-2">{ALLERGENS.map((a) => { const on = g.allergens.includes(a.id); return <button key={a.id} aria-pressed={on} onClick={() => toggleA(a.id)} className={`tap rounded-full px-4 py-2 text-lg font-bold ${on ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{on ? "✓ " : ""}{a.icon} {a.IT}</button>; })}</div>}
  </li>;
}
