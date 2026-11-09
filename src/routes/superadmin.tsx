import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getLicense, masterLogin, masterLogout, masterStatus, saveLicense, type LicenseRow } from "@/lib/license.functions";
import { PLANS } from "@/lib/license";
import { gateFlags } from "@/lib/gate";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/superadmin")({
  loader: () => masterStatus(),
  head: () => ({ meta: [
    { title: "Licenza — area riservata" }, { name: "description", content: "Area riservata al fornitore del software." },
    { property: "og:title", content: "Licenza — area riservata" }, { property: "og:description", content: "Area riservata al fornitore del software." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: SuperAdmin,
});

const input = "w-full rounded-xl border border-border bg-background px-4 py-3 text-xl";

function SuperAdmin() {
  const st = Route.useLoaderData();
  return st.unlocked ? <LicensePanel /> : <Login configured={st.configured} />;
}

function Login({ configured }: { configured: boolean }) {
  const router = useRouter();
  const login = useServerFn(masterLogin);
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const r = await login({ data: configured ? { password: pw, ...gateFlags() } : { password: "", newPassword: pw, ...gateFlags() } }).catch(() => ({ ok: false, reason: "Errore" }));
    if (r.ok) router.invalidate(); else setErr(r.reason);
  };
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
    <h1 className="font-display text-6xl text-accent">Area riservata</h1>
    <p className="text-lg text-muted-foreground">{configured ? "Inserisci la password Master." : "Prima volta: scegli la password Master (almeno 8 caratteri). Devi essere già entrato in Admin con il PIN del personale su questo dispositivo."}</p>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="password" autoComplete={configured ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} className={input} aria-label="Password Master" />
      {err && <p className="text-lg text-destructive">{err}</p>}
      <Button type="submit" className="h-14 text-xl">{configured ? "Entra" : "Imposta password"}</Button>
    </form>
  </main>;
}

function LicensePanel() {
  const router = useRouter(); const qc = useQueryClient();
  const load = useServerFn(getLicense); const save = useServerFn(saveLicense);
  const logout = useServerFn(masterLogout); const login = useServerFn(masterLogin);
  const { data } = useQuery({ queryKey: ["license-full"], queryFn: () => load() });
  const [d, setD] = useState<LicenseRow | null>(null);
  const [msg, setMsg] = useState(""); const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState("");
  if (!d && data) setD(data);
  if (!d) return <main className="p-10 text-2xl">Caricamento…</main>;
  const set = (k: keyof LicenseRow, v: unknown) => setD({ ...d, [k]: v } as LicenseRow);
  const text = (k: keyof LicenseRow, label: string, req = false) => <label className="flex flex-col gap-1 text-lg">
    <span>{label}{req && " *"}</span><input value={String(d[k] ?? "")} onChange={(e) => set(k, e.target.value)} className={input} />
  </label>;
  const doSave = async () => {
    setMsg("");
    try { await save({ data: d }); setMsg("✅ Salvato"); qc.invalidateQueries({ queryKey: ["license"] }); }
    catch (e) { setMsg("⚠️ " + (e instanceof Error ? e.message : "Errore")); }
  };
  const changePw = async () => {
    const r = await login({ data: { password: oldPw, newPassword: newPw, ...gateFlags() } });
    setMsg(r.ok ? "✅ Password Master cambiata" : "⚠️ " + r.reason); if (r.ok) { setOldPw(""); setNewPw(""); }
  };
  return <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 pb-24">
    <div className="flex items-center justify-between gap-4">
      <h1 className="font-display text-6xl text-accent">Licenza del locale</h1>
      <Button variant="secondary" onClick={async () => { await logout({ data: gateFlags() }); router.invalidate(); }}>Esci</Button>
    </div>

    <section className="grid gap-4 rounded-2xl bg-card p-5">
      <h2 className="font-display text-4xl">Stato e piano</h2>
      {text("business_name", "Nome del locale / insegna", true)}
      {text("owner_email", "Email del titolare", true)}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-lg">Stato licenza *
          <select value={d.status} onChange={(e) => set("status", e.target.value)} className={input}>
            <option value="demo">In prova (demo)</option><option value="active">Attivo (abbonamento)</option><option value="expired">Scaduto</option>
          </select></label>
        <label className="flex flex-col gap-1 text-lg">Tipo di piano *
          <select value={d.plan} onChange={(e) => set("plan", e.target.value)} className={input}>
            {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-lg">Data di scadenza
          <input type="date" value={d.expires_at ?? ""} onChange={(e) => set("expires_at", e.target.value || null)} className={input} /></label>
      </div>
      <p className="text-muted-foreground">Superata la data di scadenza il locale passa automaticamente a «Scaduto».</p>
    </section>

    <section className="grid gap-4 rounded-2xl bg-card p-5">
      <h2 className="font-display text-4xl">Regole della demo</h2>
      <label className="flex flex-col gap-1 text-lg">Numero massimo di piatti
        <input type="number" min={0} value={d.demo.max_products} onChange={(e) => set("demo", { ...d.demo, max_products: Number(e.target.value) })} className={input} /></label>
      <label className="flex flex-col gap-1 text-lg">Ordini al totem
        <select value={d.demo.orders} onChange={(e) => set("demo", { ...d.demo, orders: e.target.value })} className={input}>
          <option value="simulate">Solo simulazione (non arrivano in cassa)</option><option value="real">Ordini reali consentiti</option>
        </select></label>
      <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="size-6" checked={d.demo.badge} onChange={(e) => set("demo", { ...d.demo, badge: e.target.checked })} /> Mostra la scritta «Modalità dimostrativa» sul totem</label>
    </section>

    <section className="grid gap-4 rounded-2xl bg-card p-5">
      <h2 className="font-display text-4xl">Dati per fattura (facoltativi)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("company_name", "Ragione sociale")}{text("vat", "Partita IVA / Codice fiscale")}
        {text("address", "Indirizzo")}{text("city", "Città")}
        {text("sdi", "Codice univoco SDI")}{text("pec", "PEC")}
        {text("phone", "Cellulare / WhatsApp")}
      </div>
      <label className="flex flex-col gap-1 text-lg">Note interne
        <textarea rows={4} value={d.notes} onChange={(e) => set("notes", e.target.value)} className={input} /></label>
    </section>

    <div className="sticky bottom-4 flex items-center gap-4">
      <Button onClick={doSave} className="h-16 px-10 font-display text-3xl">Salva</Button>
      {msg && <span className="rounded-xl bg-card px-4 py-2 text-lg">{msg}</span>}
    </div>

    <section className="grid gap-4 rounded-2xl bg-card p-5">
      <h2 className="font-display text-4xl">Cambia password Master</h2>
      <input type="password" placeholder="Password attuale" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className={input} autoComplete="current-password" />
      <input type="password" placeholder="Nuova password (min. 8)" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={input} autoComplete="new-password" />
      <Button variant="secondary" onClick={changePw}>Cambia password</Button>
    </section>
  </main>;
}
