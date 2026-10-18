import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OrderConfirmation } from "@/components/order-confirmation";

export const Route = createFileRoute("/ordine-confermato/")({
  head: () => ({ meta: [
    { title: "Ultimo ordine — Totem Burger" }, { name: "description", content: "Consulta la conferma del tuo ultimo ordine." },
    { property: "og:title", content: "Ultimo ordine — Totem Burger" }, { property: "og:description", content: "Consulta la conferma del tuo ultimo ordine." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: LatestOrder,
});
function LatestOrder() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { try { setId(localStorage.getItem("last_order_id") ?? ""); } catch { setId(""); } }, []);
  return id === null ? null : <OrderConfirmation id={id} />;
}