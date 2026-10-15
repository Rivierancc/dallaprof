import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Category = { id: string; name: string; position: number; };

function AdminOrdineComponent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    // usa la stessa funzione che usa menu.tsx per prendere le categorie
    const { createClient } = await import("@/lib/supabase");
    // prova entrambi i percorsi
    let supabase: any;
    try {
      const mod = await import("@/integrations/supabase/client");
      supabase = mod.supabase;
    } catch {
      const mod2 = await import("@/lib/supabase");
      supabase = mod2.supabase || mod2.default;
    }
    if (!supabase) {
      const { supabase: sb } = await import("@/lib/supabase");
      supabase = sb;
    }
    const { data } = await supabase.from("categories").select("id, name, position").order("position");
    setCategories((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const move = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const newCats = [...categories];
    [newCats[index], newCats[newIndex]] = [newCats[newIndex], newCats[index]];
    setCategories(newCats);
  };

  const handleSave = async () => {
    setSaving(true);
    let supabase: any;
    try {
      const mod = await import("@/integrations/supabase/client");
      supabase = mod.supabase;
    } catch {
      const mod2 = await import("@/lib/supabase");
      supabase = mod2.supabase || mod2.default;
    }
    for (let i = 0; i < categories.length; i++) {
      await supabase.from("categories").update({ position: (i + 1) * 10 }).eq("id", categories[i].id);
    }
    toast.success("Ordine salvato!");
    setSaving(false);
  };

  if (loading) return <div className="p-8">Caricamento...</div>;

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen bg-white text-black">
      <h1 className="text-2xl font-bold mb-2">Ordine Categorie</h1>
      <p className="text-sm text-gray-500 mb-6">Sposta su/giù e salva. 1 = primo sul totem.</p>
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <div key={cat.id} className="flex items-center justify-between border rounded-xl p-3 bg-gray-50">
            <div className="flex items-center gap-3"><span className="font-bold w-6">{idx + 1}</span><span>{cat.name}</span></div>
            <div className="flex gap-1">
              <button className="border rounded p-2" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
              <button className="border rounded p-2" onClick={() => move(idx, 1)} disabled={idx === categories.length - 1}>↓</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} className="w-full mt-8 h-14 text-lg rounded-xl bg-black text-white">
        {saving? "Salvataggio..." : "SALVA ORDINE"}
      </button>
    </div>
  );
}

export const Route = createFileRoute("/admin/ordine")({
  component: AdminOrdineComponent,
});
