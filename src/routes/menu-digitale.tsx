import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { menuQueryOptions, euro } from "@/lib/menu";
import { bannerQueryOptions } from "@/components/display-banner";
import { LANGUAGES, descriptionFor, translatedFor, isRtl, type Language } from "@/lib/customer";
import { venuePageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/menu-digitale")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(menuQueryOptions), context.queryClient.ensureQueryData(bannerQueryOptions)]),
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Menu digitale", matches) }, { name: "description", content: "Il nostro menu completo da consultare: piatti, foto e descrizioni." },
    { property: "og:title", content: venuePageTitle("Menu digitale", matches) }, { property: "og:description", content: "Il nostro menu completo da consultare: piatti, foto e descrizioni." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: () => <MenuProblem text="Menu non disponibile al momento." />,
  notFoundComponent: () => <MenuProblem text="Menu non trovato." />,
  component: DigitalMenu,
});

/** Indirizzo del sito del locale (Admin → Menu digitale); vuoto = nessun link, mai il totem. */
export function siteUrl(settings: Record<string, unknown> | undefined): string {
  const raw = String(settings?.["website_url"] ?? "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function MenuProblem({ text }: { text: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const site = siteUrl(qc.getQueryData(bannerQueryOptions.queryKey));
  return <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
    <p className="text-3xl">{text}</p>
    <div className="flex flex-wrap justify-center gap-3 text-xl">
      <button onClick={() => window.location.reload()} className="rounded-lg bg-secondary px-5 py-3 text-secondary-foreground">↻ Riprova</button>
      {site ? <a href={site} className="rounded-lg bg-accent px-5 py-3 text-accent-foreground">← Torna al sito</a>
        : <button onClick={() => router.history.back()} className="rounded-lg bg-accent px-5 py-3 text-accent-foreground">← Indietro</button>}
    </div>
  </main>;
}

function DigitalMenu() {
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const { data: banner } = useQuery(bannerQueryOptions);
  const showPrices = banner?.["digital_prices"] !== false;
  const site = siteUrl(banner);
  const [lang, setLang] = useState<Language>("IT");
  const cats = menu.categories.filter((c) => menu.products.some((p) => p.category_id === c.id));
  return <main dir={isRtl(lang) ? "rtl" : "ltr"} className="mx-auto min-h-screen max-w-4xl px-4 pb-16">
    <header className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {site && <a href={site} className="rounded-lg bg-secondary px-3 py-1 text-lg text-secondary-foreground">← Torna al sito</a>}
        <h1 className="mr-auto font-display text-5xl text-accent">Menu</h1>
        {LANGUAGES.map((l) => <button key={l.code} aria-label={l.name} onClick={() => setLang(l.code)} className={`rounded-md px-2 py-1 text-2xl ${lang === l.code ? "bg-accent/30" : ""}`}>{l.flag}</button>)}
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => <a key={c.id} href={`#c-${c.slug}`} className="shrink-0 rounded-full bg-secondary px-4 py-1 text-lg text-secondary-foreground">{translatedFor(c.name, c.name_tr, lang)}</a>)}
      </nav>
    </header>
    {cats.map((c) => <section key={c.id} id={`c-${c.slug}`} className="scroll-mt-32 pt-8">
      <h2 className="mb-4 font-display text-4xl text-accent">{translatedFor(c.name, c.name_tr, lang)}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {menu.products.filter((p) => p.category_id === c.id).map((p) => <li key={p.id} className={`flex gap-3 rounded-xl bg-card p-3 text-card-foreground ${p.sold_out ? "opacity-50" : ""}`}>
          {p.image && <img src={p.image} alt={p.name} loading="lazy" className="h-24 w-24 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2"><h3 className="mr-auto text-xl font-bold">{p.name}</h3>{showPrices && <span className="shrink-0 text-xl font-bold text-accent">{euro(p.price)}</span>}</div>
            {descriptionFor(p, lang) && <p className="mt-1 text-base text-muted-foreground">{descriptionFor(p, lang)}</p>}
            {p.sold_out && <p className="mt-1 text-sm font-bold text-destructive">Esaurito</p>}
          </div>
        </li>)}
      </ul>
    </section>)}
  </main>;
}
