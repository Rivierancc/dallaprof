import { useEffect, useRef, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Save } from "lucide-react";
import { getCompany, saveCompany, uploadCompanyLogo } from "@/lib/menu.functions";
import { Button } from "@/components/ui/button";

const companyQuery = queryOptions({ queryKey: ["company"], queryFn: () => getCompany(), staleTime: 10_000, refetchInterval: 20_000 });

export function CompanyIdentity() {
  const { data } = useQuery(companyQuery);
  if (!data || (!data.logo && !data.description)) return null;
  return <section aria-label="Azienda" className="mb-6 flex flex-col items-center gap-4 [@media(max-height:900px)]:mb-3 [@media(max-height:900px)]:gap-2">
    {data.logo && <img src={data.logo} alt="Logo azienda" className="h-40 w-full max-w-96 object-contain [@media(max-height:900px)]:h-20" />}
    {data.description && <p className="max-w-3xl whitespace-pre-wrap break-words text-center text-2xl leading-snug text-foreground [@media(max-height:900px)]:text-lg">{data.description}</p>}
  </section>;
}

export function CompanySettings() {
  const { data, isLoading, error } = useQuery(companyQuery);
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ description: string; logoPath: string; logo: string } | null>(null);
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
      await saveCompany({ data: { description: draft.description, logoPath } });
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
  return <div className="space-y-5">
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Carica logo azienda" hidden disabled={busy} onChange={(e) => { const image = e.target.files?.[0]; if (image) void selectLogo(image); e.target.value = ""; }} />
    {draft.logo && <img src={draft.logo} alt="Anteprima logo azienda" className="h-40 w-full max-w-96 object-contain" />}
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus />{draft.logo ? "Cambia logo" : "Carica logo"}</Button>
      {draft.logo && <Button variant="outline" disabled={busy} onClick={() => { setFile(null); setDraft({ ...draft, logoPath: "", logo: "" }); setMessage(""); }}><Trash2 />Rimuovi logo</Button>}
    </div>
    <label className="block space-y-2 text-xl">
      <span>Descrizione azienda</span>
      <textarea rows={4} maxLength={500} disabled={busy} value={draft.description} onChange={(e) => { setDraft({ ...draft, description: e.target.value }); setMessage(""); }} className="w-full select-text rounded-lg border border-border bg-muted p-3 text-xl text-foreground" />
    </label>
    <div className="flex flex-wrap items-center gap-4"><Button disabled={busy} onClick={() => void save()}><Save />{busy ? "Salvo…" : "Salva logo e descrizione"}</Button>{message && <span role="status" className="text-xl">{message}</span>}</div>
  </div>;
}