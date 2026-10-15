import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions } from "@/lib/menu"

const DEFAULT_COLORS = {
  bottoneAggiungi: "#000000",
  bottoneCarrello: "#000000",
  sfondo: "#F5F5F7",
  testoCategorie: "#FFFFFF", // testo sulle categorie
  testoProdotti: "#000000", // nome prodotto
  testoPrezzo: "#000000", // prezzo
  categorie: {} as Record<string, string>,
}
const DEFAULT_PASSWORD = "1234"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState(false)
  const [colors, setColors] = useState(DEFAULT_COLORS)
  const [savedPassword, setSavedPassword] = useState(DEFAULT_PASSWORD)

  useEffect(() => {
    const saved = localStorage.getItem("dallaprof_colors")
    if (saved) {
      const parsed = JSON.parse(saved)
      setColors({...DEFAULT_COLORS,...parsed, categorie: parsed.categorie || {} })
    }
    const pwd = localStorage.getItem("dallaprof_pwd")
    if (pwd) setSavedPassword(pwd)
  }, [])

  const saveColor = (key: string, value: string) => {
    const newColors = {...colors, [key]: value }
    setColors(newColors as any)
    localStorage.setItem("dallaprof_colors", JSON.stringify(newColors))
  }

  const saveCategoriaColor = (catId: string, value: string) => {
    const newCatColors = {...colors.categorie, [catId]: value }
    const newColors = {...colors, categorie: newCatColors }
    setColors(newColors)
    localStorage.setItem("dallaprof_colors", JSON.stringify(newColors))
  }

  const handleGearClick = () => {
    setPasswordInput("")
    setPasswordError(false)
    setShowPasswordPrompt(true)
  }

  const checkPassword = () => {
    if (passwordInput === savedPassword) {
      setShowPasswordPrompt(false)
      setShowSettings(true)
    } else {
      setPasswordError(true)
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-black">Caricamento...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []
  const getCategoryColor = (cat: any, i: number) => {
    if (colors.categorie[cat.id]) return colors.categorie[cat.id]
    return cat.color || ["#FFB800","#FF3B30","#007AFF","#AF52DE","#34C759","#FF9500"][i % 6]
  }
  const euro = (n: number) => `€ ${Number(n).toFixed(2)}`

  const addToCart = (p: any, removedIngredients: string[] = [], extraList: any[] = []) => {
    const totalExtra = extraList.reduce((s: number, e: any) => s + e.price, 0)
    const cartItem = {...p, cartId: Date.now(), removedIngredients, extras: extraList, finalPrice: p.price + totalExtra }
    setCart(prev => [...prev, cartItem])
    setSelectedProduct(null)
  }

  const total = cart.reduce((s, p) => s + p.finalPrice, 0)
  const removeFromCart = (id: number) => setCart(prev => prev.filter(p => p.cartId!== id))

  if (showCart) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-black">IL TUO ORDINE 🛒</h1>
          <button onClick={() => setShowCart(false)} className="bg-gray-100 px-6 py-3 rounded-full font-bold text-black text-[18px]">✕ Chiudi</button>
        </div>
        {cart.length === 0? <p className="text-2xl text-gray-500 mt-20 text-center">Carrello vuoto</p> : (
          <>
            <div className="space-y-6">
              {cart.map((item: any) => (
                <div key={item.cartId} className="border-[3px] border-black rounded-[20px] p-6 bg-[#F9F9F9]">
                  <div className="flex justify-between items-start">
                    <h2 style={{ color: colors.testoProdotti }} className="font-black text-[32px] leading-tight">{item.name}</h2>
                    <button onClick={() => removeFromCart(item.cartId)} className="bg-red-500 text-white w-12 h-12 rounded-full font-black text-[20px]">✕</button>
                  </div>
                  <p style={{ color: colors.testoPrezzo }} className="text-[26px] font-black mt-3">{euro(item.finalPrice)}</p>
                  {item.removedIngredients?.length > 0 && <p className="text-[20px] text-red-600 font-black mt-3">SENZA: {item.removedIngredients.join(", ").toUpperCase()}</p>}
                  {item.extras?.length > 0 && <div className="mt-3">{item.extras.map((e: any) => <p key={e.name} style={{ color: colors.testoProdotti }} className="text-[22px]">+ {e.name} <span className="font-black">{euro(e.price)}</span></p>)}</div>}
                </div>
              ))}
            </div>
            <div className="mt-10 border-t-[4px] border-black pt-6">
              <div className="flex justify-between items-center"><p className="text-[28px] font-bold text-gray-600">TOTALE:</p><p style={{ color: colors.testoPrezzo }} className="text-[56px] font-black">{euro(total)}</p></div>
              <button style={{ backgroundColor: colors.bottoneCarrello }} className="w-full mt-8 text-white py-6 rounded-full font-black text-[30px]">CONFERMA ORDINE 🛒</button>
              <button onClick={() => setShowCart(false)} className="w-full mt-4 bg-white border-[3px] border-black text-black py-4 rounded-full font-bold text-[22px]">Aggiungi altri prodotti</button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: colors.sfondo }} className="min-h-screen p-8 pb-40">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-4xl font-black text-black">Dalla Prof</h1>
        <button onClick={handleGearClick} className="bg-white border-2 border-black w-14 h-14 rounded-full flex items-center justify-center text-[28px]">⚙️</button>
      </div>

      {!selectedCategory? (
        <>
          <p className="text-gray-600 mb-8 text-[20px]">Scegli una categoria</p>
          <div className="grid grid-cols-3 gap-5">
            {categories.map((cat: any, i: number) => {
              const catColor = getCategoryColor(cat, i)
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ backgroundColor: catColor }} className="h-36 rounded-[24px] flex items-center justify-center shadow-md active:scale-95 border-0">
                  <span style={{ color: colors.testoCategorie }} className="font-black text-[24px] text-center px-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{cat.name.toUpperCase()}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {(() => {
            const currentCat = categories.find((c: any) => c.id === selectedCategory)
            const filtered = products.filter((p: any) => p.category_id === selectedCategory).sort((a: any,b: any) => a.position - b.position)
            const color = getCategoryColor(currentCat, categories.indexOf(currentCat))
            return (
              <>
                <button onClick={() => setSelectedCategory(null)} style={{ backgroundColor: color }} className="mb-6 px-6 py-3 rounded-full font-bold text-[20px]" >
                  <span style={{ color: colors.testoCategorie }}>← {currentCat?.name}</span>
                </button>
                <div className="grid grid-cols-2 gap-4">
                  {filtered.map((p: any) => (
                    <button key={p.id} disabled={p.sold_out} onClick={() => setSelectedProduct(p)} className="bg-white rounded-[20px] p-5 shadow-sm border-2 border-gray-100 text-left active:scale-95">
                      <h3 style={{ color: colors.testoProdotti }} className="font-black text-[22px]">{p.name}</h3>
                      <p className="text-gray-700 text-[16px] mt-1">{p.description}</p>
                      <p style={{ color: colors.testoPrezzo }} className="font-black text-[24px] mt-3">{euro(p.price)}</p>
                    </button>
                  ))}
                </div>
              </>
            )
          })()}
        </>
      )}

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} euro={euro} colors={colors} />}

      {cart.length > 0 && (
        <div style={{ backgroundColor: colors.bottoneCarrello }} className="fixed bottom-0 left-0 right-0 text-white p-6 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          <div><p className="text-[18px] opacity-90">{cart.length} prodotti</p><p className="font-black text-[36px]">{euro(total)}</p></div>
          <button onClick={() => setShowCart(true)} className="bg-white text-black px-8 py-5 rounded-full font-black text-[24px]">🛒 VEDI CARRELLO</button>
        </div>
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-8">
            <h2 className="font-black text-[24px] text-black text-center mb-2">🔒 Area riservata</h2>
            <input type="password" inputMode="numeric" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkPassword()} placeholder="Password" className="w-full border-[3px] border-black rounded-full px-6 py-4 text-[24px] font-black text-center tracking-[0.5em] text-black" autoFocus />
            {passwordError && <p className="text-red-500 font-bold text-center mt-3">Password errata!</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPasswordPrompt(false)} className="flex-1 bg-gray-100 py-4 rounded-full font-bold text-black">Annulla</button>
              <button onClick={checkPassword} className="flex-1 bg-black text-white py-4 rounded-full font-black">ENTRA</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[24px] p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-[24px] text-black">🎨 Personalizza</h2>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-gray-100 rounded-full font-black text-black">✕</button>
            </div>

            <div className="space-y-5">
              <p className="font-black text-[13px] text-gray-500 uppercase">Bottoni</p>
              <div className="flex justify-between items-center border-2 p-3 rounded-xl"><p className="font-bold text-black">Sfondo bottone AGGIUNGI 🛒</p><input type="color" value={colors.bottoneAggiungi} onChange={(e) => saveColor("bottoneAggiungi", e.target.value)} className="w-14 h-14 rounded-xl" /></div>
              <div className="flex justify-between items-center border-2 p-3 rounded-xl"><p className="font-bold text-black">Sfondo CARRELLO</p><input type="color" value={colors.bottoneCarrello} onChange={(e) => saveColor("bottoneCarrello", e.target.value)} className="w-14 h-14 rounded-xl" /></div>

              <p className="font-black text-[13px] text-gray-500 uppercase pt-3">Testi</p>
              <div className="flex justify-between items-center border-2 p-3 rounded-xl bg-yellow-50"><div><p className="font-bold text-black">Testo CATEGORIE</p><p className="text-xs text-gray-500">Colore scritta su bottone categoria</p></div><input type="color" value={colors.testoCategorie} onChange={(e) => saveColor("testoCategorie", e.target.value)} className="w-14 h-14 rounded-xl" /></div>
              <div className="flex justify-between items-center border-2 p-3 rounded-xl"><div><p className="font-bold text-black">Testo NOME prodotto</p></div><input type="color" value={colors.testoProdotti} onChange={(e) => saveColor("testoProdotti", e.target.value)} className="w-14 h-14 rounded-xl" /></div>
              <div className="flex justify-between items-center border-2 p-3 rounded-xl"><div><p className="font-bold text-black">Testo PREZZO</p></div><input type="color" value={colors.testoPrezzo} onChange={(e) => saveColor("testoPrezzo", e.target.value)} className="w-14 h-14 rounded-xl" /></div>

              <p className="font-black text-[13px] text-gray-500 uppercase pt-3">Sfondo categorie (si aggiorna da solo)</p>
              {categories.map((cat: any, i: number) => {
                const currentColor = getCategoryColor(cat, i)
                return (
                  <div key={cat.id} className="flex justify-between items-center border-2 p-3 rounded-xl">
                    <div className="flex items-center gap-3"><div style={{ backgroundColor: currentColor }} className="w-8 h-8 rounded-full border"></div><p className="font-bold text-black text-[15px]">{cat.name}</p></div>
                    <input type="color" value={currentColor} onChange={(e) => saveCategoriaColor(cat.id, e.target.value)} className="w-14 h-14 rounded-xl" />
                  </div>
                )
              })}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => { localStorage.removeItem("dallaprof_colors"); setColors(DEFAULT_COLORS) }} className="bg-gray-100 py-3 rounded-full font-bold text-black">Resetta</button>
                <button onClick={() => setShowSettings(false)} style={{ backgroundColor: colors.bottoneAggiungi }} className="text-white py-3 rounded-full font-black">FATTO ✓</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductModal({ product, onClose, onAdd, euro, colors }: any) {
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
          <h2 style={{ color: colors.testoProdotti }} className="font-black text-[36px]">{product.name}</h2>
          <p className="text-gray-700 mt-2 text-[20px]">{product.description}</p>
          <p style={{ color: colors.testoPrezzo }} className="font-black text-[28px] mt-3">{euro(product.price)}</p>
          {ingredients.length > 0 && (
            <div className="mt-6">
              <p className="font-black text-[22px] mb-3 text-black">Togli dalla preparazione:</p>
              <div className="space-y-3">
                {ingredients.map((ing: string) => {
                  const isRemoved = removed.includes(ing)
                  return <label key={ing} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isRemoved? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}><span className={`font-bold text-[20px] ${isRemoved? 'line-through text-red-600' : 'text-black'}`}>{ing}</span><input type="checkbox" checked={isRemoved} onChange={() => toggleRemove(ing)} className="w-7 h-7 accent-red-600" /></label>
                })}
              </div>
            </div>
          )}
          {extras.length > 0 && (
            <div className="mt-8">
              <p className="font-black text-[22px] mb-3 text-black">Aggiungi extra:</p>
              <div className="space-y-3">
                {extras.map((e: any) => {
                  const isSelected =!!selectedExtras.find(x => x.name === e.name)
                  return <label key={e.name} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isSelected? 'border-black bg-gray-100' : 'border-gray-300 bg-white'}`}><span style={{ color: colors.testoProdotti }} className="font-bold text-[20px] flex items-center"><input type="checkbox" checked={isSelected} onChange={() => toggleExtra(e)} className="mr-3 w-7 h-7 accent-black" />{e.name}</span><span style={{ color: colors.testoPrezzo }} className="font-black text-[20px]">+ {euro(e.price)}</span></label>
                })}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t-2 bg-white">
          <button onClick={() => onAdd(product, removed, selectedExtras)} style={{ backgroundColor: colors.bottoneAggiungi }} className="w-full text-white py-5 rounded-full font-black text-[26px] shadow-lg">AGGIUNGI 🛒 {euro(product.price + extraTotal)}</button>
          <button onClick={onClose} className="w-full mt-3 text-gray-500 py-2 text-[18px]">Chiudi</button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
