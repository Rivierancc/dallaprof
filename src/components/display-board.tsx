import type { Order } from "@/lib/menu";

/** The same order board on the customer screen and staff previews. */
export function DisplayBoard({ orders, partial, compact = false }: { orders: Order[]; partial: boolean; compact?: boolean }) {
  const prep = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready").reverse();
  const pad = (n: number) => String(n).padStart(2, "0");
  return <div className={compact ? "grid h-[220px] grid-cols-2 overflow-hidden" : "contents"}>
    <section className={compact ? "min-w-0 overflow-y-auto p-3" : "flex flex-col p-8"}>
      <h2 className={compact ? "mb-3 font-display text-[22px] leading-tight text-muted-foreground" : "mb-8 font-display text-8xl text-muted-foreground"}>In preparazione</h2>
      <div className={compact ? "grid grid-cols-3 content-start gap-2" : "grid grid-cols-3 content-start gap-5"}>
        {prep.map((o) => <div key={o.id} className={compact ? "min-w-0 rounded-lg bg-card py-2 text-center" : "rounded-3xl bg-card py-6 text-center"}>
          <div className={compact ? "font-display text-[30px] leading-none" : "font-display text-8xl"}>{pad(o.order_number)}</div>
          {partial && (o.partial_notes ?? []).map((n, i) => <p key={i} className={compact ? "mx-1 mt-1 break-words rounded bg-accent px-1 text-[12px] font-bold text-accent-foreground" : "animate-pop mx-2 mt-2 rounded-xl bg-accent px-2 py-1 text-xl font-bold text-accent-foreground"}>✓ {n}</p>)}
        </div>)}
      </div>
    </section>
    <section className={compact ? "min-w-0 overflow-y-auto bg-success p-3 text-success-foreground" : "flex flex-col bg-success p-8 text-success-foreground"}>
      <h2 className={compact ? "mb-3 font-display text-[22px] leading-tight" : "mb-8 font-display text-8xl"}>Pronto ✓</h2>
      <div className={compact ? "grid grid-cols-3 content-start gap-2" : "grid grid-cols-2 content-start gap-5"}>
        {ready.map((o) => <div key={o.id} className={compact ? "rounded-lg bg-background py-2 text-center font-display text-[30px] leading-none text-success" : "animate-pop rounded-3xl bg-background py-8 text-center font-display text-9xl text-success"}>{pad(o.order_number)}</div>)}
      </div>
    </section>
  </div>;
}