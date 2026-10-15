import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Cat = { id: string; name: string; position: number };

function AdminOrdinePage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
    .from("menu_categories")
    .select("id,name,position")
    .order("position", { ascending: true });

    if (error) {
      toast.error("Errore: " + error.message);
      setCats([]);
    } else {
      setCats((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const move = (i: number, dir: -1 | 1) => {
    const n = i + dir;
    if (n < 0 || n >= cats.length) return;
    const copy = [...cats];
    [copy[i], copy[n]] = [copy[n], copy[i]];
    setCats(copy);
  };

  const save = async () => {
    setSaving(true);
    for (let i = 0; i < cats.length; i++) {
      const { error } = await supabase
      .from("menu_categories")
      .update({ position: (i + 1) * 10 })
      .eq("id", cats[i].id);
      if (error) {
        toast.error("Errore salvataggio: " + error.message);
        setSaving(false);
        return;
      }
    }
    toast.success("Ordine salvato!");
    setSaving(false);
  };

  if (loading) return <div className="p-10">Caricamento...</div>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white min-h-screen text-black">
      <h1 className="text-2xl font-bold">Ordine Categorie</h1>
      <p className="text-sm text-gray-500 mb-6">1 = primo sul totem</p>
      {cats.length === 0? (
        <div className="p-4 border rounded bg-yellow-50">Nessuna categoria trovata</div>
      ) : (
        <div className="space-y-2">
          {cats.map((c, idx) => (
            <div key={c.id} className="flex justify-between border rounded-xl p-3 bg-gray-50">
              <span><b>{idx + 1}</b> - {c.name}</span>
              <div className="flex gap-2">
                <button onClick={() => move(idx, -1)} className="border px-3 py-1 rounded">↑</button>
                <button onClick={() => move(idx, 1)} className="border px-3 py-1 rounded">↓</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {cats.length > 0 && (
        <button onClick={save} disabled={saving} className="w-full mt-8 h-14 bg-black text-white rounded-xl font-bold">
          {saving? "Salvo..." : "SALVA ORDINE"}
        </button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/ordine")({ component: AdminOrdinePage });
