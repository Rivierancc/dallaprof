import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions, euro, type Product, type Category } from "@/lib/menu"

export default function Index() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<(Product & { qty: number })[]>([])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Caricamento menu Dalla Prof...</div>
  }

  // QUI PRENDE LE TUE CATEGORIE VERE - non le inventa
  const categories: Category[] = (data as any)?.categories || (data as any)?.categories_list || []
  // QUI PRENDE I TUOI PRODOTTI VERI con descrizione e prezzo
  const products: Product[] = (data as any)?.products || (data as any)?.items || []

  const filtered = selectedCategory
   ? products.filter((p: any) => p.category_id === selectedCategory || p.category === selectedCategory)
    : products

  const getColor = (cat: any, index: number) => {
    if (cat.color) return cat.color
    // se nel DB non hai colori, usa questi in ordine
    const fallback = ["#FFB800", "#FF5723", "#3498DB", "#9B59B6", "#2ECC71", "#E67E22"]
    return fallback[index % fallback.length]
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const found = prev.find(p => p.id === product.id)
      if (found) return prev.map(p => p.id === product.id? {...p, qty: p.qty + 1 } : p)
      return [...prev, {...product, qty: 1 }]
    })
  }

  const total = cart.reduce((s, p) => s + p.price * p.qty, 0)

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 pb-28">
      <h1 className="text-3xl font-black mb-6">Dalla Prof</h1>

      {/* CATEGORIE - 3 per riga, le tue vere */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {categories.map((cat: any, i: number) => {
          const color = getColor(cat, i)
          const isSelected = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected? null : cat.id)}
              style={{
                backgroundColor: isSelected? color : color + "18",
                borderColor: color,
                color: isSelected? "white" : color,
              }}
              className="p-6 rounded-2xl border-2 font-bold text-[17px] transition-all active:scale-95"
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* PRODOTTI VERI con descrizione e prezzo */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((product: any) => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            className="bg-white border rounded-2xl p-4 text-left shadow-sm active:scale-95 transition"
          >
            {product.image && (
              <img src={product.image} alt={product.name} className="w-full h-32 object-cover rounded-xl mb-3" />
            )}
            <h3 className="font-bold text-[16px] leading-tight">{product.name}</h3>
            {product.description && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
            )}
            <p className="font-black mt-2 text-lg">{euro(product.price)}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-gray-400 mt-12">Nessun prodotto in questa categoria</div>
      )}

      {/* CARRELLO */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">{cart.reduce((s, p) => s + p.qty, 0)} prodotti</p>
              <p className="font-black text-xl">{euro(total)}</p>
            </div>
            <button className="bg-black text-white px-8 py-4 rounded-full font-bold">
              Ordina
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
