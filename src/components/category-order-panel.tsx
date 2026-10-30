import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Fold } from "@/components/fold";
import { reorderCategories, type MenuCategory } from "@/lib/menu.functions";

export function CategoryOrderPanel({ categories, refresh }: { categories: MenuCategory[]; refresh: () => Promise<unknown> }) {
  const [cats, setCats] = useState(categories);
  const [saving, setSaving] = useState(false);
  useEffect(() => setCats(categories), [categories]);
  const changed = cats.some((c, i) => c.id !== categories[i]?.id);

  const move = (i: number, dir: -1 | 1) => {
    const n = i + dir;
    if (n < 0 || n >= cats.length) return;
    const copy = [...cats];
    [copy[i], copy[n]] = [copy[n]!, copy[i]!];
    setCats(copy);
  };

  const save = async () => {
    setSaving(true);
    try { await reorderCategories({ data: { ids: cats.map((c) => c.id) } }); await refresh(); toast.success("Ordine salvato"); }
    catch (e) { console.error(e); toast.error("Salvataggio non riuscito"); }
    finally { setSaving(false); }
  };

  return (
    <Fold title="↕️ Ordine categorie" hint="1 = prima sul totem">
      <ul className="space-y-2">
        {cats.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-background/40 p-3">
            <span className="w-10 text-center font-display text-3xl text-accent">{i + 1}</span>
            <span className="min-w-0 flex-1 text-2xl font-bold">{c.name}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Sposta su ${c.name}`} className="tap rounded-xl bg-primary px-4 py-2 text-2xl font-bold text-primary-foreground disabled:opacity-25">▲</button>
            <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} aria-label={`Sposta giù ${c.name}`} className="tap rounded-xl bg-primary px-4 py-2 text-2xl font-bold text-primary-foreground disabled:opacity-25">▼</button>
          </li>
        ))}
        {!cats.length && <li className="text-lg text-muted-foreground">Nessuna categoria</li>}
      </ul>
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving || !changed} className="tap rounded-xl bg-primary px-6 py-3 text-xl font-bold text-primary-foreground disabled:opacity-40">{saving ? "Salvataggio…" : "Salva ordine"}</button>
        {changed && <button onClick={() => setCats(categories)} className="tap rounded-xl bg-secondary px-5 py-3 text-xl">Annulla</button>}
      </div>
    </Fold>
  );
}
