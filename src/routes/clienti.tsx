import { createFileRoute, Link } from "@tanstack/react-router";
import { kitchenStatus } from "@/lib/kitchen.functions";
import { PinPad } from "@/components/pin-pad";
import { CustomersPanel } from "@/components/loyalty-settings";
import { staffChipClass } from "@/components/staff-nav";
import { venuePageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/clienti")({
  loader: () => kitchenStatus(),
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Clienti", matches) }, { name: "description", content: "Anagrafica clienti riservata: contatti, storico, compleanni e messaggi." },
    { property: "og:title", content: venuePageTitle("Clienti", matches) }, { property: "og:description", content: "Anagrafica clienti riservata: contatti, storico, compleanni e messaggi." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ClientiGate,
});

function ClientiGate() {
  if (!Route.useLoaderData().unlocked) return <PinPad title="Clienti" />;
  return <main className="mx-auto min-h-screen max-w-5xl p-6">
    <header className="mb-6 flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-7xl text-accent">👥 Clienti</h1>
      <Link to="/admin" className={staffChipClass}>⚙️ Admin</Link><Link to="/cassa" className={staffChipClass}>💶 Cassa</Link></header>
    <CustomersPanel />
  </main>;
}
