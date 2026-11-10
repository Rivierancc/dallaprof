import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getSuperManual } from "@/lib/license.functions";
import type { SuperChapter } from "@/lib/superadmin-manual.server";

function filterChapters(chapters: SuperChapter[], q: string): SuperChapter[] {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return chapters;
  return chapters.map((c) => ({ ...c, sections: c.sections.map((s) => ({ ...s, entries: s.entries.filter((e) => {
    const text = [c.title, s.title, e.title, e.where, ...e.steps, ...(e.tips ?? [])].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  }) })).filter((s) => s.entries.length) })).filter((c) => c.sections.length);
}

function asText(updated: string, chapters: SuperChapter[]) {
  const out = [`MANUALE FORNITORE — aggiornato al ${updated}`, ""];
  for (const c of chapters) {
    out.push("=".repeat(40), c.title.toUpperCase(), c.intro, "");
    for (const s of c.sections) {
      out.push(s.title.toUpperCase(), "");
      for (const e of s.entries) {
        out.push(`■ ${e.title}  (${e.where})`);
        e.steps.forEach((st, i) => out.push(`   ${i + 1}. ${st}`));
        e.tips?.forEach((t) => out.push(`   💡 ${t}`));
        out.push("");
      }
    }
  }
  return out.join("\n");
}

export function SuperManual({ onBack }: { onBack: () => void }) {
  const get = useServerFn(getSuperManual);
  const { data, error } = useQuery({ queryKey: ["super-manual"], queryFn: () => get() });
  const [q, setQ] = useState("");
  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([asText(data.updated, data.chapters)], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "manuale-fornitore.txt";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const chapters = data ? filterChapters(data.chapters, q) : [];
  return <div className="superadmin-page"><main className="mx-auto flex max-w-5xl flex-col gap-6 p-6 pb-24 print:p-0">
    <div className="flex flex-wrap items-center gap-4 print:hidden">
      <h1 className="mr-auto font-display text-6xl text-accent">Manuale fornitore</h1>
      <Button variant="secondary" onClick={onBack}>← I tuoi locali</Button>
    </div>
    <h1 className="hidden font-display text-4xl print:block">Manuale fornitore</h1>
    {error && <p className="text-xl text-destructive">{(error as Error).message}</p>}
    {!data ? !error && <p className="text-xl">Caricamento…</p> : <>
      <p className="text-xl text-muted-foreground">Aggiornato al {data.updated} · visibile solo a te</p>
      <div className="flex flex-wrap gap-3 print:hidden">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Cerca una funzione…" aria-label="Cerca nel manuale fornitore" className="superadmin-field h-14 min-w-0 flex-1 rounded-xl border px-4 text-xl" />
        <Button className="h-14 px-6 text-xl" onClick={download}>⬇️ Scarica</Button>
        <Button variant="secondary" className="h-14 px-6 text-xl" onClick={() => window.print()}>🖨️ Stampa / PDF</Button>
      </div>
      {!q && <nav className="flex flex-wrap gap-2 print:hidden">
        {data.chapters.map((c) => <a key={c.id} href={`#cap-${c.id}`} className="rounded-xl bg-secondary px-4 py-2 text-xl text-secondary-foreground">{c.title}</a>)}
      </nav>}
      {chapters.length === 0 && <p className="text-2xl">Nessuna funzione trovata per «{q}».</p>}
      {chapters.map((c) => <section key={c.id} id={`cap-${c.id}`} className="flex flex-col gap-4 rounded-2xl border p-5">
        <h2 className="font-display text-5xl text-accent">{c.title}</h2>
        <p className="text-xl text-muted-foreground">{c.intro}</p>
        {c.sections.map((s) => <div key={s.id} className="flex flex-col gap-3">
          <h3 className="font-display text-4xl">{s.title}</h3>
          {s.entries.map((e, i) => <article key={e.title + i} className="break-inside-avoid rounded-2xl bg-card p-5">
            <h4 className="text-2xl font-bold">{e.title}</h4>
            <p className="mb-2 text-lg text-accent">📍 {e.where}</p>
            <ol className="list-decimal space-y-1 pl-8 text-xl">{e.steps.map((st) => <li key={st}>{st}</li>)}</ol>
            {e.tips?.map((t) => <p key={t} className="mt-2 text-lg text-muted-foreground">💡 {t}</p>)}
          </article>)}
        </div>)}
      </section>)}
    </>}
  </main></div>;
}
