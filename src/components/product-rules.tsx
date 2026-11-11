import { useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { menuQueryOptions } from "@/lib/menu";
import { bannerQueryOptions } from "@/components/display-banner";
import { cleanFilters, dishMatches } from "@/lib/food-filters";
import { setProductTags, setProductRecipe, setProductRules, type MenuProduct } from "@/lib/menu.functions";
import { EditOption } from "@/components/edit-option";
import type { ChoiceGroup, Suggest } from "@/lib/options";

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
const num = (s: string) => Number(s.replace(",", "."));
const box = "rounded-xl bg-muted px-3 py-2 text-xl outline-none";
const btn = "tap rounded-xl px-4 py-2 text-xl font-bold";

// Limite extra, scelte obbligatorie, menu combinato e prodotto suggerito di un piatto.
export function ProductRules({ p }: { p: MenuProduct }) {
  const qc = useQueryClient();
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const save = useServerFn(setProductRules);
  const [busy, setBusy] = useState(false);
  const run = async (patch: Partial<{ maxExtras: number; groups: ChoiceGroup[]; combo: string[]; comboPrice: number | null; suggest: Suggest }>, msg = "Salvato") => {
    setBusy(true);
    try {
      await save({ data: { id: p.id, maxExtras: p.max_extras, groups: p.choice_groups, combo: p.combo_items, comboPrice: p.combo_price, suggest: p.suggest, ...patch } });
      await qc.invalidateQueries({ queryKey: ["menu"] });
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };
  const groups = p.choice_groups;
  const setGroups = (g: ChoiceGroup[]) => run({ groups: g });
  const [gName, setGName] = useState("");
  const [sPrice, setSPrice] = useState(p.suggest.price === null ? "" : fmt(p.suggest.price));
  const [sMin, setSMin] = useState(fmt(p.suggest.min));

  return (
    <div className={`grid w-full gap-6 rounded-2xl bg-background/40 p-4 ${busy ? "opacity-60" : ""}`}>
      <TagsEditor p={p} />
      <RecipeEditor p={p} />
      <section>
        <h3 className="mb-2 text-2xl font-bold">Quanti extra può aggiungere il cliente</h3>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button key={n} disabled={busy} onClick={() => run({ maxExtras: n })} className={`${btn} ${p.max_extras === n ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{n === 0 ? "Senza limite" : `Max ${n}`}</button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-2xl font-bold">Scelte del cliente (es. salse, condimenti)</h3>
        <p className="mb-3 text-lg text-muted-foreground">Con «minimo» 1 o più la scelta è obbligatoria: il totem non aggiunge il piatto finché il cliente non sceglie.</p>
        <div className="grid gap-3">
          {groups.map((g, gi) => (
            <GroupEditor key={g.name + gi} g={g} disabled={busy} menu={menu}
              onChange={(ng) => setGroups(groups.map((x, i) => (i === gi ? ng : x)))}
              onDelete={() => setGroups(groups.filter((_, i) => i !== gi))} />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Nome gruppo, es. Salsa" className={`${box} min-w-0 flex-1`} />
          <button disabled={busy || !gName.trim() || groups.some((g) => g.name === gName.trim())} onClick={() => { setGroups([...groups, { name: gName.trim(), min: 1, max: 1, options: [] }]); setGName(""); }} className={`${btn} bg-primary text-primary-foreground disabled:opacity-40`}>+ Nuovo gruppo</button>
        </div>
      </section>

      <p className="text-lg text-muted-foreground">🍱 Il menu di questo piatto (scelte dalle categorie, prezzo, nome) si imposta nella sezione «🍱 Menu offerta» più in basso.</p>

      <section>
        <h3 className="mb-1 text-2xl font-bold">💡 Suggerisci prima di chiudere l'ordine</h3>
        <p className="mb-3 text-lg text-muted-foreground">Compare al cliente quando va al carrello, se non l'ha già preso. Prezzo offerta 0 = omaggio; vuoto = prezzo normale. Spesa minima 0 = offerta sempre valida.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy} role="switch" aria-checked={p.suggest.on} onClick={() => run({ suggest: { ...p.suggest, on: !p.suggest.on } })} className={`${btn} ${p.suggest.on ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{p.suggest.on ? "💡 Suggerito" : "Non suggerito"}</button>
          <label className="flex items-center gap-2 text-xl">Prezzo offerta €<input value={sPrice} inputMode="decimal" onChange={(e) => setSPrice(e.target.value)} placeholder="—" className={`${box} w-24 text-center`} /></label>
          <label className="flex items-center gap-2 text-xl">se spende almeno €<input value={sMin} inputMode="decimal" onChange={(e) => setSMin(e.target.value)} className={`${box} w-24 text-center`} /></label>
          <button disabled={busy} onClick={() => {
            const price = sPrice.trim() === "" ? null : num(sPrice);
            const min = num(sMin || "0");
            if ((price !== null && !(price >= 0)) || !(min >= 0)) { toast.error("Controlla i prezzi"); return; }
            void run({ suggest: { on: p.suggest.on, price, min } }, "Offerta salvata");
          }} className={`${btn} bg-primary text-primary-foreground`}>Salva offerta</button>
        </div>
      </section>
    </div>
  );
}

export function GroupEditor({ g, disabled, menu, onChange, onDelete }: { g: ChoiceGroup; disabled: boolean; menu: { categories: { id: string; name: string }[]; products: { id: string; name: string; category_id: string }[] }; onChange: (g: ChoiceGroup) => void; onDelete: () => void }) {
  const addNames = (names: string[]) => {
    const fresh = names.filter((v) => !g.options.some((o) => o.name === v)).map((v) => ({ name: v.slice(0, 40), price: 0 }));
    const options = [...g.options, ...fresh].slice(0, 20);
    if (!fresh.length) { toast.error("Già presente"); return; }
    onChange({ ...g, options });
  };
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const n = g.options.length;
  const add = () => {
    const v = name.trim();
    const pr = price.trim() ? num(price) : 0;
    if (!v || !(pr >= 0) || g.options.some((o) => o.name === v)) { toast.error("Scrivi un nome nuovo e un prezzo valido"); return; }
    onChange({ ...g, options: [...g.options, { name: v, price: Math.round(pr * 100) / 100 }] });
    setName(""); setPrice("");
  };
  const step = (k: "min" | "max", d: number) => {
    const next = { ...g, [k]: Math.max(k === "max" ? 1 : 0, g[k] + d) };
    if (next.min > next.max) k === "min" ? (next.max = next.min) : (next.min = next.max);
    if (next.max > Math.max(1, n)) return;
    onChange(next);
  };
  return (
    <div className="rounded-xl bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <strong className="text-2xl">{g.name}</strong>
        <span className={`rounded-full px-3 py-1 text-base font-bold ${g.min > 0 ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>{g.min > 0 ? "Obbligatoria" : "Facoltativa"}</span>
        <span className="flex items-center gap-1 text-xl">minimo <button disabled={disabled} onClick={() => step("min", -1)} className={`${btn} bg-secondary`}>−</button><b className="w-6 text-center">{g.min}</b><button disabled={disabled} onClick={() => step("min", 1)} className={`${btn} bg-secondary`}>+</button></span>
        <span className="flex items-center gap-1 text-xl">massimo <button disabled={disabled} onClick={() => step("max", -1)} className={`${btn} bg-secondary`}>−</button><b className="w-6 text-center">{g.max}</b><button disabled={disabled} onClick={() => step("max", 1)} className={`${btn} bg-secondary`}>+</button></span>
        <button disabled={disabled} onClick={() => confirm(`Eliminare il gruppo «${g.name}»?`) && onDelete()} className={`${btn} ml-auto bg-destructive text-destructive-foreground`}>Elimina gruppo</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {g.options.map((o, oi) => (
          <EditOption key={o.name} name={o.name} price={o.price} showZero={false} disabled={disabled} taken={g.options.map((x) => x.name)}
            onSave={(name, price) => onChange({ ...g, options: g.options.map((x, j) => (j === oi ? { ...x, name, price } : x)) })}
            onRemove={() => { const options = g.options.filter((x) => x.name !== o.name); onChange({ ...g, options, max: Math.min(g.max, Math.max(1, options.length)), min: Math.min(g.min, Math.max(1, options.length)) }); }} />
        ))}
        {!n && <span className="text-lg text-muted-foreground">Aggiungi le opzioni qui sotto</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={name} list="ing-lib" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="es. Ketchup" className={`${box} min-w-0 flex-1`} />
        <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} placeholder="€ 0" className={`${box} w-24 text-center`} />
        <button disabled={disabled} onClick={add} className={`${btn} bg-primary text-primary-foreground`}>+ Opzione</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <select disabled={disabled} value="" onChange={(e) => e.target.value && addNames([e.target.value])} className={`${box} min-w-0 flex-1`}>
          <option value="">🍱 Aggiungi un articolo del menu…</option>
          {menu.categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {menu.products.filter((x) => x.category_id === c.id).map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select disabled={disabled} value="" onChange={(e) => e.target.value && addNames(menu.products.filter((x) => x.category_id === e.target.value).map((x) => x.name))} className={`${box} min-w-0 flex-1`}>
          <option value="">📂 Aggiungi tutta una categoria…</option>
          {menu.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  );
}

// Scheda ingredienti mostrata in cucina quando si tocca il piatto.
function RecipeEditor({ p }: { p: MenuProduct }) {
  const qc = useQueryClient();
  const save = useServerFn(setProductRecipe);
  const [text, setText] = useState(p.recipe);
  const run = async (on: boolean, recipe: string) => {
    try { await save({ data: { id: p.id, on, recipe } }); await qc.invalidateQueries({ queryKey: ["menu"] }); toast.success("Salvato"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); }
  };
  return (
    <section>
      <h3 className="mb-1 text-2xl font-bold">👨‍🍳 Ingredienti di preparazione in cucina</h3>
      <p className="mb-3 text-lg text-muted-foreground">Se è acceso, in cucina toccando il piatto si apre il riquadro con ingredienti, modifiche del cliente e queste note.</p>
      <button onClick={() => run(!p.recipe_on, text)} className={`${btn} mb-3 ${p.recipe_on ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{p.recipe_on ? "Acceso" : "Spento"}</button>
      <textarea value={text} maxLength={1000} rows={4} onChange={(e) => setText(e.target.value)} placeholder="Es. pane tostato, 180 g di carne, cheddar, insalata, pomodoro…" className={`${box} block w-full`} />
      <button onClick={() => run(p.recipe_on, text)} className={`${btn} mt-2 bg-primary text-primary-foreground`}>Salva note</button>
    </section>
  );
}

// Etichette per i filtri del totem (Pollo, Halal, Senza glutine…).
function TagsEditor({ p }: { p: MenuProduct }) {
  const qc = useQueryClient();
  const save = useServerFn(setProductTags);
  const { data: banner } = useQuery(bannerQueryOptions);
  const list = cleanFilters(banner?.["food_filters"]);
  const toggle = async (id: string) => {
    const tags = p.food_tags.includes(id) ? p.food_tags.filter((t) => t !== id) : [...p.food_tags, id];
    try { await save({ data: { id: p.id, tags } }); await qc.invalidateQueries({ queryKey: ["menu"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); }
  };
  return (
    <section>
      <h3 className="mb-1 text-2xl font-bold">🔎 Filtri sul totem</h3>
      <p className="mb-3 text-lg text-muted-foreground">Spunta i filtri in cui deve comparire questo piatto. «Auto» vuol dire che è già riconosciuto dagli ingredienti.</p>
      <div className="flex flex-wrap gap-2">
        {list.map((f) => {
          const on = p.food_tags.includes(f.id);
          const auto = !on && dishMatches({ ...p, food_tags: [] }, f);
          return <button key={f.id} onClick={() => toggle(f.id)} className={`${btn} ${on ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{on ? "✓ " : ""}{f.emoji} {f.label}{auto ? " · auto" : ""}</button>;
        })}
      </div>
    </section>
  );
}
