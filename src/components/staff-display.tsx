import { Maximize, Minimize, Monitor, Move, Settings2, RotateCcw, Scaling } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useCustomer } from "@/components/customer-session";
import { Button } from "@/components/ui/button";
import { DisplayBoard } from "@/components/display-board";
import { useKitchenFeatures } from "@/components/kitchen-features";
import { useLiveOrders } from "@/hooks/use-orders";
import { Slider } from "@/components/ui/slider";
import { cleanPreviewLayout, DEFAULT_PREVIEW_LAYOUT, fitPreviewLayout, previewLayoutKey, type PreviewLayout } from "@/lib/display-preview-layout";
import { StaffChip } from "@/components/staff-nav";

export function StaffFullscreenButton() {
  const { fullscreen, enterKiosk, exitKiosk, kioskError } = useCustomer();
  return <div className="flex flex-col items-start gap-2">
    <StaffChip
      aria-label={fullscreen ? "Esci da schermo intero" : "Schermo intero"}
      title={fullscreen ? "Esci da schermo intero" : "Schermo intero"}
      onClick={() => { if (fullscreen) void exitKiosk(); else void enterKiosk(); }}
    >
      {fullscreen ? <Minimize aria-hidden="true" className="size-5" /> : <Maximize aria-hidden="true" className="size-5" />}
      Schermo
    </StaffChip>
    {kioskError && <p role="alert" className="max-w-sm text-lg text-destructive">{kioskError}</p>}
  </div>;
}

export function StaffDisplayPreview({ page }: { page: "cassa" | "cucina" }) {
  const features = useKitchenFeatures();
  const enabled = page === "cassa" ? features.displayTill : features.displayKitchen;
  return enabled ? <LivePreview key={page} page={page} partial={features.partial} /> : null;
}

function LivePreview({ page, partial }: { page: "cassa" | "cucina"; partial: boolean }) {
  const orders = useLiveOrders(["preparing", "ready"]);
  const [layout, setLayout] = useState<PreviewLayout>(DEFAULT_PREVIEW_LAYOUT);
  const [loaded, setLoaded] = useState(false);
  const [controls, setControls] = useState(false);
  const gesture = useRef<{ kind: "move" | "resize"; x: number; y: number; layout: PreviewLayout } | null>(null);
  const fit = (next: PreviewLayout) => fitPreviewLayout(next, window.innerWidth, window.innerHeight);
  useEffect(() => {
    try { setLayout(fit(cleanPreviewLayout(JSON.parse(localStorage.getItem(previewLayoutKey(page)) || "null")))); } catch { setLayout(fit(DEFAULT_PREVIEW_LAYOUT)); }
    setLoaded(true);
    const resize = () => setLayout((current) => fit(current));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [page]);
  useEffect(() => {
    if (loaded) { try { localStorage.setItem(previewLayoutKey(page), JSON.stringify(layout)); } catch { /* Storage may be disabled. */ } }
  }, [layout, loaded, page]);
  const start = (e: PointerEvent<HTMLButtonElement>, kind: "move" | "resize") => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.closest("section")?.getBoundingClientRect();
    const next = fit({ ...layout, floating: true, ...(!layout.floating && rect ? { x: rect.left, y: rect.top } : {}) });
    setLayout(next);
    gesture.current = { kind, x: e.clientX, y: e.clientY, layout: next };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    const next = g.kind === "move" ? { ...g.layout, x: g.layout.x + dx, y: g.layout.y + dy } : { ...g.layout, width: g.layout.width + dx, height: g.layout.height + dy };
    setLayout(fit(cleanPreviewLayout(next)));
  };
  const end = () => { gesture.current = null; };
  const change = (key: "width" | "height" | "opacity", value: number) => setLayout((current) => fit({ ...current, [key]: value }));
  return <section aria-label="Miniatura Display" className={`${layout.floating ? "fixed z-40" : "relative mb-6 max-w-full"} flex flex-col rounded-lg border border-border`}
    style={{ width: layout.width, height: layout.height, ...(layout.floating ? { left: layout.x, top: layout.y } : {}) }}>
    <header className="flex shrink-0 items-center justify-between gap-1 rounded-t-lg border-b border-border bg-background px-2 py-1">
      <h2 className="flex items-center gap-2 font-display text-[20px]"><Monitor aria-hidden="true" className="size-4" />Display</h2>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" title="Sposta miniatura" aria-label="Sposta miniatura" className="touch-none cursor-move" onPointerDown={(e) => start(e, "move")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={() => setLayout((current) => fit({ ...current, floating: true }))}><Move /></Button>
        <Button variant="ghost" size="icon" title="Regola miniatura" aria-label="Regola miniatura" aria-expanded={controls} onClick={() => setControls(!controls)}><Settings2 /></Button>
        <Button variant="ghost" size="icon" title="Ripristina miniatura" aria-label="Ripristina miniatura" onClick={() => { setLayout(fit(DEFAULT_PREVIEW_LAYOUT)); setControls(false); }}><RotateCcw /></Button>
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-hidden rounded-b-lg bg-background [&>div]:h-full" style={{ opacity: layout.opacity / 100 }}>
      <DisplayBoard orders={orders} partial={partial} compact />
    </div>
    {controls && <div className="absolute inset-x-0 top-12 z-10 max-h-[calc(100%-3rem)] overflow-y-auto border border-border bg-background p-4 text-base shadow-lg">
      {([['width', 'Larghezza', 280, 900], ['height', 'Altezza', 200, 700], ['opacity', 'Visibilità', 20, 100]] as const).map(([key, label, min, max]) => <label key={key} className="mb-4 block">
        <span className="mb-3 block">{label}: {Math.round(layout[key])}{key === "opacity" ? "%" : " px"}</span>
        <Slider aria-label={label} min={min} max={max} step={key === "opacity" ? 5 : 10} value={[layout[key]]} onValueChange={([value]) => { if (value !== undefined) change(key, value); }} />
      </label>)}
      <Button variant="secondary" className="w-full" onClick={() => setLayout((current) => fit({ ...current, floating: !current.floating }))}><Move />{layout.floating ? "Rimetti nella pagina" : "Sposta liberamente"}</Button>
    </div>}
    <Button variant="secondary" size="icon" aria-label="Ridimensiona miniatura" title="Ridimensiona miniatura" className="absolute bottom-1 right-1 size-8 touch-none cursor-nwse-resize" onPointerDown={(e) => start(e, "resize")} onPointerMove={move} onPointerUp={end} onPointerCancel={end}><Scaling className="size-4" /></Button>
  </section>;
}