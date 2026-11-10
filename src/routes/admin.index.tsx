import { venuePageTitle } from "@/lib/page-title";
import { useRestaurantOnly } from "@/lib/venue-mode";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { kitchenStatus } from "@/lib/kitchen.functions";
import { PinPad } from "@/components/pin-pad";
import { useCustomer } from "@/components/customer-session";
import { Button } from "@/components/ui/button";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { menuQueryOptions } from "@/lib/menu";
import { Fold } from "@/components/fold";
import { CategoryOrderPanel } from "@/components/category-order-panel";
import { ThemesPanel } from "@/components/themes-panel";
import { CompanySettings } from "@/components/company-identity";
import { BannerSettings, IdleSettings } from "@/components/display-banner";
import { NewsSettingsPanel } from "@/components/news-ticker";
import { DividerSettings } from "@/components/menu-divider";
import { KitchenFeaturesSettings } from "@/components/kitchen-features";
import { PasswordSettings } from "@/components/password-settings";
import { TextScaleToggle, useTextScale } from "@/components/text-scale";
import { LanguageSettings } from "@/components/language-settings";
import { OrderNumberSettings } from "@/components/order-number-settings";
import { LicenseSummary } from "@/components/license-summary";
import { LoyaltySettings } from "@/components/loyalty-settings";
import { RestaurantSettings } from "@/components/restaurant-settings";
import { StaffFullscreenButton } from "@/components/staff-display";

export const Route = createFileRoute("/admin/")({
  loader: async ({ context }) => {
    const status = await kitchenStatus();
    if (status.unlocked) await context.queryClient.ensureQueryData(menuQueryOptions);
    return status;
  },
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Admin", matches) }, { name: "description", content: "Impostazioni riservate al personale: codici, categorie, temi, identità aziendale, scritte e notizie." },
    { property: "og:title", content: venuePageTitle("Admin", matches) }, { property: "og:description", content: "Impostazioni riservate al personale: codici, categorie, temi, identità aziendale, scritte e notizie." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AdminGate,
});
function AdminGate() { return Route.useLoaderData().unlocked ? <Admin /> : <PinPad title="Personale" />; }
function Admin() {
  const { fullscreen, enterKiosk, exitKiosk, kioskError } = useCustomer();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu"] });
  const { index: textScale, change: changeTextScale } = useTextScale();
  const ro = useRestaurantOnly();
  return <main className="min-h-screen p-6">
    <header className="mb-6 flex flex-wrap items-center gap-4"><h1 className="mr-auto font-display text-7xl text-accent">Admin</h1>
      <StaffFullscreenButton />
      <Button asChild variant="secondary"><Link to="/manuale">📖 Manuale</Link></Button>
      <Button asChild variant="secondary"><Link to="/menu">Gestione menu</Link></Button>
      <Button asChild variant="secondary"><Link to="/cassa">Cassa</Link></Button>
      {ro ? <Button asChild variant="secondary"><Link to="/sala">🍽️ Sala</Link></Button> : <Button asChild variant="secondary"><Link to="/">Totem</Link></Button>}
    </header>
    <LicenseSummary />
    <TextScaleToggle index={textScale} onChange={changeTextScale} />
    {!ro && <Button className="h-auto whitespace-normal p-8 font-display text-5xl" onClick={async () => {
      if (fullscreen) await exitKiosk(); else if (await enterKiosk()) await navigate({ to: "/" });
    }}>{fullscreen ? "Esci da chiosco" : "Attiva modalità chiosco"}</Button>}
    {kioskError && <p role="alert" className="mt-6 text-2xl text-destructive">{kioskError}</p>}
    <div className="mt-6">
      <PasswordSettings restaurantOnly={ro} />
      {!ro && <div className="mt-6"><OrderNumberSettings /></div>}
      <div className="mx-auto mt-6 max-w-5xl"><CategoryOrderPanel categories={menu.categories} refresh={refresh} /></div>
      {!ro && <ThemesPanel />}
      <div className="mx-auto mt-6 max-w-5xl"><Fold title="🏷️ Logo e descrizione azienda"><CompanySettings /></Fold></div>
      <div className="mx-auto mt-6 max-w-5xl"><Fold title="🍽️ Ristorante: tavoli, coperto e tablet"><RestaurantSettings /></Fold></div>
      {!ro && <div className="mx-auto mt-6 max-w-5xl"><Fold title="👥 Clienti e fidelizzazione"><LoyaltySettings /></Fold></div>}
      {!ro && <div className="mx-auto mt-6 max-w-5xl"><Fold title="🌍 Lingue del totem"><LanguageSettings /></Fold></div>}
      {!ro && <div className="mx-auto mt-6 max-w-5xl"><Fold title="⏱️ Ritorno all'inizio del totem"><IdleSettings /></Fold></div>}
      {!ro && <div className="mx-auto mt-6 max-w-5xl"><Fold title="📢 Scritta in alto sul totem"><BannerSettings /></Fold></div>}
      {!ro && <div className="mx-auto mt-6 max-w-5xl"><Fold title="📰 Notizie ultima ora"><NewsSettingsPanel /></Fold></div>}
      {!ro && <div className="mx-auto mt-6 max-w-5xl"><Fold title="🎨 Linea tra i piatti"><DividerSettings /></Fold></div>}
      <div className="mx-auto mt-6 max-w-5xl"><Fold title="👨‍🍳 Funzioni cucina"><KitchenFeaturesSettings /></Fold></div>
    </div>
  </main>;
}