import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Fold } from "@/components/fold";
import { menuQueryOptions } from "@/lib/menu";
import { setComboOffer, setOffersTitle, setProductRules, type MenuProduct } from "@/lib/menu.functions";
import { menuName, type ChoiceGroup, type ChoiceOption } from "@/lib/options";
import { GroupEditor } from "@/components/product-rules";

const fmt = (n: number) => n.toFixed(2).replace(".", ",");
const num = (s: string) => Number(s.replace(",", "."));
const box = "rounded-xl bg-muted px-3 py-2 text-xl outline-none";
const btn = "tap rounded-xl px-4 py-2 text-xl font-bold";

// Tutto ciò che riguarda i menu: articoli inclusi, prezzo, nome e sezione «Menu in offerta» del totem.
export function ComboOffersPanel() {
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const qc = useQueryClient();
  const saveTitle = useServerFn(setOffersTitle);
  const [title, setTitle] = useState(menu.offersTitle);
  const [extra, setExtra] = useState<string[]>([]);
  const menus = menu.products.filter((p) => p.combo_items.length || p.combo_groups.length || p.combo_offer || extra.includes(p.id));
  const rest = menu.products.filter((p) => !menus.includes(p));
  const offers = menu.products.filter((p) => p.combo_offer).length;
  return (
    <div className="mx-auto mt-6 max-w-5xl">
      <Fold title="🍱 Menu offerta" hint={`${menus.length} menu · ${offers} in offerta`}>
        <div className="grid gap-5">
          <p className="text-lg text-muted-foreground">Ogni piatto resta in vendita da solo nella sua categoria. Qui lo trasformi anche in menu: scegli dalle categorie cosa può scegliere il cliente (contorno, bevanda, dolce) e il prezzo totale; se lo metti «In offerta» compare anche nella sezione speciale del totem.</p>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/40 p-4">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-xl">Nome della sezione sul totem
              <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="Menu in offerta" className={`${box} min-w-0 flex-1`} /></label>
            <button onClick={async () => { try { await saveTitle({ data: { title } }); await qc.invalidateQueries({ queryKey: ["menu"] }); toast.success("Nome sezione salvato"); } catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); } }} className={`${btn} bg-primary text-primary-foreground`}>Salva nome</button>
          </div>
          {menus.map((p) => <ComboEditor key={p.id} p={p} />)}
          <select value="" onChange={(e) => e.target.value && setExtra((x) => [...x, e.target.value])} className={`${box} w-full`}>
            <option value="">+ Crea un menu da un piatto…</option>
            {menu.categories.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {rest.filter((x) => x.category_id === c.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </Fold>
    </div>
  );
}

function ComboEditor({ p }: { p: MenuProduct }) {
  const qc = useQueryClient();
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const saveRules = useServerFn(setProductRules);
  const saveOffer = useServerFn(setComboOffer);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(p.combo_name);
  const [cPrice, setCPrice] = useState(p.combo_price === null ? "" : fmt(p.combo_price));
  const catName = (id: string) => menu.categories.find((c) => c.id === id)?.name ?? "";
  const go = async (f: () => Promise<unknown>, msg = "Salvato") => {
    setBusy(true);
    try { await f(); await qc.invalidateQueries({ queryKey: ["menu"] }); toast.success(msg); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); }
    finally { setBusy(false); }
  };
  const rules = (patch: { combo?: string[]; comboPrice?: number | null; comboGroups?: ChoiceGroup[]; comboExtras?: ChoiceOption[] }) => go(() => saveRules({ data: { id: p.id, maxExtras: p.max_extras, groups: p.choice_groups, combo: p.combo_items, comboPrice: p.combo_price, suggest: p.suggest, ...patch } }));
  return (
    <div className={`grid gap-4 rounded-2xl bg-background/40 p-4 ${busy ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <strong className="font-display text-3xl">🍱 {menuName(p.name, p.combo_name)}</strong>
        <span className="text-lg text-muted-foreground">piatto principale: {p.name} · {catName(p.category_id)} · da solo {fmt(p.price)} €</span>
        <button disabled={busy} role="switch" aria-checked={p.combo_offer} onClick={() => go(() => saveOffer({ data: { id: p.id, on: !p.combo_offer, name } }))} className={`${btn} ml-auto ${p.combo_offer ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{p.combo_offer ? "⭐ In offerta sul totem" : "Non in offerta"}</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xl">Nome del menu
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={`Menu ${p.name}`} className={`${box} min-w-0 flex-1`} /></label>
        <button disabled={busy} onClick={() => go(() => saveOffer({ data: { id: p.id, on: p.combo_offer, name } }), "Nome salvato")} className={`${btn} bg-primary text-primary-foreground`}>Salva nome</button>
      </div>
      <p className="-mt-2 text-lg text-muted-foreground">Vuoto = si chiama «Menu {p.name}».</p>
      {p.combo_items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted p-3">
          <span className="text-lg text-muted-foreground">🍱 Articoli inclusi di prima: {p.combo_items.map((id) => menu.products.find((x) => x.id === id)?.name ?? "?").join(", ")}</span>
          <button disabled={busy} onClick={() => rules({ combo: [] })} className={`${btn} bg-secondary`}>Togli</button>
        </div>
      )}
      <MenuChoices p={p} busy={busy} menu={menu} onChange={(g) => rules({ comboGroups: g })} />
      <MenuExtras p={p} busy={busy} onChange={(e) => rules({ comboExtras: e })} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xl">Prezzo totale del menu €<input value={cPrice} inputMode="decimal" onChange={(e) => setCPrice(e.target.value)} placeholder="—" className={`${box} w-28 text-center`} /></label>
        <button disabled={busy} onClick={() => { const v = cPrice.trim() === "" ? null : num(cPrice); if (v !== null && !(v >= 0)) { toast.error("Controlla il prezzo"); return; } void rules({ comboPrice: v }); }} className={`${btn} bg-primary text-primary-foreground`}>Salva prezzo</button>
        <span className="text-lg text-muted-foreground">Vuoto = costa come il piatto ({fmt(p.price)} €).</span>
      </div>
    </div>
  );
}

type MenuData = { categories: { id: string; name: string }[]; products: { id: string; name: string; category_id: string; sold_out: boolean }[] };

// Scelte valide solo quando il cliente prende il menu (es. contorno e bevanda a scelta).
function MenuChoices({ p, busy, menu, onChange }: { p: MenuProduct; busy: boolean; menu: MenuData; onChange: (g: ChoiceGroup[]) => void }) {
  const groups = p.combo_groups;
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const create = (n: string, catId: string) => {
    const v = n.trim();
    if (!v || groups.some((g) => g.name === v)) { toast.error("Scrivi un nome nuovo"); return; }
    const options = menu.products.filter((x) => x.category_id === catId).map((x) => ({ name: x.name.slice(0, 40), price: 0 })).slice(0, 20);
    onChange([...groups, { name: v.slice(0, 40), min: 1, max: 1, options }]);
    setName(""); setCat("");
  };
  return (
    <section>
      <h3 className="mb-1 text-2xl font-bold">🥤 Scelte del menu (contorno, bevanda…)</h3>
      <p className="mb-3 text-lg text-muted-foreground">Valgono solo quando il cliente prende il menu. Scegli il nome e la categoria: entrano tutti i suoi prodotti; togli con la ✕ quelli non adatti. I prodotti esauriti spariscono da soli. Prezzo 0 = compreso; puoi mettere un supplemento.</p>
      <div className="grid gap-3">
        {groups.map((g, gi) => (
          <GroupEditor key={g.name + gi} g={g} disabled={busy} menu={menu}
            onChange={(ng) => onChange(groups.map((x, i) => (i === gi ? ng : x)))}
            onDelete={() => onChange(groups.filter((_, i) => i !== gi))} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome, es. Bevanda" className={`${box} min-w-0 flex-1`} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${box} min-w-0 flex-1`}>
          <option value="">Da quale categoria?</option>
          {menu.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button disabled={busy || !name.trim() || !cat} onClick={() => create(name, cat)} className={`${btn} bg-primary text-primary-foreground disabled:opacity-40`}>+ Aggiungi scelta</button>
      </div>
    </section>
  );
}

// Extra a pagamento proposti solo nel menu (si sommano agli extra del piatto).
function MenuExtras({ p, busy, onChange }: { p: MenuProduct; busy: boolean; onChange: (e: ChoiceOption[]) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const list = p.combo_extras;
  const add = () => {
    const v = name.trim(); const pr = num(price || "0");
    if (!v || !(pr >= 0) || list.some((x) => x.name === v)) { toast.error("Scrivi un nome nuovo e un prezzo valido"); return; }
    onChange([...list, { name: v.slice(0, 40), price: Math.round(pr * 100) / 100 }]);
    setName(""); setPrice("");
  };
  return (
    <section>
      <h3 className="mb-1 text-2xl font-bold">➕ Extra a pagamento nel menu</h3>
      <p className="mb-3 text-lg text-muted-foreground">Es. bacon, salse. Il cliente li vede insieme agli extra già impostati nelle Opzioni del piatto{p.extras.length ? ` (${p.extras.map((e) => e.name).join(", ")})` : ""}.</p>
      <div className="flex flex-wrap gap-2">
        {list.map((o) => (
          <span key={o.name} className="flex items-center gap-2 rounded-full bg-muted py-1 pl-4 pr-1 text-xl font-bold">
            {o.name} · € {fmt(o.price)}
            <button disabled={busy} onClick={() => onChange(list.filter((x) => x.name !== o.name))} className="tap h-8 w-8 rounded-full bg-secondary text-lg">✕</button>
          </span>
        ))}
        {!list.length && <span className="text-lg text-muted-foreground">Nessun extra solo-menu</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={name} list="ing-lib" onChange={(e) => setName(e.target.value)} placeholder="es. Bacon" className={`${box} min-w-0 flex-1`} />
        <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} placeholder="€ 0" className={`${box} w-24 text-center`} />
        <button disabled={busy} onClick={add} className={`${btn} bg-primary text-primary-foreground`}>+ Extra</button>
      </div>
    </section>
  );
}
