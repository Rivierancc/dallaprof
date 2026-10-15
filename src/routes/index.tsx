import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-black">Caricamento...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []

  const getColor = (cat: any, i: number) => cat.color || ["#FFB800","#FF3B30","#007AFF","#AF52DE","#34C759","#FF9500"][i % 6]
  const euro = (n: number) => `€ ${Number(n).toFixed(2)}`

  const addToCart = (p: any, removedIngredients: string[] = [], extraList: any[] = []) => {
    const totalExtra = extraList.reduce((s: number, e: any) => s + e.price, 0)
    const cartItem = {...p, cartId: Date.now(), removedIngredients, extras: extraList, finalPrice: p.price + totalExtra }
    setCart(prev => [...prev, cartItem])
    setSelectedProduct(null)
  }

  const total = cart.reduce((s, p) => s + p.finalPrice, 0)

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-8 pb-32">
        <h1 className="text-4xl font-black mb-2 text-black">Dalla Prof</h1>
        <p className="text-gray-600 mb-8">Scegli una categoria</p>
        <div className="grid grid-cols-3 gap-5">
          {categories.map((cat: any, i: number) => {
            const color = getColor(cat, i)
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                style={{ borderColor: color, borderWidth: 2.5, backgroundColor: "white" }}
                className="h-36 rounded-[24px] flex items-center justify-center shadow-sm active:scale-95">
                <span style={{ color }} className="font-black text-lg text-center px-2">{cat.name}</span>
              </button>
            )
          })}
        </div>
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center">
            <div><p className="text-sm text-gray-600">{cart.length} prodotti</p><p className="font-black text-xl text-black">{euro(total)}</p></div>
            <button className="bg-black text-white px-8 py-4 rounded-full font-bold">VAI AL CARRELLO</button>
          </div>
        )}
      </div>
    )
  }

  const currentCat = categories.find((c: any) => c.id === selectedCategory)
  const filtered = products.filter((p: any) => p.category_id === selectedCategory).sort((a: any,b: any) => a.position - b.position)
  const color = getColor(currentCat, 0)

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 pb-32">
      <button onClick={() => setSelectedCategory(null)} style={{ backgroundColor: color }} className="mb-6 text-white px-6 py-3 rounded-full font-bold">
        ← {currentCat?.name}
      </button>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((p: any) => (
          <button key={p.id} disabled={p.sold_out} onClick={() => setSelectedProduct(p)}
            className="bg-white rounded-[20px] p-5 shadow-sm border-2 border-gray-100 text-left active:scale-95">
            <h3 className="font-black text-[17px] text-black">{p.name}</h3>
            <p className="text-gray-700 text-[13px] mt-1 line-clamp-3">{p.description}</p>
            <p className="font-black text-lg mt-3 text-black">{euro(p.price)}</p>
            {p.sold_out && <p className="text-red-500 font-bold text-sm mt-1">ESAURITO</p>}
          </button>
        ))}
      </div>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} euro={euro} />
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
          <div><p className="text-sm text-gray-600">{cart.length} prodotti</p><p className="font-black text-xl text-black">{euro(total)}</p></div>
          <button className="bg-black text-white px-8 py-4 rounded-full font-bold">ORDINA</button>
        </div>
      )}
    </div>
  )
}

function ProductModal({ product, onClose, onAdd, euro }: any) {
  const [removed, setRemoved] = useState<string[]>([])
  const [selectedExtras, setSelectedExtras] = useState<any[]>([])

  const ingredients: string[] = product.ingredients || []
  const extras: any[] = product.extras || []

  const toggleRemove = (ing: string) => {
    setRemoved(prev => prev.includes(ing)? prev.filter(i => i!== ing) : [...prev, ing])
  }

  const toggleExtra = (e: any) => {
    setSelectedExtras(prev => prev.find(x => x.name === e.name)? prev.filter(x => x.name!== e.name) : [...prev, e])
  }

  const extraTotal = selectedExtras.reduce((s: number, e: any) => s + e.price, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] p-6 max-h-[85vh] overflow-auto">
        <h2 className="font-black text-2xl text-black">{product.name}</h2>
        <p className="text-gray-700 mt-2">{product.description}</p>
        <p className="font-black text-xl mt-3 text-black">{euro(product.price)}</p>

        {/* TOGLI INGREDIENTI */}
        {ingredients.length > 0 && (
          <div className="mt-6">
            <p className="font-bold mb-3 text-black">Togli dalla preparazione:</p>
            <div className="space-y-2">
              {ingredients.map((ing: string) => {
                const isRemoved = removed.includes(ing)
                return (
                  <label key={ing} className={`flex justify-between items-center border-2 p-3 rounded-xl ${isRemoved? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}>
                    <span className={`font-medium ${isRemoved? 'line-through text-red-600' : 'text-black'}`}>{ing}</span>
                    <input type="checkbox" checked={isRemoved} onChange={() => toggleRemove(ing)} className="w-5 h-5 accent-red-600" />
                  </label>
                )
              })}
            </div>
            {removed.length > 0 && <p className="text-sm text-red-600 mt-2">Rimuovi: {removed.join(", ")}</p>}
          </div>
        )}

        {/* EXTRA */}
        {extras.length > 0 && (
          <div className="mt-6">
            <p className="font-bold mb-3 text-black">Aggiungi extra:</p>
            <div className="space-y-2">
              {extras.map((e: any) => {
                const isSelected =!!selectedExtras.find(x => x.name === e.name)
                return (
                  <label key={e.name} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isSelected? 'border-black bg-gray-50' : 'border-gray-300 bg-white'}`}>
                    <span className="text-black font-medium flex items-center">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleExtra(e)} className="mr-3 w-5 h-5 accent-black" />
                      {e.name}
                    </span>
                    <span className="font-bold text-black">+ € {e.price.toFixed(2)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <button onClick={() => onAdd(product, removed, selectedExtras)} className="w-full mt-6 bg-black text-white py-4 rounded-full font-bold text-[16px]">
          Aggiungi - {euro(product.price + extraTotal)} {removed.length>0? `(-${removed.length})` : ''} {selectedExtras.length>0? `(+${selectedExtras.length} extra)` : ''}
        </button>
        <button onClick={onClose} className="w-full mt-3 text-gray-500 py-3">Chiudi</button>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
