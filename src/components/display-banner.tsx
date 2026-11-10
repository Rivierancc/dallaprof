import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBanner, saveBanner } from "@/lib/menu.functions";
import { Button } from "@/components/ui/button";

export type BannerEffect = "none" | "blink" | "fade" | "scroll";
export type Banner = {
  on: boolean; text: string; bold: boolean; italic: boolean; underline: boolean;
  size: "s" | "m" | "l"; align: "left" | "center" | "right";
  color: string; bg: string; effect: BannerEffect; speed: number;
  /** Secondi di inattività prima che il totem torni all'inizio; 0 = mai. */
  idle?: number;
};
const KEY = "display_banner";
const DEFAULT: Banner = { on: false, text: "Benvenuti!", bold: true, italic: false, underline: false, size: "m", align: "center", color: "#ffd84d", bg: "#b3261e", effect: "none", speed: 2 };
const sizes = { s: "text-4xl", m: "text-6xl", l: "text-8xl" };
const durations: Record<BannerEffect, number> = { none: 0, blink: 1, fade: 3, scroll: 12 };

export const bannerQueryOptions = queryOptions({ queryKey: ["banner"], queryFn: () => getBanner(), staleTime: 10_000, refetchInterval: 20_000 });
export function useBanner(): Banner {
  const { data } = useQuery(bannerQueryOptions);
  return { ...DEFAULT, ...(data ?? {}) } as Banner;
}

/** Sezione di Gestione menu: modifica e salva la scritta per tutti i totem. */
export function BannerSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Banner | null>(null);
  const [msg, setMsg] = useState("");
  // Il modulo si riempie solo quando il database ha risposto: altrimenti i pulsanti
  // restano fermi all'aspetto iniziale e mostrano uno stato diverso da quello salvato.
  useEffect(() => { if (!draft && saved) setDraft({ ...DEFAULT, ...saved } as Banner); }, [saved, draft]);
  if (!draft) return null;
  const save = async () => {
    setMsg("Salvo…");
    try { await saveBanner({ data: { settings: draft } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  return <BannerEditor banner={draft} set={(p) => { setMsg(""); setDraft({ ...draft, ...p }); }} onSave={save} msg={msg} />;
}

export function BannerView({ banner }: { banner: Banner }) {
  if (!banner.on || !banner.text.trim()) return null;
  const duration = `${durations[banner.effect] / banner.speed}s`;
  const anim = banner.effect === "none" ? undefined : { animation: `banner-${banner.effect} ${duration} ${banner.effect === "scroll" ? "linear" : "ease-in-out"} infinite` };
  const style = { color: banner.color, fontWeight: banner.bold ? 700 : 400, fontStyle: banner.italic ? "italic" : "normal", textDecoration: banner.underline ? "underline" : "none" };
  return <div className="overflow-hidden px-6 py-4" style={{ backgroundColor: banner.bg, textAlign: banner.align }}>
    <p className={`${sizes[banner.size]} whitespace-nowrap font-sans leading-tight ${banner.effect === "scroll" ? "inline-block" : ""}`} style={{ ...style, ...anim }}>{banner.text}</p>
  </div>;
}

function BannerEditor({ banner, set, onSave, msg }: { banner: Banner; set: (p: Partial<Banner>) => void; onSave: () => void; msg: string }) {
  const toggle = (k: "bold" | "italic" | "underline", label: string, cls: string) =>
    <Button type="button" variant={banner[k] ? "default" : "secondary"} className={cls} onClick={() => set({ [k]: !banner[k] })}>{label}</Button>;
  const pick = <T extends string>(value: T, options: [T, string][], on: (v: T) => void) =>
    <div className="flex flex-wrap gap-2">{options.map(([v, l]) => <Button key={v} type="button" variant={value === v ? "default" : "secondary"} onClick={() => on(v)}>{l}</Button>)}</div>;
  return <div>
    <div className="space-y-5">
      <div className="flex items-center gap-3"><p className="mr-auto text-xl text-muted-foreground">Compare in alto nella schermata iniziale del totem.</p>
        <Button variant={banner.on ? "default" : "secondary"} onClick={() => set({ on: !banner.on })}>{banner.on ? "Accesa" : "Spenta"}</Button></div>
      <textarea aria-label="Testo" value={banner.text} maxLength={160} rows={2} onChange={(e) => set({ text: e.target.value })} className="w-full rounded-lg bg-muted p-3 text-2xl select-text" />
      <div className="flex flex-wrap gap-2">{toggle("bold", "G", "font-bold")}{toggle("italic", "C", "italic")}{toggle("underline", "S", "underline")}</div>
      <div><p className="mb-2 text-muted-foreground">Grandezza</p>{pick(banner.size, [["s", "Piccola"], ["m", "Media"], ["l", "Grande"]], (size) => set({ size }))}</div>
      <div><p className="mb-2 text-muted-foreground">Allineamento</p>{pick(banner.align, [["left", "Sinistra"], ["center", "Centro"], ["right", "Destra"]], (align) => set({ align }))}</div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3">Colore testo <input type="color" value={banner.color} onChange={(e) => set({ color: e.target.value })} className="h-12 w-16" /></label>
        <label className="flex items-center gap-3">Colore sfondo <input type="color" value={banner.bg} onChange={(e) => set({ bg: e.target.value })} className="h-12 w-16" /></label>
      </div>
      <div><p className="mb-2 text-muted-foreground">Effetto</p>{pick(banner.effect, [["none", "Fisso"], ["blink", "Lampeggia"], ["fade", "Svanisce"], ["scroll", "Scorre"]], (effect) => set({ effect }))}</div>
      {banner.effect !== "none" && <label className="block"><span className="text-muted-foreground">Velocità: {banner.speed < 1.5 ? "lenta" : banner.speed > 2.5 ? "veloce" : "normale"}</span>
        <input type="range" min={0.5} max={4} step={0.5} value={banner.speed} onChange={(e) => set({ speed: Number(e.target.value) })} className="w-full" /></label>}
      <div className="rounded-lg border border-border"><BannerView banner={{ ...banner, on: true }} /></div>
      <div className="flex items-center gap-4"><Button onClick={onSave}>Salva scritta</Button>{msg && <span role="status" className="text-xl">{msg}</span>}</div>
    </div>
  </div>;
}

const IDLE_CHOICES: [number, string][] = [[30, "30 secondi"], [60, "1 minuto"], [90, "90 secondi"], [120, "2 minuti"], [180, "3 minuti"], [0, "Mai"]];
/** Admin: dopo quanto tempo senza tocchi il totem torna alla schermata iniziale. */
export function IdleSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  if (!saved) return null;
  const current = Number(saved.idle ?? 60);
  const pick = async (idle: number) => {
    setMsg("Salvo…");
    try { await saveBanner({ data: { settings: { ...saved, idle } } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  return <div className="space-y-4">
    <p className="text-xl text-muted-foreground">Se nessuno tocca il totem per questo tempo, il carrello si svuota e torna la schermata iniziale per il cliente successivo.</p>
    <div className="flex flex-wrap gap-2">{IDLE_CHOICES.map(([v, l]) => <Button key={v} variant={current === v ? "default" : "secondary"} onClick={() => void pick(v)}>{l}</Button>)}</div>
    {msg && <p role="status" className="text-xl">{msg}</p>}
  </div>;
}
