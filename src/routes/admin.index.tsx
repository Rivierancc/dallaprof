import { venuePageTitle } from "@/lib/page-title";
import { useRestaurantOnly } from "@/lib/venue-mode";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { kitchenStatus } from "@/lib/kitchen.functions";
import { PinPad } from "@/components/pin-pad";
import { useCustomer } from "@/components/customer-session";
import { Button } from "@/components/ui/button";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { menuQueryOptions } from "@/lib/menu";
import { FoldPresentation } from "@/components/fold";
import { StaffOrb, type StaffOrbTone } from "@/components/staff-orb";
import { CategoryOrderPanel } from "@/components/category-order-panel";
import { ThemesPanel } from "@/components/themes-panel";
import { CompanySettings } from "@/components/company-identity";
import { BannerSettings, IdleSettings, CartLiftSettings, InfoSettings, KioskButtonSettings } from "@/components/display-banner";
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
  return <main className="admin-page min-h-screen p-6">
    <header className="mb-3 flex flex-wrap items-center gap-3"><h1 className="font-display text-5xl text-accent">Admin</h1>
      <span className="mr-auto"><LicenseSummary /></span>
      <TextScaleToggle index={textScale} onChange={changeTextScale} />
      {!ro && <Button size="sm" onClick={async () => {
        if (fullscreen) await exitKiosk(); else if (await enterKiosk()) await navigate({ to: "/" });
      }}>{fullscreen ? "Esci da chiosco" : "⛶ Chiosco"}</Button>}
      <StaffFullscreenButton />
      <Button asChild size="sm" variant="secondary"><Link to="/manuale">📖 Manuale</Link></Button>
      <Button asChild size="sm" variant="secondary"><Link to="/menu">Gestione menu</Link></Button>
      <Button asChild size="sm" variant="secondary"><Link to="/cassa">Cassa</Link></Button>
      {ro ? <Button asChild size="sm" variant="secondary"><Link to="/sala">🍽️ Sala</Link></Button> : <Button asChild size="sm" variant="secondary"><Link to="/">Totem</Link></Button>}
    </header>
    {kioskError && <p role="alert" className="mb-3 text-xl text-destructive">{kioskError}</p>}
    <AdminTabs ro={ro} menu={menu} refresh={refresh} />
  </main>;
}
type TabId = "totem" | "menu" | "locale" | "clienti";
const TABS: { id: TabId; icon: string; label: string; tone: StaffOrbTone }[] = [
  { id: "totem", icon: "🖥️", label: "Totem e schermo", tone: "blue" },
  { id: "menu", icon: "🍔", label: "Menu e catalogo", tone: "orange" },
  { id: "locale", icon: "🏪", label: "Locale e cucina", tone: "yellow" },
  { id: "clienti", icon: "👥", label: "Clienti e sconti", tone: "pink" },
];
type AdminSection = { id: string; icon: string; label: string; content?: ReactNode; children?: AdminSection[] };
function AdminTabs({ ro, menu, refresh }: { ro: boolean; menu: { categories: Parameters<typeof CategoryOrderPanel>[0]["categories"] }; refresh: () => Promise<unknown> }) {
  const tabs = ro ? TABS.filter(({ id }) => id !== "totem" && id !== "clienti") : TABS;
  const [tab, setTab] = useState<TabId | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [subSection, setSubSection] = useState<string | null>(null);
  const activeTab = tabs.find(({ id }) => id === tab);
  const sections: Record<TabId, AdminSection[]> = {
    totem: [
      { id: "saver", icon: "⏱️", label: "Salvaschermo e Orari", children: [
        { id: "closed", icon: "📅", label: "Giorni di chiusura", content: <ScreensaverSettings view="closed" /> },
        { id: "slots", icon: "⏰", label: "Fasce orarie", content: <ScreensaverSettings view="slots" /> },
        { id: "media", icon: "🖼️", label: "Foto e video vetrina", content: <ScreensaverSettings view="media" /> },
        { id: "idle", icon: "⏱️", label: "Tempo di inattività", content: <IdleSettings /> },
        { id: "tv", icon: "📺", label: "Schermo TV esterno", content: <ScreensaverSettings view="tv" /> },
      ] },
      { id: "comms", icon: "📢", label: "Comunicazioni ai clienti", children: [
        { id: "banner", icon: "📢", label: "Scritta in alto sul totem", content: <BannerSettings /> },
        { id: "news", icon: "📰", label: "Notizie ultima ora", content: <NewsSettingsPanel /> },
      ] },
      { id: "screen", icon: "🖥️", label: "Schermo e Regolazioni fisiche", children: [
        { id: "kiosk", icon: "⛶", label: "Pulsante modalità chiosco", content: <KioskButtonSettings /> },
        { id: "cart", icon: "🛒", label: "Altezza del carrello", content: <CartLiftSettings /> },
        { id: "divider", icon: "🎨", label: "Linea tra i piatti", content: <DividerSettings /> },
      ] },
      { id: "lang-themes", icon: "🌍", label: "Lingue e Ricorrenze", children: [
        { id: "languages", icon: "🌍", label: "Lingue attive sul totem", content: <LanguageSettings /> },
        { id: "themes", icon: "🎉", label: "Temi festività", content: <ThemesPanel /> },
      ] },
    ],
    menu: [
      { id: "categories", icon: "↕️", label: "Ordine categorie e strisce", content: <CategoryOrderPanel categories={menu.categories} refresh={refresh} /> },
      ...(!ro ? [{ id: "filters", icon: "🔎", label: "Filtri dei piatti sul totem", content: <FoodFilterSettings /> }] : []),
      { id: "digital", icon: "📱", label: "Menu digitale (sito e QR code)", content: <DigitalMenuSettings /> },
      { id: "stock", icon: "📦", label: "Scorte, allergeni e prodotti gelo", content: <><InfoSettings /><Button asChild variant="secondary" className="mt-4"><Link to="/scorte">📦 Apri la pagina Scorte</Link></Button></> },
    ],
    locale: [
      { id: "company", icon: "🏷️", label: "Logo e descrizione azienda", content: <CompanySettings /> },
      { id: "restaurant", icon: "🍽️", label: "Ristorante: tavoli, coperto e tablet", content: <RestaurantSettings /> },
      { id: "kitchen", icon: "👨‍🍳", label: "Funzioni cucina", content: <KitchenFeaturesSettings /> },
      ...(!ro ? [{ id: "numbers", icon: "🔢", label: "Numerazione ordini", content: <OrderNumberSettings /> }] : []),
      { id: "password", icon: "🔐", label: "Password e codici", content: <PasswordSettings restaurantOnly={ro} /> },
    ],
    clienti: [
      { id: "loyalty", icon: "🎁", label: "Sconti e fidelizzazione", content: <LoyaltySettings /> },
      { id: "customers", icon: "👥", label: "Rubrica clienti", content: <Button asChild variant="secondary" className="h-16 w-full whitespace-normal font-display text-3xl"><Link to="/clienti">👥 Apri la rubrica clienti</Link></Button> },
    ],
  };
  const activeSections = activeTab ? sections[activeTab.id] : [];
  const activeSection = activeSections.find(({ id }) => id === section);
  const activeSubSection = activeSection?.children?.find(({ id }) => id === subSection);
  const tones: StaffOrbTone[] = ["blue", "orange", "yellow", "pink", "green"];
  const backLabel = activeSubSection ? activeSection!.label : activeSection ? activeTab!.label : "Categorie Admin";
  const heading = activeSubSection ? `${activeSubSection.icon} ${activeSubSection.label}` : activeSection ? `${activeSection.icon} ${activeSection.label}` : activeTab ? `${activeTab.icon} ${activeTab.label}` : "";
  const goBack = () => { if (activeSubSection) setSubSection(null); else if (activeSection) setSection(null); else setTab(null); };
  const leaf = activeSubSection ?? (activeSection && !activeSection.children ? activeSection : null);
  const orbItems = activeSection?.children ?? activeSections;
  return <div className="mx-auto mt-2 max-w-5xl">
    {activeTab ? <>
      <div className="my-5 flex flex-wrap items-center gap-4 border-b-2 border-shared pb-5">
        <Button variant="secondary" className="h-auto whitespace-normal px-6 py-3 text-2xl font-bold" onClick={goBack}>← {backLabel}</Button>
        <h2 className="font-display text-4xl">{heading}</h2>
      </div>
      {leaf ? <section key={leaf.id} aria-label={leaf.label} className="pb-8">
        <FoldPresentation.Provider value="content">{leaf.content}</FoldPresentation.Provider>
      </section> : <nav className="grid grid-cols-2 gap-x-6 gap-y-10 py-6 sm:grid-cols-4" aria-label={`Sottocategorie ${activeSection ? activeSection.label : activeTab.label}`}>
        {orbItems.map(({ id, icon, label }, index) => <StaffOrb key={id} icon={icon} label={label} tone={tones[index % tones.length] ?? "blue"} onClick={() => { if (activeSection?.children) setSubSection(id); else { setSection(id); setSubSection(null); } }} />)}
      </nav>}
    </> : <nav className="grid grid-cols-2 gap-x-6 gap-y-10 py-6 sm:grid-cols-4" aria-label="Categorie Admin">
      {tabs.map(({ id, icon, label, tone }) => <StaffOrb key={id} icon={icon} label={label} tone={tone} onClick={() => { setTab(id); setSection(null); setSubSection(null); }} />)}
    </nav>}
  </div>;
}
