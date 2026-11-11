import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

/** Voce con nome e prezzo (extra, gusto, formato): ✏️ la rende modificabile sul posto. */
export function EditOption({ name, price, disabled, taken, showZero = true, onSave, onRemove, children }: {
  name: string; price: number; disabled?: boolean; taken: string[]; showZero?: boolean;
  onSave: (name: string, price: number) => void; onRemove: () => void; children?: ReactNode;
}) {
  const [edit, setEdit] = useState(false);
  const [n, setN] = useState(name);
  const [p, setP] = useState(fmt(price));
  const box = "rounded-xl bg-background px-3 py-1 text-xl outline-none";
  const save = () => {
    const v = n.trim().slice(0, 40);
    const pr = Number(p.replace(",", ".") || "0");
    if (!v || !Number.isFinite(pr) || pr < 0) { toast.error("Scrivi nome e prezzo validi"); return; }
    if (v !== name && taken.includes(v)) { toast.error("Nome già presente"); return; }
    onSave(v, Math.round(pr * 100) / 100);
    setEdit(false);
  };
  if (edit) return (
    <span className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted p-2 text-xl font-bold">
      <input autoFocus aria-label="Nome" value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className={`${box} w-40`} />
      € <input aria-label="Prezzo" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className={`${box} w-20 text-center`} />
      <button disabled={disabled} onClick={save} className="tap rounded-full bg-primary px-3 py-1 text-lg text-primary-foreground">✓ Salva</button>
      <button onClick={() => { setEdit(false); setN(name); setP(fmt(price)); }} className="tap rounded-full bg-secondary px-3 py-1 text-lg">Annulla</button>
    </span>
  );
  return (
    <span className="flex items-center gap-2 rounded-full bg-muted py-1 pl-4 pr-1 text-xl font-bold">
      {name}{showZero || price > 0 ? ` · € ${fmt(price)}` : ""}
      {children}
      <button disabled={disabled} title="Modifica" aria-label={`Modifica ${name}`} onClick={() => { setN(name); setP(fmt(price)); setEdit(true); }} className="tap h-8 w-8 rounded-full bg-secondary text-lg">✏️</button>
      <button disabled={disabled} title="Rimuovi" aria-label={`Rimuovi ${name}`} onClick={onRemove} className="tap h-8 w-8 rounded-full bg-secondary text-lg">✕</button>
    </span>
  );
}
