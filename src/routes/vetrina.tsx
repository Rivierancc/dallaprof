import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { bannerQueryOptions } from "@/components/display-banner";
import { NewsTicker } from "@/components/news-ticker";
import { euro, menuQueryOptions, type Product } from "@/lib/menu";
import { getSaverPhotos, getSaverVideo } from "@/lib/menu.functions";
import { venuePageTitle } from "@/lib/page-title";
import { collectSaverPhotoPaths, readSaver, resolveActiveSlots } from "@/lib/screensaver";
import { browserSlug } from "@/lib/venue";

export const Route = createFileRoute("/vetrina")({
  head: ({ matches }) => ({
    meta: [
      { title: venuePageTitle("Vetrina", matches) },
      { name: "description", content: "Vetrina digitale a schermo continuo con piatti, prezzi e QR code del menu." },
      { property: "og:title", content: venuePageTitle("Vetrina", matches) },
      { property: "og:description", content: "Vetrina digitale a schermo continuo con piatti, prezzi e QR code del menu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VetrinaPage,
});

type Slide =
  | { kind: "photo"; key: string; url: string; slotName: string }
  | { kind: "dish"; key: string; product: Product; slotName: string };

function VetrinaPage() {
  const { data } = useQuery(bannerQueryOptions);
  const { data: menu } = useQuery(menuQueryOptions);
  const s = readSaver(data);
  const [now, setNow] = useState(() => new Date());
  const [i, setI] = useState(0);
  const [qr, setQr] = useState("");
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Genera il QR code verso il menu digitale dello stesso locale.
  useEffect(() => {
    const slug = browserSlug();
    const menuUrl = `${window.location.origin}${slug ? `/${slug}` : ""}/menu-digitale`;
    void QRCode.toDataURL(menuUrl, { width: 512, margin: 1 }).then(setQr);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("saver-open");
    return () => { root.classList.remove("saver-open"); };
  }, []);

  const allPaths = useMemo(() => collectSaverPhotoPaths(s), [data]);
  const { data: videoUrl } = useQuery({
    queryKey: ["saver-video", s.video],
    queryFn: () => getSaverVideo({ data: { path: s.video } }),
    enabled: s.kind === "video" && !!s.video,
    staleTime: 30 * 60_000,
  });
  const { data: mine } = useQuery({
    queryKey: ["saver-photos", allPaths],
    queryFn: () => getSaverPhotos({ data: { paths: allPaths } }),
    enabled: allPaths.length > 0,
    staleTime: 30 * 60_000,
  });
  const urlMap = useMemo(() => Object.fromEntries((mine ?? []).map((x) => [x.path, x.url])), [mine]);
  const activeSlots = useMemo(() => resolveActiveSlots(s, now), [data, now]);

  const slides = useMemo<Slide[]>(() => {
    const available = (menu?.products ?? []).filter((p) => !p.sold_out);
    const prods = new Map(available.map((p) => [p.id, p]));
    const out: Slide[] = [];
    for (const slot of activeSlots) {
      for (const path of slot.photos) {
        const url = urlMap[path];
        if (url) out.push({ kind: "photo", key: `${slot.id}-p-${path}`, url, slotName: slot.name });
      }
      for (const id of slot.dishIds) {
        const product = prods.get(id);
        if (product) out.push({ kind: "dish", key: `${slot.id}-d-${id}`, product, slotName: slot.name });
      }
    }
    if (out.length) return out;
    for (const path of s.photos) {
      const url = urlMap[path];
      if (url) out.push({ kind: "photo", key: `base-${path}`, url, slotName: "" });
    }
    if (out.length) return out;
    // Se non ci sono fasce attive o foto base, ruota i piatti del menu (prima quelli con foto).
    const withPhoto = available.filter((p) => !!p.image);
    const fallbackList = withPhoto.length ? withPhoto : available;
    return fallbackList.map((product) => ({ kind: "dish", key: `menu-${product.id}`, product, slotName: "" }));
  }, [activeSlots, menu?.products, urlMap, s.photos]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);

  const toggleFs = () => {
    if (document.fullscreenElement) { void document.exitFullscreen().catch(() => {}); }
    else { void document.documentElement.requestFullscreen?.().catch(() => {}); }
  };

  const useVideo = activeSlots.length === 0 && s.kind === "video" && !!videoUrl;
  const activeIndex = slides.length ? i % slides.length : 0;

  return (
    <div className="fixed inset-0 flex select-none flex-col overflow-hidden bg-background">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {useVideo ? (
          <video src={videoUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        ) : slides.length > 0 ? (
          slides.map((slide, n) => (
            <div
              key={slide.key}
              aria-hidden={n !== activeIndex}
              className="absolute inset-0 transition-opacity duration-[1500ms]"
              style={{ opacity: n === activeIndex ? 1 : 0, pointerEvents: n === activeIndex ? "auto" : "none" }}
            >
              {slide.kind === "photo" ? (
                <img src={slide.url} alt={slide.slotName || "Vetrina"} className="h-full w-full object-cover" />
              ) : (
                <DishSlide product={slide.product} />
              )}
            </div>
          ))
        ) : (
          <div className="grid h-full w-full place-items-center p-10 text-center">
            <p className="font-display text-5xl text-accent">Caricamento vetrina…</p>
          </div>
        )}

        <button
          type="button"
          onClick={toggleFs}
          aria-label={isFs ? "Esci da schermo intero" : "Schermo intero"}
          className="absolute right-6 top-6 z-20 rounded-full border border-border/50 bg-background/70 px-4 py-2 text-base font-medium text-muted-foreground opacity-40 backdrop-blur transition-opacity hover:opacity-100 focus:opacity-100"
        >
          {isFs ? "✕ Esci" : "⛶ Schermo intero"}
        </button>

        {qr && (
          <aside
            aria-label="QR code menu digitale"
            className="absolute bottom-6 right-6 z-20 flex flex-col items-center rounded-2xl border border-border/70 bg-background/90 p-3 text-center shadow-2xl backdrop-blur-md"
          >
            <img src={qr} alt="QR code del menu digitale" className="h-40 w-40 rounded-lg bg-foreground p-1.5 sm:h-48 sm:w-48" />
            <p className="mt-2 font-display text-2xl leading-none text-accent">Menu digitale</p>
            <p className="mt-1 text-sm text-muted-foreground">Inquadra col telefono</p>
          </aside>
        )}
      </main>
      <div className="shrink-0"><NewsTicker /></div>
    </div>
  );
}

function DishSlide({ product }: { product: Product }) {
  return (
    <div className="relative h-full w-full bg-background landscape:grid landscape:grid-cols-12">
      {/* Immagine: a pieno schermo in verticale, nella metà sinistra in orizzontale (TV / monitor). */}
      <div className="relative h-full w-full landscape:col-span-7">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover portrait:opacity-80" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-card">
            <span className="font-display text-9xl opacity-20">🍔</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/25 landscape:bg-gradient-to-r landscape:from-transparent landscape:via-transparent landscape:to-background" />
      </div>

      {/* Nome, descrizione e prezzo: in basso in verticale, affiancati a destra in orizzontale (lascia spazio al QR in basso a destra). */}
      <div className="absolute inset-x-0 bottom-8 z-10 px-8 pr-48 text-left sm:px-12 sm:pr-56 landscape:static landscape:col-span-5 landscape:flex landscape:flex-col landscape:justify-center landscape:px-10 landscape:pb-44 landscape:pt-16">
        <h1 className="font-display text-6xl leading-[0.95] text-accent drop-shadow sm:text-7xl lg:text-8xl">
          {product.name}
        </h1>
        {product.description && (
          <p className="mt-4 max-w-2xl text-xl leading-snug text-foreground/95 drop-shadow sm:text-2xl lg:text-3xl">
            {product.description}
          </p>
        )}
        <div className="mt-6">
          <span className="inline-block rounded-full bg-primary px-8 py-2.5 font-display text-5xl text-primary-foreground shadow-xl sm:text-6xl">
            {euro(product.price)}
          </span>
        </div>
      </div>
    </div>
  );
}