import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LANGUAGES, type Translations } from "@/lib/customer";

/** Campi per le lingue straniere: se un campo resta vuoto il cliente vede l'italiano. */
export function TranslationsEditor({ label, value, onSave }: { label: string; value: Translations; onSave: (tr: Translations) => Promise<unknown> }) {
  const [draft, setDraft] = useState<Translations>(value ?? {});
  const [busy, setBusy] = useState(false);
  return (
    <details className="rounded-2xl bg-background/40 p-3">
      <summary className="cursor-pointer text-xl font-bold">{label}</summary>
      <p className="mt-2 text-lg text-muted-foreground">Vuoto = resta in italiano.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {LANGUAGES.filter((l) => l.code !== "IT").map(({ code, flag, name }) => {
          const c = code as keyof Translations;
          return <label key={code} className="grid gap-1 text-lg">{flag} {name}
            <input dir={code === "AR" ? "rtl" : undefined} maxLength={60} value={draft[c] ?? ""} onChange={(e) => setDraft({ ...draft, [c]: e.target.value })} className="h-12 rounded-xl border border-border bg-background px-3 text-xl" /></label>;
        })}
      </div>
      <Button disabled={busy} className="mt-3" onClick={async () => {
        setBusy(true);
        try { await onSave(draft); toast.success("Traduzioni salvate"); } catch (e) { toast.error(e instanceof Error ? e.message : "Errore"); } finally { setBusy(false); }
      }}>{busy ? "Salvataggio…" : "Salva traduzioni"}</Button>
    </details>
  );
}
