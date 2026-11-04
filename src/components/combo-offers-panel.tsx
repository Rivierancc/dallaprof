import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Fold } from "@/components/fold";
import { menuQueryOptions } from "@/lib/menu";
import { setComboOffer, setOffersTitle, setProductRules, type MenuProduct } from "@/lib/menu.functions";
import { menuName } from "@/lib/options";

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
  const menus = menu.products.filter((p) => p.combo_items.length || p.combo_offer || extra.includes(p.id));
  const rest = menu.products.filter((p) => !menus.includes(p));
  const offers = menu.products.filter((p) => p.combo_offer).length;
  return (
    <div className="mx-auto mt-6 max-w-5xl">
      <Fold title="🍱 Menu offerta" hint={`${menus.length} menu · ${offers} in offerta`}>
        <div className="grid gap-5">
          <p className="text-lg text-muted-foreground">Ogni piatto resta in vendita da solo nella sua categoria. Qui lo trasformi anche in menu: scegli gli articoli inclusi e il prezzo; se lo metti «In offerta» compare anche nella sezione speciale del totem.</p>
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
  const rules = (patch: { combo?: string[]; comboPrice?: number | null }) => go(() => saveRules({ data: { id: p.id, maxExtras: p.max_extras, groups: p.choice_groups, combo: p.combo_items, comboPrice: p.combo_price, suggest: p.suggest, ...patch } }));
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
      <div>
        <p className="mb-2 text-xl">Articoli inclusi (tocca per aggiungere o togliere):</p>
        <div className="flex flex-wrap gap-2">
          {menu.products.filter((x) => x.id !== p.id).map((x) => {
            const on = p.combo_items.includes(x.id);
            return <button key={x.id} disabled={busy} aria-pressed={on} onClick={() => rules({ combo: on ? p.combo_items.filter((i) => i !== x.id) : [...p.combo_items, x.id] })} className={`${btn} ${on ? "bg-success text-success-foreground" : "bg-secondary"}`}>{on ? "✓ " : "+ "}{x.name} <span className="text-base opacity-70">· {catName(x.category_id)}</span></button>;
          })}
        </div>
        <p className="mt-2 text-lg text-muted-foreground">Per far scegliere al cliente (es. una bevanda a scelta) usa «Scelte del cliente» nelle Opzioni del piatto.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xl">Prezzo totale del menu €<input value={cPrice} inputMode="decimal" onChange={(e) => setCPrice(e.target.value)} placeholder="—" className={`${box} w-28 text-center`} /></label>
        <button disabled={busy} onClick={() => { const v = cPrice.trim() === "" ? null : num(cPrice); if (v !== null && !(v >= 0)) { toast.error("Controlla il prezzo"); return; } void rules({ comboPrice: v }); }} className={`${btn} bg-primary text-primary-foreground`}>Salva prezzo</button>
        <span className="text-lg text-muted-foreground">Vuoto = costa come il piatto ({fmt(p.price)} €), articoli in omaggio.</span>
      </div>
    </div>
  );
}
