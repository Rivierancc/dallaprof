import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerQueryOptions } from "@/components/display-banner";
import { getSaverPhotos, getSaverVideo, saveBanner, uploadSaverPhoto, uploadSaverVideo } from "@/lib/menu.functions";
import { euro, menuQueryOptions, type Product } from "@/lib/menu";
import { collectSaverPhotoPaths, DEFAULT_SHOWCASE_MSG, isShowcaseMode, makeNewSlot, readSaver, resolveActiveSlots, WEEKDAYS, type SaverOverride, type SaverSlot, type Weekday } from "@/lib/screensaver";
import { ScreensaverSlotEditor } from "@/components/screensaver-slot-editor";
import { Button } from "@/components/ui/button";
import { NewsTicker } from "@/components/news-ticker";
import { useCustomer } from "@/components/customer-session";
import { browserSlug } from "@/lib/venue";

export { readSaver, type Saver } from "@/lib/screensaver";

type Slide =
  | { kind: "photo"; key: string; url: string; slotName: string }
  | { kind: "dish"; key: string; product: Product; slotName: string };

/** Salvaschermo e modalità Solo vetrina del totem. */
export function Screensaver() {
  const { data } = useQuery(bannerQueryOptions);
  const { data: menu } = useQuery(menuQueryOptions);
  const s = readSaver(data);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const showcase = isShowcaseMode(s, now);
  const allPaths = useMemo(() => collectSaverPhotoPaths(s), [data]);
  const { data: videoUrl } = useQuery({ queryKey: ["saver-video", s.video], queryFn: () => getSaverVideo({ data: { path: s.video } }), enabled: s.kind === "video" && !!s.video, staleTime: 30 * 60_000 });
  const { data: mine } = useQuery({ queryKey: ["saver-photos", allPaths], queryFn: () => getSaverPhotos({ data: { paths: allPaths } }), enabled: allPaths.length > 0, staleTime: 30 * 60_000 });
  const urlMap = useMemo(() => Object.fromEntries((mine ?? []).map((x) => [x.path, x.url])), [mine]);
  const activeSlots = useMemo(() => resolveActiveSlots(s, now), [data, now]);
  const slides = useMemo<Slide[]>(() => {
    const prods = new Map((menu?.products ?? []).filter((p) => !p.sold_out).map((p) => [p.id, p]));
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
    return out;
  }, [activeSlots, menu?.products, urlMap, s.photos]);

  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  const { orderType, reset } = useCustomer();
  const isHome = !orderType;
  const visible = showcase || (show && isHome && s.on);

  // Quando parte il salvaschermo o la vetrina il totem torna in italiano e chiude eventuali sessioni.
  useEffect(() => { if (visible) reset(); }, [visible]);
  // Mentre il salvaschermo è aperto la pagina non deve scorrere: sui Chromium vecchi
  // (Windows 7 / Chrome 109) la barra di scorrimento resta sempre visibile a schermo.
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.classList.add("saver-open");
    return () => { root.classList.remove("saver-open"); };
  }, [visible]);
  useEffect(() => {
    if (!data || !s.on || showcase || !isHome) { setShow(false); return; }
    let t = setTimeout(() => setShow(true), s.after * 1000);
    const bump = () => { clearTimeout(t); t = setTimeout(() => setShow(true), s.after * 1000); };
    const evs = ["pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }));
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, bump, { capture: true })); };
  }, [data, s.on, s.after, showcase, isHome]);
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setI((x) => (x + 1) % Math.max(1, slides.length)), 7000);
    return () => clearInterval(t);
  }, [visible, slides.length]);

  const useVideo = activeSlots.length === 0 && s.kind === "video" && !!videoUrl;
  if (!visible) return null;
  if (!showcase && !useVideo && slides.length === 0) return null;

  const activeIndex = slides.length ? i % slides.length : 0;
  const activeSlotName = slides.length ? (slides[activeIndex]?.slotName ?? "") : "";
  // In vetrina senza diapositive il messaggio è già scritto al centro: la pillola in alto non serve.
  const showPill = !showcase || slides.length > 0;
  return (
    <div
      role={showcase ? "region" : "button"}
      aria-label={showcase ? "Modalità solo vetrina" : "Tocca per ordinare"}
      onPointerDown={(e) => { if (!showcase) { e.stopPropagation(); e.preventDefault(); } }}
      onClick={(e) => { if (showcase) return; e.stopPropagation(); e.preventDefault(); setShow(false); window.scrollTo({ top: 0 }); }}
      className={`fixed inset-0 z-[9999] overflow-hidden bg-background ${showcase ? "select-none" : "cursor-pointer"}`}
    >
      {useVideo ? <video src={videoUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" /> :
        slides.length > 0 ? slides.map((slide, n) => (
          <div key={slide.key} className="absolute inset-0 transition-opacity duration-[1500ms]" style={{ opacity: n === activeIndex ? 1 : 0 }}>
            {slide.kind === "photo" ? (
              <img src={slide.url} alt={slide.slotName || "Salvaschermo"} className="h-full w-full object-cover" />
            ) : (
              <div className="relative h-full w-full bg-background">
                {slide.product.image && <img src={slide.product.image} alt={slide.product.name} className="h-full w-full object-cover opacity-80" />}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/30" />
                <div className="absolute inset-x-0 bottom-56 px-12 text-center">
                  <p className="font-display text-8xl leading-none text-accent drop-shadow">{slide.product.name}</p>
                  {slide.product.description && <p className="mx-auto mt-4 max-w-3xl text-3xl text-foreground/95 drop-shadow">{slide.product.description}</p>}
                  <p className="mt-6 inline-block rounded-full bg-primary px-8 py-2 font-display text-6xl text-primary-foreground shadow-xl">{euro(slide.product.price)}</p>
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="grid h-full w-full place-items-center p-12 text-center">
            <p className="font-display text-7xl text-accent">{s.showcaseMessage || DEFAULT_SHOWCASE_MSG}</p>
          </div>
        )}
      {/* Invito a ordinare (o messaggio vetrina) in alto, in una pillola compatta:
          il basso resta libero per nome, descrizione e prezzo del piatto. */}
      <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex flex-col items-center gap-3 px-6">
        {activeSlotName && (
          <span className="rounded-full bg-background/85 px-5 py-1.5 font-display text-3xl text-accent shadow-lg backdrop-blur">
            {activeSlotName}
          </span>
        )}
        {showPill && (
          <div className="rounded-full border border-border/60 bg-background/75 px-8 py-3 text-center shadow-2xl backdrop-blur-md">
            {showcase ? (
              <p className="font-display text-4xl leading-none text-accent">{s.showcaseMessage || DEFAULT_SHOWCASE_MSG}</p>
            ) : (
              <>
                <p className="animate-pulse font-display text-4xl leading-none text-foreground">👆 Tocca lo schermo per ordinare</p>
                <p className="mt-1.5 font-display text-2xl leading-none text-muted-foreground">Touch the screen to order</p>
              </>
            )}
          </div>
        )}
      </div>
      {showcase && (
        <Link to="/admin" className="absolute right-6 top-6 z-20 rounded-full bg-background/70 px-4 py-2 text-lg text-muted-foreground opacity-40 backdrop-blur transition-opacity hover:opacity-100 focus:opacity-100">
          🔒 Personale
        </Link>
      )}
      <div className="absolute inset-x-0 bottom-0"><NewsTicker /></div>
    </div>
  );
}

const AFTER: [number, string][] = [[30, "30 secondi"], [60, "1 minuto"], [120, "2 minuti"], [300, "5 minuti"]];
const OVERRIDES: [SaverOverride, string][] = [
  ["auto", "⏱️ Automatico (segue calendario)"],
  ["showcase", "🖼️ Forza solo vetrina (blocca ordini)"],
  ["open", "🟢 Forza aperto (ignora giorno chiuso)"],
];

/** Admin: calendario settimanale, fasce orarie, modalità solo vetrina e foto/video base. */
export function ScreensaverSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const { data: menu } = useQuery(menuQueryOptions);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const videoInput = useRef<HTMLInputElement>(null);
  const s = readSaver(saved);
  const allPaths = useMemo(() => collectSaverPhotoPaths(s), [saved]);
  const { data: mine } = useQuery({ queryKey: ["saver-photos", allPaths], queryFn: () => getSaverPhotos({ data: { paths: allPaths } }), enabled: allPaths.length > 0 });
  const urlMap = useMemo(() => Object.fromEntries((mine ?? []).map((x) => [x.path, x.url])), [mine]);
  const [showcaseMsg, setShowcaseMsg] = useState<string | null>(null);
  useEffect(() => { if (showcaseMsg === null && saved) setShowcaseMsg(s.showcaseMessage); }, [saved, showcaseMsg, s.showcaseMessage]);
  const [vetrinaUrl, setVetrinaUrl] = useState("");
  useEffect(() => {
    const slug = browserSlug();
    setVetrinaUrl(`${window.location.origin}${slug ? `/${slug}` : ""}/vetrina`);
  }, []);
  if (!saved) return null;

  const save = async (p: Record<string, unknown>) => {
    setMsg("Salvo…");
    const fresh = qc.getQueryData<Record<string, unknown>>(bannerQueryOptions.queryKey) ?? saved;
    try { await saveBanner({ data: { settings: { ...fresh, ...p } as never } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  const now = new Date();
  const liveShowcase = isShowcaseMode(s, now);
  const liveSlots = resolveActiveSlots(s, now);

  const toggleClosedDay = (d: Weekday) => {
    const next = s.closedDays.includes(d) ? s.closedDays.filter((x) => x !== d) : [...s.closedDays, d].sort((a, b) => a - b);
    void save({ saverClosedDays: next });
  };
  const saveSlots = (next: SaverSlot[], extra?: Record<string, unknown>) => void save({ saverSlots: next, ...(extra ?? {}) });
  const addSlot = (slot: SaverSlot) => saveSlots([...s.slots, slot]);

  const upload = (f: File | undefined) => {
    if (!f) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(f.type)) { setMsg("Usa un video MP4, WebM o MOV"); return; }
    if (f.size > 20 * 1024 * 1024) { setMsg("Il video è troppo grande (massimo 20 MB)"); return; }
    setMsg("Carico il video…");
    const r = new FileReader();
    r.onload = async () => {
      try { const { path } = await uploadSaverVideo({ data: { file: String(r.result) } }); await save({ saverVideo: path, saverKind: "video" }); }
      catch (e) { setMsg(e instanceof Error ? e.message : "Caricamento non riuscito"); }
    };
    r.readAsDataURL(f);
  };
  const addPhotos = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    const added: string[] = [];
    for (const f of list) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setMsg("Usa foto JPG, PNG o WebP"); continue; }
      if (f.size > 10 * 1024 * 1024) { setMsg("Una foto è troppo grande (massimo 10 MB)"); continue; }
      setMsg("Carico le foto…");
      const url = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(f); });
      try { added.push((await uploadSaverPhoto({ data: { file: url } })).path); } catch (e) { setMsg(e instanceof Error ? e.message : "Caricamento non riuscito"); }
    }
    if (added.length) await save({ saverPhotos: [...s.photos, ...added].slice(0, 20), saverKind: "photos" });
  };
  const removePhoto = (path: string) => {
    if (!window.confirm("Togliere questa foto dal salvaschermo?")) return;
    void save({ saverPhotos: s.photos.filter((x) => x !== path) });
  };
  const removeAll = () => {
    if (!window.confirm("Togliere tutte le foto? Il salvaschermo non partirà finché non ne carichi altre o un video.")) return;
    void save({ saverPhotos: [], saverKind: "photos" });
  };

  return <div className="space-y-6">
    <div className={`rounded-2xl border-2 p-4 ${liveShowcase ? "border-accent bg-accent/15" : "border-border bg-card/60"}`}>
      <p className="font-display text-2xl text-accent">
        {liveShowcase ? "🖼️ Adesso sul totem: SOLO VETRINA (ordini bloccati)" : "🟢 Adesso sul totem: APERTO (ordini attivi)"}
      </p>
      <p className="mt-1 text-lg text-muted-foreground">
        {s.forcedSlotId ? `Fascia forzata manualmente: ${s.slots.find((x) => x.id === s.forcedSlotId)?.name || "Fascia"}` : liveSlots.length ? `Fasce attive ora: ${liveSlots.map((x) => x.name || "Senza nome").join(", ")}` : "Nessuna fascia attiva in questo orario (usa foto/video base)."}
      </p>
      <p className="mt-3 mb-2 text-lg font-medium">Controllo manuale fuori orario</p>
      <div className="flex flex-wrap gap-2">
        {OVERRIDES.map(([id, label]) => (
          <Button key={id} variant={s.override === id ? "default" : "secondary"} onClick={() => void save({ saverOverride: id })}>{label}</Button>
        ))}
      </div>
      {vetrinaUrl && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-lg font-medium">📺 Pagina Vetrina per un altro schermo (TV, monitor o tablet)</p>
          <p className="text-base text-muted-foreground">
            Apri <b className="break-all text-foreground">{vetrinaUrl}</b> su un altro dispositivo: fa girare i piatti con prezzo e QR code del menu senza bloccare il totem.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard?.writeText(vetrinaUrl); setMsg("Indirizzo Vetrina copiato ✓"); }}>📋 Copia indirizzo</Button>
            <Button size="sm" asChild variant="secondary"><a href={vetrinaUrl} target="_blank" rel="noreferrer">↗ Apri Vetrina</a></Button>
          </div>
        </div>
      )}
    </div>

    <div className="space-y-3 rounded-2xl border-2 border-border p-4">
      <h4 className="font-display text-2xl text-accent">📅 Calendario settimanale (giorni aperti / solo vetrina)</h4>
      <p className="text-lg text-muted-foreground">Tocca i giorni in cui il locale è chiuso: il totem passerà da solo in modalità solo vetrina bloccando gli ordini.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {WEEKDAYS.map((d) => {
          const closed = s.closedDays.includes(d.id);
          return (
            <Button key={d.id} variant={closed ? "destructive" : "secondary"} className="flex h-auto flex-col py-2.5" onClick={() => toggleClosedDay(d.id)}>
              <span className="font-display text-2xl">{d.short}</span>
              <span className="text-xs">{closed ? "Chiuso · Vetrina" : "Aperto"}</span>
            </Button>
          );
        })}
      </div>
      <div className="pt-2">
        <p className="mb-2 text-lg">In modalità solo vetrina mostra:</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={s.showcaseAllSlots ? "default" : "secondary"} onClick={() => void save({ saverShowcaseAll: true })}>Tutte le fasce orarie insieme</Button>
          <Button size="sm" variant={!s.showcaseAllSlots ? "default" : "secondary"} onClick={() => void save({ saverShowcaseAll: false })}>Solo le fasce del giorno e dell'ora</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2 pt-2">
        <label className="min-w-[16rem] flex-1 text-lg">Scritta in basso in modalità solo vetrina
          <input type="text" maxLength={120} value={showcaseMsg ?? s.showcaseMessage} onChange={(e) => setShowcaseMsg(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-lg" />
        </label>
        <Button onClick={() => void save({ saverShowcaseMsg: (showcaseMsg ?? s.showcaseMessage).trim() || DEFAULT_SHOWCASE_MSG })}>Salva scritta</Button>
      </div>
    </div>

    <div className="space-y-3 rounded-2xl border-2 border-border p-4">
      <h4 className="font-display text-2xl text-accent">🕒 Fasce orarie e giorni speciali</h4>
      <p className="text-lg text-muted-foreground">Crea fasce per pranzo, merenda, cena o piatti del giorno (es. «Giovedì Trippa») con piatti del menu e immagini dedicate.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => addSlot(makeNewSlot("Pranzo", "11:30", "15:00"))}>+ Pranzo</Button>
        <Button size="sm" variant="secondary" onClick={() => addSlot(makeNewSlot("Merenda", "15:00", "18:30"))}>+ Merenda</Button>
        <Button size="sm" variant="secondary" onClick={() => addSlot(makeNewSlot("Cena", "18:30", "23:30"))}>+ Cena</Button>
        <Button size="sm" variant="secondary" onClick={() => addSlot(makeNewSlot("Speciale del giorno", "00:00", "23:59", [4], true))}>+ Giorno speciale</Button>
        <Button size="sm" onClick={() => addSlot(makeNewSlot("Nuova fascia", "12:00", "15:00"))}>+ Altra fascia</Button>
      </div>
      {s.slots.length > 0 ? (
        <div className="space-y-3 pt-1">
          {s.slots.map((slot) => (
            <ScreensaverSlotEditor
              key={slot.id}
              slot={slot}
              forced={s.forcedSlotId === slot.id}
              products={menu?.products ?? []}
              photoUrls={urlMap}
              onChange={(next) => saveSlots(s.slots.map((x) => (x.id === slot.id ? next : x)))}
              onToggleForce={() => void save({ saverForcedSlot: s.forcedSlotId === slot.id ? "" : slot.id })}
              onDelete={() => saveSlots(s.slots.filter((x) => x.id !== slot.id), s.forcedSlotId === slot.id ? { saverForcedSlot: "" } : undefined)}
              onMsg={setMsg}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border p-3 text-lg text-muted-foreground">Nessuna fascia creata: aggiungi una fascia qui sopra oppure usa le foto/video di base qui sotto.</p>
      )}
    </div>

    <div className="space-y-4 rounded-2xl border-2 border-border p-4">
      <h4 className="font-display text-2xl text-accent">🖼️ Salvaschermo di base (inattività e foto/video generali)</h4>
      <p className="text-lg text-muted-foreground">Quando il locale è aperto e nessuno tocca lo schermo, parte dopo il tempo scelto. Se non c'è una fascia oraria attiva, usa queste foto o il video.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant={s.on ? "default" : "secondary"} onClick={() => void save({ saver: true })}>Acceso</Button>
        <Button variant={!s.on ? "default" : "secondary"} onClick={() => void save({ saver: false })}>Spento</Button>
      </div>
      <div><p className="mb-2 text-lg">Parte dopo</p><div className="flex flex-wrap gap-2">{AFTER.map(([v, l]) => <Button key={v} variant={s.after === v ? "default" : "secondary"} onClick={() => void save({ saverAfter: v })}>{l}</Button>)}</div></div>
      <div><p className="mb-2 text-lg">Cosa mostrare fuori dalle fasce</p><div className="flex flex-wrap gap-2">
        <Button variant={s.kind === "photos" ? "default" : "secondary"} onClick={() => void save({ saverKind: "photos" })}>🖼️ Foto</Button>
        <Button variant={s.kind === "video" ? "default" : "secondary"} onClick={() => (s.video ? void save({ saverKind: "video" }) : videoInput.current?.click())}>🎬 Il mio video</Button>
      </div></div>
      <label className="block text-lg">🎬 Carica un video (MP4 o WebM, massimo 20 MB, parte senza audio)
        <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" className="mt-2 block text-base" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {s.video && <div className="flex flex-wrap items-center gap-3"><p className="text-lg text-muted-foreground">Video caricato ✓</p><Button variant="destructive" onClick={() => { if (window.confirm("Togliere il video?")) void save({ saverVideo: "", saverKind: "photos" }); }}>✕ Togli video</Button></div>}
      <label className="block text-lg">🖼️ Carica le tue foto generali (JPG, PNG o WebP, massimo 10 MB l'una, fino a 20)
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block text-base" onChange={(e) => { const f = e.target.files; void addPhotos(f).finally(() => { e.target.value = ""; }); }} />
      </label>
      {s.photos.length > 0 ? <>
        <div className="flex flex-wrap items-center gap-3"><p className="text-lg text-muted-foreground">Foto generali caricate: {s.photos.length}.</p><Button variant="destructive" onClick={removeAll}>✕ Togli tutte le foto</Button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{s.photos.map((path) => urlMap[path] ? <div key={path} className="space-y-2"><img src={urlMap[path]} alt="Foto salvaschermo" loading="lazy" className="aspect-[9/16] w-full rounded-xl object-cover" /><Button variant="destructive" className="w-full" onClick={() => removePhoto(path)}>✕ Togli</Button></div> : null)}</div>
      </> : (
        <p className="rounded-xl border border-border p-3 text-lg text-muted-foreground">Nessuna foto generale caricata: usa le fasce qui sopra oppure carica almeno una foto o un video.</p>
      )}
    </div>
    {msg && <p role="status" className="text-xl">{msg}</p>}
  </div>;
}
