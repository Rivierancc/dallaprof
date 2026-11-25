import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { updateCustomer, type CustomerRow } from "@/lib/loyalty.functions";

const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Modifica inline dei dati anagrafici di una singola scheda cliente. */
export function CustomerEditor({ c, onClose }: { c: CustomerRow; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(updateCustomer);
  const [name, setName] = useState(c.name);
  const [surname, setSurname] = useState(c.surname);
  const [phone, setPhone] = useState(c.phone);
  const [email, setEmail] = useState(c.email);
  const [day, setDay] = useState(c.birth_day ? String(c.birth_day) : "");
  const [month, setMonth] = useState(c.birth_month ? String(c.birth_month) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await saveFn({ data: { id: c.id, name, surname, phone, email, day: day ? Number(day) : null, month: month ? Number(month) : null } });
      await qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 text-lg">
      <p className="text-xl font-bold">✏️ Modifica scheda cliente</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-base text-muted-foreground">Nome *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className="h-12 w-full rounded-xl bg-background px-3 text-xl" />
        </label>
        <label className="space-y-1">
          <span className="block text-base text-muted-foreground">Cognome</span>
          <input value={surname} onChange={(e) => setSurname(e.target.value)} maxLength={60} className="h-12 w-full rounded-xl bg-background px-3 text-xl" />
        </label>
        <label className="space-y-1">
          <span className="block text-base text-muted-foreground">Cellulare</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="es. 3331234567" className="h-12 w-full rounded-xl bg-background px-3 text-xl" />
        </label>
        <label className="space-y-1">
          <span className="block text-base text-muted-foreground">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="es. mario@email.it" maxLength={254} className="h-12 w-full rounded-xl bg-background px-3 text-xl" />
        </label>
        <div className="space-y-1 sm:col-span-2">
          <span className="block text-base text-muted-foreground">Data di nascita (giorno e mese)</span>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Giorno di nascita" value={day} onChange={(e) => setDay(e.target.value)} className="h-12 rounded-xl bg-background px-3 text-xl">
              <option value="">Giorno —</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Mese di nascita" value={month} onChange={(e) => setMonth(e.target.value)} className="h-12 rounded-xl bg-background px-3 text-xl">
              <option value="">Mese —</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            {(day || month) && <Button type="button" variant="secondary" onClick={() => { setDay(""); setMonth(""); }}>✕ Rimuovi data</Button>}
          </div>
        </div>
      </div>
      {err && <p role="alert" className="rounded-xl bg-destructive/15 px-3 py-2 text-lg text-destructive">{err}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Salvo…" : "💾 Salva modifiche"}</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Annulla</Button>
      </div>
    </form>
  );
}