export const NEWS_SOURCES = {
  ansa: { name: "ANSA Ultima ora", url: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml" },
  rai: { name: "Rai News", url: "https://www.rainews.it/rss/ultimora" },
  sky: { name: "Sky TG24", url: "https://tg24.sky.it/rss/tg24.xml" },
  corriere: { name: "Corriere della Sera", url: "https://xml2.corriereobjects.it/rss/homepage.xml" },
  repubblica: { name: "la Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml" },
  sole: { name: "Il Sole 24 Ore", url: "https://www.ilsole24ore.com/rss/italia.xml" },
  economia: { name: "ANSA Economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml" },
  sport: { name: "ANSA Sport", url: "https://www.ansa.it/sito/notizie/sport/sport_rss.xml" },
  gazzetta: { name: "Gazzetta dello Sport", url: "https://www.gazzetta.it/rss/home.xml" },
} as const;
export type NewsSource = keyof typeof NEWS_SOURCES;
export const NEWS_PAGES = { display: "Display ordini", home: "Totem (tutte le schermate)", conferma: "Ordine confermato", cucina: "Cucina", cassa: "Cassa" } as const;
export type NewsPage = keyof typeof NEWS_PAGES;
export type NewsSettings = { on: boolean; sources: NewsSource[]; pages: NewsPage[] };
export const DEFAULT_NEWS: NewsSettings = { on: true, sources: ["ansa"], pages: ["display"] };
export function cleanNews(raw: unknown): NewsSettings {
  const r = (raw ?? {}) as Partial<NewsSettings>;
  return {
    on: typeof r.on === "boolean" ? r.on : true,
    sources: (Array.isArray(r.sources) ? r.sources : DEFAULT_NEWS.sources).filter((s): s is NewsSource => s in NEWS_SOURCES),
    pages: (Array.isArray(r.pages) ? r.pages : DEFAULT_NEWS.pages).filter((p): p is NewsPage => p in NEWS_PAGES),
  };
}
export function pageFor(path: string): NewsPage | null {
  if (path === "/") return "home";
  if (path.startsWith("/display")) return "display";
  if (path.startsWith("/ordine-confermato")) return "conferma";
  if (path.startsWith("/cucina")) return "cucina";
  if (path.startsWith("/cassa")) return "cassa";
  return null;
}
