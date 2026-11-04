import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getKitchenFeatures, saveKitchenFeatures, type KitchenFeatures } from "@/lib/menu.functions";
import { cleanKitchenFeatures } from "@/lib/kitchen";
import { Button } from "@/components/ui/button";

const DEFAULT: KitchenFeatures = cleanKitchenFeatures({});
export const kitchenFeaturesQueryOptions = queryOptions({ queryKey: ["kitchen-features"], queryFn: () => getKitchenFeatures(), staleTime: 10_000, refetchInterval: 30_000 });
export function useKitchenFeatures(): KitchenFeatures {
  const { data } = useQuery(kitchenFeaturesQueryOptions);
  return data ?? DEFAULT;
}

const labels: [keyof KitchenFeatures, string, string][] = [
  ["partial", "📣 Avvisi «parzialmente pronto»", "La cucina può mandare al tabellone messaggi come «Bevande pronte»."],
  ["checklist", "✅ Spunta piatti preparati", "In cucina ogni piatto dell'ordine si può spuntare quando è pronto."],
  ["delivery", "🚚 Spunta consegne parziali", "In cucina ogni piatto si può segnare come consegnato: «bevande consegnate», «patatine consegnate»."],
  ["history", "📋 Storico ordini del giorno", "In cucina compare il pulsante per rivedere gli ordini di oggi."],
];

/** Sezione di Admin: accende o spegne le funzioni extra della cucina. */
export function KitchenFeaturesSettings() {
  const { data: saved } = useQuery(kitchenFeaturesQueryOptions);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState<KitchenFeatures | null>(null);
  // Il modulo si riempie solo quando il database ha risposto: altrimenti i pulsanti
  // restano fermi all'aspetto iniziale e mostrano uno stato diverso da quello salvato.
  useEffect(() => { if (!draft && saved) setDraft(saved); }, [saved, draft]);
  if (!draft) return null;
  const save = async () => {
    try { await saveKitchenFeatures({ data: draft }); await qc.invalidateQueries({ queryKey: ["kitchen-features"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(`Non salvato: ${(e as Error).message}`); }
  };
  return <div className="space-y-4">
    {labels.map(([k, title, hint]) => (
      <div key={k} className="flex flex-wrap items-center gap-4 rounded-2xl bg-secondary/40 p-4">
        <div className="mr-auto"><p className="text-2xl font-bold">{title}</p><p className="text-lg text-muted-foreground">{hint}</p></div>
        <Button variant={draft[k] ? "default" : "secondary"} className="h-14 px-6 text-xl" onClick={() => { setMsg(""); setDraft({ ...draft, [k]: !draft[k] }); }}>
          {draft[k] ? "Acceso" : "Spento"}
        </Button>
      </div>
    ))}
    <div className="flex items-center gap-4"><Button className="h-14 px-8 text-xl" onClick={save}>Salva</Button>{msg && <span className="text-xl">{msg}</span>}</div>
  </div>;
}
