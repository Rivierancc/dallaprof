import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { deleteCustomer, getLoyalty, listCustomers, saveLoyalty, type CustomerRow } from "@/lib/loyalty.functions";
import { birthdayNear, type Loyalty } from "@/lib/loyalty";
import { euro } from "@/lib/menu";

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const bday = (c: CustomerRow) => (c.birth_day && c.birth_month ? `${c.birth_day} ${MONTHS[c.birth_month - 1]}` : "—");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("it-IT") : "—");

function csv(rows: CustomerRow[]) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Nome", "Cellulare", "Compleanno", "Iscritto il", "Ordini", "Spesa totale", "Ultimo ordine", "Piatti preferiti"].join(";"),
    ...rows.map((c) => [c.name, c.phone, bday(c), day(c.created_at), c.orders, c.spent.toFixed(2).replace(".", ","), day(c.last), c.top.map((t) => `${t.name} (${t.qty})`).join(", ")].map(q).join(";"))];
  const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `clienti-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

function Pct({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-2xl bg-background/40 p-3 text-xl">{label}
    <span className="flex items-center gap-2"><input type="number" min={0} max={50} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-12 w-24 rounded-xl bg-background px-3 text-2xl" />%</span></label>;
}

/** Admin → Clienti: regole sconto, anagrafica del solo locale, storico, compleanni ed esportazione. */
export function LoyaltySettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["loyalty"], queryFn: () => getLoyalty() });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });
  const [draft, setDraft] = useState<Loyalty | null>(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [onlyBday, setOnlyBday] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (!draft && data) setDraft(data); }, [data, draft]);
  if (!draft) return <p className="text-xl text-muted-foreground">Caricamento…</p>;
  const set = (p: Partial<Loyalty>) => { setMsg(""); setDraft({ ...draft, ...p }); };
  const save = async () => {
    setMsg("Salvo…");
    try { await saveLoyalty({ data: { loyalty: draft } }); await qc.invalidateQueries({ queryKey: ["loyalty"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  const remove = async (c: CustomerRow) => {
    if (!confirm(`Cancellare ${c.name} (${c.phone})? Non si può annullare.`)) return;
    await deleteCustomer({ data: { id: c.id } }); await qc.invalidateQueries({ queryKey: ["customers"] });
  };
  const s = search.trim().toLowerCase();
  const rows = (customers ?? []).filter((c) => (!s || c.name.toLowerCase().includes(s) || c.phone.includes(s)) && (!onlyBday || birthdayNear(c.birth_day, c.birth_month, 30)));
  return <div className="space-y-6">
    <p className="text-xl text-muted-foreground">I clienti si iscrivono dal totem con cellulare e nome (compleanno facoltativo). Sono solo di questo locale: in un altro locale non vengono riconosciuti.</p>
    <div className="flex items-center gap-3 rounded-2xl bg-background/40 p-3 text-2xl font-bold">
      <span className="flex-1">Chiedi il cellulare sul totem</span>
      <Button variant={draft.on ? "default" : "secondary"} aria-pressed={draft.on} onClick={() => set({ on: !draft.on })}>{draft.on ? "Acceso" : "Spento"}</Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Pct label="Sconto fedeltà (ogni ordine)" value={draft.pct} onChange={(n) => set({ pct: n })} />
      <Pct label="Sconto benvenuto (primo ordine)" value={draft.welcome_pct} onChange={(n) => set({ welcome_pct: n })} />
      <Pct label="🎂 Sconto compleanno" value={draft.birthday_pct} onChange={(n) => set({ birthday_pct: n })} />
      <label className="flex items-center justify-between gap-3 rounded-2xl bg-background/40 p-3 text-xl">Compleanno valido
        <select value={draft.birthday_days} onChange={(e) => set({ birthday_days: Number(e.target.value) })} className="h-12 rounded-xl bg-background px-3 text-xl">
          <option value={0}>solo il giorno</option><option value={3}>anche 3 giorni dopo</option><option value={7}>tutta la settimana</option>
        </select></label>
    </div>
    <p className="text-lg text-muted-foreground">Si applica solo lo sconto più alto. Lascia 0 per non dare sconti e raccogliere solo i contatti.</p>
    <div className="flex items-center gap-3"><Button onClick={save}>Salva</Button><span className="text-lg text-muted-foreground">{msg}</span></div>

    <div className="border-t border-border pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="mr-auto font-display text-4xl">👥 Clienti ({customers?.length ?? 0})</h3>
        <Button variant={onlyBday ? "default" : "secondary"} onClick={() => setOnlyBday(!onlyBday)}>🎉 Compleanni nei prossimi 30 giorni</Button>
        <Button variant="secondary" disabled={!rows.length} onClick={() => csv(rows)}>📥 Scarica elenco (Excel)</Button>
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per nome o cellulare" className="mt-4 h-14 w-full rounded-2xl bg-background px-4 text-xl" />
      <ul className="mt-4 space-y-3">
        {rows.map((c) => <li key={c.id} className="rounded-2xl bg-background/40 p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xl">
            <span className="text-2xl font-bold">{c.name}</span><span>📱 {c.phone}</span><span>🎂 {bday(c)}</span>
            <span>{c.orders} ordini · {euro(c.spent)}</span><span className="text-muted-foreground">iscritto il {day(c.created_at)}</span>
            <span className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(open === c.id ? null : c.id)}>📜 Storico</Button>
              <Button variant="destructive" aria-label={`Cancella ${c.name}`} onClick={() => void remove(c)}>🗑️</Button>
            </span>
          </div>
          {open === c.id && <div className="mt-3 space-y-2 text-lg">
            {c.top.length > 0 && <p><b>Preferiti:</b> {c.top.map((t) => `${t.name} ×${t.qty}`).join(" · ")}</p>}
            {c.history.length ? c.history.map((h, i) => <p key={i} className="text-muted-foreground">{new Date(h.at).toLocaleString("it-IT")} · {euro(h.total)} — {h.items.map((x) => `${x.qty}× ${x.name}`).join(", ")}</p>) : <p className="text-muted-foreground">Nessun ordine pagato.</p>}
          </div>}
        </li>)}
        {!rows.length && <li className="text-xl text-muted-foreground">Nessun cliente.</li>}
      </ul>
    </div>
  </div>;
}
