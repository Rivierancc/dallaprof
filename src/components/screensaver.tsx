import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerQueryOptions } from "@/components/display-banner";
import { getSaverPhotos, getSaverVideo, saveBanner, uploadSaverPhoto, uploadSaverVideo } from "@/lib/menu.functions";
import { Button } from "@/components/ui/button";
import { NewsTicker } from "@/components/news-ticker";
import torri from "@/assets/albenga-torri.jpg";
import gallinara from "@/assets/albenga-gallinara.jpg";
import carruggi from "@/assets/albenga-carruggi.jpg";
import battistero from "@/assets/albenga-battistero.jpg";
import viaGenova from "@/assets/albenga-via-genova.jpg";

const PHOTOS = [torri, gallinara, carruggi, battistero, viaGenova];
export type Saver = { on: boolean; after: number; kind: "photos" | "video"; video: string; photos: string[] };
export function readSaver(s: Record<string, unknown> | undefined): Saver {
  const v = s ?? {};
  return {
    on: v["saver"] !== false,
    after: Number(v["saverAfter"] ?? 60) || 60,
    kind: v["saverKind"] === "video" ? "video" : "photos",
    video: typeof v["saverVideo"] === "string" ? v["saverVideo"] : "",
    photos: Array.isArray(v["saverPhotos"]) ? (v["saverPhotos"] as unknown[]).filter((x): x is string => typeof x === "string") : [],
  };
}

/** Salvaschermo del totem: parte sulla schermata iniziale dopo il tempo scelto senza tocchi. */
export function Screensaver() {
  const { data } = useQuery(bannerQueryOptions);
  const s = readSaver(data);
  const { data: videoUrl } = useQuery({ queryKey: ["saver-video", s.video], queryFn: () => getSaverVideo({ data: { path: s.video } }), enabled: s.kind === "video" && !!s.video, staleTime: 30 * 60_000 });
  const { data: mine } = useQuery({ queryKey: ["saver-photos", s.photos], queryFn: () => getSaverPhotos({ data: { paths: s.photos } }), enabled: s.photos.length > 0, staleTime: 30 * 60_000 });
  const pics = mine && mine.length ? mine : PHOTOS;
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!data || !s.on) return;
    let t = setTimeout(() => setShow(true), s.after * 1000);
    const bump = () => { clearTimeout(t); t = setTimeout(() => setShow(true), s.after * 1000); };
    const evs = ["pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }));
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, bump, { capture: true })); };
  }, [data, s.on, s.after]);
  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => setI((x) => (x + 1) % pics.length), 7000);
    return () => clearInterval(t);
  }, [show, pics.length]);
  if (!show || !s.on) return null;
  const useVideo = s.kind === "video" && !!videoUrl;
  return (
    <div role="button" aria-label="Tocca per ordinare" onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setShow(false); }} className="fixed inset-0 z-[9999] cursor-pointer overflow-hidden bg-background">
      {useVideo ? <video src={videoUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" /> :
        pics.map((p, n) => <img key={p} src={p} alt="Salvaschermo" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms]" style={{ opacity: n === i % pics.length ? 1 : 0 }} />)}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-16 pb-32 text-center">
        <p className="animate-pulse font-display text-8xl text-foreground">👆 Tocca lo schermo per ordinare</p>
        <p className="mt-3 font-display text-5xl text-muted-foreground">Touch the screen to order</p>
      </div>
      <div className="absolute inset-x-0 bottom-0"><NewsTicker /></div>
    </div>
  );
}

const AFTER: [number, string][] = [[30, "30 secondi"], [60, "1 minuto"], [120, "2 minuti"], [300, "5 minuti"]];
/** Admin: accende il salvaschermo, sceglie il tempo, foto di Albenga o video caricato. */
export function ScreensaverSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const s = readSaver(saved);
  const { data: mine } = useQuery({ queryKey: ["saver-photos", s.photos], queryFn: () => getSaverPhotos({ data: { paths: s.photos } }), enabled: s.photos.length > 0 });
  if (!saved) return null;
  const save = async (p: Record<string, unknown>) => {
    setMsg("Salvo…");
    try { await saveBanner({ data: { settings: { ...saved, ...p } as never } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  const upload = (f: File | undefined) => {
    if (!f) return;
    if (!/^video\/(mp4|webm)$/.test(f.type)) { setMsg("Usa un video MP4 o WebM"); return; }
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
  const removePhoto = (n: number) => void save({ saverPhotos: s.photos.filter((_, k) => k !== n) });
  return <div className="space-y-5">
    <p className="text-xl text-muted-foreground">Quando nessuno tocca la schermata iniziale del totem, parte a tutto schermo. Un tocco lo chiude.</p>
    <div className="flex flex-wrap gap-2">
      <Button variant={s.on ? "default" : "secondary"} onClick={() => void save({ saver: true })}>Acceso</Button>
      <Button variant={!s.on ? "default" : "secondary"} onClick={() => void save({ saver: false })}>Spento</Button>
    </div>
    <div><p className="mb-2 text-xl">Parte dopo</p><div className="flex flex-wrap gap-2">{AFTER.map(([v, l]) => <Button key={v} variant={s.after === v ? "default" : "secondary"} onClick={() => void save({ saverAfter: v })}>{l}</Button>)}</div></div>
    <div><p className="mb-2 text-xl">Cosa mostrare</p><div className="flex flex-wrap gap-2">
      <Button variant={s.kind === "photos" ? "default" : "secondary"} onClick={() => void save({ saverKind: "photos" })}>🖼️ Foto</Button>
      <Button variant={s.kind === "video" ? "default" : "secondary"} disabled={!s.video} onClick={() => void save({ saverKind: "video" })}>🎬 Il mio video</Button>
    </div></div>
    <label className="block text-xl">🎬 Carica un video (MP4 o WebM, massimo 20 MB, parte senza audio)
      <input type="file" accept="video/mp4,video/webm" className="mt-2 block text-lg" onChange={(e) => upload(e.target.files?.[0])} />
    </label>
    {s.video && <p className="text-lg text-muted-foreground">Video caricato ✓</p>}
    <label className="block text-xl">🖼️ Carica le tue foto (JPG, PNG o WebP, massimo 10 MB l'una, fino a 20)
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block text-lg" onChange={(e) => void addPhotos(e.target.files)} />
    </label>
    {s.photos.length > 0 ? <>
      <p className="text-lg text-muted-foreground">Il totem mostra le tue foto. Togliendole tutte tornano quelle di Albenga.</p>
      <div className="grid grid-cols-4 gap-2">{(mine ?? []).map((p, n) => <div key={p} className="relative"><img src={p} alt="Foto salvaschermo" loading="lazy" className="aspect-[9/16] w-full rounded-xl object-cover" /><Button size="sm" variant="destructive" className="absolute right-1 top-1" onClick={() => removePhoto(n)}>✕ Togli</Button></div>)}</div>
    </> : <>
      <p className="text-lg text-muted-foreground">Ora il totem mostra le foto di Albenga:</p>
      <div className="grid grid-cols-5 gap-2">{PHOTOS.map((p) => <img key={p} src={p} alt="Albenga" loading="lazy" className="aspect-[9/16] w-full rounded-xl object-cover" />)}</div>
    </>}
    {msg && <p role="status" className="text-xl">{msg}</p>}
  </div>;
}
