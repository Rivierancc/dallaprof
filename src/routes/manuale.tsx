import { venuePageTitle } from "@/lib/page-title";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MANUAL_UPDATED, manualAsText, searchManual } from "@/lib/manual";

export const Route = createFileRoute("/manuale")({
  head: ({ matches }) => ({ meta: [
    { title: venuePageTitle("Manuale istruzioni", matches) },
    { name: "description", content: "Manuale dettagliato di totem, cassa, cucina, tabellone, gestione menu e admin, con ricerca." },
    { property: "og:title", content: venuePageTitle("Manuale istruzioni", matches) },
    { property: "og:description", content: "Manuale dettagliato di tutte le funzioni, con ricerca e download." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Manuale,
});

function download() {
  const blob = new Blob([manualAsText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "manuale-totem-burger.txt";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function Manuale() {
  const [q, setQ] = useState("");
  const sections = searchManual(q);
  return <main className="mx-auto min-h-screen max-w-5xl p-6 print:p-0">
    <header className="mb-6 flex flex-wrap items-center gap-4 print:hidden">
      <h1 className="mr-auto font-display text-7xl text-accent">Manuale</h1>
      <Button asChild variant="secondary"><Link to="/admin">Admin</Link></Button>
      <Button asChild variant="secondary"><Link to="/menu">Gestione menu</Link></Button>
    </header>
    <h1 className="hidden font-display text-4xl print:block">Manuale Totem Burger</h1>
    <p className="mb-4 text-xl text-muted-foreground">Aggiornato al {MANUAL_UPDATED}</p>
    <div className="mb-6 flex flex-wrap gap-3 print:hidden">
      <input
        type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Cerca una funzione (es. suoneria, PIN, foto)…" aria-label="Cerca nel manuale"
        className="h-16 min-w-0 flex-1 rounded-2xl border border-input bg-background px-5 text-2xl"
      />
      <Button className="h-16 px-6 text-xl" onClick={download}>⬇️ Scarica (testo)</Button>
      <Button variant="secondary" className="h-16 px-6 text-xl" onClick={() => window.print()}>🖨️ Stampa / PDF</Button>
    </div>
    {!q && <nav className="mb-6 flex flex-wrap gap-2 print:hidden">
      {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="rounded-xl bg-secondary px-4 py-2 text-xl text-secondary-foreground">{s.title}</a>)}
    </nav>}
    {sections.length === 0 && <p className="text-2xl">Nessuna funzione trovata per «{q}».</p>}
    {sections.map((s) => <section key={s.id} id={s.id} className="mb-8 break-inside-avoid">
      <h2 className="mb-3 font-display text-5xl">{s.title}</h2>
      <div className="space-y-4">
        {s.entries.map((e) => <article key={e.title} className="break-inside-avoid rounded-2xl bg-card/60 p-5">
          <h3 className="text-3xl font-bold">{e.title}</h3>
          <p className="mb-2 text-lg text-accent">📍 {e.where}</p>
          <ol className="list-decimal space-y-1 pl-8 text-xl">{e.steps.map((st) => <li key={st}>{st}</li>)}</ol>
          {e.tips?.map((t) => <p key={t} className="mt-2 text-lg text-muted-foreground">💡 {t}</p>)}
        </article>)}
      </div>
    </section>)}
  </main>;
}
