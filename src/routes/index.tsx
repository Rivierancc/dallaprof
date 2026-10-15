import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions } from "@/lib/menu"

const DEFAULT_COLORS = {
  bottoneAggiungi: "#000000",
  bottoneCarrello: "#000000",
  sfondo: "#F5F5F7",
}
const DEFAULT_PASSWORD = "1234" // CAMBIA QUI LA PASSWORD SE VUOI

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
    if (saved) setColors(JSON.parse(saved))
    const pwd = localStorage.getItem("dallaprof_pwd")
    if (pwd) setSavedPassword(pwd)
  }, [])

  const saveColor = (key: string, value: string) => {
    const newColors = {...colors, [key]: value }
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
                    <h2 className="font-black text-[32px] text-black leading-tight">{item.name}</h2>
                    <button onClick={() => removeFromCart(item.cartId)} className="bg-red-500 text-white w-12 h-12 rounded-full font-black text-[20px]">✕</button>
                  </div>
                  <p className="text-[26px] font-black text-black mt-3">{euro(item.finalPrice)}</p>
                  {item.removedIngredients?.length > 0 && <p className="text-[20px] text-red-600 font-black mt-3">SENZA: {item.removedIngredients.join(", ").toUpperCase()}</p>}
                  {item.extras?.length > 0 && <div className="mt-3">{item.extras.map((e: any) => <p key={e.name} className="text-[22px] text-black">+ {e.name} <span className="font-black">{euro(e.price)}</span></p>)}</div>}
                </div>
              ))}
            </div>
            <div className="mt-10 border-t-[4px] border-black pt-6">
              <div className="flex justify-between items-center"><p className="text-[28px] font-bold text-gray-600">TOTALE:</p><p className="text-[56px] font-black text-black">{euro(total)}</p></div>
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
              const catColor = getColor(cat, i)
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ borderColor: catColor, borderWidth: 2.5, backgroundColor: "white" }} className="h-36 rounded-[24px] flex items-center justify-center shadow-sm active:scale-95">
                  <span style={{ color: catColor }} className="font-black text-[22px] text-center px-2">{cat.name}</span>
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
            const color = getColor(currentCat, 0)
            return (
              <>
                <button onClick={() => setSelectedCategory(null)} style={{ backgroundColor: color }} className="mb-6 text-white px-6 py-3 rounded-full font-bold text-[20px]">← {currentCat?.name}</button>
                <div className="grid grid-cols-2 gap-4">
                  {filtered.map((p: any) => (
                    <button key={p.id} disabled={p.sold_out} onClick={() => setSelectedProduct(p)} className="bg-white rounded-[20px] p-5 shadow-sm border-2 border-gray-100 text-left active:scale-95">
                      <h3 className="font-black text-[22px] text-black">{p.name}</h3>
                      <p className="text-gray-700 text-[16px] mt-1">{p.description}</p>
                      <p className="font-black text-[24px] mt-3 text-black">{euro(p.price)}</p>
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

      {/* PROMPT PASSWORD */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-8">
            <h2 className="font-black text-[24px] text-black text-center mb-2">🔒 Area riservata</h2>
            <p className="text-center text-gray-500 mb-6">Inserisci password</p>
            <input type="password" inputMode="numeric" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkPassword()} placeholder="Password" className="w-full border-[3px] border-black rounded-full px-6 py-4 text-[24px] font-black text-center tracking-[0.5em] text-black" autoFocus />
            {passwordError && <p className="text-red-500 font-bold text-center mt-3">Password errata!</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPasswordPrompt(false)} className="flex-1 bg-gray-100 py-4 rounded-full font-bold text-black">Annulla</button>
              <button onClick={checkPassword} className="flex-1 bg-black text-white py-4 rounded-full font-black text-[18px]">ENTRA</button>
            </div>
          </div>
        </div>
      )}

      {/* PANNELLO COLORI PROTETTO */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[24px] p-8 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-[28px] text-black">🎨 Colori</h2>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-gray-100 rounded-full font-black">✕</button>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-center border-2 p-4 rounded-xl">
                <div><p className="font-bold text-black text-[18px]">Bottone AGGIUNGI 🛒</p><p className="text-sm text-gray-500">{colors.bottoneAggiungi}</p></div>
                <input type="color" value={colors.bottoneAggiungi} onChange={(e) => saveColor("bottoneAggiungi", e.target.value)} className="w-16 h-16 rounded-xl" />
              </div>
              <div className="flex justify-between items-center border-2 p-4 rounded-xl">
                <div><p className="font-bold text-black text-[18px]">Bottone CARRELLO</p><p className="text-sm text-gray-500">{colors.bottoneCarrello}</p></div>
                <input type="color" value={colors.bottoneCarrello} onChange={(e) => saveColor("bottoneCarrello", e.target.value)} className="w-16 h-16 rounded-xl" />
              </div>
              <div className="flex justify-between items-center border-2 p-4 rounded-xl">
                <div><p className="font-bold text-black text-[18px]">Sfondo</p><p className="text-sm text-gray-500">{colors.sfondo}</p></div>
                <input type="color" value={colors.sfondo} onChange={(e) => saveColor("sfondo", e.target.value)} className="w-16 h-16 rounded-xl" />
              </div>

              <div className="border-t pt-6 mt-6">
                <p className="font-black text-black mb-3">Cambia password:</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nuova password" id="newPwd" className="flex-1 border-2 border-black rounded-full px-4 py-3 font-bold text-black" />
                  <button onClick={() => {
                    const input = document.getElementById("newPwd") as HTMLInputElement
                    if (input.value.length >= 4) {
                      localStorage.setItem("dallaprof_pwd", input.value)
                      setSavedPassword(input.value)
                      alert("Password cambiata! Nuova: " + input.value)
                      input.value = ""
                    } else {
                      alert("Minimo 4 caratteri")
                    }
                  }} className="bg-black text-white px-6 py-3 rounded-full font-bold">Salva</button>
                </div>
                <p className="text-sm text-gray-500 mt-2">Attuale: {savedPassword}</p>
              </div>

              <button onClick={() => { setColors(DEFAULT_COLORS); localStorage.removeItem("dallaprof_colors") }} className="w-full bg-gray-100 py-3 rounded-full font-bold text-black">Ripristina colori default</button>
              <button onClick={() => setShowSettings(false)} style={{ backgroundColor: colors.bottoneAggiungi }} className="w-full text-white py-4 rounded-full font-black text-[20px]">FATTO ✓</button>
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
          <h2 className="font-black text-[36px] text-black">{product.name}</h2>
          <p className="text-gray-700 mt-2 text-[20px]">{product.description}</p>
          <p className="font-black text-[28px] mt-3 text-black">{euro(product.price)}</p>
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
                  return <label key={e.name} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isSelected? 'border-black bg-gray-100' : 'border-gray-300 bg-white'}`}><span className="text-black font-bold text-[20px] flex items-center"><input type="checkbox" checked={isSelected} onChange={() => toggleExtra(e)} className="mr-3 w-7 h-7 accent-black" />{e.name}</span><span className="font-black text-[20px] text-black">+ {euro(e.price)}</span></label>
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
