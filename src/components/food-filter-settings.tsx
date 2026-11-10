import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerQueryOptions } from "@/components/display-banner";
import { saveBanner } from "@/lib/menu.functions";
import { cleanFilters, filtersOn, newFilter, type FoodFilter } from "@/lib/food-filters";

const btn = "tap rounded-xl px-4 py-2 text-xl font-bold";

export function FoodFilterSettings() {
  const qc = useQueryClient();
  const { data: banner } = useQuery(bannerQueryOptions);
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  if (!banner) return <p className="text-lg text-muted-foreground">Caricamento…</p>;
  const on = filtersOn(banner);
  const list = cleanFilters(banner["food_filters"]);
  const save = async (p: Record<string, unknown>) => {
    try { await saveBanner({ data: { settings: { ...banner, ...p } } }); await qc.invalidateQueries({ queryKey: ["banner"] }); toast.success("Salvato"); }
    catch { toast.error("Salvataggio non riuscito"); }
  };
  const setList = (l: FoodFilter[]) => save({ food_filters: l });
  const add = () => { const f = newFilter(label, emoji, list); if (!f) return; void setList([...list, f]); setLabel(""); setEmoji(""); };
  return (
    <div className="space-y-4">
      <p className="text-lg text-muted-foreground">Sul totem compare una riga di pulsanti (es. Pollo, Halal) per vedere solo i piatti adatti. In Gestione menu, dentro ogni piatto, spunti i filtri giusti; carni e piccante vengono riconosciuti anche dagli ingredienti.</p>
      <button onClick={() => save({ food_filters_on: !on })} className={`${btn} ${on ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{on ? "Filtri accesi sul totem" : "Filtri spenti"}</button>
      <ul className="space-y-2">
        {list.map((f, i) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-2 text-xl">
            <span className="min-w-48 font-bold">{f.emoji} {f.label}</span>
            <button onClick={() => setList(list.map((x, j) => j === i ? { ...x, on: !x.on } : x))} className={`${btn} ${f.on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{f.on ? "Visibile" : "Nascosto"}</button>
            <button onClick={() => { if (confirm(`Togliere il filtro «${f.label}»?`)) void setList(list.filter((_, j) => j !== i)); }} className={`${btn} bg-destructive text-destructive-foreground`}>✕ Togli</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🐟" maxLength={4} aria-label="Simbolo del filtro" className="w-20 rounded-xl bg-muted px-3 py-2 text-xl" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Es. Pesce" maxLength={24} aria-label="Nome del filtro" className="rounded-xl bg-muted px-3 py-2 text-xl" />
        <button onClick={add} disabled={!label.trim()} className={`${btn} bg-primary text-primary-foreground disabled:opacity-50`}>+ Aggiungi filtro</button>
      </div>
    </div>
  );
}
