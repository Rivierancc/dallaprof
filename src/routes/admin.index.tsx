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
import { BannerSettings, IdleSettings, CartLiftSettings, InfoSettings } from "@/components/display-banner";
import { ScreensaverSettings } from "@/components/screensaver";
import { FoodFilterSettings } from "@/components/food-filter-settings";
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
import { DigitalMenuSettings } from "@/components/digital-menu-settings";
import { StaffFullscreenButton } from "@/components/staff-display";
import { useState, type ReactNode } from "react";

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
    <AdminTabs ro={ro} menu={menu} refresh={refresh} />
  </main>;
}
type TabId = "totem" | "menu" | "locale" | "clienti";
const TABS: [TabId, string][] = [["totem", "🖥️ Totem e schermo"], ["menu", "🍔 Menu e catalogo"], ["locale", "🏪 Locale e cucina"], ["clienti", "👥 Clienti e sconti"]];
/** Riquadro con cornice: separa nettamente un argomento dall'altro. */
function Box({ children }: { children: ReactNode }) { return <div className="mx-auto mt-6 max-w-5xl">{children}</div>; }
function AdminTabs({ ro, menu, refresh }: { ro: boolean; menu: { categories: Parameters<typeof CategoryOrderPanel>[0]["categories"] }; refresh: () => Promise<unknown> }) {
  const tabs = ro ? TABS.filter(([id]) => id !== "totem" && id !== "clienti") : TABS;
  const [tab, setTab] = useState<TabId>(tabs[0]?.[0] ?? "menu");
  return <div className="mt-8">
    <nav className="sticky top-0 z-20 -mx-6 flex flex-wrap gap-3 border-b-4 border-accent bg-background px-6 py-3" aria-label="Schede Admin">
      {tabs.map(([id, label]) => <Button key={id} variant={tab === id ? "default" : "secondary"} aria-pressed={tab === id} className="h-16 flex-1 whitespace-normal px-4 font-display text-3xl" onClick={() => setTab(id)}>{label}</Button>)}
    </nav>
    {tab === "totem" && <>
      <ThemesPanel />
      <Box><Fold title="⏱️ Inattività e salvaschermo">
        <section className="rounded-2xl border-2 border-border bg-background/60 p-4"><h3 className="mb-3 font-display text-3xl text-accent">Ritorno all'inizio</h3><IdleSettings /></section>
        <section className="mt-6 rounded-2xl border-2 border-border bg-background/60 p-4"><h3 className="mb-3 font-display text-3xl text-accent">Salvaschermo con foto e video</h3><ScreensaverSettings /></section>
      </Fold></Box>
      <Box><Fold title="📢 Scritta in alto sul totem"><BannerSettings /></Fold></Box>
      <Box><Fold title="📰 Notizie ultima ora"><NewsSettingsPanel /></Fold></Box>
      <Box><Fold title="🛒 Altezza del carrello sul totem"><CartLiftSettings /></Fold></Box>
      <Box><Fold title="🎨 Linea tra i piatti"><DividerSettings /></Fold></Box>
      <Box><Fold title="🌍 Lingue del totem"><LanguageSettings /></Fold></Box>
    </>}
    {tab === "menu" && <>
      <Box><CategoryOrderPanel categories={menu.categories} refresh={refresh} /></Box>
      {!ro && <Box><Fold title="🔎 Filtri dei piatti sul totem"><FoodFilterSettings /></Fold></Box>}
      <Box><Fold title="📱 Menu digitale (sito e QR code)"><DigitalMenuSettings /></Fold></Box>
      <Box><Fold title="📦 Scorte, allergeni e prodotti gelo"><InfoSettings /><Button asChild variant="secondary" className="mt-4"><Link to="/scorte">📦 Apri la pagina Scorte</Link></Button></Fold></Box>
    </>}
    {tab === "locale" && <>
      <Box><Fold title="🏷️ Logo e descrizione azienda"><CompanySettings /></Fold></Box>
      <Box><Fold title="🍽️ Ristorante: tavoli, coperto e tablet"><RestaurantSettings /></Fold></Box>
      <Box><Fold title="👨‍🍳 Funzioni cucina"><KitchenFeaturesSettings /></Fold></Box>
      {!ro && <Box><OrderNumberSettings /></Box>}
      <PasswordSettings restaurantOnly={ro} />
    </>}
    {tab === "clienti" && <>
      <Box><Fold title="🎁 Sconti e fidelizzazione"><LoyaltySettings /></Fold></Box>
      <Box><Button asChild variant="secondary" className="h-16 w-full font-display text-3xl"><Link to="/clienti">👥 Apri la rubrica clienti</Link></Button></Box>
    </>}
  </div>;
}
