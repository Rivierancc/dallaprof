import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { addTablet, deleteTablet, getRestaurant, listTablets, saveRestaurant, updateTablet, type Tablet } from "@/lib/restaurant.functions";
import { MODES } from "@/lib/license";
import type { Restaurant } from "@/lib/restaurant";

const box = "flex items-center justify-between gap-3 rounded-2xl bg-background/40 p-3 text-xl";
const inp = "h-12 rounded-xl bg-background px-3 text-2xl";

export const restaurantQuery = { queryKey: ["restaurant"], queryFn: () => getRestaurant() };

function Switch({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return <label className={box}>{label}<input type="checkbox" className="size-7" checked={on} onChange={(e) => set(e.target.checked)} /></label>;
}

function TabletRow({ t, onDone }: { t: Tablet; onDone: () => void }) {
  const [label, setLabel] = useState(t.label);
  const [waiter, setWaiter] = useState(t.waiter);
  const [pin, setPin] = useState("");
  const [full, setFull] = useState(t.fullscreen);
  const [msg, setMsg] = useState("");
  const run = async (f: () => Promise<unknown>, ok: string) => { setMsg("…"); try { await f(); setMsg(ok); setPin(""); onDone(); } catch (e) { setMsg((e as Error).message); } };
  return <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-background/40 p-3">
    <input aria-label="Nome tablet" value={label} onChange={(e) => setLabel(e.target.value)} className={`${inp} w-40`} />
    <input aria-label="Cameriere" placeholder="Cameriere" value={waiter} onChange={(e) => setWaiter(e.target.value)} className={`${inp} w-40`} />
    <input aria-label="Nuovo PIN" placeholder="Nuovo PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className={`${inp} w-36`} />
    <label className="flex items-center gap-2 text-lg"><input type="checkbox" className="size-6" checked={full} onChange={(e) => setFull(e.target.checked)} />⛶ Schermo intero all'accesso</label>
    <Button onClick={() => run(() => updateTablet({ data: { id: t.id, label, waiter, pin, fullscreen: full } }), pin ? "PIN reimpostato ✓" : "Salvato ✓")}>Salva</Button>
    <Button variant="destructive" onClick={() => confirm(`Eliminare ${t.label}?`) && run(() => deleteTablet({ data: { id: t.id } }), "")}>🗑️</Button>
    {msg && <span className="text-lg text-muted-foreground">{msg}</span>}
  </div>;
}

function Tablets() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["tablets"], queryFn: () => listTablets() });
  const [n, setN] = useState({ label: "", waiter: "", pin: "" });
  const [msg, setMsg] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["tablets"] });
  const add = async () => { setMsg("…"); try { await addTablet({ data: n }); setN({ label: "", waiter: "", pin: "" }); setMsg("Aggiunto ✓"); refresh(); } catch (e) { setMsg((e as Error).message); } };
  return <div className="grid gap-3">
    <h3 className="font-display text-3xl">📱 Tablet dei camerieri</h3>
    <p className="text-lg text-muted-foreground">Ogni tablet si sblocca con il suo PIN di 4 cifre. Il nome (o quello del cameriere) resta scritto in piccolo sullo schermo. Per reimpostare un PIN scrivine uno nuovo e premi Salva.</p>
    {data.map((t) => <TabletRow key={t.id} t={t} onDone={refresh} />)}
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border p-3">
      <input placeholder={`Tablet ${data.length + 1}`} value={n.label} onChange={(e) => setN({ ...n, label: e.target.value })} className={`${inp} w-40`} />
      <input placeholder="Cameriere (facoltativo)" value={n.waiter} onChange={(e) => setN({ ...n, waiter: e.target.value })} className={`${inp} w-56`} />
      <input placeholder="PIN 4 cifre" inputMode="numeric" maxLength={4} value={n.pin} onChange={(e) => setN({ ...n, pin: e.target.value.replace(/\D/g, "") })} className={`${inp} w-36`} />
      <Button onClick={add}>+ Aggiungi tablet</Button>
      {msg && <span className="text-lg text-muted-foreground">{msg}</span>}
    </div>
  </div>;
}

export function RestaurantSettings() {
  const qc = useQueryClient();
  const { data } = useQuery(restaurantQuery);
  const [draft, setDraft] = useState<Restaurant | null>(null);
  const [msg, setMsg] = useState("");
  if (!draft && data) setDraft(data.settings);
  if (!data || !draft) return <p className="text-xl">Carico…</p>;
  if (data.mode === "fast_food") return <p className="text-xl text-muted-foreground">Il tuo locale è in modalità {MODES.fast_food}. La modalità ristorante si attiva solo dal fornitore.</p>;
  const set = <K extends keyof Restaurant>(k: K, v: Restaurant[K]) => { setMsg(""); setDraft({ ...draft, [k]: v }); };
  const save = async () => { setMsg("Salvo…"); try { await saveRestaurant({ data: { settings: draft } }); await qc.invalidateQueries({ queryKey: ["restaurant"] }); setMsg("Salvato ✓"); } catch (e) { setMsg((e as Error).message); } };
  return <div className="grid gap-4">
    <p className="text-xl">Modalità del locale: <b>{MODES[data.mode]}</b></p>
    <label className={box}>Numero di tavoli in sala<input type="number" min={1} max={200} value={draft.tables} onChange={(e) => set("tables", Number(e.target.value))} className={`${inp} w-28`} /></label>
    <Switch label="Numero del tavolo obbligatorio" on={draft.table_required} set={(v) => set("table_required", v)} />
    <Switch label="Coperto a persona" on={draft.cover_on} set={(v) => set("cover_on", v)} />
    {draft.cover_on && <label className={box}>Prezzo del coperto (€ a persona)<input type="number" min={0} step={0.5} value={draft.cover_price} onChange={(e) => set("cover_price", Number(e.target.value))} className={`${inp} w-28`} /></label>}
    <div className={box}>Uscita dei piatti
      <span className="flex gap-2">
        <Button variant={draft.courses === "single" ? "default" : "secondary"} onClick={() => set("courses", "single")}>Tutto insieme</Button>
        <Button variant={draft.courses === "split" ? "default" : "secondary"} onClick={() => set("courses", "split")}>Diviso per portate</Button>
      </span></div>
    <Switch label="🔔 Campanella dalla cucina ai tablet" on={draft.bell_on} set={(v) => set("bell_on", v)} />
    <Switch label="💬 Messaggi tra cucina e camerieri" on={draft.messages_on} set={(v) => set("messages_on", v)} />
    <div className="flex items-center gap-3"><Button size="lg" onClick={save}>Salva impostazioni</Button>{msg && <span className="text-xl">{msg}</span>}</div>
    <Tablets />
  </div>;
}
