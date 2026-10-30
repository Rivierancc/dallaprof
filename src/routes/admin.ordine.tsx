import { createFileRoute, redirect } from "@tanstack/react-router";

// L'ordine categorie ora è una sezione di Gestione menu.
export const Route = createFileRoute("/admin/ordine")({
  beforeLoad: () => { throw redirect({ to: "/menu" }); },
});
