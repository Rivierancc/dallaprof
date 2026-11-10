import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { salaLogin, salaLogout, salaState, salaStatus, openTab, sendComanda, markServed, setCovers, type OpenTab } from "@/lib/sala.functions";
import { euro, menuQueryOptions } from "@/lib/menu";
import { translatedFor } from "@/lib/customer";
import { gateFlags } from "@/lib/gate";
import { useTextScale } from "@/components/text-scale";
import { TEXT_SCALES } from "@/lib/text-scale";

export const Route = createFileRoute("/sala")({
  loader: () => salaStatus(),
  head: () => ({
    meta: [
      { title: "Sala camerieri — Totem Burger" },
      { name: "description", content: "Comande ai tavoli per i camerieri, con invio diretto in cucina." },
      { property: "og:title", content: "Sala camerieri — Totem Burger" },
      { property: "og:description", content: "Comande ai tavoli per i camerieri, con invio diretto in cucina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Sala,
});

type L = "IT" | "EN";
const T = {
  IT: { pick: "Chi sei?", pin: "PIN del tablet", wrong: "PIN errato", off: "La modalità ristorante non è attiva in questo locale.", none: "Nessun tablet: il ristoratore li aggiunge in Admin.", other: "+ Altro tavolo", name: "Nome del tavolo (es. Dehors 2)", people: "Persone al tavolo", open: "Apri tavolo", back: "← Tavoli", send: "Invia in cucina", sent: "Comanda inviata ✓", empty: "Tocca i piatti per aggiungerli", note: "Nota (es. ben cotto)", ready: "Piatti pronti!", served: "✓ Portato", lock: "🔒 Blocca", total: "Conto", sending: "Invio…", prev: "Già ordinato", status: { preparing: "in preparazione", ready: "PRONTO", done: "portato" } as Record<string, string> },
  EN: { pick: "Who are you?", pin: "Tablet PIN", wrong: "Wrong PIN", off: "Restaurant mode is not active here.", none: "No tablets yet: the manager adds them in Admin.", other: "+ Other table", name: "Table name (e.g. Patio 2)", people: "Guests at table", open: "Open table", back: "← Tables", send: "Send to kitchen", sent: "Order sent ✓", empty: "Tap dishes to add them", note: "Note (e.g. well done)", ready: "Dishes ready!", served: "✓ Served", lock: "🔒 Lock", total: "Bill", sending: "Sending…", prev: "Already ordered", status: { preparing: "cooking", ready: "READY", done: "served" } as Record<string, string> },
};

function useLang() {
  const [l, setL] = useState<L>("IT");
  useEffect(() => { if (localStorage.getItem("sala-lang") === "EN") setL("EN"); }, []);
  return [l, (v: L) => { localStorage.setItem("sala-lang", v); setL(v); }] as const;
}

function Sala() {
  const s = Route.useLoaderData();
  const [lang, setLang] = useLang();
  const t = T[lang];
  const Lang = <button onClick={() => setLang(lang === "IT" ? "EN" : "IT")} className="tap rounded-full bg-muted px-3 py-1 text-sm font-bold">{lang === "IT" ? "🇮🇹 IT" : "🇬🇧 EN"}</button>;
  if (!s.on) return <main className="grid min-h-screen place-items-center p-6 text-center text-2xl">{t.off}</main>;
  if (!s.me) return <Login tablets={s.tablets} t={t} lang={Lang} />;
  return <Floor me={s.me} tables={s.settings.tables} required={s.settings.table_required} t={t} lang={lang} langBtn={Lang} />;
}

function Login({ tablets, t, lang }: { tablets: { id: string; label: string; waiter: string }[]; t: typeof T.IT; lang: React.ReactNode }) {
  const router = useRouter();
  const login = useServerFn(salaLogin);
  const [id, setId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const press = async (k: string) => {
    setErr(false);
    if (k === "C") return setPin("");
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4 && id) {
      const r = await login({ data: { id, pin: next, ...gateFlags() } }).catch(() => ({ ok: false }));
      if (r.ok) router.invalidate(); else { setErr(true); setPin(""); }
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-6">
      <div className="self-end">{lang}</div>
      <h1 className="font-display text-6xl text-accent">{id ? t.pin : t.pick}</h1>
      {!id ? (
        tablets.length ? <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">{tablets.map((x) => (
          <button key={x.id} onClick={() => setId(x.id)} className="tap rounded-2xl bg-card p-5 text-left text-2xl font-bold">📱 {x.label}{x.waiter && <span className="block text-lg text-muted-foreground">{x.waiter}</span>}</button>
        ))}</div> : <p className="text-xl text-muted-foreground">{t.none}</p>
      ) : (
        <>
          <div className="flex h-16 w-60 items-center justify-center rounded-2xl bg-card font-display text-5xl tracking-[0.5em]">{"•".repeat(pin.length)}</div>
          {err && <p className="text-xl font-bold text-destructive">{t.wrong}</p>}
          <div className="grid grid-cols-3 gap-3">
            {["1","2","3","4","5","6","7","8","9","C","0","←"].map((k) => (
              <button key={k} onClick={() => k === "←" ? (setId(null), setPin("")) : press(k)} className="tap h-20 w-20 rounded-2xl bg-card font-display text-4xl">{k}</button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function Floor({ me, tables, required, t, lang, langBtn }: { me: { label: string; waiter: string }; tables: number; required: boolean; t: typeof T.IT; lang: L; langBtn: React.ReactNode }) {
  const router = useRouter();
  const logout = useServerFn(salaLogout);
  const state = useServerFn(salaState);
  const open = useServerFn(openTab);
  const { data: tabs = [] } = useQuery({ queryKey: ["sala"], queryFn: () => state(), refetchInterval: 4000 });
  const [cur, setCur] = useState<string | null>(null);
  const [ask, setAsk] = useState<string | null>(null); // tavolo da aprire
  const [people, setPeople] = useState(2);
  const [custom, setCustom] = useState("");
  const qc = useQueryClient();
  const readyCount = useRef(0);
  const { index: zoom, change: setZoom } = useTextScale();

  // Suono quando la cucina segna nuovi piatti pronti.
  const ready = tabs.reduce((n, x) => n + x.orders.filter((o) => o.status === "ready").length, 0);
  useEffect(() => {
    if (ready > readyCount.current) {
      try { const ac = new AudioContext(); [0, 0.18].forEach((d) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 1568; g.gain.setValueAtTime(0.3, ac.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d + 0.5); o.connect(g).connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.5); }); } catch { /* audio bloccato */ }
    }
    readyCount.current = ready;
  }, [ready]);

  const tab = tabs.find((x) => x.id === cur);
  const byLabel = (l: string) => tabs.find((x) => x.label === l);
  const start = async (label: string) => {
    const r = await open({ data: { label, covers: people } }).catch((e) => { alert(e.message); return null; });
    if (!r) return;
    await qc.invalidateQueries({ queryKey: ["sala"] });
    setAsk(null); setCustom(""); setCur(r.id);
  };
  const tapTable = (label: string) => { const x = byLabel(label); if (x) setCur(x.id); else { setPeople(2); setAsk(label); } };

  const badge = (
    <header className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-background/95 py-2 text-sm">
      <span className="rounded-full bg-secondary px-3 py-1 font-bold">📱 {me.label}{me.waiter && ` (${me.waiter})`}</span>
      {langBtn}
      <button onClick={() => setZoom((zoom + 1) % TEXT_SCALES.length)} aria-label="Ingrandisci il testo" className="tap rounded-full bg-muted px-3 py-1 font-bold">🔠 {TEXT_SCALES[zoom].label}</button>
      <button onClick={async () => { await logout({ data: gateFlags() }); router.invalidate(); }} className="tap ml-auto rounded-full bg-muted px-3 py-1 font-bold">{t.lock}</button>
    </header>
  );

  if (tab) return <main className="p-4">{badge}<TabView tab={tab} t={t} lang={lang} onBack={() => setCur(null)} /></main>;

  const labels = Array.from({ length: tables }, (_, i) => String(i + 1));
  const extra = tabs.filter((x) => !labels.includes(x.label)).map((x) => x.label);
  return (
    <main className="p-4">
      {badge}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {[...labels, ...extra].map((l) => {
          const x = byLabel(l);
          const isReady = x?.orders.some((o) => o.status === "ready");
          return (
            <button key={l} onClick={() => tapTable(l)} className={`tap min-h-24 rounded-2xl p-2 text-center font-bold ${isReady ? "animate-pulse bg-accent text-accent-foreground" : x ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              <span className="block font-display text-4xl leading-none">{l}</span>
              {x && <span className="block text-xs">{new Date(x.opened_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · {euro(x.total)}</span>}
              {isReady && <span className="block text-xs">🔔 {t.ready}</span>}
            </button>
          );
        })}
      </div>
      {!required && (
        <div className="mt-4 flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t.name} className="flex-1 rounded-xl bg-muted px-4 py-3 select-text" />
          <button disabled={!custom.trim()} onClick={() => tapTable(custom.trim())} className="tap rounded-xl bg-secondary px-4 font-bold disabled:opacity-50">{t.other}</button>
        </div>
      )}
      {ask && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-background/80 p-4" onClick={() => setAsk(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-5xl">{/^\d+$/.test(ask) ? `Tavolo ${ask}` : ask}</p>
            <p className="mt-3 text-lg">{t.people}</p>
            <div className="my-3 flex items-center justify-center gap-4">
              <button onClick={() => setPeople(Math.max(0, people - 1))} className="tap h-14 w-14 rounded-full bg-muted text-3xl">−</button>
              <span className="w-12 font-display text-5xl">{people}</span>
              <button onClick={() => setPeople(people + 1)} className="tap h-14 w-14 rounded-full bg-muted text-3xl">+</button>
            </div>
            <button onClick={() => start(ask)} className="tap h-14 w-full rounded-2xl bg-primary text-xl font-bold text-primary-foreground">{t.open}</button>
          </div>
        </div>
      )}
    </main>
  );
}

type Line = { productId: string; name: string; price: number; qty: number; note: string };

function TabView({ tab, t, lang, onBack }: { tab: OpenTab; t: typeof T.IT; lang: L; onBack: () => void }) {
  const { data: menu } = useQuery(menuQueryOptions);
  const send = useServerFn(sendComanda);
  const served = useServerFn(markServed);
  const covers = useServerFn(setCovers);
  const qc = useQueryClient();
  const [cat, setCat] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cats = menu?.categories ?? [];
  const active = cat ?? cats[0]?.id ?? null;
  const prods = (menu?.products ?? []).filter((p) => p.category_id === active && !p.sold_out);
  const add = (p: { id: string; name: string; price: number }) => setLines((ls) => {
    const i = ls.findIndex((l) => l.productId === p.id && !l.note);
    if (i >= 0) return ls.map((l, j) => j === i ? { ...l, qty: l.qty + 1 } : l);
    return [...ls, { productId: p.id, name: p.name, price: Number(p.price), qty: 1, note: "" }];
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sala"] });
  const go = async () => {
    setBusy(true);
    try { await send({ data: { tabId: tab.id, lines } }); setLines([]); setMsg(t.sent); refresh(); }
    catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const title = /^\d+$/.test(tab.label) ? `Tavolo ${tab.label}` : tab.label;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="tap rounded-xl bg-muted px-4 py-2 font-bold">{t.back}</button>
        <h1 className="font-display text-5xl text-accent">{title}</h1>
        <span className="flex items-center gap-1">👥
          <button onClick={() => covers({ data: { tabId: tab.id, covers: tab.covers - 1 } }).then(refresh)} className="tap h-9 w-9 rounded-full bg-muted">−</button>
          <b>{tab.covers}</b>
          <button onClick={() => covers({ data: { tabId: tab.id, covers: tab.covers + 1 } }).then(refresh)} className="tap h-9 w-9 rounded-full bg-muted">+</button>
        </span>
        <span className="ml-auto text-xl font-bold">{t.total}: {euro(tab.total)}</span>
      </div>
      {tab.orders.length > 0 && (
        <div className="mb-3 space-y-2 rounded-2xl bg-card p-3">
          <p className="text-sm text-muted-foreground">{t.prev}</p>
          {tab.orders.map((o) => (
            <div key={o.id} className={`flex flex-wrap items-center gap-2 rounded-xl p-2 ${o.status === "ready" ? "animate-pulse bg-accent text-accent-foreground" : "bg-muted"}`}>
              <span className="font-bold">{new Date(o.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="flex-1">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
              <span className="text-sm font-bold uppercase">{t.status[o.status] ?? o.status}</span>
              {o.status === "ready" && <button onClick={() => served({ data: { orderId: o.id } }).then(refresh)} className="tap rounded-xl bg-primary px-3 py-2 font-bold text-primary-foreground">{t.served}</button>}
            </div>
          ))}
        </div>
      )}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`tap shrink-0 rounded-full px-4 py-2 font-bold ${c.id === active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{translatedFor(c.name, c.name_tr, lang)}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {prods.map((p) => (
          <button key={p.id} onClick={() => add(p)} className="tap rounded-xl bg-card p-3 text-left">
            <span className="block font-bold">{p.name}</span><span className="text-sm text-muted-foreground">{euro(Number(p.price))}</span>
          </button>
        ))}
      </div>
      <div className="sticky bottom-0 mt-4 rounded-2xl bg-card p-3 shadow-lg">
        {lines.length === 0 ? <p className="text-center text-muted-foreground">{msg || t.empty}</p> : lines.map((l, i) => (
          <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
            <button onClick={() => setLines(lines.flatMap((x, j) => j !== i ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []))} className="tap h-9 w-9 rounded-full bg-muted">−</button>
            <b>{l.qty}×</b><span className="flex-1">{l.name}</span>
            <input value={l.note} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} placeholder={t.note} className="w-full rounded-lg bg-muted px-3 py-1 text-sm select-text sm:w-48" />
          </div>
        ))}
        <button disabled={!lines.length || busy} onClick={go} className="tap mt-2 h-14 w-full rounded-2xl bg-primary text-xl font-bold text-primary-foreground disabled:opacity-50">
          {busy ? t.sending : `${t.send}${lines.length ? ` · ${euro(lines.reduce((s, l) => s + l.price * l.qty, 0))}` : ""}`}
        </button>
      </div>
    </section>
  );
}
