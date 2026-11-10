import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerQueryOptions } from "@/components/display-banner";
import { getSaverVideo, saveBanner, uploadSaverVideo } from "@/lib/menu.functions";
import { Button } from "@/components/ui/button";
import torri from "@/assets/albenga-torri.jpg";
import gallinara from "@/assets/albenga-gallinara.jpg";
import carruggi from "@/assets/albenga-carruggi.jpg";
import lungomare from "@/assets/albenga-lungomare.jpg";

const PHOTOS = [torri, gallinara, carruggi, lungomare];
export type Saver = { on: boolean; after: number; kind: "photos" | "video"; video: string };
export function readSaver(s: Record<string, unknown> | undefined): Saver {
  const v = s ?? {};
  return {
    on: v["saver"] !== false,
    after: Number(v["saverAfter"] ?? 60) || 60,
    kind: v["saverKind"] === "video" ? "video" : "photos",
    video: typeof v["saverVideo"] === "string" ? v["saverVideo"] : "",
  };
}

/** Salvaschermo del totem: parte sulla schermata iniziale dopo il tempo scelto senza tocchi. */
export function Screensaver() {
  const { data } = useQuery(bannerQueryOptions);
  const s = readSaver(data);
  const { data: videoUrl } = useQuery({ queryKey: ["saver-video", s.video], queryFn: () => getSaverVideo({ data: { path: s.video } }), enabled: s.kind === "video" && !!s.video, staleTime: 30 * 60_000 });
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
    const t = setInterval(() => setI((x) => (x + 1) % PHOTOS.length), 7000);
    return () => clearInterval(t);
  }, [show]);
  if (!show || !s.on) return null;
  const useVideo = s.kind === "video" && !!videoUrl;
  return (
    <div role="button" aria-label="Tocca per ordinare" onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setShow(false); }} className="fixed inset-0 z-[100] cursor-pointer overflow-hidden bg-background">
      {useVideo ? <video src={videoUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" /> :
        PHOTOS.map((p, n) => <img key={p} src={p} alt="Albenga" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms]" style={{ opacity: n === i ? 1 : 0 }} />)}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-16 text-center">
        <p className="animate-pulse font-display text-8xl text-foreground">👆 Tocca lo schermo per ordinare</p>
        <p className="mt-3 font-display text-5xl text-muted-foreground">Touch the screen to order</p>
      </div>
    </div>
  );
}

const AFTER: [number, string][] = [[30, "30 secondi"], [60, "1 minuto"], [120, "2 minuti"], [300, "5 minuti"]];
/** Admin: accende il salvaschermo, sceglie il tempo, foto di Albenga o video caricato. */
export function ScreensaverSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  if (!saved) return null;
  const s = readSaver(saved);
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
  return <div className="space-y-5">
    <p className="text-xl text-muted-foreground">Quando nessuno tocca la schermata iniziale del totem, parte a tutto schermo. Un tocco lo chiude.</p>
    <div className="flex flex-wrap gap-2">
      <Button variant={s.on ? "default" : "secondary"} onClick={() => void save({ saver: true })}>Acceso</Button>
      <Button variant={!s.on ? "default" : "secondary"} onClick={() => void save({ saver: false })}>Spento</Button>
    </div>
    <div><p className="mb-2 text-xl">Parte dopo</p><div className="flex flex-wrap gap-2">{AFTER.map(([v, l]) => <Button key={v} variant={s.after === v ? "default" : "secondary"} onClick={() => void save({ saverAfter: v })}>{l}</Button>)}</div></div>
    <div><p className="mb-2 text-xl">Cosa mostrare</p><div className="flex flex-wrap gap-2">
      <Button variant={s.kind === "photos" ? "default" : "secondary"} onClick={() => void save({ saverKind: "photos" })}>🖼️ Foto di Albenga</Button>
      <Button variant={s.kind === "video" ? "default" : "secondary"} disabled={!s.video} onClick={() => void save({ saverKind: "video" })}>🎬 Il mio video</Button>
    </div></div>
    <label className="block text-xl">🎬 Carica un video (MP4 o WebM, massimo 20 MB, parte senza audio)
      <input type="file" accept="video/mp4,video/webm" className="mt-2 block text-lg" onChange={(e) => upload(e.target.files?.[0])} />
    </label>
    {s.video && <p className="text-lg text-muted-foreground">Video caricato ✓</p>}
    <div className="grid grid-cols-4 gap-2">{PHOTOS.map((p) => <img key={p} src={p} alt="Albenga" loading="lazy" className="aspect-[9/16] w-full rounded-xl object-cover" />)}</div>
    {msg && <p role="status" className="text-xl">{msg}</p>}
  </div>;
}
