import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderNumber, saveOrderNumber } from "@/lib/order-number.functions";
import { RESET_ORDER_NUMBER } from "@/lib/order-number";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/fold";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function OrderNumberSettings() {
  const read = useServerFn(getOrderNumber);
  const save = useServerFn(saveOrderNumber);
  const qc = useQueryClient();
  const { data, error, isPending } = useQuery({ queryKey: ["order-number"], queryFn: () => read(), refetchInterval: 10000 });
  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const next = Number(draft);
  const confirm = async () => {
    if (target === null || busy) return;
    setBusy(true); setMessage("");
    try {
      const saved = await save({ data: { next: target, confirmed: true } });
      qc.setQueryData(["order-number"], saved);
      await qc.invalidateQueries({ queryKey: ["order-number"] });
      setMessage(`Numerazione aggiornata: il prossimo ordine partirà da ${String(saved).padStart(2, "0")}.`);
      setTarget(null); setDraft("");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Numerazione non modificata"); }
    finally { setBusy(false); }
  };
  return <Fold title="🔢 Numerazione ordini">
    <div className="space-y-4">
      <p className="text-2xl">{isPending ? "Caricamento…" : error ? "Numerazione non disponibile" : `Prossimo numero: ${String(data).padStart(2, "0")}`}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2 text-xl">Nuovo numero (1–99)
          <input aria-label="Nuovo numero" type="number" min={1} max={99} step={1} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-36 rounded-lg border border-border bg-background p-3 text-2xl" />
        </label>
        <Button disabled={busy || !draft || !Number.isInteger(next) || next < 1 || next > 99} onClick={() => { setMessage(""); setTarget(next); }}>Modifica numero</Button>
        <Button variant="destructive" disabled={busy} onClick={() => { setMessage(""); setTarget(RESET_ORDER_NUMBER); }}>Reset a 01</Button>
      </div>
      {message && target === null && <p role="status" className="text-xl">{message}</p>}
    </div>
    <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !busy) setTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confermi il cambio della numerazione?</AlertDialogTitle>
          <AlertDialogDescription>Il prossimo ordine partirà da {String(target).padStart(2, "0")} su tutti i totem. Gli ordini già presenti non cambiano e non vengono cancellati. Se il numero è già usato da un ordine aperto, la modifica verrà bloccata.</AlertDialogDescription>
        </AlertDialogHeader>
        {message && <p role="alert" className="text-destructive">{message}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={confirm}>{busy ? "Salvataggio…" : "Conferma modifica"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Fold>;
}