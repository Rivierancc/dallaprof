// Stampa diretta su Epson TM-m30III (ePOS-Print) dal browser della cassa, in rete locale.
import { itemNotes, type Order } from "@/lib/menu";

const KEY = "epson-printer";
export type PrinterCfg = { ip: string; https: boolean; auto: boolean };

export const loadPrinter = (): PrinterCfg => {
  try {
    return { ip: "", https: true, auto: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ip: "", https: true, auto: true };
  }
};
export const savePrinter = (c: PrinterCfg) => localStorage.setItem(KEY, JSON.stringify(c));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function ticketXml(o: Order) {
  const t = (s: string, attrs = "") => `<text${attrs}>${esc(s)}&#10;</text>`;
  const time = new Date(o.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const lines = o.items
    .map((i) => {
      const notes = itemNotes(i).map((n) => t(`    ${n}`, ' width="1" height="1" em="false"')).join("");
      return t(`${i.qty} x ${i.name}`, ' width="1" height="2" em="true"') + notes;
    })
    .join("");
  return `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
<text lang="it" smooth="true" align="center"/>
${t("COMANDA CUCINA", ' width="2" height="1" em="true"')}
${t(String(o.order_number).padStart(2, "0"), ' width="6" height="6" em="true"')}
${t(`${o.dine_option === "qui" ? "MANGIA QUI" : "ASPORTO"}  -  ${time}`, ' width="1" height="1" em="true"')}
<feed line="1"/>
<text align="left"/>
${lines}
<feed line="3"/>
<cut type="feed"/>
</epos-print>`;
}

export async function printTicket(cfg: PrinterCfg, o: Order) {
  if (!cfg.ip) throw new Error("Stampante non impostata");
  const url = `${cfg.https ? "https" : "http"}://${cfg.ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;
  const body = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${ticketXml(o)}</s:Body></s:Envelope>`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' },
    body,
  });
  const txt = await r.text();
  if (!/success="true"/.test(txt)) throw new Error("La stampante non ha risposto");
}
