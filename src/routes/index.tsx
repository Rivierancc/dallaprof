import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [showCart, setShowCart] = useState(false)

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
  const removeFromCart = (id: number) => setCart(prev => prev.filter(p => p.cartId!== id))

  // PAGINA CARRELLO GIGANTE
  if (showCart) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-black">IL TUO ORDINE</h1>
          <button onClick={() => setShowCart(false)} className="bg-gray-100 px-6 py-3 rounded-full font-bold text-black">X Chiudi</button>
        </div>

        {cart.length === 0? (
          <p className="text-2xl text-gray-500 mt-20 text-center">Carrello vuoto</p>
        ) : (
          <>
            <div className="space-y-6">
              {cart.map((item: any) => (
                <div key={item.cartId} className="border-2 border-black rounded-[20px] p-6 bg-[#F9F9F9]">
                  <div className="flex justify-between items-start">
                    <h2 className="font-black text-[28px] text-black leading-tight">{item.name}</h2>
                    <button onClick={() => removeFromCart(item.cartId)} className="bg-red-500 text-white w-10 h-10 rounded-full font-black text-xl">X</button>
                  </div>

                  <p className="text-[20px] font-bold text-black mt-3">{euro(item.finalPrice)}</p>

                  {item.removedIngredients?.length > 0 && (
                    <p className="text-[18px] text-red-600 font-bold mt-3">SENZA: {item.removedIngredients.join(", ").toUpperCase()}</p>
                  )}

                  {item.extras?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[18px] font-black text-black">EXTRA:</p>
                      {item.extras.map((e: any) => (
                        <p key={e.name} className="text-[20px] text-black">+ {e.name} <span className="font-bold">€ {e.price.toFixed(2)}</span></p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 border-t-4 border-black pt-6">
              <div className="flex justify-between items-center">
                <p className="text-[24px] font-bold text-gray-600">TOTALE:</p>
                <p className="text-[48px] font-black text-black">{euro(total)}</p>
              </div>
              <button className="w-full mt-8 bg-black text-white py-6 rounded-full font-black text-[28px]">
                CONFERMA ORDINE
              </button>
              <button onClick={() => setShowCart(false)} className="w-full mt-4 bg-white border-2 border-black text-black py-4 rounded-full font-bold text-[20px]">
                Aggiungi altri prodotti
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-8 pb-40">
        <h1 className="text-4xl font-black mb-2 text-black">Dalla Prof</h1>
        <p className="text-gray-600 mb-8 text-[18px]">Scegli una categoria</p>
        <div className="grid grid-cols-3 gap-5">
          {categories.map((cat: any, i: number) => {
            const color = getColor(cat, i)
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                style={{ borderColor: color, borderWidth: 2.5, backgroundColor: "white" }}
                className="h-36 rounded-[24px] flex items-center justify-center shadow-sm active:scale-95">
                <span style={{ color }} className="font-black text-[20px] text-center px-2">{cat.name}</span>
              </button>
            )
          })}
        </div>
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-6 flex justify-between items-center">
            <div>
              <p className="text-[16px] opacity-80">{cart.length} prodotti</p>
              <p className="font-black text-[32px]">{euro(total)}</p>
            </div>
            <button onClick={() => setShowCart(true)} className="bg-white text-black px-8 py-4 rounded-full font-black text-[20px]">CARRELLO →</button>
          </div>
        )}
      </div>
    )
  }

  const currentCat = categories.find((c: any) => c.id === selectedCategory)
  const filtered = products.filter((p: any) => p.category_id === selectedCategory).sort((a: any,b: any) => a.position - b.position)
  const color = getColor(currentCat, 0)

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 pb-40">
      <button onClick={() => setSelectedCategory(null)} style={{ backgroundColor: color }} className="mb-6 text-white px-6 py-3 rounded-full font-bold text-[18px]">
        ← {currentCat?.name}
      </button>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((p: any) => (
          <button key={p.id} disabled={p.sold_out} onClick={() => setSelectedProduct(p)}
            className="bg-white rounded-[20px] p-5 shadow-sm border-2 border-gray-100 text-left active:scale-95">
            <h3 className="font-black text-[20px] text-black">{p.name}</h3>
            <p className="text-gray-700 text-[15px] mt-1">{p.description}</p>
            <p className="font-black text-[22px] mt-3 text-black">{euro(p.price)}</p>
          </button>
        ))}
      </div>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} euro={euro} />
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-6 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          <div>
            <p className="text-[16px] opacity-80">{cart.length} prodotti nel carrello</p>
            <p className="font-black text-[32px]">{euro(total)}</p>
          </div>
          <button onClick={() => setShowCart(true)} className="bg-white text-black px-8 py-5 rounded-full font-black text-[22px]">VEDI CARRELLO</button>
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
  const toggleRemove = (ing: string) => setRemoved(prev => prev.includes(ing)? prev.filter(i => i!== ing) : [...prev, ing])
  const toggleExtra = (e: any) => setSelectedExtras(prev => prev.find(x => x.name === e.name)? prev.filter(x => x.name!== e.name) : [...prev, e])
  const extraTotal = selectedExtras.reduce((s: number, e: any) => s + e.price, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-auto flex-1">
          <h2 className="font-black text-[32px] text-black">{product.name}</h2>
          <p className="text-gray-700 mt-2 text-[18px]">{product.description}</p>
          <p className="font-black text-[24px] mt-3 text-black">{euro(product.price)}</p>

          {ingredients.length > 0 && (
            <div className="mt-6">
              <p className="font-black text-[20px] mb-3 text-black">Togli dalla preparazione:</p>
              <div className="space-y-3">
                {ingredients.map((ing: string) => {
                  const isRemoved = removed.includes(ing)
                  return (
                    <label key={ing} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isRemoved? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}>
                      <span className={`font-bold text-[18px] ${isRemoved? 'line-through text-red-600' : 'text-black'}`}>{ing}</span>
                      <input type="checkbox" checked={isRemoved} onChange={() => toggleRemove(ing)} className="w-6 h-6 accent-red-600" />
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {extras.length > 0 && (
            <div className="mt-8">
              <p className="font-black text-[20px] mb-3 text-black">Aggiungi extra:</p>
              <div className="space-y-3">
                {extras.map((e: any) => {
                  const isSelected =!!selectedExtras.find(x => x.name === e.name)
                  return (
                    <label key={e.name} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isSelected? 'border-black bg-gray-100' : 'border-gray-300 bg-white'}`}>
                      <span className="text-black font-bold text-[18px] flex items-center">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleExtra(e)} className="mr-3 w-6 h-6 accent-black" />
                        {e.name}
                      </span>
                      <span className="font-black text-[18px] text-black">+ € {e.price.toFixed(2)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t-2 bg-white">
          <button onClick={() => onAdd(product, removed, selectedExtras)} className="w-full bg-black text-white py-5 rounded-full font-black text-[24px]">
            AGGIUNGI - {euro(product.price + extraTotal)}
          </button>
          <button onClick={onClose} className="w-full mt-3 text-gray-500 py-2 text-[16px]">Chiudi</button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
