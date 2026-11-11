import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const BOX = 320;
const OUT = 800;

// Finestra per centrare (trascinando) e ingrandire la foto prima di salvarla: produce un'immagine quadrata.
export function PhotoCrop({ file, onDone, onCancel }: { file: File | null; onDone: (f: File) => void; onCancel: () => void }) {
  const [url, setUrl] = useState("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u); setZoom(1); setPos({ x: 0, y: 0 }); setImg(null);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const base = img ? BOX / Math.min(img.width, img.height) : 1;
  const w = img ? img.width * base * zoom : BOX;
  const h = img ? img.height * base * zoom : BOX;
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(BOX - w, p.x)),
    y: Math.min(0, Math.max(BOX - h, p.y)),
  });
  // posizione predefinita: centrata
  const cur = clamp(pos.x === 0 && pos.y === 0 && !drag.current ? { x: (BOX - w) / 2, y: (BOX - h) / 2 } : pos);

  const setZ = (z: number) => {
    const cx = (BOX / 2 - cur.x) / w, cy = (BOX / 2 - cur.y) / h;
    const nw = w / zoom * z, nh = h / zoom * z;
    setZoom(z);
    setPos({ x: BOX / 2 - cx * nw || -0.01, y: BOX / 2 - cy * nh || -0.01 });
  };

  const save = () => {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = OUT; c.height = OUT;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const k = OUT / BOX;
    ctx.drawImage(img, cur.x * k, cur.y * k, w * k, h * k);
    c.toBlob((b) => b && onDone(new File([b], "foto.jpg", { type: "image/jpeg" })), "image/jpeg", 0.9);
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">Centra e ingrandisci la foto</DialogTitle></DialogHeader>
        <p className="text-lg text-muted-foreground">Trascina la foto con il dito per spostarla, usa la barra per ingrandire.</p>
        <div
          className="relative mx-auto touch-none overflow-hidden rounded-xl bg-muted"
          style={{ width: BOX, height: BOX }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: cur.x, py: cur.y }; }}
          onPointerMove={(e) => { const d = drag.current; if (d) setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y })); }}
          onPointerUp={() => { drag.current = null; }}
        >
          {url && <img src={url} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: cur.x, top: cur.y, width: w, height: h }} />}
        </div>
        <div className="flex items-center gap-3 text-2xl">
          <span>－</span>
          <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={([z]) => setZ(z)} aria-label="Zoom" />
          <span>＋</span>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="lg" onClick={onCancel}>Annulla</Button>
          <Button size="lg" onClick={save} disabled={!img}>✓ Fatto</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
