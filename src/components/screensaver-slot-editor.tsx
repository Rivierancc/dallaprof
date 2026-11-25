import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadSaverPhoto } from "@/lib/menu.functions";
import { euro, type Product } from "@/lib/menu";
import { WEEKDAYS, type SaverSlot, type Weekday } from "@/lib/screensaver";

type Props = {
  slot: SaverSlot;
  forced: boolean;
  products: Product[];
  photoUrls: Record<string, string>;
  onChange: (next: SaverSlot) => void;
  onToggleForce: () => void;
  onDelete: () => void;
  onMsg: (m: string) => void;
};

function daysSummary(days: Weekday[]): string {
  if (!days.length || days.length === 7) return "Tutti i giorni";
  return WEEKDAYS.filter((d) => days.includes(d.id)).map((d) => d.short).join(", ");
}

export function ScreensaverSlotEditor({ slot, forced, products, photoUrls, onChange, onToggleForce, onDelete, onMsg }: Props) {
  const [open, setOpen] = useState(false);
  const [pickDish, setPickDish] = useState("");
  const sorted = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name, "it")), [products]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const toggleDay = (d: Weekday) => {
    const next = slot.days.includes(d) ? slot.days.filter((x) => x !== d) : [...slot.days, d].sort((a, b) => a - b);
    onChange({ ...slot, days: next });
  };

  const addDish = (id: string) => {
    if (!id || slot.dishIds.includes(id)) return;
    onChange({ ...slot, dishIds: [...slot.dishIds, id].slice(0, 30) });
    setPickDish("");
  };

  const addPhotos = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    const added: string[] = [];
    for (const f of list) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { onMsg("Usa foto JPG, PNG o WebP"); continue; }
      if (f.size > 10 * 1024 * 1024) { onMsg("Una foto è troppo grande (massimo 10 MB)"); continue; }
      onMsg("Carico le foto della fascia…");
      const url = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(f); });
      try { added.push((await uploadSaverPhoto({ data: { file: url } })).path); }
      catch (e) { onMsg(e instanceof Error ? e.message : "Caricamento non riuscito"); }
    }
    if (added.length) onChange({ ...slot, photos: [...slot.photos, ...added].slice(0, 20) });
  };

  const when = `${daysSummary(slot.days)} · ${slot.allDay ? "Tutto il giorno" : `${slot.start}–${slot.end}`}`;
  const countText = `${slot.dishIds.length} piatti · ${slot.photos.length} foto`;

  return (
    <div className={`rounded-2xl border-2 p-4 ${forced ? "border-accent bg-accent/10" : slot.enabled ? "border-border bg-card/70" : "border-border/50 bg-muted/30 opacity-80"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <p className="font-display text-2xl leading-tight text-foreground">
            {slot.name.trim() || "Fascia senza nome"}
            {forced && <span className="ml-2 rounded-full bg-accent px-2.5 py-0.5 font-sans text-sm font-bold text-accent-foreground">⚡ Forzata ora</span>}
          </p>
          <p className="text-base text-muted-foreground">{when} · {countText}</p>
        </div>
        <Button size="sm" variant={slot.enabled ? "default" : "secondary"} onClick={() => onChange({ ...slot, enabled: !slot.enabled })}>
          {slot.enabled ? "✓ Accesa" : "Spenta"}
        </Button>
        <Button size="sm" variant={forced ? "default" : "secondary"} onClick={onToggleForce}>
          {forced ? "✕ Togli forzatura" : "⚡ Forza ora"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "▲ Chiudi" : "▼ Modifica"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <label className="block text-lg">
            Nome della fascia
            <input type="text" value={slot.name} maxLength={60} placeholder="Es. Pranzo, Merenda, Giovedì Trippa…" onChange={(e) => onChange({ ...slot, name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-lg" />
          </label>

          <div>
            <p className="mb-2 text-lg">Giorni in cui è attiva</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={slot.days.length === 0 ? "default" : "secondary"} onClick={() => onChange({ ...slot, days: [] })}>Tutti i giorni</Button>
              {WEEKDAYS.map((d) => (
                <Button key={d.id} size="sm" variant={slot.days.includes(d.id) ? "default" : "secondary"} onClick={() => toggleDay(d.id)}>{d.short}</Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-lg">Orario</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant={slot.allDay ? "default" : "secondary"} onClick={() => onChange({ ...slot, allDay: !slot.allDay })}>
                {slot.allDay ? "✓ Tutto il giorno" : "Tutto il giorno"}
              </Button>
              {!slot.allDay && (
                <>
                  <label className="flex items-center gap-2 text-lg">Dalle
                    <input type="time" value={slot.start} onChange={(e) => onChange({ ...slot, start: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-1.5 text-lg" />
                  </label>
                  <label className="flex items-center gap-2 text-lg">Alle
                    <input type="time" value={slot.end} onChange={(e) => onChange({ ...slot, end: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-1.5 text-lg" />
                  </label>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-lg">🍽️ Piatti del menu da mostrare</p>
            <div className="flex flex-wrap gap-2">
              <select value={pickDish} onChange={(e) => addDish(e.target.value)} className="min-w-[16rem] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-lg">
                <option value="">+ Aggiungi un piatto dal menu…</option>
                {sorted.filter((p) => !slot.dishIds.includes(p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({euro(p.price)})</option>
                ))}
              </select>
            </div>
            {slot.dishIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {slot.dishIds.map((id) => {
                  const p = productMap.get(id);
                  return (
                    <span key={id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-base">
                      {p ? `${p.name} · ${euro(p.price)}` : "Piatto rimosso"}
                      <button type="button" aria-label="Rimuovi piatto" onClick={() => onChange({ ...slot, dishIds: slot.dishIds.filter((x) => x !== id) })} className="font-bold text-destructive">✕</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-lg">🖼️ Immagini dedicate per questa fascia (JPG, PNG o WebP)
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block text-base" onChange={(e) => { const f = e.target.files; void addPhotos(f).finally(() => { e.target.value = ""; }); }} />
            </label>
            {slot.photos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {slot.photos.map((path) => (
                  <div key={path} className="space-y-1.5">
                    {photoUrls[path] ? <img src={photoUrls[path]} alt={slot.name || "Foto fascia"} loading="lazy" className="aspect-[9/16] w-full rounded-xl object-cover" /> : <div className="grid aspect-[9/16] w-full place-items-center rounded-xl bg-muted text-sm text-muted-foreground">Caricamento…</div>}
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => onChange({ ...slot, photos: slot.photos.filter((x) => x !== path) })}>✕ Togli</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Eliminare la fascia «${slot.name || "senza nome"}»?`)) onDelete(); }}>
              🗑️ Elimina fascia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}