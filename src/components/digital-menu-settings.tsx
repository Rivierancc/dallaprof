import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { saveBanner } from "@/lib/menu.functions";
import { bannerQueryOptions } from "@/components/display-banner";
import { Button } from "@/components/ui/button";

/** Admin: il menu digitale per il sito mostra o nasconde i prezzi (salvato con le impostazioni condivise). */
export function DigitalMenuSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [show, setShow] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => { if (show === null && saved) setShow(saved["digital_prices"] !== false); }, [saved, show]);
  useEffect(() => {
    const seg = window.location.pathname.split("/").filter(Boolean)[0];
    setUrl(`${window.location.origin}${seg && seg !== "admin" ? `/${seg}` : ""}/menu-digitale`);
  }, []);
  if (show === null || !saved) return null;
  const save = async (v: boolean) => {
    setShow(v); setMsg("Salvo…");
    try { await saveBanner({ data: { settings: { ...saved, digital_prices: v } } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore"); }
  };
  return <div className="space-y-4 text-2xl">
    <label className="flex items-center gap-4"><input type="checkbox" className="h-8 w-8" checked={show} onChange={(e) => save(e.target.checked)} /> Mostra i prezzi nel menu digitale</label>
    <p className="text-muted-foreground">Indirizzo da mettere sul sito o nel QR code: <b className="break-all text-foreground">{url}</b></p>
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(url); setMsg("Indirizzo copiato ✓"); }}>📋 Copia indirizzo</Button>
      <Button asChild variant="secondary"><a href={url} target="_blank" rel="noreferrer">↗ Apri menu digitale</a></Button>
    </div>
    {msg && <p>{msg}</p>}
  </div>;
}
