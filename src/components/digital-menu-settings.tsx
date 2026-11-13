import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { saveBanner } from "@/lib/menu.functions";
import { bannerQueryOptions } from "@/components/display-banner";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";

/** Admin: il menu digitale per il sito mostra o nasconde i prezzi (salvato con le impostazioni condivise). */
export function DigitalMenuSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [show, setShow] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [url, setUrl] = useState("");
  const [site, setSite] = useState<string | null>(null);
  useEffect(() => { if (site === null && saved) setSite(String(saved["website_url"] ?? "")); }, [saved, site]);
  useEffect(() => { if (show === null && saved) setShow(saved["digital_prices"] !== false); }, [saved, show]);
  useEffect(() => {
    const seg = window.location.pathname.split("/").filter(Boolean)[0];
    setUrl(`${window.location.origin}${seg && seg !== "admin" ? `/${seg}` : ""}/menu-digitale`);
  }, []);
  const [qr, setQr] = useState("");
  useEffect(() => { if (url) void QRCode.toDataURL(url, { width: 600, margin: 2 }).then(setQr); }, [url]);
  if (show === null || site === null || !saved) return null;
  const saveSite = async () => {
    setMsg("Salvo…");
    try { await saveBanner({ data: { settings: { ...saved, website_url: site.trim() } } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Sito salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore"); }
  };
  const print = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>Menu digitale</h1><img src="${qr}" style="width:360px"/><p style="font-size:22px">Inquadra per consultare il nostro menu</p><p>${url}</p><script>onload=()=>print()</script></body></html>`);
    w.document.close();
  };
  const save = async (v: boolean) => {
    setShow(v); setMsg("Salvo…");
    try { await saveBanner({ data: { settings: { ...saved, digital_prices: v } } }); await qc.invalidateQueries({ queryKey: ["banner"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore"); }
  };
  return <div className="space-y-4 text-2xl">
    <label className="flex items-center gap-4"><input type="checkbox" className="h-8 w-8" checked={show} onChange={(e) => save(e.target.checked)} /> Mostra i prezzi nel menu digitale</label>
    <div className="space-y-2">
      <p>Sito web del locale <span className="text-muted-foreground">(per il tasto «← Torna al sito»; lascia vuoto se non hai un sito)</span></p>
      <div className="flex flex-wrap gap-3"><input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://www.tuosito.it" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2" /><Button onClick={saveSite}>Salva sito</Button></div>
    </div>
    <p className="text-muted-foreground">Indirizzo da mettere sul sito o nel QR code: <b className="break-all text-foreground">{url}</b></p>
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(url); setMsg("Indirizzo copiato ✓"); }}>📋 Copia indirizzo</Button>
      <Button asChild variant="secondary"><a href={url} target="_blank" rel="noreferrer">↗ Apri menu digitale</a></Button>
    </div>
    {qr && <div className="flex flex-wrap items-center gap-6"><img src={qr} alt="QR code del menu digitale" className="h-56 w-56 rounded-lg bg-background" />
      <div className="flex flex-col gap-3"><Button asChild variant="secondary"><a href={qr} download="qr-menu-digitale.png">⬇️ Scarica QR Code</a></Button><Button variant="secondary" onClick={print}>🖨️ Stampa QR Code</Button></div></div>}
    {msg && <p>{msg}</p>}
  </div>;
}
