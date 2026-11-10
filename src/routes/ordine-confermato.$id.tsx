import { venuePageTitle } from "@/lib/page-title";
import { createFileRoute } from "@tanstack/react-router";
import { OrderConfirmation } from "@/components/order-confirmation";

export const Route = createFileRoute("/ordine-confermato/$id")({
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Stato del tuo ordine", matches) }, { name: "description", content: "Numero e conferma del pagamento del tuo ordine al totem." },
    { property: "og:title", content: venuePageTitle("Stato del tuo ordine", matches) }, { property: "og:description", content: "Numero e conferma del pagamento del tuo ordine al totem." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ConfirmationPage,
});
function ConfirmationPage() { const { id } = Route.useParams(); return <OrderConfirmation id={id} />; }