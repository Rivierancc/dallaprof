import type { ReactNode } from "react";

/** Sezione richiudibile del pannello staff: chiusa di default, si apre toccando il titolo. */
export function Fold({ title, hint, children, open = false, onToggle, bare }: { title: ReactNode; hint?: ReactNode; children: ReactNode; open?: boolean; onToggle?: (open: boolean) => void; bare?: boolean }) {
  // bare: il titolo è già un pulsante esterno, qui si mostra solo il contenuto a tutta larghezza.
  if (bare) return <div className="rounded-3xl border-2 border-accent bg-card p-5 shadow-lg"><p className="mb-4 font-display text-4xl">{title}</p>{children}</div>;
  return (
    <details
      open={open}
      onToggle={(e) => onToggle?.((e.target as HTMLDetailsElement).open)}
      className="group rounded-3xl border-2 border-border bg-card p-5 shadow-lg open:border-accent"
    >
      <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-4xl">{title}</span>
        <span className="flex items-center gap-3 text-xl text-muted-foreground">
          {hint}
          <span className="rounded-xl bg-secondary px-4 py-2 text-secondary-foreground group-open:hidden">Apri ▼</span>
          <span className="hidden rounded-xl bg-secondary px-4 py-2 text-secondary-foreground group-open:inline">Chiudi ▲</span>
        </span>
      </summary>
      <div className="mt-4 border-t-2 border-border pt-4">{children}</div>
    </details>
  );
}
