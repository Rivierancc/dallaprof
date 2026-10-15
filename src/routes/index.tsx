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

  useEffect(() => {
    const saved = localStorage.getItem("dallaprof_colors")
    if (saved) {
      const parsed = JSON.parse(saved)
      setColors({...DEFAULT_COLORS,...parsed, categorie: parsed.categorie || {} })
    }
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

  const printScontrino = (order: any) => {
    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) return
    const itemsHtml = order.items.map((it: any) => `
      <div style="display:flex;justify-content:space-between;margin:6px 0"><span>${it.name}</span><span style="font-weight:900">€${Number(it.finalPrice).toFixed(2)}</span></div>
    `).join('')
    win.document.write(`
      <html><head><title>Scontrino</title><style>
        body{font-family:monospace;width:280px;padding:10px;color:black}
        h1{text-align:center;font-size:22px;margin:0}
       .center{text-align:center}
        hr{border:1px dashed black}
       .big{font-size:26px;font-weight:900;text-align:center;margin:10px 0}
       .tipo{font-size:18px;font-weight:900;text-align:center;background:black;color:white;padding:8px;border-radius:10px;margin:10px 0}
      </style></head>
      <body>
        <h1>DALLA PROF</h1><div class="center">Albenga</div><hr/>
        <div class="center">${new Date().toLocaleString()}</div>
        <div class="big">#${order.id}</div>
        <div class="tipo">${order.order_type==='qui'?'🍽️ MANGIA QUI':'🥡 ASPORTO'}</div><hr/>
        ${itemsHtml}<hr/>
        <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:900"><span>TOTALE</span><span>€${Number(order.total).toFixed(2)}</span></div><hr/>
        <div class="center" style="font-weight:900;font-size:16px">VAI ALLA CASSA PER PAGARE</div>
        <script>window.onload=()=>{window.print(); setTimeout(()=>window.close(),500)}</script>
      </body></html>
    `)
    win.document.close()
  }

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.from("orders").insert([{
        items: orderData.items,
        total: orderData.total,
        order_type: orderData.type,
        status: "in_attesa_cassa",
        created_at: new Date().toISOString(),
      }]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      printScontrino(data)
      setCart([]); setShowCart(false); setSelectedCategory(null); setOrderType(null)
      alert(`Ordine #${data.id} inviato in cassa! Scontrino in stampa...`)
    },
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-black">Caricamento...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []
  const getCategoryColor = (cat: any, i: number) => {
    if (colors.categorie[cat.id]) return colors.categorie[cat.id]
    return cat.color || ["#FFB800","#FF3B30","#007AFF","#AF52DE","#34C759","#FF9500"][i % 6]
  }
  const euro = (n: number) => `€ ${Number(n).toFixed(2)}`
  const addToCart = (p: any, removed: string[] = [], extras: any[] = []) => {
    const totalExtra = extras.reduce((s: number, e: any) => s + e.price, 0)
    setCart(prev => [...prev, {...p, cartId: Date.now(), removedIngredients: removed, extras, finalPrice: p.price + totalExtra }])
    setSelectedProduct(null)
  }
  const total = cart.reduce((s, p) => s + p.finalPrice, 0)

  // SCELTA MANGIA QUI / ASPORTO
  if (!orderType) {
    return (
      <div style={{ backgroundColor: colors.sfondo }} className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-[48px] font-black text-black text-center leading-none mb-2">Dalla Prof</h1>
        <p className="text-[22px] text-gray-600 mb-12 text-center">Come vuoi gustarlo?</p>
        <div className="w-full max-w-md space-y-6">
          <button onClick={() => setOrderType("qui")} className="w-full bg-white border-[4px] border-black rounded-[32px] p-8 flex items-center gap-6 shadow-[8px_8px_0px_black]"><div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-[40px]">🍽️</div><div className="text-left"><p className="font-black text-[28px] text-black">MANGIA QUI</p></div></button>
          <button onClick={() => setOrderType("asporto")} className="w-full bg-black border-[4px] border-black rounded-[32px] p-8 flex items-center gap-6 shadow-[8px_8px_0px_#FFB800]"><div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[40px]">🥡</div><div className="text-left"><p className="font-black text-[28px] text-white">ASPORTO</p></div></button>
        </div>
      </div>
    )
  }

  if (showCart) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="flex justify-between items-center mb-8"><span className={`px-4 py-2 rounded-full font-black ${orderType==='qui'?'bg-black text-white':'bg-yellow-400 text-black'}`}>{orderType==='qui'?'🍽️ QUI':'🥡 ASPORTO'}</span><button onClick={() => setShowCart(false)} className="bg-gray-100 px-6 py-3 rounded-full font-bold text-black">✕ Chiudi</button></div>
        <h1 className="text-4xl font-black text-black mb-8">IL TUO ORDINE 🛒</h1>
        <div className="space-y-4">{cart.map((item: any) => <div key={item.cartId} className="border-[3px] border-black rounded-[20px] p-5 flex justify-between"><div><h2 className="font-black text-[24px] text-black">{item.name}</h2><p className="bg-black text-white inline-block px-3 py-1 rounded-full font-black mt-2">{euro(item.finalPrice)}</p></div><button onClick={() => setCart(prev => prev.filter(p => p.cartId!== item.cartId))} className="bg-red-500 text-white w-12 h-12 rounded-full font-black">✕</button></div>)}</div>
        <div className="mt-10 border-t-[4px] border-black pt-6">
          <div className="flex justify-between items-center"><p className="text-[28px] font-bold text-gray-600">TOTALE:</p><p className="text-[56px] font-black text-black">{euro(total)}</p></div>
          <button onClick={() => createOrderMutation.mutate({ items: cart, total, type: orderType })} disabled={createOrderMutation.isPending} style={{ backgroundColor: colors.bottoneCarrello }} className="w-full mt-8 text-white py-6 rounded-full font-black text-[30px]">{createOrderMutation.isPending? "STAMPA..." : "CONFERMA E STAMPA 🖨️"}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: colors.sfondo }} className="min-h-screen p-8 pb-40">
      <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-3"><h1 className="text-3xl font-black text-black">Dalla Prof</h1><button onClick={() => setOrderType(null)} className={`px-4 py-1 rounded-full font-black text-[12px] border-2 border-black ${orderType==='qui'?'bg-black text-white':'bg-yellow-400 text-black'}`}>{orderType==='qui'?'🍽️ QUI':'🥡 ASPORTO'} ▼</button></div><button onClick={() => setShowSettings(true)} className="bg-white border-2 border-black w-12 h-12 rounded-full flex items-center justify-center">⚙️</button></div>
      {!selectedCategory? (
        <div className="grid grid-cols-3 gap-5 mt-8">{categories.map((cat: any, i: number) => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ backgroundColor: getCategoryColor(cat, i) }} className="h-36 rounded-[24px] flex items-center justify-center shadow-md"><span style={{ color: colors.testoCategorie }} className="font-black text-[24px] text-center px-2">{cat.name.toUpperCase()}</span></button>)}</div>
      ) : (
        <>
          {(() => {
            const currentCat = categories.find((c: any) => c.id === selectedCategory)
            const filtered = products.filter((p: any) => p.category_id === selectedCategory)
            const color = getCategoryColor(currentCat, categories.indexOf(currentCat))
            return (
              <>
                <button onClick={() => setSelectedCategory(null)} style={{ backgroundColor: color }} className="mb-6 px-6 py-3 rounded-full font-bold text-[20px]"><span style={{ color: colors.testoCategorie }}>← {currentCat?.name}</span></button>
                <div className="grid grid-cols-2 gap-5">{filtered.map((p: any) => <button key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white rounded-[24px] p-5 shadow border-2 border-gray-100 text-left flex flex-col justify-between min-h-[160px]"><div><h3 style={{ color: colors.testoProdotti }} className="font-black text-[22px]">{p.name}</h3><p className="text-gray-600 text-[15px] mt-2">{p.description}</p></div><div className="mt-4"><span className="bg-black text-white font-black text-[22px] px-4 py-2 rounded-full inline-block">{euro(p.price)}</span></div></button>)}</div>
              </>
            )
          })()}
        </>
      )}
      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} euro={euro} colors={colors} />}
      {cart.length > 0 && <div style={{ backgroundColor: colors.bottoneCarrello }} className="fixed bottom-0 left-0 right-0 text-white p-6 flex justify-between items-center"><div><p className="text-[18px] opacity-90">{cart.length} prodotti • {orderType==='qui'?'🍽️ QUI':'🥡 ASPORTO'}</p><p className="font-black text-[36px]">{euro(total)}</p></div><button onClick={() => setShowCart(true)} className="bg-white text-black px-8 py-5 rounded-full font-black text-[24px]">🛒 VEDI CARRELLO</button></div>}
      {showSettings && <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"><div className="bg-white w-full max-w-lg rounded-[24px] p-6"><div className="flex justify-between items-center mb-6"><h2 className="font-black text-[24px] text-black">🎨 Personalizza</h2><button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-gray-100 rounded-full font-black text-black">✕</button></div>{categories.map((cat: any, i: number) => { const currentColor = getCategoryColor(cat, i); return <div key={cat.id} className="flex justify-between items-center border-2 p-3 rounded-xl mb-3"><div className="flex items-center gap-3"><div style={{ backgroundColor: currentColor }} className="w-8 h-8 rounded-full border"></div><p className="font-bold text-black">{cat.name}</p></div><input type="color" value={currentColor} onChange={(e) => saveCategoriaColor(cat.id, e.target.value)} className="w-14 h-14 rounded-xl" /></div> })}<button onClick={() => setShowSettings(false)} className="w-full mt-4 bg-black text-white py-3 rounded-full font-black">FATTO ✓</button></div></div>}
    </div>
  )
}

function ProductModal({ product, onClose, onAdd, euro, colors }: any) {
  const [removed, setRemoved] = useState<string[]>([])
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-[32px] max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-auto flex-1">
          <h2 className="font-black text-[36px] text-black">{product.name}</h2>
          <p className="text-gray-700 mt-2 text-[20px]">{product.description}</p>
          <div className="mt-3 bg-black text-white font-black text-[28px] px-5 py-2 rounded-full inline-block">{euro(product.price)}</div>
        </div>
        <div className="p-6 border-t-2 bg-white">
          <button onClick={() => onAdd(product, removed, [])} style={{ backgroundColor: colors.bottoneAggiungi }} className="w-full text-white py-5 rounded-full font-black text-[26px]">AGGIUNGI 🛒 {euro(product.price)}</button>
          <button onClick={onClose} className="w-full mt-3 text-gray-500 py-2">Chiudi</button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
