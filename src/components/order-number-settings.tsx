import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrderNumber, saveOrderNumber } from "@/lib/order-number.functions";
import { RESET_ORDER_NUMBER } from "@/lib/order-number";
import { Button } from "@/components/ui/button";
import { StaffChip } from "@/components/staff-nav";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function OrderNumberSettings() {
  const read = useServerFn(getOrderNumber);
  const save = useServerFn(saveOrderNumber);
  const qc = useQueryClient();
  const { data, error, isPending } = useQuery({ queryKey: ["order-number"], queryFn: () => read(), refetchInterval: 10000 });
  const [open, setOpen] = useState(false);
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
      setTarget(null); setDraft(""); setOpen(false);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Numerazione non modificata"); }
    finally { setBusy(false); }
  };
  return <div className="relative z-50">
    {open && <button type="button" tabIndex={-1} aria-hidden="true" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />}
    <StaffChip className="relative z-50" aria-label="Numerazione ordini" aria-expanded={open} onClick={() => setOpen((v) => !v)}>🔢 Numeri</StaffChip>
    <div hidden={!open} className="absolute right-0 top-full z-50 mt-2 w-[26rem] max-w-[85vw] space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xl">
      <p className="text-xl">{isPending ? "Caricamento…" : error ? "Numerazione non disponibile" : `Prossimo numero: ${String(data).padStart(2, "0")}`}</p>
      <label className="flex flex-col gap-2 text-lg">Nuovo numero (1–99)
        <input aria-label="Nuovo numero" type="number" min={1} max={99} step={1} value={draft} onChange={(e) => setDraft(e.target.value)} className="w-36 rounded-lg border border-border bg-background p-2 text-xl" />
      </label>
      <div className="flex flex-wrap gap-2">
        <StaffChip disabled={busy || !draft || !Number.isInteger(next) || next < 1 || next > 99} onClick={() => { setMessage(""); setTarget(next); }}>Modifica numero</StaffChip>
        <StaffChip tone="destructive" disabled={busy} onClick={() => { setMessage(""); setTarget(RESET_ORDER_NUMBER); }}>Reset a 01</StaffChip>
      </div>
      {message && target === null && <p role="status" className="text-lg">{message}</p>}
    </div>
    <AlertDialog open={target !== null} onOpenChange={(openDialog) => { if (!openDialog && !busy) setTarget(null); }}>
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
  </div>;
}
