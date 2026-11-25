import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fold } from "@/components/fold";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerQueryOptions } from "@/components/display-banner";
import { cleanCategoryLayout, CATEGORY_SIZES, DISH_SIZES, FINGER_SIZES, FINGER_SPEEDS, dishLayoutFor } from "@/lib/category-layout";
import { reorderCategories, saveBanner, setCategoryStrip, type MenuCategory } from "@/lib/menu.functions";

const arrow3d = {
  background: "radial-gradient(circle at 35% 25%, color-mix(in oklch, var(--a), white 35%), var(--a) 45%, var(--b))",
  boxShadow: "0 4px 0 var(--b), 0 6px 10px rgb(0 0 0 / 0.4), inset 0 1px 1px rgb(255 255 255 / 0.5)",
};

export function CategoryOrderPanel({ categories, refresh }: { categories: MenuCategory[]; refresh: () => Promise<unknown> }) {
  const [cats, setCats] = useState(categories);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data: banner } = useQuery(bannerQueryOptions);
  const layout = cleanCategoryLayout(banner);
  const setLayout = async (p: Record<string, unknown>) => {
    if (!banner) return;
    try { await saveBanner({ data: { settings: { ...banner, ...p } } }); await qc.invalidateQueries({ queryKey: ["banner"] }); toast.success("Salvato"); }
    catch (e) { console.error(e); toast.error("Salvataggio non riuscito"); }
  };
  const setDish = (id: string, p: Record<string, unknown>) => {
    const all = (banner?.["dishLayout"] && typeof banner["dishLayout"] === "object" ? banner["dishLayout"] : {}) as Record<string, unknown>;
    void setLayout({ dishLayout: { ...all, [id]: { scroll: dishLayoutFor(banner, id).scroll, size: dishLayoutFor(banner, id).size - 1, ...p } } });
  };
  const dishRow = (id: string, name: string) => {
    const d = dishLayoutFor(banner, id);
    return (
      <div className="flex flex-wrap items-center gap-2 pl-12 text-lg">
        <span className="text-muted-foreground">Piatti:</span>
        <button onClick={() => setDish(id, { scroll: false })} aria-label={`Piatti a griglia per ${name}`} className={`tap rounded-lg px-3 py-1 ${!d.scroll ? "bg-primary font-bold text-primary-foreground" : "bg-secondary"}`}>▦ Griglia</button>
        <button onClick={() => setDish(id, { scroll: true })} aria-label={`Piatti scorrevoli per ${name}`} className={`tap rounded-lg px-3 py-1 ${d.scroll ? "bg-primary font-bold text-primary-foreground" : "bg-secondary"}`}>↔️ Scorrevoli</button>
        <select value={d.size} onChange={(e) => setDish(id, { size: Number(e.target.value) - 1 })} aria-label={`Grandezza piatti di ${name}`} className="rounded-lg bg-secondary px-3 py-1">
          {DISH_SIZES.map((l, i) => <option key={l} value={i}>{l}</option>)}
        </select>
      </div>
    );
  };
  useEffect(() => setCats(categories), [categories]);
  const changed = cats.some((c, i) => c.id !== categories[i]?.id);

  const move = (i: number, dir: -1 | 1) => {
    const n = i + dir;
    if (n < 0 || n >= cats.length) return;
    const copy = [...cats];
    [copy[i], copy[n]] = [copy[n]!, copy[i]!];
    setCats(copy);
  };

  const save = async () => {
    setSaving(true);
    try { await reorderCategories({ data: { ids: cats.map((c) => c.id) } }); await refresh(); toast.success("Ordine salvato"); }
    catch (e) { console.error(e); toast.error("Salvataggio non riuscito"); }
    finally { setSaving(false); }
  };

  const setStrip = async (id: string, strip: number) => {
    try { await setCategoryStrip({ data: { id, strip } }); await refresh(); toast.success(strip ? `Messa nella striscia ${strip}` : "Tolta dalle strisce"); }
    catch (e) { console.error(e); toast.error("Salvataggio non riuscito"); }
  };

  return (
    <Fold title="↕️ Ordine categorie e strisce" hint="1 = prima sul tablet">
      {banner && <div className="mb-5 space-y-4 rounded-2xl bg-background/40 p-4">
        <div>
          <p className="mb-2 text-xl font-bold">Come si vedono le categorie</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void setLayout({ catStrips: false, catSidebar: false })} className={`tap rounded-xl px-5 py-3 text-xl font-bold ${!layout.sidebar && !layout.strips ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>▦ Riquadri fissi</button>
            <button onClick={() => void setLayout({ catStrips: true, catSidebar: false })} className={`tap rounded-xl px-5 py-3 text-xl font-bold ${!layout.sidebar && layout.strips ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>↔️ Strisce scorrevoli</button>
            <button onClick={() => void setLayout({ catSidebar: true })} className={`tap rounded-xl px-5 py-3 text-xl font-bold ${layout.sidebar ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>◧ Colonna a sinistra</button>
          </div>
          {layout.sidebar
            ? <p className="mt-2 text-lg text-muted-foreground">Le categorie scorrono in verticale a sinistra con pulsanti compatti (foto sopra, nome sotto) e i piatti si vedono subito a destra. Le altre impostazioni restano salvate.</p>
            : !layout.strips && <p className="mt-2 text-lg text-muted-foreground">Le strisce assegnate restano ricordate: riattivandole tornano come prima.</p>}
        </div>
        {layout.sidebar && <div>
          <p className="mb-2 text-xl font-bold">Velocità del dito sulle categorie</p>
          <div className="flex flex-wrap gap-2">
            {FINGER_SPEEDS.map((o) => <button key={o.sec} onClick={() => void setLayout({ fingerSpeed: o.sec })} className={`tap rounded-xl px-4 py-3 text-xl ${layout.fingerSpeed === o.sec ? "bg-primary font-bold text-primary-foreground" : "bg-secondary"}`}>{o.label}</button>)}
          </div>
        </div>}
        {layout.sidebar && <div className={layout.fingerSpeed === 0 ? "opacity-50" : undefined}>
          <p className="mb-2 text-xl font-bold">Grandezza del dito{layout.fingerSpeed === 0 ? " (dito spento)" : ""}</p>
          <div className="flex flex-wrap gap-2">
            {FINGER_SIZES.map((o) => <button key={o.scale} onClick={() => void setLayout({ fingerSize: o.scale })} className={`tap rounded-xl px-4 py-3 text-xl ${layout.fingerSize === o.scale ? "bg-primary font-bold text-primary-foreground" : "bg-secondary"}`}>{o.label}</button>)}
          </div>
        </div>}
        <div>
          <p className="mb-2 text-xl font-bold">Grandezza delle categorie</p>
          <div className="flex flex-wrap gap-2">{CATEGORY_SIZES.map((l, i) => <button key={l} onClick={() => void setLayout({ catSize: i - 1 })} className={`tap rounded-xl px-4 py-3 text-xl ${layout.size === i ? "bg-primary font-bold text-primary-foreground" : "bg-secondary"}`}>{l}</button>)}</div>
        </div>
      </div>}
      <p className="mb-3 text-lg text-muted-foreground">Striscia: le categorie con lo stesso numero stanno sulla stessa riga scorrevole del tablet. «Nessuna» = riquadri normali.</p>
      <ul className="space-y-2">
        {cats.map((c, i) => (
          <li key={c.id} className="space-y-2 rounded-2xl bg-background/40 p-3"><div className="flex items-center gap-3">
            <span className="w-10 text-center font-display text-3xl text-accent">{i + 1}</span>
            <span className="min-w-0 flex-1 text-2xl font-bold">{c.name}</span>
            <select value={c.strip} onChange={(e) => setStrip(c.id, Number(e.target.value))} aria-label={`Striscia di ${c.name}`} className="rounded-xl bg-secondary px-3 py-2 text-xl">
              <option value={0}>Nessuna striscia</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Striscia {n}</option>)}
            </select>
            <div className="flex items-center gap-2" style={{ ["--a" as string]: `oklch(0.66 0.17 ${(i * 47 + 245) % 360})`, ["--b" as string]: `oklch(0.42 0.14 ${(i * 47 + 245) % 360})` }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Sposta su ${c.name}`} style={arrow3d} className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-primary-foreground transition-transform active:translate-y-1 active:shadow-none disabled:opacity-25">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} aria-label={`Sposta giù ${c.name}`} style={arrow3d} className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-primary-foreground transition-transform active:translate-y-1 active:shadow-none disabled:opacity-25">▼</button>
            </div>
          </div>{banner && dishRow(c.id, c.name)}</li>
        ))}
        {banner && <li className="space-y-2 rounded-2xl bg-background/40 p-3"><span className="pl-12 text-2xl font-bold">🍱 Menu in offerta</span>{dishRow("__offers", "Menu in offerta")}</li>}
        {!cats.length && <li className="text-lg text-muted-foreground">Nessuna categoria</li>}
      </ul>
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving || !changed} className="tap rounded-xl bg-primary px-6 py-3 text-xl font-bold text-primary-foreground disabled:opacity-40">{saving ? "Salvataggio…" : "Salva ordine"}</button>
        {changed && <button onClick={() => setCats(categories)} className="tap rounded-xl bg-secondary px-5 py-3 text-xl">Annulla</button>}
      </div>
    </Fold>
  );
}
