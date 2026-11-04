import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDivider, saveDivider } from "@/lib/menu.functions";
import { Button } from "@/components/ui/button";

export type DividerStyle = "solid" | "dashed" | "dotted" | "double";
export type Divider = { on: boolean; color: string; style: DividerStyle; width: "s" | "m" | "l" };

const DEFAULT: Divider = { on: true, color: "#ffd84d", style: "solid", width: "m" };
const widths = { s: "border-t-2", m: "border-t-4", l: "border-t-8" };
const presets: [string, string][] = [
  ["#ffd84d", "Giallo"],
  ["#b3261e", "Rosso"],
  ["#2e7d32", "Verde"],
  ["#3b82f6", "Blu"],
  ["#f5f5f5", "Chiaro"],
  ["#6b7280", "Grigio"],
];

export const dividerQueryOptions = queryOptions({ queryKey: ["divider"], queryFn: () => getDivider(), staleTime: 10_000, refetchInterval: 30_000 });
export function useDivider(): Divider {
  const { data } = useQuery(dividerQueryOptions);
  return { ...DEFAULT, ...(data ?? {}) } as Divider;
}

/** La linea vera e propria, disegnata tra un piatto e l'altro. */
export function DividerView({ divider }: { divider: Divider }) {
  if (!divider.on) return null;
  return <hr aria-hidden className={`${widths[divider.width]} rounded-full`} style={{ borderColor: divider.color, borderTopStyle: divider.style }} />;
}

/** Sezione di Admin: sceglie come appare la linea tra i piatti in Gestione menu. */
export function DividerSettings() {
  const { data: saved } = useQuery(dividerQueryOptions);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Divider | null>(null);
  const [msg, setMsg] = useState("");
  // Il modulo si riempie solo quando il database ha risposto: altrimenti i pulsanti
  // restano fermi all'aspetto iniziale e mostrano uno stato diverso da quello salvato.
  useEffect(() => { if (!draft && saved) setDraft({ ...DEFAULT, ...saved } as Divider); }, [saved, draft]);
  if (!draft) return null;
  const set = (p: Partial<Divider>) => { setMsg(""); setDraft({ ...draft, ...p }); };
  const save = async () => {
    setMsg("Salvo…");
    try { await saveDivider({ data: draft }); await qc.invalidateQueries({ queryKey: ["divider"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <p className="mr-auto text-xl text-muted-foreground">Separa un piatto dall'altro nell'elenco di Gestione menu.</p>
        <Button variant={draft.on ? "default" : "secondary"} onClick={() => set({ on: !draft.on })}>{draft.on ? "Accesa" : "Spenta"}</Button>
      </div>
      <div>
        <p className="mb-2 text-muted-foreground">Colore</p>
        <div className="flex flex-wrap items-center gap-3">
          {presets.map(([hex, label]) => (
            <button key={hex} type="button" aria-label={label} title={label} onClick={() => set({ color: hex })}
              className={`h-12 w-12 rounded-full border-4 ${draft.color === hex ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: hex }} />
          ))}
          <label className="flex items-center gap-2 text-lg">
            Altro
            <input type="color" aria-label="Colore personalizzato" value={draft.color} onChange={(e) => set({ color: e.target.value })} className="h-12 w-16" />
          </label>
        </div>
      </div>
      <div>
        <p className="mb-2 text-muted-foreground">Stile</p>
        <div className="flex flex-wrap gap-2">
          {([["solid", "Continua"], ["dashed", "Tratteggiata"], ["dotted", "Puntini"], ["double", "Doppia"]] as [DividerStyle, string][]).map(([v, l]) => (
            <Button key={v} type="button" variant={draft.style === v ? "default" : "secondary"} onClick={() => set({ style: v })}>{l}</Button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-muted-foreground">Spessore</p>
        <div className="flex flex-wrap gap-2">
          {([["s", "Sottile"], ["m", "Media"], ["l", "Spessa"]] as [Divider["width"], string][]).map(([v, l]) => (
            <Button key={v} type="button" variant={draft.width === v ? "default" : "secondary"} onClick={() => set({ width: v })}>{l}</Button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-muted-foreground">Anteprima</p>
        <p className="rounded-xl bg-background/40 p-3 text-xl font-bold">Piatto 1</p>
        <div className="py-3"><DividerView divider={{ ...draft, on: true }} /></div>
        <p className="rounded-xl bg-background/40 p-3 text-xl font-bold">Piatto 2</p>
      </div>
      <div className="flex items-center gap-4"><Button onClick={save}>Salva linea</Button>{msg && <span role="status" className="text-xl">{msg}</span>}</div>
    </div>
  );
}
