import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { menuQueryOptions } from "@/lib/menu"
import { supabase } from "@/lib/supabase"

const DEFAULT_COLORS = {
  bottoneAggiungi: "#000000",
  bottoneCarrello: "#000000",
  sfondo: "#F5F5F7",
  testoCategorie: "#FFFFFF",
  testoProdotti: "#000000",
  categorie: {} as Record<string, string>,
}
const DEFAULT_PASSWORD = "1234"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const queryClient = useQueryClient()
  const [orderType, setOrderType] = useState<null | "qui" | "asporto">(null)
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
  const [orderSuccess, setOrderSuccess] = useState<any>(null)

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
  const handleGearClick = () => { setPasswordInput(""); setPasswordError(false); setShowPasswordPrompt(true) }
  const checkPassword = () => {
    if (passwordInput === savedPassword) { setShowPasswordPrompt(false); setShowSettings(true) }
    else setPasswordError(true)
  }

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase
      .from("orders")
      .insert([{
          items: orderData.items,
          total: orderData.total,
          order_type: orderData.type,
          status: "in_attesa_cassa", // CORRETTO: non va in cucina finché non paghi!
          created_at: new Date().toISOString(),
        }])
      .select()
      .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setOrderSuccess({ id: data.id, total: data.total, type: data.order_type })
      try { navigator.vibrate([200, 100, 200]) } catch {}
      setTimeout(() => {
        setOrderSuccess(null)
        setCart([])
        setShowCart(false)
        setSelectedCategory(null)
        setOrderType(null)
      }, 8000)
    },
    onError: (err) => {
      console.error(err)
      alert("Errore invio ordine alla cassa: " + (err as any).message)
    }
  })

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
  const confirmOrder = () => {
    if (cart.length === 0) return
    createOrderMutation.mutate({ items: cart, total: total, type: orderType })
  }

  // SCHERMATA CORRETTA - VAI ALLA CASSA, NON IN PREPARAZIONE
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#FFB800] text-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-[50px] mb-6 text-white">🛒</div>
        <h1 className="text-[42px] font-black leading-none">ORDINE<br/>RICEVUTO!</h1>
        <div className="mt-6 bg-black text-white rounded-[24px] px-10 py-6">
          <p className="text-[18px] opacity-70">NUMERO ORDINE</p>
          <p className="font-black text-[56px] leading-none">#{orderSuccess.id}</p>
          <p className="font-bold text-[22px] mt-2">{orderSuccess.type==='qui'?'🍽️ MANGIA QUI':'🥡 ASPORTO'} - {euro(orderSuccess.total)}</p>
        </div>
        <div className="mt-8 bg-white border-[3px] border-black rounded-[20px] p-6 w-full max-w-sm">
          <p className="font-black text-[24px] text-black">👉 VAI ALLA CASSA</p>
          <p className="text-[18px] text-gray-700 mt-2">Mostra questo numero alla cassa per pagare.<br/><span className="font-black text-black">L'ordine NON è ancora in preparazione.</span><br/>Partirà in cucina solo dopo il pagamento.</p>
        </div>
        <p className="mt-6 text-[16px] opacity-60">Si chiude tra 8 secondi...</p>
      </div>
    )
  }

  if (!orderType) {
    return (
      <div style={{ backgroundColor: colors.sfondo }} className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="absolute top-6 right-6"><button onClick={handleGearClick} className="bg-white border-2 border-black w-14 h-14 rounded-full flex items-center justify-center text-[28px]">⚙️</button></div>
        <h1 className="text-[48px] font-black text-black text-center leading-none mb-2">Dalla Prof</h1>
        <p className="text-[22px] text-gray-600 mb-12 text-center">Come vuoi gustarlo?</p>
        <div className="w-full max-w-md space-y-6">
          <button onClick={() => setOrderType("qui")} className="w-full bg-white border-[4px] border-black rounded-[32px] p-8 flex items-center gap-6 shadow-[8px_8px_0px_black]"><div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-[40px]">🍽️</div><div className="text-left"><p className="font-black text-[28px] text-black">MANGIA QUI</p><p className="text-gray-500">Servito al tavolo</p></div></button>
          <button onClick={() => setOrderType("asporto")} className="w-full bg-black border-[4px] border-black rounded-[32px] p-8 flex items-center gap-6 shadow-[8px_8px_0px_#FFB800]"><div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[40px]">🥡</div><div className="text-left"><p className="font-black text-[28px] text-white">ASPORTO</p><p className="text-gray-300">Da portare via</p></div></button>
        </div>
        {showPasswordPrompt && <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6"><div className="bg-white w-full max-w-sm rounded-[24px] p-8"><h2 className="font-black text-[24px] text-black text-center mb-2">🔒 Area riservata</h2><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkPassword()} className="w-full border-[3px] border-black rounded-full px-6 py-4 text-[24px] font-black text-center text-black" autoFocus />{passwordError && <p className="text-red-500 text-center mt-3">Password errata!</p>}<div className="flex gap-3 mt-6"><button onClick={() => setShowPasswordPrompt(false)} className="flex-1 bg-gray-100 py-4 rounded-full font-bold text-black">Annulla</button><button onClick={checkPassword} className="flex-1 bg-black text-white py-4 rounded-full font-black">ENTRA</button></div></div></div>}
        {showSettings && <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"><div className="bg-white w-full max-w-lg rounded-[24px] p-6 max-h-[90vh] overflow-auto"><div className="flex justify-between items-center mb-6"><h2 className="font-black text-[24px] text-black">🎨 Personalizza</h2><button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-gray-100 rounded-full font-black text-black">✕</button></div><div className="space-y-4">{categories.map((cat: any, i: number) => { const currentColor = getCategoryColor(cat, i); return <div key={cat.id} className="flex justify-between items-center border-2 p-3 rounded-xl"><div className="flex items-center gap-3"><div style={{ backgroundColor: currentColor }} className="w-8 h-8 rounded-full border"></div><p className="font-bold text-black">{cat.name}</p></div><input type="color" value={currentColor} onChange={(e) => saveCategoriaColor(cat.id, e.target.value)} className="w-14 h-14 rounded-xl" /></div> })}<button onClick={() => setShowSettings(false)} style={{ backgroundColor: colors.bottoneAggiungi }} className="w-full text-white py-3 rounded-full font-black">FATTO ✓</button></div></div></div>}
      </div>
    )
  }

  if (showCart) {
    return (
      <div className="min-h-screen bg-white p-8 pb-40">
        <div className="flex justify-between items-center mb-2"><span className={`px-4 py-2 rounded-full font-black text-[14px] ${orderType==='qui'?'bg-black text-white':'bg-yellow-400 text-black'}`}>{orderType==='qui'?'🍽️ QUI':'🥡 ASPORTO'}</span><button onClick={() => setShowCart(false)} className="bg-gray-100 px-6 py-3 rounded-full font-bold text-black">✕ Chiudi</button></div>
        <h1 className="text-4xl font-black text-black mt-4 mb-8">IL TUO ORDINE 🛒</h1>
        {cart.length === 0? <p className="text-2xl text-gray-500 mt-20 text-center">Carrello vuoto</p> : (
          <>
            <div className="space-y-4">
              {cart.map((item: any) => (
                <div key={item.cartId} className="border-[3px] border-black rounded-[20px] p-5 bg-[#F9F9F9] flex justify-between"><div><h2 className="font-black text-[24px] text-black">{item.name}</h2><p className="bg-black text-white inline-block px-3 py-1 rounded-full font-black mt-2">{euro(item.finalPrice)}</p></div><button onClick={() => removeFromCart(item.cartId)} className="bg-red-500 text-white w-12 h-12 rounded-full font-black">✕</button></div>
              ))}
            </div>
            <div className="mt-10 border-t-[4px] border-black pt-6">
              <div className="flex justify-between items-center"><p className="text-[28px] font-bold text-gray-600">TOTALE:</p><p className="text-[56px] font-black text-black">{euro(total)}</p></div>
              <button onClick={confirmOrder} disabled={createOrderMutation.isPending} style={{ backgroundColor: colors.bottoneCarrello }} className="w-full mt-8 text-white py-6 rounded-full font-black text-[30px] shadow-xl active:scale-95 disabled:opacity-50">
                {createOrderMutation.isPending? "INVIO..." : `CONFERMA ${orderType==='qui'?'🍽️':'🥡'} 🛒`}
              </button>
              <p className="text-center text-[14px] text-gray-500 mt-3">Verrà inviato alla Cassa per il pagamento</p>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: colors.sfondo }} className="min-h-screen p-8 pb-40">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3"><h1 className="text-3xl font-black text-black">Dalla Prof</h1><button onClick={() => setOrderType(null)} className={`px-4 py-1 rounded-full font-black text-[12px] border-2 border-black ${orderType==='qui'?'bg-black text-white':'bg-yellow-400 text-black'}`}>{orderType==='qui'?'🍽️ QUI':'🥡 ASPORTO'} ▼</button></div>
        <button onClick={handleGearClick} className="bg-white border-2 border-black w-12 h-12 rounded-full flex items-center justify-center text-[24px]">⚙️</button>
      </div>
      {!selectedCategory? (
        <>
          <p className="text-gray-600 mb-8 text-[20px]">Scegli una categoria</p>
          <div className="grid grid-cols-3 gap-5">
            {categories.map((cat: any, i: number) => {
              const catColor = getCategoryColor(cat, i)
              return <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ backgroundColor: catColor }} className="h-36 rounded-[24px] flex items-center justify-center shadow-md"><span style={{ color: colors.testoCategorie }} className="font-black text-[24px] text-center px-2">{cat.name.toUpperCase()}</span></button>
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
                <button onClick={() => setSelectedCategory(null)} style={{ backgroundColor: color }} className="mb-6 px-6 py-3 rounded-full font-bold text-[20px]"><span style={{ color: colors.testoCategorie }}>← {currentCat?.name}</span></button>
                <div className="grid grid-cols-2 gap-5">
                  {filtered.map((p: any) => (
                    <button key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white rounded-[24px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-2 border-gray-100 text-left active:scale-95 flex flex-col justify-between min-h-[160px]">
                      <div><h3 style={{ color: colors.testoProdotti }} className="font-black text-[22px] leading-tight">{p.name}</h3><p className="text-gray-600 text-[15px] mt-2 line-clamp-3">{p.description}</p></div>
                      <div className="mt-4"><span className="bg-black text-white font-black text-[22px] px-4 py-2 rounded-full inline-block">{euro(p.price)}</span></div>
                    </button>
                  ))}
                </div>
              </>
            )
          })()}
        </>
      )}
      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} euro={euro} colors={colors} />}
      {cart.length > 0 && <div style={{ backgroundColor: colors.bottoneCarrello }} className="fixed bottom-0 left-0 right-0 text-white p-6 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.3)]"><div><p className="text-[18px] opacity-90">{cart.length} prodotti • {orderType==='qui'?'🍽️ QUI':'🥡 ASPORTO'}</p><p className="font-black text-[36px]">{euro(total)}</p></div><button onClick={() => setShowCart(true)} className="bg-white text-black px-8 py-5 rounded-full font-black text-[24px]">🛒 VEDI CARRELLO</button></div>}
      {showPasswordPrompt && <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6"><div className="bg-white w-full max-w-sm rounded-[24px] p-8"><h2 className="font-black text-[24px] text-black text-center mb-2">🔒 Area riservata</h2><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkPassword()} placeholder="Password" className="w-full border-[3px] border-black rounded-full px-6 py-4 text-[24px] font-black text-center text-black" autoFocus />{passwordError && <p className="text-red-500 text-center mt-3">Password errata!</p>}<div className="flex gap-3 mt-6"><button onClick={() => setShowPasswordPrompt(false)} className="flex-1 bg-gray-100 py-4 rounded-full font-bold text-black">Annulla</button><button onClick={checkPassword} className="flex-1 bg-black text-white py-4 rounded-full font-black">ENTRA</button></div></div></div>}
      {showSettings && <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"><div className="bg-white w-full max-w-lg rounded-[24px] p-6 max-h-[90vh] overflow-auto"><div className="flex justify-between items-center mb-6"><h2 className="font-black text-[24px] text-black">🎨 Personalizza</h2><button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-gray-100 rounded-full font-black text-black">✕</button></div><div className="space-y-4"><div className="flex justify-between items-center border-2 p-3 rounded-xl"><p className="font-bold text-black">Sfondo AGGIUNGI 🛒</p><input type="color" value={colors.bottoneAggiungi} onChange={(e) => saveColor("bottoneAggiungi", e.target.value)} className="w-14 h-14 rounded-xl" /></div><div className="flex justify-between items-center border-2 p-3 rounded-xl"><p className="font-bold text-black">Sfondo CARRELLO</p><input type="color" value={colors.bottoneCarrello} onChange={(e) => saveColor("bottoneCarrello", e.target.value)} className="w-14 h-14 rounded-xl" /></div>{categories.map((cat: any, i: number) => { const currentColor = getCategoryColor(cat, i); return <div key={cat.id} className="flex justify-between items-center border-2 p-3 rounded-xl"><div className="flex items-center gap-3"><div style={{ backgroundColor: currentColor }} className="w-8 h-8 rounded-full border"></div><p className="font-bold text-black text-[15px]">{cat.name}</p></div><input type="color" value={currentColor} onChange={(e) => saveCategoriaColor(cat.id, e.target.value)} className="w-14 h-14 rounded-xl" /></div> })}<button onClick={() => setShowSettings(false)} style={{ backgroundColor: colors.bottoneAggiungi }} className="w-full text-white py-3 rounded-full font-black">FATTO ✓</button></div></div></div>}
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
          <div className="mt-3 bg-black text-white font-black text-[28px] px-5 py-2 rounded-full inline-block">{euro(product.price)}</div>
          {ingredients.length > 0 && <div className="mt-6"><p className="font-black text-[22px] mb-3 text-black">Togli dalla preparazione:</p><div className="space-y-3">{ingredients.map((ing: string) => { const isRemoved = removed.includes(ing); return <label key={ing} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isRemoved? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}><span className={`font-bold text-[20px] ${isRemoved? 'line-through text-red-600' : 'text-black'}`}>{ing}</span><input type="checkbox" checked={isRemoved} onChange={() => toggleRemove(ing)} className="w-7 h-7 accent-red-600" /></label> })}</div></div>}
          {extras.length > 0 && <div className="mt-8"><p className="font-black text-[22px] mb-3 text-black">Aggiungi extra:</p><div className="space-y-3">{extras.map((e: any) => { const isSelected =!!selectedExtras.find(x => x.name === e.name); return <label key={e.name} className={`flex justify-between items-center border-2 p-4 rounded-xl ${isSelected? 'border-black bg-gray-100' : 'border-gray-300 bg-white'}`}><span className="text-black font-bold text-[20px] flex items-center"><input type="checkbox" checked={isSelected} onChange={() => toggleExtra(e)} className="mr-3 w-7 h-7 accent-black" />{e.name}</span><span className="font-black text-[20px] text-black">+ {euro(e.price)}</span></label> })}</div></div>}
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
