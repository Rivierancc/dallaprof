import { createFileRoute } from "@tanstack/react-router";
import { OrderConfirmation } from "@/components/order-confirmation";

export const Route = createFileRoute("/ordine-confermato/$id")({
  head: () => ({ meta: [
    { title: "Stato del tuo ordine — Totem Burger" }, { name: "description", content: "Numero e conferma del pagamento del tuo ordine al totem." },
    { property: "og:title", content: "Stato del tuo ordine — Totem Burger" }, { property: "og:description", content: "Numero e conferma del pagamento del tuo ordine al totem." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ConfirmationPage,
});
function ConfirmationPage() { const { id } = Route.useParams(); return <OrderConfirmation id={id} />; }