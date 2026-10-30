import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { themesQueryOptions } from "@/components/theme-layer";
import { deleteTheme, saveTheme } from "@/lib/menu.functions";
import { decorList, parseDayMonth, pickTheme, showDayMonth, type KioskTheme } from "@/lib/themes";

const blank: KioskTheme = {
  id: "", name: "", mode: "off", start_md: "", end_md: "", bg: "#1a1410", primary_color: "#e0432b", accent: "#f5c842",
  decor: "", anim: "fall", greeting: "", greeting_en: "", greeting_fr: "", greeting_es: "", position: 99,
};
const field = "tap rounded-xl bg-background px-3 py-2 text-xl";

function ThemeCard({ theme, live, onDone }: { theme: KioskTheme; live: boolean; onDone: () => void }) {
  const save = useServerFn(saveTheme);
  const remove = useServerFn(deleteTheme);
  const [d, setD] = useState(theme);
  const [from, setFrom] = useState(showDayMonth(theme.start_md));
  const [to, setTo] = useState(showDayMonth(theme.end_md));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setD(theme); setFrom(showDayMonth(theme.start_md)); setTo(showDayMonth(theme.end_md)); }, [theme]);
  const set = <K extends keyof KioskTheme>(k: K, v: KioskTheme[K]) => setD((x) => ({ ...x, [k]: v }));

  const submit = async (patch: Partial<KioskTheme> = {}) => {
    const start_md = from.trim() ? parseDayMonth(from) : "";
    const end_md = to.trim() ? parseDayMonth(to) : "";
    if ((from.trim() && !start_md) || (to.trim() && !end_md)) return toast.error("Scrivi le date come giorno/mese, per esempio 25/12");
    const next = { ...d, start_md, end_md, ...patch };
    if (next.mode === "auto" && (!start_md || !end_md)) return toast.error("Per l'automatico servono le date Dal e Al");
    setBusy(true);
    try { await save({ data: next }); toast.success(`Tema «${next.name}» salvato`); onDone(); if (!theme.id) setD(blank); }
    catch (e) { console.error(e); toast.error(e instanceof Error ? e.message : "Salvataggio non riuscito"); }
    finally { setBusy(false); }
  };

  const modes: [KioskTheme["mode"], string][] = [["off", "Spento"], ["auto", "📅 Automatico"], ["on", "🔛 Sempre acceso"]];
  return (
    <li className={`rounded-3xl border-4 p-4 ${live ? "border-accent" : "border-transparent"}`} style={{ background: d.bg }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-4xl">{decorList(d.decor).slice(0, 3).join("") || "🎨"}</span>
        <input aria-label="Nome del tema" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome del tema" className={`${field} font-display text-3xl`} />
        {live && <span className="rounded-full bg-accent px-4 py-1 font-bold text-accent-foreground">● Attivo adesso sul totem</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {modes.map(([m, l]) => (
          <button key={m} disabled={busy || (!theme.id && m !== d.mode)} aria-pressed={d.mode === m} onClick={() => (theme.id ? submit({ mode: m }) : set("mode", m))}
            className={`tap rounded-full px-5 py-2 text-xl font-bold ${d.mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 rounded-2xl bg-card/80 p-3 text-card-foreground md:grid-cols-2">
        <label className="flex items-center gap-2 text-xl">Dal <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="gg/mm" className={`${field} w-28`} />
          al <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="gg/mm" className={`${field} w-28`} /></label>
        <div className="flex flex-wrap items-center gap-3 text-xl">
          {([["bg", "Sfondo"], ["primary_color", "Colore 1"], ["accent", "Colore 2"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2">{l}<input type="color" value={d[k]} onChange={(e) => set(k, e.target.value)} className="h-12 w-14 rounded-lg" /></label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xl">Decorazioni <input value={d.decor} onChange={(e) => set("decor", e.target.value)} placeholder="es. ❄️🎄⭐" className={`${field} flex-1`} /></label>
        <label className="flex items-center gap-2 text-xl">Movimento
          <select value={d.anim} onChange={(e) => set("anim", e.target.value as KioskTheme["anim"])} className={field}>
            <option value="fall">Cadono dall'alto</option><option value="float">Salgono dal basso</option><option value="none">Nessuna decorazione</option>
          </select></label>
        {([["greeting", "🇮🇹 Auguri"], ["greeting_en", "🇬🇧 English"], ["greeting_fr", "🇫🇷 Français"], ["greeting_es", "🇪🇸 Español"]] as const).map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 text-xl">{l}<input value={d[k]} onChange={(e) => set(k, e.target.value)} className={`${field} flex-1`} /></label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => submit()} className="tap rounded-xl bg-primary px-6 py-3 text-xl font-bold text-primary-foreground">{theme.id ? "Salva modifiche" : "+ Crea tema"}</button>
        {theme.id && (confirm
          ? <><button onClick={async () => { await remove({ data: { id: theme.id } }); onDone(); }} className="tap rounded-xl bg-destructive px-5 py-3 text-xl text-destructive-foreground">Sì, elimina</button>
              <button onClick={() => setConfirm(false)} className="tap rounded-xl bg-secondary px-5 py-3 text-xl">Annulla</button></>
          : <button onClick={() => setConfirm(true)} className="tap rounded-xl bg-secondary px-5 py-3 text-xl">🗑 Elimina</button>)}
      </div>
    </li>
  );
}

export function ThemesPanel() {
  const { data = [] } = useQuery(themesQueryOptions);
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["themes"] });
  const live = pickTheme(data, new Date());
  return (
    <section className="mt-12">
      <h2 className="font-display text-6xl">🎉 Temi delle ricorrenze</h2>
      <p className="mt-2 max-w-4xl text-xl text-muted-foreground">
        «📅 Automatico» accende il tema da solo tra le due date, ogni anno. «🔛 Sempre acceso» lo tiene acceso finché non lo spegni (uno alla volta).
        Se due temi automatici cadono negli stessi giorni vince quello più in alto. Le date di Pasqua e della Festa della mamma cambiano ogni anno: ricordati di aggiornarle.
        {!live && " Oggi nessun tema è attivo."}
      </p>
      <ul className="mt-5 grid gap-4">
        {data.map((t) => <ThemeCard key={t.id} theme={t} live={live?.id === t.id} onDone={refresh} />)}
        <ThemeCard theme={blank} live={false} onDone={refresh} />
      </ul>
    </section>
  );
}
