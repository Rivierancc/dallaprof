import { useState, useMemo } from "react";
import { useMenu } from "../hooks/useMenu";

export default function TotemHome() {
  const { menu } = useMenu() as any;
  const [catId, setCatId] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  const categories = menu?.categories || [];
  const products = menu?.products || [];

  const activeCat = useMemo(() => {
    if (!catId) return null;
    return categories.find((c: any) => String(c.id) === String(catId));
  }, [catId, categories]);

  const shown = useMemo(() => {
    if (!activeCat) return [];
    return products.filter((p: any) => {
      const pCat = String(p.category_id || p.categoryId || "");
      return pCat === String(activeCat.id);
    }).filter((p: any) => p.is_available!== false);
  }, [activeCat, products]);

  const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      {/* HEADER */}
      <div className="border-b-4 border-yellow-400 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center font-black">RB</div>
          <div>
            <div className="font-black text-xl leading-none">ROSSO BRUSCO</div>
            <div className="text-xs opacity-60">BURGER & STREET FOOD ITALIANO</div>
          </div>
        </div>
        <div className="text-sm">IT | EN • AIUTO • 12:34</div>
      </div>

      <div className="flex flex-1">
        {/* LEFT */}
        <div className="flex-1 p-6">
          {!activeCat? (
            <>
              <div className="bg-yellow-100 rounded-2xl p-5 mb-6">
                <h1 className="text-2xl font-black">Benvenuto! Scegli una categoria</h1>
                <p className="opacity-70">Tocca ciò che desideri e aggiungilo al carrello</p>
              </div>

              <h2 className="font-bold text-lg mb-4 border-b-2 border-yellow-400 inline-block">Categorie</h2>

              <div className="grid grid-cols-2 gap-4">
                {categories.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setCatId(c.id)}
                    className="relative h-44 rounded-2xl overflow-hidden shadow-lg group"
                  >
                    <img src={c.image_url || c.image} className="w-full h-full object-cover group-active:scale-105 transition" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-3 left-3 right-3 text-white font-black text-xl text-left">{c.name}</span>
                    {c.name === 'BURGER' && <span className="absolute top-3 right-3 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full">PIÙ VENDUTO</span>}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button className="border-2 border-yellow-400 rounded-xl py-4 font-bold">🍽️ MANGIA QUI</button>
                <button className="border-2 border-yellow-400 rounded-xl py-4 font-bold">🛍️ ASPORTO</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setCatId(null)} className="mb-4 bg-zinc-100 px-4 py-2 rounded-full font-bold">← Indietro alle categorie</button>
              <h2 className="text-2xl font-black mb-4">{activeCat.name}</h2>
              <div className="grid grid-cols-2 gap-4">
                {shown.map((p: any) => (
                  <div key={p.id} className="border rounded-2xl overflow-hidden shadow-sm">
                    <img src={p.image_url || p.image} className="h-32 w-full object-cover" />
                    <div className="p-3">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-sm opacity-60 line-clamp-2">{p.description}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-black">€ {Number(p.price).toFixed(2)}</span>
                        <button onClick={() => setCart([...cart, {...p, qty: 1 }])} className="bg-yellow-400 px-4 py-2 rounded-full font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {shown.length === 0 && <div className="text-center opacity-50 mt-10">Nessun piatto in questa categoria</div>}
            </>
          )}
        </div>

        {/* CART */}
        <div className="w-[340px] bg-zinc-50 border-l p-6 flex flex-col">
          <h3 className="font-bold mb-6">🛒 Il tuo carrello - {cart.length} articoli</h3>
          <div className="flex-1">
            {cart.length === 0? (
              <div className="text-center mt-20">
                <div className="w-20 h-20 bg-yellow-100 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">🛍️</div>
                <div className="font-bold">Carrello vuoto</div>
                <div className="text-sm opacity-60">Aggiungi un piatto per iniziare</div>
              </div>
            ) : cart.map((i, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b text-sm">
                <span>{i.qty}x {i.name}</span>
                <span>€ {(i.price * i.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between font-bold text-lg"><span>Subtotale</span><span>€ {total.toFixed(2)}</span></div>
            <button className={`w-full mt-4 py-4 rounded-xl font-black ${total > 0? 'bg-yellow-400' : 'bg-zinc-300'}`}>PROSEGUI - € {total.toFixed(2)}</button>
            <div className="text-[10px] text-center opacity-50 mt-2">IVA inclusa • Pagamento al termine</div>
          </div>
        </div>
      </div>
    </div>
  );
}
