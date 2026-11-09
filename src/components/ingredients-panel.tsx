import { useState } from "react";
import { toast } from "sonner";
import { deleteIngredient, saveIngredient, setCategoryCustom, setCategoryCustomTitles, setCategoryNameTr, type MenuCategory, type MenuIngredient } from "@/lib/menu.functions";
import { Fold } from "@/components/fold";
import { TranslationsEditor } from "@/components/translations-editor";
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

function KindList({ kind, title, items, refresh }: { kind: "dolce" | "salato"; title: string; items: MenuIngredient[]; refresh: () => Promise<unknown> }) {
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
    <Fold title={title} hint={`${items.length}`}>
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

function CategoryCustom({ c, refresh }: { c: MenuCategory; refresh: () => Promise<unknown> }) {
  const [price, setPrice] = useState(fmt(c.custom_price));
  const [titles, setTitles] = useState({ custom_title: c.custom_title, custom_title_en: c.custom_title_en, custom_title_fr: c.custom_title_fr, custom_title_es: c.custom_title_es, custom_title_de: c.custom_title_de, custom_title_ar: c.custom_title_ar });
  const [busy, setBusy] = useState(false);
  const save = async (kind: string, p = price) => {
    try { await setCategoryCustom({ data: { id: c.id, kind, price: p } }); await refresh(); toast.success("Salvato"); } catch (e) { err(e); }
  };
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/40 p-3">
      <span className="min-w-40 flex-1 text-2xl font-bold">{c.name}</span>
      <select aria-label={`Crea il tuo ${c.name}`} value={c.custom_kind} onChange={(e) => save(e.target.value)} className={field}>
        <option value="none">No</option>
        <option value="salato">Sì, ingredienti salati</option>
        <option value="dolce">Sì, ingredienti dolci</option>
        <option value="entrambi">Sì, dolci e salati</option>
      </select>
      <label className="flex items-center gap-2 text-xl">
        Prezzo base €
        <input aria-label="Prezzo base" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => save(c.custom_kind)} className={`${field} w-24 text-center`} />
      </label>
      <div className="w-full"><TranslationsEditor label={`🌍 Nome «${c.name}» nelle altre lingue`} value={c.name_tr} onSave={async (tr) => { await setCategoryNameTr({ data: { id: c.id, tr } }); await refresh(); }} /></div>
      <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
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
      }} className="tap h-auto whitespace-normal px-5 py-3 text-xl font-bold">{busy ? "Salvataggio…" : "Salva titoli"}</Button>
    </li>
  );
}

export function IngredientsPanel({ categories, ingredients, refresh }: { categories: MenuCategory[]; ingredients: MenuIngredient[]; refresh: () => Promise<unknown> }) {
  return (
    <div className="mt-10 grid gap-6">
      <h2 className="font-display text-6xl">Ingredienti</h2>
      <p className="-mt-4 text-xl text-muted-foreground">
        Scrivi ogni ingrediente una volta, con il nome nelle 4 lingue e il prezzo quando lo si aggiunge. Usa gli stessi nomi italiani nelle opzioni dei piatti: sul totem compariranno tradotti. "Non disponibile" lo nasconde ovunque sul totem.
      </p>
      <KindList kind="salato" title="🧀 Ingredienti salati" items={ingredients.filter((g) => g.kind === "salato")} refresh={refresh} />
      <KindList kind="dolce" title="🍫 Ingredienti dolci" items={ingredients.filter((g) => g.kind === "dolce")} refresh={refresh} />
      <Fold title="✨ Crea il tuo piatto">
        <p className="mb-3 text-xl text-muted-foreground">Per ogni categoria scegli se il cliente può comporre un piatto da zero e con quali ingredienti. Il prezzo finale = prezzo base + ingredienti scelti.</p>
        <ul className="space-y-2">
          {categories.map((c) => <CategoryCustom key={[c.id, c.custom_price, c.custom_title, c.custom_title_en, c.custom_title_fr, c.custom_title_es, c.custom_title_de, c.custom_title_ar].join("|")} c={c} refresh={refresh} />)}
        </ul>
      </Fold>
    </div>
  );
}
