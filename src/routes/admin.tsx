import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { kitchenStatus } from "@/lib/kitchen.functions";
import { PinPad } from "@/components/pin-pad";
import { useCustomer } from "@/components/customer-session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  loader: () => kitchenStatus(),
  head: () => ({ meta: [
    { title: "Chiosco — Totem Burger" }, { name: "description", content: "Impostazioni chiosco riservate al personale." },
    { property: "og:title", content: "Chiosco — Totem Burger" }, { property: "og:description", content: "Impostazioni chiosco riservate al personale." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AdminGate,
});
function AdminGate() { return Route.useLoaderData().unlocked ? <Admin /> : <PinPad title="Personale" />; }
function Admin() {
  const { fullscreen, enterKiosk, exitKiosk, kioskError } = useCustomer();
  const navigate = useNavigate();
  return <main className="min-h-screen p-8">
    <header className="mb-12 flex flex-wrap items-center gap-4"><h1 className="mr-auto font-display text-7xl text-accent">Chiosco</h1>
      <Button asChild variant="secondary"><Link to="/menu">Gestione menu</Link></Button>
      <Button asChild variant="secondary"><Link to="/cassa">Cassa</Link></Button>
      <Button asChild variant="secondary"><Link to="/">Totem</Link></Button>
    </header>
    <Button className="h-auto whitespace-normal p-8 font-display text-5xl" onClick={async () => {
      if (fullscreen) await exitKiosk(); else if (await enterKiosk()) await navigate({ to: "/" });
    }}>{fullscreen ? "Esci da chiosco" : "Attiva modalità chiosco"}</Button>
    {kioskError && <p role="alert" className="mt-6 text-2xl text-destructive">{kioskError}</p>}
  </main>;
}