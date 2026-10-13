import { createFileRoute } from "@tanstack/react-router";
import { useLiveOrders } from "@/hooks/use-orders";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Display ordini — Totem Burger" },
      { name: "description", content: "Stato degli ordini: in preparazione e pronti." },
      { property: "og:title", content: "Display ordini — Totem Burger" },
      { property: "og:description", content: "Stato degli ordini: in preparazione e pronti." },
    ],
  }),
  component: Display,
});

const pad = (n: number) => String(n).padStart(2, "0");

function Display() {
  const orders = useLiveOrders(["preparing", "ready"]);
  const prep = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready").reverse();

  return (
    <main className="grid h-screen grid-cols-2">
      <section className="flex flex-col p-8">
        <h2 className="mb-8 font-display text-8xl text-muted-foreground">In preparazione</h2>
        <div className="grid grid-cols-3 content-start gap-5">
          {prep.map((o) => (
            <div key={o.id} className="rounded-3xl bg-card py-6 text-center font-display text-8xl">{pad(o.order_number)}</div>
          ))}
        </div>
      </section>
      <section className="flex flex-col bg-success p-8 text-success-foreground">
        <h2 className="mb-8 font-display text-8xl">Pronto ✓</h2>
        <div className="grid grid-cols-2 content-start gap-5">
          {ready.map((o) => (
            <div key={o.id} className="animate-pop rounded-3xl bg-background py-8 text-center font-display text-9xl text-success">
              {pad(o.order_number)}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
