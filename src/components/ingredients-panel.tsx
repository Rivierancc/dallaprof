import { useState } from "react";
import { toast } from "sonner";
import { deleteIngredient, fillIngredientPrices, saveIngredient, setCategoryCustom, setCategoryCustomTitles, setCategoryNameTr, type MenuCategory, type MenuIngredient } from "@/lib/menu.functions";
import { Fold } from "@/components/fold";
import { TranslationsEditor } from "@/components/translations-editor";
import { translateIngredients } from "@/lib/translate.functions";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Operazione non riuscita");
const field = "min-w-0 rounded-xl bg-muted px-3 py-3 text-xl outline-none";

type Draft = { name: string; name_en: string; name_fr: string; name_es: string; name_de: string; name_ar: string; group: string; price: string };
const empty: Draft = { name: "", name_en: "", name_fr: "", name_es: "", name_de: "", name_ar: "", group: "", price: "" };

function IngredientForm({ initial, onSave, onCancel, label, listId }: { listId: string; initial: Draft; onSave: (d: Draft) => Promise<void>; onCancel?: () => void; label: string }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <div className="grid gap-2 rounded-2xl bg-background/40 p-3 sm:grid-cols-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_9rem_6rem_auto]">
      <input aria-label="Nome italiano" placeholder="🇮🇹 Italiano" value={d.name} onChange={set("name")} className={field} />
      <input aria-label="Nome inglese" placeholder="🇬🇧 English" value={d.name_en} onChange={set("name_en")} className={field} />
      <input aria-label="Nome francese" placeholder="🇫🇷 Français" value={d.name_fr} onChange={set("name_fr")} className={field} />
      <input aria-label="Nome spagnolo" placeholder="🇪🇸 Español" value={d.name_es} onChange={set("name_es")} className={field} />
      <input aria-label="Nome tedesco" placeholder="🇩🇪 Deutsch" value={d.name_de} onChange={set("name_de")} className={field} />
      <input aria-label="Nome arabo" dir="rtl" placeholder="🇸🇦 العربية" value={d.name_ar} onChange={set("name_ar")} className={field} />
      <input aria-label="Categoria ingrediente" placeholder="Categoria (es. Salumi)" list={listId} value={d.group} onChange={set("group")} className={field} />
      <input aria-label="Prezzo" placeholder="€ 0,00" inputMode="decimal" value={d.price} onChange={set("price")} className={`${field} text-center`} />
      <div className="flex gap-2">
        <button disabled={busy} onClick={async () => { setBusy(true); try { await onSave(d); setD(initial); } catch (e) { err(e); } finally { setBusy(false); } }} className="tap rounded-xl bg-primary px-4 text-xl font-bold text-primary-foreground">{label}</button>
        {onCancel && <button onClick={onCancel} className="tap rounded-xl bg-secondary px-4 text-xl">✕</button>}
      </div>
    </div>
  );
}

function KindList({ kind, title, items, refresh, bare }: { kind: "dolce" | "salato"; title: string; items: MenuIngredient[]; refresh: () => Promise<unknown>; bare?: boolean }) {
  const [edit, setEdit] = useState<string | null>(null);
  const listId = `grp-${kind}`;
  const groups = [...new Set(items.map((g) => g.group).filter(Boolean))].sort();
  const sorted = [...items].sort((a, b) => (a.group || "~").localeCompare(b.group || "~"));
  const save = async (d: Draft, g?: MenuIngredient) => {
    await saveIngredient({ data: { ...(g ? { id: g.id } : {}), ...d, kind, price: d.price || "0", available: g ? g.available : true } });
    setEdit(null);
    await refresh();
    toast.success("Ingrediente salvato");
  };
  return (
    <Fold bare={!!bare} title={title} hint={`${items.length}`}>
      <datalist id={listId}>{groups.map((x) => <option key={x} value={x} />)}</datalist>
      <ul className="mb-4 space-y-2">
        {sorted.map((g) =>
          edit === g.id ? (
            <li key={g.id}>
              <IngredientForm listId={listId} label="Salva" initial={{ name: g.name, name_en: g.name_en, name_fr: g.name_fr, name_es: g.name_es, name_de: g.name_de, name_ar: g.name_ar, group: g.group, price: fmt(g.price) }} onSave={(d) => save(d, g)} onCancel={() => setEdit(null)} />
            </li>
          ) : (
            <li key={g.id} className={`flex flex-wrap items-center gap-3 rounded-2xl bg-background/40 p-3 ${g.available ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold">{g.group && <span className="mr-2 rounded-full bg-accent px-3 py-0.5 text-lg text-accent-foreground">{g.group}</span>}{g.name} · € {fmt(g.price)}</p>
                <p className="text-lg text-muted-foreground">🇬🇧 {g.name_en || "—"} · 🇫🇷 {g.name_fr || "—"} · 🇪🇸 {g.name_es || "—"} · 🇩🇪 {g.name_de || "—"} · 🇸🇦 {g.name_ar || "—"}</p>
              </div>
              <button
                onClick={async () => { try { await saveIngredient({ data: { ...g, available: !g.available } }); await refresh(); } catch (e) { err(e); } }}
                className={`tap rounded-xl px-4 py-2 text-xl font-bold ${g.available ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
              >
                {g.available ? "Disponibile" : "Non disponibile"}
              </button>
              <button onClick={() => setEdit(g.id)} className="tap rounded-xl bg-secondary px-4 py-2 text-xl">✏️</button>
              <button
                onClick={async () => { if (!confirm(`Eliminare ${g.name}?`)) return; try { await deleteIngredient({ data: { id: g.id } }); await refresh(); } catch (e) { err(e); } }}
                className="tap rounded-xl bg-secondary px-4 py-2 text-xl"
              >
                🗑️
              </button>
            </li>
          ),
        )}
        {!items.length && <li className="text-lg text-muted-foreground">Nessun ingrediente</li>}
      </ul>
      <IngredientForm listId={listId} label="+ Aggiungi" initial={empty} onSave={(d) => save(d)} />
    </Fold>
  );
}

// «Crea il tuo» della singola categoria: si mostra dentro la categoria in Gestione menu.
export function CategoryCustom({ c, ingredients, refresh }: { c: MenuCategory; ingredients: MenuIngredient[]; refresh: () => Promise<unknown> }) {
  const [price, setPrice] = useState(fmt(c.custom_price));
  const [titles, setTitles] = useState({ custom_title: c.custom_title, custom_title_en: c.custom_title_en, custom_title_fr: c.custom_title_fr, custom_title_es: c.custom_title_es, custom_title_de: c.custom_title_de, custom_title_ar: c.custom_title_ar });
  const [excluded, setExcluded] = useState<string[]>(c.custom_excluded);
  const [busy, setBusy] = useState(false);
  const on = c.custom_kind !== "none";
  const save = async (kind: string, p = price, ex = excluded) => {
    try { await setCategoryCustom({ data: { id: c.id, kind, price: p, excluded: ex } }); await refresh(); toast.success("Salvato"); } catch (e) { err(e); }
  };
  const offered = ingredients.filter((g) => c.custom_kind === "entrambi" || g.kind === c.custom_kind).sort((a, b) => (a.group || "~").localeCompare(b.group || "~") || a.name.localeCompare(b.name));
  const toggle = (id: string) => setExcluded(excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id]);
  const [open, setOpen] = useState(false);
  const [newKind, setNewKind] = useState<"salato" | "dolce">("salato");
  const dirty = [...excluded].sort().join(",") !== [...c.custom_excluded].sort().join(",");
  const title = c.custom_title.trim() || `Crea il tuo ${c.name}`;
  const [expanded, setExpanded] = useState(false);
  const head = (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={() => setExpanded(!expanded)} className="mr-auto min-w-0 truncate text-left text-2xl font-bold">✨ {title}</button>
      <span className={`rounded-full px-4 py-1 text-lg font-bold ${on ? "bg-success text-success-foreground" : "bg-secondary"}`}>{on ? "Acceso sul totem" : "Spento"}</span>
      {on && <span className="text-2xl font-bold">€ {fmt(c.custom_price)}</span>}
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="tap rounded-xl bg-secondary px-4 py-3 text-xl font-bold">{expanded ? "▲ Comprimi" : "▼ Apri"}</button>
    </div>
  );
  if (!expanded) return <div className={`mb-3 rounded-2xl border-2 p-3 ${on ? "border-accent bg-background/40" : "border-border bg-background/20"}`}>{head}</div>;
  return (
    <div className={`mb-3 rounded-2xl border-2 p-4 ${on ? "border-accent bg-background/40" : "border-border bg-background/20"}`}>
      {head}
      <Fold open={open} onToggle={setOpen} title="Impostazioni «Crea il tuo»" hint={on ? `${offered.length - offered.filter((g) => excluded.includes(g.id)).length} ingredienti` : "spento"}>
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label={`Crea il tuo ${c.name}`} value={c.custom_kind} onChange={(e) => save(e.target.value)} className={field}>
            <option value="none">Spento (non si vede sul totem)</option>
            <option value="salato">Acceso, ingredienti salati</option>
            <option value="dolce">Acceso, ingredienti dolci</option>
            <option value="entrambi">Acceso, dolci e salati</option>
          </select>
          <label className="flex items-center gap-2 text-xl">
            Prezzo base €
            <input aria-label="Prezzo base" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => save(c.custom_kind)} className={`${field} w-24 text-center`} />
          </label>
        </div>
        {on && (
          <div className="mt-4">
            <p className="mb-2 text-xl font-bold">Ingredienti che il cliente può scegliere — tocca per escludere o rimettere:</p>
            <div className="flex flex-wrap gap-2">
              {offered.map((g) => {
                const out = excluded.includes(g.id);
                return (
                  <button key={g.id} onClick={() => toggle(g.id)} className={`tap rounded-full px-4 py-2 text-lg font-bold ${out ? "bg-secondary text-muted-foreground line-through" : "bg-success text-success-foreground"}`}>
                    {out ? "✕" : "✓"} {g.name}{g.price ? ` · € ${fmt(g.price)}` : ""}{!g.available ? " (non disp.)" : ""}
                  </button>
                );
              })}
              {!offered.length && <p className="text-lg text-muted-foreground">Nessun ingrediente in archivio di questo tipo.</p>}
            </div>
            <Fold title="💶 Prezzi e nuovi ingredienti" hint="archivio unico">
              <p className="mb-2 text-lg text-muted-foreground">I prezzi sono quelli dell'archivio generale: se li cambi qui cambiano ovunque. 0 = gratis, incluso nel prezzo base.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {offered.map((g) => <PriceRow key={g.id + g.price} g={g} refresh={refresh} />)}
              </div>
              <p className="mb-2 mt-4 text-xl font-bold">＋ Nuovo ingrediente (va nell'archivio generale)</p>
              {c.custom_kind === "entrambi" && (
                <select aria-label="Tipo nuovo ingrediente" value={newKind} onChange={(e) => setNewKind(e.target.value as "salato" | "dolce")} className={`${field} mb-2`}>
                  <option value="salato">🧀 Salato</option><option value="dolce">🍫 Dolce</option>
                </select>
              )}
              <IngredientForm listId={`grp-${c.id}`} label="+ Aggiungi" initial={empty} onSave={async (d) => {
                await saveIngredient({ data: { ...d, kind: c.custom_kind === "entrambi" ? newKind : c.custom_kind, price: d.price || "0", available: true } });
                await refresh(); toast.success("Ingrediente aggiunto");
              }} />
            </Fold>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {dirty && <span className="text-lg font-bold text-accent">Modifiche non ancora salvate</span>}
              <button onClick={async () => { await save(c.custom_kind, price, excluded); setOpen(false); }} className="tap rounded-xl bg-success px-5 py-3 text-xl font-bold text-success-foreground">✓ Ho finito, salva e chiudi</button>
              <button disabled={!dirty} onClick={() => save(c.custom_kind, price, excluded)} className="tap rounded-xl bg-secondary px-5 py-3 text-xl font-bold disabled:opacity-50">Salva senza chiudere</button>
              <button disabled={!dirty} onClick={() => setExcluded(c.custom_excluded)} className="tap rounded-xl bg-secondary px-5 py-3 text-xl font-bold disabled:opacity-50">✕ Annulla</button>
            </div>
          </div>
        )}
        <div className="mt-4"><TranslationsEditor label={`🌍 Nome «${c.name}» nelle altre lingue`} value={c.name_tr} onSave={async (tr) => { await setCategoryNameTr({ data: { id: c.id, tr } }); await refresh(); }} /></div>
        <div className="mt-3 grid w-full min-w-0 gap-3 sm:grid-cols-2">
          {([
            ["custom_title", "Titolo italiano", "Crea la tua piadina"],
            ["custom_title_en", "Titolo inglese", "Create your own flatbread"],
            ["custom_title_fr", "Titolo francese", "Composez votre galette"],
            ["custom_title_es", "Titolo spagnolo", "Crea tu piadina"],
            ["custom_title_de", "Titolo tedesco", "Stell deine Piadina zusammen"],
            ["custom_title_ar", "Titolo arabo", "اصنع البيادينا الخاصة بك"],
          ] as const).map(([key, label, placeholder]) => (
            <label key={key} className="grid min-w-0 gap-1 text-lg">
              {label}
              <input aria-label={`${label} ${c.name}`} maxLength={120} placeholder={placeholder} value={titles[key]} onChange={(e) => setTitles({ ...titles, [key]: e.target.value })} className={field} />
            </label>
          ))}
        </div>
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await setCategoryCustomTitles({ data: { id: c.id, ...titles } }); await refresh(); toast.success("Titoli salvati"); }
          catch (e) { err(e); }
          finally { setBusy(false); }
        }} className="tap mt-3 h-auto whitespace-normal px-5 py-3 text-xl font-bold">{busy ? "Salvataggio…" : "Salva titoli"}</Button>
      </Fold>
    </div>
  );
}

function PriceRow({ g, refresh }: { g: MenuIngredient; refresh: () => Promise<unknown> }) {
  const [v, setV] = useState(fmt(g.price));
  const commit = async () => {
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) { setV(fmt(g.price)); return; }
    if (Math.round(n * 100) === Math.round(g.price * 100)) return;
    try { await saveIngredient({ data: { id: g.id, name: g.name, name_en: g.name_en, name_fr: g.name_fr, name_es: g.name_es, name_de: g.name_de, name_ar: g.name_ar, group: g.group, kind: g.kind, price: v, available: g.available } }); await refresh(); toast.success(`${g.name}: € ${fmt(n)}`); } catch (e) { err(e); }
  };
  return (
    <label className="flex items-center gap-2 rounded-xl bg-background/40 px-3 py-2 text-lg">
      <span className="min-w-0 flex-1 truncate">{g.name}</span>
      €<input aria-label={`Prezzo ${g.name}`} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className={`${field} w-24 py-2 text-center`} />
      <span className={`w-16 text-sm font-bold ${Number(v.replace(",", ".")) > 0 ? "text-accent" : "text-muted-foreground"}`}>{Number(v.replace(",", ".")) > 0 ? "a pagam." : "gratis"}</span>
    </label>
  );
}

function FillPricesButton({ refresh }: { refresh: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button disabled={busy} variant="secondary" onClick={async () => {
      setBusy(true);
      try { const r = await fillIngredientPrices(); await refresh(); toast.success(r.done ? `Prezzi copiati dal menu: ${r.done} ingredienti` : "Nessun prezzo nuovo da copiare"); }
      catch (e) { err(e); }
      finally { setBusy(false); }
    }} className="tap h-auto w-fit whitespace-normal px-5 py-3 text-xl font-bold">{busy ? "Copia in corso…" : "💶 Prendi i prezzi dagli extra del menu (solo ingredienti a 0 €)"}</Button>
  );
}

function TranslateIngredientsButton({ refresh }: { refresh: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button disabled={busy} variant="secondary" onClick={async () => {
      setBusy(true);
      try { const r = await translateIngredients(); await refresh(); toast.success(`Tradotti ${r.done} ingredienti${r.failed ? ` · ${r.failed} non riusciti` : ""}`); }
      catch (e) { err(e); }
      finally { setBusy(false); }
    }} className="tap h-auto w-fit whitespace-normal px-5 py-3 text-xl font-bold">{busy ? "Traduzione in corso…" : "🌍 Traduci gli ingredienti senza traduzione"}</Button>
  );
}

export function IngredientsPanel({ ingredients, refresh, only }: { categories?: MenuCategory[]; ingredients: MenuIngredient[]; refresh: () => Promise<unknown>; only?: "salato" | "dolce" }) {
  if (only) return (
    <div className="grid gap-4">
      <KindList bare kind={only} title={only === "salato" ? "🧀 Ingredienti salati" : "🍫 Ingredienti dolci"} items={ingredients.filter((g) => g.kind === only)} refresh={refresh} />
      <p className="text-lg text-muted-foreground">Scrivi ogni ingrediente una volta, con il nome nelle lingue e il prezzo. Usa gli stessi nomi italiani nelle opzioni dei piatti: sul totem compariranno tradotti. "Non disponibile" lo nasconde ovunque sul totem.</p>
      <FillPricesButton refresh={refresh} />
      <TranslateIngredientsButton refresh={refresh} />
    </div>
  );
  return (
    <div className="mt-10 grid gap-6">
      <KindList kind="salato" title="🧀 Ingredienti salati" items={ingredients.filter((g) => g.kind === "salato")} refresh={refresh} />
      <KindList kind="dolce" title="🍫 Ingredienti dolci" items={ingredients.filter((g) => g.kind === "dolce")} refresh={refresh} />
      <FillPricesButton refresh={refresh} />
      <TranslateIngredientsButton refresh={refresh} />
    </div>
  );
}
