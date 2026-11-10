import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/fold";
import { useCustomer } from "@/components/customer-session";
import { changeStaffPin } from "@/lib/kitchen.functions";
import { gateFlags } from "@/lib/gate";
import { validatePinChange } from "@/lib/access";

function CodeForm({ title, name, onSave }: { title: string; name: string; onSave: (current: string, next: string, confirmation: string) => Promise<void> }) {
  const [values, setValues] = useState({ current: "", next: "", confirmation: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      validatePinChange(values.current, values.next, values.confirmation);
      await onSave(values.current, values.next, values.confirmation);
      setValues({ current: "", next: "", confirmation: "" });
      setMessage("Codice aggiornato");
    } catch (e) { setError(e instanceof Error ? e.message : "Codice non aggiornato. Riprova."); }
    finally { setBusy(false); }
  }}>
    <h3 className="font-display text-3xl">{title}</h3>
    <div className="grid gap-4 sm:grid-cols-3">
      {([ ["current", "Codice attuale"], ["next", "Nuovo codice"], ["confirmation", "Conferma nuovo codice"] ] as const).map(([key, label]) =>
        <label key={key} className="flex min-w-0 flex-col gap-2 font-sans text-lg">
          {label}
          <input aria-label={`${label} ${name}`} type="password" inputMode="numeric" autoComplete={key === "current" ? "current-password" : "new-password"}
            required minLength={4} maxLength={12} pattern="[0-9]{4,12}" disabled={busy} value={values[key]}
            onChange={event => { const value = event.target.value.replace(/\D/g, ""); setValues(old => ({ ...old, [key]: value })); setMessage(""); setError(""); }}
            className="min-h-14 w-full rounded-lg border border-border bg-background px-4 text-2xl" />
        </label>)}
    </div>
    {error && <p role="alert" className="text-lg text-destructive">{error}</p>}
    {message && <p role="status" className="text-lg text-accent">{message}</p>}
    <Button type="submit" disabled={busy} className="min-h-14 gap-2 text-lg"><LockKeyhole className="size-5" />{busy ? "Salvataggio…" : `Salva ${name}`}</Button>
  </form>;
}

export function PasswordSettings({ restaurantOnly = false }: { restaurantOnly?: boolean }) {
  const changeStaff = useServerFn(changeStaffPin);
  const { changeExitPin } = useCustomer();
  return <div className="mx-auto mt-6 max-w-5xl"><Fold title="🔐 Password e codici">
    <div className="space-y-8">
      <CodeForm title={restaurantOnly ? "PIN personale · Menu, Cucina, Cassa e Admin" : "PIN personale · Menu, Cucina, Cassa e Chiosco"} name="PIN personale" onSave={async (current, next, confirmation) => {
        await changeStaff({ data: { current, next, confirmation, ...gateFlags() } });
      }} />
      {!restaurantOnly && <div className="border-t border-border pt-6">
        <CodeForm title="Uscita chiosco · Solo questo dispositivo" name="codice uscita chiosco" onSave={async (current, next, confirmation) => { changeExitPin(current, next, confirmation); }} />
      </div>}
    </div>
  </Fold></div>;
}