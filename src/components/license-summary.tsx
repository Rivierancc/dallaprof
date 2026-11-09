import { useQuery } from "@tanstack/react-query";
import { licenseQueryOptions, PLANS } from "@/lib/license";

const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT") : "");

/** Riepilogo in sola lettura per il ristoratore: nessun comando per cambiare piano. */
export function LicenseSummary() {
  const { data: l } = useQuery(licenseQueryOptions);
  if (!l) return null;
  const plan = PLANS[l.plan as keyof typeof PLANS] ?? l.plan;
  const text = l.state === "expired" ? `Licenza scaduta${l.expires_at ? ` il ${fmt(l.expires_at)}` : ""}: il totem non accetta ordini. Contatta il fornitore per il rinnovo.`
    : l.state === "demo" ? `Versione di prova — massimo ${l.demo.max_products} piatti, ordini ${l.demo.orders === "real" ? "reali" : "solo simulati"}${l.expires_at ? `. Scadenza: ${fmt(l.expires_at)}` : ""}`
    : `Piano ${plan} attivo${l.expires_at ? ` — scadenza ${fmt(l.expires_at)}` : ""}`;
  return <p className={`mb-6 rounded-2xl p-4 text-xl ${l.state === "expired" ? "bg-destructive text-destructive-foreground" : "bg-card"}`}>🔑 {text}</p>;
}
