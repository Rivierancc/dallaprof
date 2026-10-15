import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Caricamento Dalla Prof...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []

  const getColor = (cat: any, i: number) => cat.color || ["#FFB800","#FF3B30","#007AFF","#AF52DE","#34C759","#FF9500"][i % 6]
  const euro = (n: number) => `€ ${Number(n).toFixed(2)}`

  const addToCart = (p: any, extraList: any[] = []) => {
    const totalExtra = extraList.reduce((s: number, e: any) => s + e.price, 0)
    const cartItem = {...p, cartId: Date.now(), extras: extraList, finalPrice: p.price + totalExtra }
    setCart(prev => [...prev, cartItem])
    setSelectedProduct(null)
  }

  const total = cart.reduce((s, p) => s + p.finalPrice, 0)

  // PAGINA 1: CATEGORIE
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-8 pb-32">
        <h1 className="text-4xl font-black mb-2">Dalla Prof</h1>
        <p className="text-gray-500 mb-8">Scegli una categoria</p>
        <div className="grid grid-cols-3 gap-5">
          {categories.map((cat: any, i: number) => {
            const color = getColor(cat, i)
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                style={{ borderColor: color, borderWidth: 2.5, background: "white" }}
                className="h-36 rounded-[24px] flex items-center justify-center shadow-sm active:scale-95">
                <span style={{ color }} className="font-black text-lg text-center px-2">{cat.name}</span>
              </button>
            )
          })}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
            <div><p className="text-sm text-gray-500">{cart.length} prodotti</p><p className="font-black text-xl">{euro(total)}</p></div>
            <button className="bg-black text-white px-8 py-4 rounded-full font-bold">VAI AL CARRELLO</button>
          </div>
        )}
      </div>
    )
  }

  // PAGINA 2: PRODOTTI
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
            className={`bg-white rounded-[20px] p-5 shadow-sm border text-left active:scale-95 ${p.sold_out? 'opacity-50' : ''}`}>
            <h3 className="font-black text-[17px]">{p.name}</h3>
            <p className="text-gray-600 text-[13px] mt-1 line-clamp-2">{p.description}</p>
            <p className="font-black text-lg mt-3">{euro(p.price)}</p>
            {p.sold_out && <p className="text-red-500 font-bold text-sm mt-1">ESAURITO</p>}
          </button>
        ))}
      </div>

      {/* MODALE EXTRAS */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] p-6 max-h-[80vh] overflow-auto">
            <h2 className="font-black text-2xl">{selectedProduct.name}</h2>
            <p className="text-gray-600 mt-2">{selectedProduct.description}</p>
            <p className="font-black text-xl mt-3">{euro(selectedProduct.price)}</p>

            {selectedProduct.extras?.length > 0 && (
              <div className="mt-6">
                <p className="font-bold mb-2">Aggiungi extra:</p>
                <ExtraSelector extras={selectedProduct.extras} onAdd={(list: any[]) => addToCart(selectedProduct, list)} />
              </div>
            )}

            {(!selectedProduct.extras || selectedProduct.extras.length === 0) && (
              <button onClick={() => addToCart(selectedProduct, [])} className="w-full mt-6 bg-black text-white py-4 rounded-full font-bold">
                Aggiungi - {euro(selectedProduct.price)}
              </button>
            )}

            <button onClick={() => setSelectedProduct(null)} className="w-full mt-3 text-gray-500 py-3">Chiudi</button>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
          <div><p className="text-sm text-gray-500">{cart.length} prodotti</p><p className="font-black text-xl">{euro(total)}</p></div>
          <button className="bg-black text-white px-8 py-4 rounded-full font-bold">ORDINA</button>
        </div>
      )}
    </div>
  )
}

function ExtraSelector({ extras, onAdd }: any) {
  const [selected, setSelected] = useState<any[]>([])
  const toggle = (e: any) => setSelected(prev => prev.find(x => x.name === e.name)? prev.filter(x => x.name!== e.name) : [...prev, e])
  const total = extras.reduce((s: number, e: any) => s + (selected.find(x => x.name === e.name)? e.price : 0), 0)
  return (
    <>
      {extras.map((e: any) => (
        <label key={e.name} className="flex justify-between items-center border p-3 rounded-xl mb-2">
          <span><input type="checkbox" checked={!!selected.find(x => x.name === e.name)} onChange={() => toggle(e)} className="mr-2" />{e.name}</span>
          <span className="font-bold">+ € {e.price.toFixed(2)}</span>
        </label>
      ))}
      <button onClick={() => onAdd(selected)} className="w-full mt-4 bg-black text-white py-4 rounded-full font-bold">
        Aggiungi {selected.length > 0? `+ € ${total.toFixed(2)}` : ''}
      </button>
    </>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
