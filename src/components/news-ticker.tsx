import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getNews, getNewsSettings, saveNewsSettings } from "@/lib/menu.functions";
import { NEWS_PAGES, NEWS_SOURCES, pageFor, type NewsPage, type NewsSettings, type NewsSource } from "@/lib/news";

const settingsQuery = queryOptions({ queryKey: ["news-settings"], queryFn: () => getNewsSettings(), staleTime: 15_000, refetchInterval: 30_000 });

/** Striscia "Ultima ora". `fixed` la appoggia in fondo allo schermo sopra la pagina. */
export function NewsTicker({ fixed = false }: { fixed?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: settings } = useQuery(settingsQuery);
  const page = pageFor(path);
  const visible = !!settings?.on && !!page && settings.pages.includes(page) && settings.sources.length > 0;
  const { data = [] } = useQuery({ queryKey: ["news", settings?.sources.join(",")], queryFn: () => getNews(), enabled: visible, staleTime: 5 * 60_000, refetchInterval: 10 * 60_000 });
  // La pagina display la mostra dentro la propria impaginazione.
  if (!visible || !data.length || (fixed && page === "display")) return null;
  const line = data.map((n) => `${n.title} (${n.source})`).join("   •   ") + "   •   ";
  return <div dir="ltr" className={`${fixed ? "fixed inset-x-0 bottom-0 z-[90]" : ""} flex items-stretch overflow-hidden border-t-2 border-border bg-card text-card-foreground`}>
    <span className="z-10 flex shrink-0 items-center bg-primary px-6 font-display text-4xl text-primary-foreground">Ultima ora</span>
    <div className="flex-1 overflow-hidden py-3">
      <p className="inline-block whitespace-nowrap font-sans text-3xl font-semibold" style={{ animation: `news-scroll ${Math.max(60, line.length / 4)}s linear infinite` }}>{line}{line}</p>
    </div>
  </div>;
}

/** Sezione di Gestione menu per la striscia notizie. */
export function NewsSettingsPanel() {
  const { data } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<NewsSettings | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (data && !draft) setDraft(data); }, [data, draft]);
  if (!draft) return null;
  const toggle = <K extends "sources" | "pages">(key: K, value: NewsSettings[K][number]) => {
    const list = draft[key] as string[];
    setMsg(""); setDraft({ ...draft, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };
  const save = async () => {
    setMsg("Salvo…");
    try { await saveNewsSettings({ data: draft }); await qc.invalidateQueries({ queryKey: ["news-settings"] }); await qc.invalidateQueries({ queryKey: ["news"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  return <div className="space-y-6">
    <div className="flex items-center gap-4"><span className="text-xl">Striscia notizie</span>
      <Button variant={draft.on ? "default" : "secondary"} onClick={() => { setMsg(""); setDraft({ ...draft, on: !draft.on }); }}>{draft.on ? "Accesa" : "Spenta"}</Button></div>
    <div><p className="mb-2 text-muted-foreground">Fonti (puoi sceglierne più di una)</p>
      <div className="flex flex-wrap gap-2">{(Object.keys(NEWS_SOURCES) as NewsSource[]).map((s) =>
        <Button key={s} variant={draft.sources.includes(s) ? "default" : "secondary"} aria-pressed={draft.sources.includes(s)} onClick={() => toggle("sources", s)}>{NEWS_SOURCES[s].name}</Button>)}</div></div>
    <div><p className="mb-2 text-muted-foreground">Dove mostrarla</p>
      <div className="flex flex-wrap gap-2">{(Object.keys(NEWS_PAGES) as NewsPage[]).map((p) =>
        <Button key={p} variant={draft.pages.includes(p) ? "default" : "secondary"} aria-pressed={draft.pages.includes(p)} onClick={() => toggle("pages", p)}>{NEWS_PAGES[p]}</Button>)}</div></div>
    <div className="flex items-center gap-4"><Button onClick={save}>Salva notizie</Button>{msg && <span role="status" className="text-xl">{msg}</span>}</div>
  </div>;
}
