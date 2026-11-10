import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SuperManual } from "@/components/super-manual";
import { createVenue, getLicense, listVenues, masterLogin, resetVenuePin, masterLogout, masterStatus, saveLicense, type LicenseRow } from "@/lib/license.functions";
import { MODES, PLANS, cleanMode } from "@/lib/license";
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

const input = "superadmin-field w-full rounded-xl border px-4 py-3 text-xl";

function PwInput({ value, onChange, placeholder, auto }: { value: string; onChange: (v: string) => void; placeholder: string; auto: string }) {
  const [show, setShow] = useState(false);
  return <div className="relative">
    <input type={show ? "text" : "password"} autoComplete={auto} placeholder={placeholder} aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={input + " pr-16"} />
    <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Nascondi password" : "Mostra password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-2xl">{show ? "🙈" : "👁️"}</button>
  </div>;
}
function pwCheck(pw: string, again: string) {
  if (pw.length < 8) return "La password deve avere almeno 8 caratteri";
  if (pw !== again) return "Le due password non coincidono";
  return "";
}

const isExpired = (e: unknown) => e instanceof Error && e.message.startsWith("Accesso scaduto");

function SuperAdmin() {
  const st = Route.useLoaderData();
  return st.unlocked ? <Venues /> : <Login configured={st.configured} />;
}

function Login({ configured }: { configured: boolean }) {
  const router = useRouter();
  const login = useServerFn(masterLogin);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [forgot, setForgot] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!configured) { const c = pwCheck(pw, pw2); if (c) return setErr(c); }
    const r = await login({ data: configured ? { password: pw, ...gateFlags() } : { password: "", newPassword: pw, ...gateFlags() } }).catch(() => ({ ok: false, reason: "Errore" }));
    if (r.ok) router.invalidate(); else setErr(r.reason);
  };
  return <div className="superadmin-page"><main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
    <h1 className="font-display text-6xl text-accent">Area riservata</h1>
    <p className="text-lg text-muted-foreground">{configured ? "Inserisci la password Master." : "Prima volta: scegli la password Master (almeno 8 caratteri). Devi essere già entrato in Admin con il PIN del personale su questo dispositivo."}</p>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PwInput value={pw} onChange={setPw} placeholder="Password Master" auto={configured ? "current-password" : "new-password"} />
      {!configured && <PwInput value={pw2} onChange={setPw2} placeholder="Ripeti la password" auto="new-password" />}
      {!configured && pw2 && <p className="text-lg">{pw === pw2 ? "✅ Le password coincidono" : "❌ Le password non coincidono"}</p>}
      {err && <p className="text-lg text-destructive">{err}</p>}
      <Button type="submit" className="h-14 text-xl">{configured ? "Entra" : "Imposta password"}</Button>
    </form>
    {configured && <button type="button" onClick={() => setForgot(!forgot)} className="text-lg underline">Password dimenticata?</button>}
    {forgot && <p className="rounded-xl bg-card p-4 text-lg">Il recupero via email sarà attivo appena collegato un indirizzo email di invio. Nel frattempo contatta l'assistenza tecnica per reimpostarla.</p>}
  </main></div>;
}

const STATUS: Record<string, [string, string]> = { active: ["Attivo", "bg-green-600"], demo: ["In prova", "bg-yellow-500"], expired: ["Scaduto", "bg-red-600"] };
const PAGES: [string, string][] = [["", "Totem"], ["/cucina", "Cucina"], ["/cassa", "Cassa"], ["/display", "Tabellone"], ["/menu", "Menu"], ["/admin", "Admin"]];

function Venues() {
  const router = useRouter();
  const list = useServerFn(listVenues); const logout = useServerFn(masterLogout);
  const { data, refetch, error } = useQuery({ queryKey: ["venues"], queryFn: () => list(), retry: false });
  if (isExpired(error)) void router.invalidate();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [manual, setManual] = useState(false);
  if (manual) return <SuperManual onBack={() => setManual(false)} />;
  if (pwOpen) return <MasterPassword onBack={() => setPwOpen(false)} />;
  if (open) return <LicensePanel venueId={open} onBack={() => { setOpen(null); void refetch(); }} />;
  return <div className="superadmin-page"><main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-24">
    <div className="flex items-center justify-between gap-4">
      <h1 className="font-display text-6xl text-accent">I tuoi locali</h1>
      <Button variant="secondary" onClick={async () => { await logout({ data: gateFlags() }); router.invalidate(); }}>Esci</Button>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => setAdding(!adding)} className="h-14 px-8 text-xl">{adding ? "Chiudi" : "+ Nuovo locale"}</Button>
      <Button variant="secondary" onClick={() => setPwOpen(true)} className="h-14 px-8 text-xl">🔑 La mia password</Button>
      <Button variant="secondary" onClick={() => setManual(true)} className="h-14 px-8 text-xl">📖 Manuale fornitore</Button>
    </div>
    {adding && <NewVenue onDone={(id) => { setAdding(false); void refetch(); setOpen(id); }} />}
    {!data ? <p className="text-xl">Caricamento…</p> : <div className="grid gap-3">
      {data.map((v) => { const [label, color] = STATUS[v.status] ?? STATUS["expired"]!; return (
        <div key={v.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-bold text-black ${color}`}>{label}</span>
            <span className="font-display text-3xl">{v.name}</span>
            <span className="text-muted-foreground">/{v.slug}</span>
            <span className="ml-auto text-muted-foreground"><span className="mr-2 rounded bg-secondary px-2">{MODES[cleanMode(v.mode)]}</span><span className={v.plan === "perpetua" ? "rounded bg-blue-600 px-2 text-white" : ""}>{PLANS[v.plan as keyof typeof PLANS] ?? v.plan}</span>{v.expires_at ? ` · scade il ${new Date(v.expires_at).toLocaleDateString("it-IT")}` : ""}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAGES.filter(([p]) => cleanMode(v.mode) !== "restaurant" || (p !== "" && p !== "/display")).map(([p, l]) => <a key={l} href={`/${v.slug}${p}`} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1 text-base">{l} ↗</a>)}
            <Button size="sm" className="ml-auto" onClick={() => setOpen(v.id)}>Licenza e dati</Button>
          </div>
        </div>); })}
    </div>}
  </main></div>;
}

function NewVenue({ onDone }: { onDone: (id: string) => void }) {
  const router = useRouter();
  const create = useServerFn(createVenue);
  const [f, setF] = useState({ name: "", slug: "", email: "", pin: "", status: "demo", plan: "prova", expires_at: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((o) => ({ ...o, [k]: v, ...(k === "name" && !o.slug ? {} : {}) }));
  const auto = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 40);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { const r = await create({ data: { ...f, expires_at: f.expires_at || null } }); onDone(r.id); }
    catch (e) { if (isExpired(e)) { await router.invalidate(); return; } setErr(e instanceof Error ? e.message : "Errore"); }
    finally { setBusy(false); }
  };
  const field = (k: keyof typeof f, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label className="flex flex-col gap-1 text-lg">{label}
    <input value={f[k]} onChange={(e) => k === "name" ? setF((o) => ({ ...o, name: e.target.value, slug: o.slug && o.slug !== auto(o.name) ? o.slug : auto(e.target.value) })) : set(k, e.target.value)} className={input} {...extra} /></label>;
  return <section className="grid gap-4 rounded-2xl bg-card p-5">
    <h2 className="font-display text-4xl">Nuovo locale</h2>
    {field("name", "Nome del locale *")}
    {field("slug", "Nome breve per il link * (solo lettere minuscole, numeri, trattini)")}
    {f.slug && <p className="text-muted-foreground">Totem: {typeof window !== "undefined" ? window.location.origin : ""}/{f.slug}</p>}
    {field("email", "Email del titolare *", { type: "email" })}
    {field("pin", "PIN del personale * (4–12 cifre, il titolare potrà cambiarlo)", { inputMode: "numeric" })}
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-lg">Stato
        <select value={f.status} onChange={(e) => set("status", e.target.value)} className={input}>
          <option value="demo">In prova (demo)</option><option value="active">Attivo</option><option value="expired">Scaduto</option></select></label>
      <label className="flex flex-col gap-1 text-lg">Piano
        <select value={f.plan} onChange={(e) => set("plan", e.target.value)} className={input}>
          {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      {field("expires_at", "Scadenza", { type: "date" })}
    </div>
    {err && <p className="text-lg text-destructive">⚠️ {err}</p>}
    <Button disabled={busy} onClick={submit} className="h-14 text-xl">{busy ? "Creazione…" : "Crea locale"}</Button>
  </section>;
}

function LicensePanel({ venueId, onBack }: { venueId: string; onBack: () => void }) {
  const router = useRouter(); const qc = useQueryClient();
  const load = useServerFn(getLicense); const save = useServerFn(saveLicense);
  const logout = useServerFn(masterLogout);
  const { data } = useQuery({ queryKey: ["license-full", venueId], queryFn: () => load({ data: { venueId } }) });
  const [d, setD] = useState<LicenseRow | null>(null);
  const [msg, setMsg] = useState("");
  if (!d && data) setD(data);
  if (!d) return <div className="superadmin-page"><main className="p-10 text-2xl">Caricamento…</main></div>;
  const set = (k: keyof LicenseRow, v: unknown) => setD((o) => ({ ...(o ?? d), [k]: v } as LicenseRow));
  const text = (k: keyof LicenseRow, label: string, req = false) => <label className="flex flex-col gap-1 text-lg">
    <span>{label}{req && " *"}</span><input value={String(d[k] ?? "")} onChange={(e) => set(k, e.target.value)} className={input} />
  </label>;
  const doSave = async () => {
    setMsg("");
    try { await save({ data: { ...d, venueId } }); setMsg("✅ Salvato"); qc.invalidateQueries({ queryKey: ["license"] }); }
    catch (e) { if (isExpired(e)) { await router.invalidate(); return; } setMsg("⚠️ " + (e instanceof Error ? e.message : "Errore")); }
  };
  return <div className="superadmin-page"><main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 pb-24">
    <div className="flex items-center justify-between gap-4">
      <h1 className="font-display text-6xl text-accent">Licenza del locale</h1>
      <div className="flex gap-2"><Button variant="secondary" onClick={onBack}>← Elenco locali</Button>
      <Button variant="secondary" onClick={async () => { await logout({ data: gateFlags() }); router.invalidate(); }}>Esci</Button></div>
    </div>

    <section className="grid gap-4 rounded-2xl bg-card p-5">
      <h2 className="font-display text-4xl">Stato e piano</h2>
      {text("business_name", "Nome del locale / insegna", true)}
      {text("owner_email", "Email del titolare", true)}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-lg">Stato licenza *
          <select value={d.status} onChange={(e) => set("status", e.target.value)} className={input}>
            <option value="demo">In prova (demo)</option><option value="active">Attivo (abbonamento)</option><option value="expired" disabled={d.plan === "perpetua"}>Scaduto{d.plan === "perpetua" ? " (non con Perpetua)" : ""}</option>
          </select></label>
        <label className="flex flex-col gap-1 text-lg">Tipo di piano *
          <select value={d.plan} onChange={(e) => { set("plan", e.target.value); if (e.target.value === "perpetua") { set("expires_at", null); if (d.status === "expired") set("status", "active"); } }} className={input}>
            {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-lg">Data di scadenza
          <input type="date" disabled={d.plan === "perpetua"} value={d.expires_at ?? ""} onChange={(e) => set("expires_at", e.target.value || null)} className={`${input} disabled:opacity-50`} /></label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => { const t = new Date(); t.setFullYear(t.getFullYear() + 1); set("plan", "annuale"); set("expires_at", t.toISOString().slice(0, 10)); }}
          className={`rounded-xl px-5 py-3 text-lg font-bold ${d.plan === "annuale" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>📅 Annuale (scade tra 1 anno)</button>
        <button type="button" onClick={() => { set("plan", "perpetua"); set("expires_at", null); set("status", "active"); }}
          className={`rounded-xl px-5 py-3 text-lg font-bold ${d.plan === "perpetua" ? "bg-blue-600 text-white ring-4 ring-blue-300" : "bg-secondary text-secondary-foreground"}`}>♾️ Perpetua (nessuna scadenza)</button>
      </div>
      <div className="grid gap-2"><span className="text-lg">Modalità del locale (la decidi solo tu)</span>
        <div className="flex flex-wrap gap-3">{Object.entries(MODES).map(([k, v]) => (
          <button key={k} type="button" onClick={() => set("mode", k)} aria-pressed={cleanMode(d.mode) === k}
            className={`rounded-xl px-5 py-3 text-lg font-bold ${cleanMode(d.mode) === k ? "bg-primary text-primary-foreground ring-4 ring-ring" : "bg-secondary text-secondary-foreground"}`}>{v}</button>))}</div></div>
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

    <section className="grid gap-3 rounded-2xl bg-card p-5">
      <h2 className="font-display text-4xl">PIN del personale</h2>
      <p className="text-muted-foreground">Serve per entrare in Cucina, Cassa, Menu e Admin di questo locale. Il titolare può cambiarlo anche da solo.</p>
      <PinReset venueId={venueId} />
    </section>
  </main></div>;
}

function MasterPassword({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const login = useServerFn(masterLogin); const logout = useServerFn(masterLogout);
  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [newPw2, setNewPw2] = useState(""); const [msg, setMsg] = useState("");
  const changePw = async () => {
    const c = pwCheck(newPw, newPw2); if (c) return setMsg("⚠️ " + c);
    const r = await login({ data: { password: oldPw, newPassword: newPw, ...gateFlags() } }).catch(() => ({ ok: false, reason: "Errore" }));
    setMsg(r.ok ? "✅ Password cambiata" : "⚠️ " + r.reason); if (r.ok) { setOldPw(""); setNewPw(""); setNewPw2(""); }
  };
  return <div className="superadmin-page"><main className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-24">
    <div className="flex items-center justify-between gap-4">
      <h1 className="font-display text-6xl text-accent">La mia password</h1>
      <div className="flex gap-2"><Button variant="secondary" onClick={onBack}>← Elenco locali</Button>
        <Button variant="secondary" onClick={async () => { await logout({ data: gateFlags() }); router.invalidate(); }}>Esci</Button></div>
    </div>
    <section className="grid gap-4 rounded-2xl bg-card p-5">
      <p className="text-lg text-muted-foreground">È la password con cui entri in quest'area riservata. Vale per tutti i locali ed è diversa dal PIN del personale.</p>
      <PwInput value={oldPw} onChange={setOldPw} placeholder="Password attuale" auto="current-password" />
      <PwInput value={newPw} onChange={setNewPw} placeholder="Nuova password (min. 8)" auto="new-password" />
      <PwInput value={newPw2} onChange={setNewPw2} placeholder="Ripeti la nuova password" auto="new-password" />
      {newPw2 && <p className="text-lg">{newPw === newPw2 ? "✅ Le password coincidono" : "❌ Le password non coincidono"}</p>}
      <Button onClick={changePw} className="h-14 text-xl">Cambia password</Button>
      {msg && <p className="rounded-xl bg-background px-4 py-2 text-lg">{msg}</p>}
    </section>
  </main></div>;
}

function PinReset({ venueId }: { venueId: string }) {
  const router = useRouter();
  const reset = useServerFn(resetVenuePin);
  const [pin, setPin] = useState(""); const [show, setShow] = useState(false);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  return <div className="flex flex-wrap items-center gap-2">
    <input aria-label="Nuovo PIN del personale" type={show ? "text" : "password"} inputMode="numeric" maxLength={12} placeholder="Nuovo PIN"
      value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setMsg(""); }} className={`${input} w-40`} />
    <button type="button" aria-label="Mostra o nascondi PIN" onClick={() => setShow(!show)} className="text-2xl">👁️</button>
    <Button size="sm" disabled={busy || pin.length < 4} onClick={async () => {
      setBusy(true); setMsg("");
      try { await reset({ data: { venueId, pin } }); setPin(""); setMsg("✅ PIN reimpostato"); }
      catch (e) { if (isExpired(e)) { await router.invalidate(); return; } setMsg(`⚠️ ${e instanceof Error ? e.message : "Errore"}`); }
      finally { setBusy(false); }
    }}>Reimposta PIN</Button>
    {msg && <span className="text-lg">{msg}</span>}
  </div>;
}
