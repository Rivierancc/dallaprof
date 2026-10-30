import { useEffect, useId, useRef, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Save, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Circle, Heart, Image, RotateCcw } from "lucide-react";
import { getCompany, saveCompany, uploadCompanyLogo } from "@/lib/menu.functions";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { CompanyStyle } from "@/lib/company-style";

const companyQuery = queryOptions({ queryKey: ["company"], queryFn: () => getCompany(), staleTime: 10_000, refetchInterval: 20_000 });
type Company = Awaited<ReturnType<typeof getCompany>>;
const logoSizes = ["w-40", "w-56", "w-80", "w-[25rem]", "w-[35rem]", "w-[45rem]"];
const textSizes = ["text-lg", "text-2xl", "text-3xl", "text-4xl"];
const textColors = { foreground: "text-foreground", accent: "text-accent", primary: "text-primary", success: "text-success", muted: "text-muted-foreground", destructive: "text-destructive" };
const alignments = { left: "text-left", center: "text-center", right: "text-right" };

function IdentityView({ company, preview = false }: { company: Company; preview?: boolean }) {
  const id = `company-heart-${useId().replace(/:/g, "")}`;
  const s = company.style;
  const shape = s.logoShape === "original" ? "aspect-[12/5]" : s.logoShape === "oval" ? "aspect-[3/2] rounded-full bg-secondary" : s.logoShape === "round" ? "aspect-square rounded-full bg-secondary" : "aspect-square bg-secondary";
  return <section aria-label={preview ? "Anteprima azienda" : "Azienda"} className="mb-6 flex w-full min-w-0 flex-col items-center gap-4 [@media(max-height:900px)]:mb-3 [@media(max-height:900px)]:gap-2">
    {s.logoShape === "heart" && <svg width="0" height="0" aria-hidden="true" className="absolute"><defs><clipPath id={id} clipPathUnits="objectBoundingBox"><path d="M.5,.96 C.4,.86 0,.57 0,.29 C0,-.03 .36,-.07 .5,.18 C.64,-.07 1,-.03 1,.29 C1,.57 .6,.86 .5,.96 Z" /></clipPath></defs></svg>}
    {company.logo && <div className={`relative overflow-hidden ${logoSizes[s.logoSize - 1]} max-w-full shrink-0 ${shape}`} style={s.logoShape === "heart" ? { clipPath: `url(#${id})` } : undefined}>
      <img src={company.logo} alt={preview ? "Anteprima logo azienda" : "Logo azienda"} draggable={false} className={`absolute inset-0 h-full w-full ${s.logoShape === "original" ? "object-contain" : "object-cover"}`} style={{ transform: `translate(${s.logoX}%, ${s.logoY}%) scale(${s.logoZoom / 100})` }} />
    </div>}
    {company.description && <p className={`w-full max-w-3xl whitespace-pre-wrap break-words leading-snug ${textSizes[s.textSize - 1]} ${textColors[s.color]} ${alignments[s.align]} ${s.bold ? "font-bold" : "font-normal"} ${s.italic ? "italic" : "not-italic"} ${s.underline ? "underline" : "no-underline"}`}>{company.description}</p>}
  </section>;
}

export function CompanyIdentity() {
  const { data } = useQuery(companyQuery);
  if (!data || (!data.logo && !data.description)) return null;
  return <IdentityView company={data} />;
}

export function CompanySettings() {
  const { data, isLoading, error } = useQuery(companyQuery);
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Company | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (data) setDraft((current) => current ?? data); }, [data]);

  const selectLogo = async (image: File) => {
    setMessage("");
    try {
      const bitmap = await createImageBitmap(image);
      const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { bitmap.close(); throw new Error("Impossibile leggere il logo"); }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const png = canvas.toDataURL("image/png");
      setFile(png);
      setDraft((d) => d ? { ...d, logo: png } : d);
    } catch { setMessage("Impossibile aprire questa immagine: scegli un logo PNG, JPG o WebP."); }
  };

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const logoPath = file ? (await uploadCompanyLogo({ data: { file } })).path : draft.logoPath;
      await saveCompany({ data: { description: draft.description, logoPath, style: draft.style } });
      await qc.invalidateQueries({ queryKey: ["company"] });
      const saved = await qc.fetchQuery(companyQuery);
      setDraft(saved);
      setFile(null);
      setMessage("Logo e descrizione salvati ✓");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Salvataggio non riuscito"); }
    finally { setBusy(false); }
  };

  if (error) return <p role="alert">Impossibile caricare logo e descrizione.</p>;
  if (isLoading || !draft) return <p className="text-muted-foreground">Caricamento…</p>;
  const setStyle = (patch: Partial<CompanyStyle>) => { setDraft({ ...draft, style: { ...draft.style, ...patch } }); setMessage(""); };
  const sizes = ["Piccolo", "Medio", "Grande", "Molto grande", "Enorme", "Grandissimo"];
  return <div className="space-y-5">
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Carica logo azienda" hidden disabled={busy} onChange={(e) => { const image = e.target.files?.[0]; if (image) void selectLogo(image); e.target.value = ""; }} />
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus />{draft.logo ? "Cambia logo" : "Carica logo"}</Button>
      {draft.logo && <Button variant="outline" disabled={busy} onClick={() => { setFile(null); setDraft({ ...draft, logoPath: "", logo: "" }); setMessage(""); }}><Trash2 />Rimuovi logo</Button>}
    </div>
    <div className="space-y-3">
      <p className="text-xl">Dimensione logo: {sizes[draft.style.logoSize - 1]}</p>
      <Slider aria-label="Dimensione logo" min={1} max={6} step={1} value={[draft.style.logoSize]} disabled={busy} onValueChange={([logoSize]) => { if (logoSize !== undefined) setStyle({ logoSize }); }} className="max-w-md py-4" />
      <p className="text-xl">Forma logo</p>
      <div className="flex flex-wrap gap-2">{([
        ["original", "Originale", Image], ["round", "Tonda", Circle], ["oval", "Ovale", Circle], ["heart", "Cuore", Heart],
      ] as const).map(([logoShape, label, Icon]) => <Button key={logoShape} disabled={busy} variant={draft.style.logoShape === logoShape ? "default" : "secondary"} aria-pressed={draft.style.logoShape === logoShape} onClick={() => setStyle({ logoShape })}><Icon className={logoShape === "oval" ? "scale-x-125" : ""} />{label}</Button>)}</div>
      {draft.logo && <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xl">Logo dentro la forma</p>
        <p>Ingrandimento: {draft.style.logoZoom}%</p>
        <Slider aria-label="Ingrandimento dentro la forma" min={50} max={250} step={5} value={[draft.style.logoZoom]} disabled={busy} onValueChange={([logoZoom]) => { if (logoZoom !== undefined) setStyle({ logoZoom }); }} className="max-w-md py-4" />
        <p>Posizione orizzontale: {draft.style.logoX === 0 ? "Centro" : `${Math.abs(draft.style.logoX)}% ${draft.style.logoX < 0 ? "a sinistra" : "a destra"}`}</p>
        <Slider aria-label="Posizione orizzontale logo" min={-50} max={50} step={1} value={[draft.style.logoX]} disabled={busy} onValueChange={([logoX]) => { if (logoX !== undefined) setStyle({ logoX }); }} className="max-w-md py-4" />
        <p>Posizione verticale: {draft.style.logoY === 0 ? "Centro" : `${Math.abs(draft.style.logoY)}% ${draft.style.logoY < 0 ? "in alto" : "in basso"}`}</p>
        <Slider aria-label="Posizione verticale logo" min={-50} max={50} step={1} value={[draft.style.logoY]} disabled={busy} onValueChange={([logoY]) => { if (logoY !== undefined) setStyle({ logoY }); }} className="max-w-md py-4" />
        <Button variant="outline" disabled={busy} onClick={() => setStyle({ logoZoom: 100, logoX: 0, logoY: 0 })}><RotateCcw />Ripristina posizione e ingrandimento</Button>
      </div>}
    </div>
    <label className="block space-y-2 text-xl">
      <span>Descrizione azienda</span>
      <textarea rows={4} maxLength={500} disabled={busy} value={draft.description} onChange={(e) => { setDraft({ ...draft, description: e.target.value }); setMessage(""); }} className="w-full select-text rounded-lg border border-border bg-muted p-3 text-xl text-foreground" />
    </label>
    <div className="space-y-3">
      <p className="text-xl">Dimensione descrizione: {sizes[draft.style.textSize - 1]}</p>
      <Slider aria-label="Dimensione descrizione" min={1} max={4} step={1} value={[draft.style.textSize]} disabled={busy} onValueChange={([textSize]) => { if (textSize !== undefined) setStyle({ textSize }); }} className="max-w-md py-4" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Formato descrizione">
        {([["bold", "Grassetto", Bold], ["italic", "Corsivo", Italic], ["underline", "Sottolineato", Underline]] as const).map(([key, label, Icon]) => <Button key={key} size="icon" title={label} aria-label={label} aria-pressed={draft.style[key]} disabled={busy} variant={draft.style[key] ? "default" : "secondary"} onClick={() => setStyle({ [key]: !draft.style[key] })}><Icon /></Button>)}
        {([["left", "Allinea a sinistra", AlignLeft], ["center", "Allinea al centro", AlignCenter], ["right", "Allinea a destra", AlignRight]] as const).map(([align, label, Icon]) => <Button key={align} size="icon" title={label} aria-label={label} aria-pressed={draft.style.align === align} disabled={busy} variant={draft.style.align === align ? "default" : "secondary"} onClick={() => setStyle({ align })}><Icon /></Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xl">Colore testo</span>{([["foreground", "Chiaro"], ["accent", "Giallo"], ["primary", "Rosso"], ["success", "Verde"], ["muted", "Grigio"], ["destructive", "Rosso scuro"]] as const).map(([color, label]) => <Button key={color} size="icon" title={label} aria-label={`Testo ${label.toLowerCase()}`} aria-pressed={draft.style.color === color} disabled={busy} variant={draft.style.color === color ? "default" : "outline"} onClick={() => setStyle({ color })}><Circle className={`fill-current ${textColors[color]}`} /></Button>)}</div>
    </div>
    {(draft.logo || draft.description) && <div className="border-t border-border pt-4"><p className="mb-4 text-xl text-muted-foreground">Anteprima</p><IdentityView company={draft} preview /></div>}
    <div className="flex flex-wrap items-center gap-4"><Button disabled={busy} onClick={() => void save()}><Save />{busy ? "Salvo…" : "Salva logo e descrizione"}</Button>{message && <span role="status" className="text-xl">{message}</span>}</div>
  </div>;
}