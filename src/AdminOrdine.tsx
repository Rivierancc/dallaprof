import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Save } from "lucide-react";

type Category = { id: string; name: string; position: number; };

export default function AdminOrdine() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("id, name, position").order("position");
    setCategories(data || []);
    setLoading(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const newCats = [...categories];
    [newCats[index], newCats[newIndex]] = [newCats[newIndex], newCats[index]];
    setCategories(newCats);
  };

  const handleSave = async () => {
    setSaving(true);
    for (let i = 0; i < categories.length; i++) {
      await supabase.from("categories").update({ position: (i + 1) * 10 }).eq("id", categories[i].id);
    }
    toast.success("Ordine salvato! Totem aggiornato.");
    setSaving(false);
  };

  if (loading) return <div className="p-8">Caricamento...</div>;

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen bg-white">
      <h1 className="text-2xl font-bold mb-2">Ordine Categorie</h1>
      <p className="text-sm text-gray-500 mb-6">Sposta su/giù e salva. 1 = primo sul totem.</p>
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <div key={cat.id} className="flex items-center justify-between border rounded-xl p-3 bg-gray-50">
            <div className="flex items-center gap-3"><span className="font-bold w-6">{idx + 1}</span><span>{cat.name}</span></div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => move(idx, 1)} disabled={idx === categories.length - 1}><ArrowDown className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full mt-8 h-14 text-lg rounded-xl"><Save className="mr-2 h-5 w-5" />{saving? "Salvataggio..." : "SALVA ORDINE"}</Button>
    </div>
  );
}
