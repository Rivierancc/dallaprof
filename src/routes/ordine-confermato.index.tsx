import { venuePageTitle } from "@/lib/page-title";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OrderConfirmation } from "@/components/order-confirmation";

export const Route = createFileRoute("/ordine-confermato/")({
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Ultimo ordine", matches) }, { name: "description", content: "Consulta la conferma del tuo ultimo ordine." },
    { property: "og:title", content: venuePageTitle("Ultimo ordine", matches) }, { property: "og:description", content: "Consulta la conferma del tuo ultimo ordine." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: LatestOrder,
});
function LatestOrder() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { try { setId(localStorage.getItem("last_order_id") ?? ""); } catch { setId(""); } }, []);
  return id === null ? null : <OrderConfirmation id={id} />;
}