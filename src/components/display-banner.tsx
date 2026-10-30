import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type BannerEffect = "none" | "blink" | "fade" | "scroll";
export type Banner = {
  on: boolean; text: string; bold: boolean; italic: boolean; underline: boolean;
  size: "s" | "m" | "l"; align: "left" | "center" | "right";
  color: string; bg: string; effect: BannerEffect; speed: number;
};
const KEY = "display_banner";
const DEFAULT: Banner = { on: false, text: "Benvenuti!", bold: true, italic: false, underline: false, size: "m", align: "center", color: "#ffd84d", bg: "#b3261e", effect: "none", speed: 2 };
const sizes = { s: "text-4xl", m: "text-6xl", l: "text-8xl" };
const durations: Record<BannerEffect, number> = { none: 0, blink: 1, fade: 3, scroll: 12 };

export function useBanner() {
  const [banner, setState] = useState<Banner>(DEFAULT);
  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) }); } catch { /* defaults */ } }, []);
  const set = (patch: Partial<Banner>) => setState((prev) => { const next = { ...prev, ...patch }; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ } return next; });
  return [banner, set] as const;
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

export function BannerEditor({ banner, set, onClose }: { banner: Banner; set: (p: Partial<Banner>) => void; onClose: () => void }) {
  const toggle = (k: "bold" | "italic" | "underline", label: string, cls: string) =>
    <Button type="button" variant={banner[k] ? "default" : "secondary"} className={cls} onClick={() => set({ [k]: !banner[k] })}>{label}</Button>;
  const pick = <T extends string>(value: T, options: [T, string][], on: (v: T) => void) =>
    <div className="flex flex-wrap gap-2">{options.map(([v, l]) => <Button key={v} type="button" variant={value === v ? "default" : "secondary"} onClick={() => on(v)}>{l}</Button>)}</div>;
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-background/90 p-4">
    <div className="max-h-full w-full max-w-2xl space-y-5 overflow-auto rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3"><h2 className="mr-auto font-display text-5xl">Scritta in alto</h2>
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
      <Button className="w-full" onClick={onClose}>Fatto</Button>
    </div>
  </div>;
}
