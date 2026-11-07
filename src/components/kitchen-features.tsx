import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getKitchenFeatures, saveKitchenFeatures, type KitchenFeatures } from "@/lib/menu.functions";
import { cleanKitchenFeatures, READY_SOUNDS, type ReadySound } from "@/lib/kitchen";
import { playSound } from "@/lib/sounds";

const SOUND_LABEL: Record<ReadySound, string> = { campanello: "🛎️ Campanello", dingdong: "🎵 Din-don", trillo: "📳 Trillo", fanfara: "🎺 Fanfara", sirena: "🚨 Sirena", fischio: "🎶 Fischio", nessuno: "🔇 Nessuna" };
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
  ["displayTill", "📺 Miniatura Display in Cassa", ""],
  ["displayKitchen", "📺 Miniatura Display in Cucina", ""],
];

/** Elenco di suonerie con ▶ per ascoltarle: una riga per «pronto» e una per «parzialmente pronto». */
function SoundPicker({ title, hint, value, onChange }: { title: string; hint: string; value: ReadySound; onChange: (s: ReadySound) => void }) {
  return <div className="rounded-2xl bg-secondary/40 p-4">
    <p className="text-2xl font-bold">{title}</p>
    <p className="mb-3 text-lg text-muted-foreground">{hint}</p>
    <div className="flex flex-wrap gap-3">
      {READY_SOUNDS.map((s) => (
        <div key={s} className="flex">
          <Button variant={value === s ? "default" : "secondary"} className="h-14 rounded-r-none px-5 text-xl" onClick={() => { onChange(s); playSound(s); }}>
            {SOUND_LABEL[s]}
          </Button>
          {s !== "nessuno" && <Button variant="outline" aria-label={`Ascolta ${SOUND_LABEL[s]}`} className="h-14 rounded-l-none px-4 text-xl" onClick={() => playSound(s)}>▶</Button>}
        </div>
      ))}
    </div>
  </div>;
}

/** Sezione di Admin: accende o spegne le funzioni extra della cucina e sceglie le suonerie. */
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
    <SoundPicker
      title="🔔 Suoneria «ordine pronto»"
      hint="Suona sul tabellone clienti quando la cucina preme Pronto. Tocca ▶ per ascoltarla."
      value={draft.readySound}
      onChange={(s) => { setMsg(""); setDraft({ ...draft, readySound: s }); }}
    />
    <SoundPicker
      title="📣 Suoneria «parzialmente pronto»"
      hint="Suona sul tabellone clienti quando la cucina manda un avviso come «Bevande pronte». Tocca ▶ per ascoltarla."
      value={draft.partialSound}
      onChange={(s) => { setMsg(""); setDraft({ ...draft, partialSound: s }); }}
    />
    <div className="flex items-center gap-4"><Button className="h-14 px-8 text-xl" onClick={save}>Salva</Button>{msg && <span className="text-xl">{msg}</span>}</div>
  </div>;
}
