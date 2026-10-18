import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCustomer } from "@/components/customer-session"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Totem - Totem Burger" },
      { name: "description", content: "Ordina al totem: mangia qui o asporto, poi paga alla cassa" },
    ],
  }),
  component: Totem,
})

// MENU FISSO - EMERGENZA SENZA SUPABASE
const MENU_FISSO = [
  { id: '1', name: 'Dalla Prof Classic', price: 8.5, category: 'BURGER', image: '', description: 'Il nostro classico' },
  { id: '2', name: 'BBQ Burger', price: 9.5, category: 'BURGER', image: '', description: 'Con salsa BBQ' },
  { id: '3', name: 'Piadina Crudo e Squacquerone', price: 7.0, category: 'PIADINE', image: '', description: '' },
  { id: '4', name: 'Schiacciata Porchetta', price: 7.5, category: 'SCHIACCIATE', image: '', description: '' },
  { id: '5', name: 'Toast Prosciutto e Formaggio', price: 6.0, category: 'TOAST', image: '', description: '' },
  { id: '6', name: 'Hot Dog Classico', price: 5.5, category: 'HOT DOG', image: '', description: '' },
  { id: '7', name: 'Pan Porchetta', price: 8.0, category: 'PAN PORCHETTA', image: '', description: '' },
]

function Totem() {
  const [dineOption, setDineOption] = useState<"qui" | "asporto" | null>(null)
  const [activeCat, setActiveCat] = useState<string>("BURGER")
  const [cart, setCart] = useState<any[]>([])
  const navigate = useNavigate()
  const { t, language } = useCustomer() as any

  const categories = useMemo(() => {
    return Array.from(new Set(MENU_FISSO.map(p => p.category)))
  }, [])

  const filtered = useMemo(() => {
    return MENU_FISSO.filter(p => p.category === activeCat)
  }, [activeCat])

  const addToCart = (p: any) => {
    setCart(c => [...c, p])
  }

  if (!dineOption) {
    return (
      <main className="grid min-h-screen place-items-center p-8 pt-24">
        <div className="w-full max-w-[60rem] text-center">
          <h1 className="font-display text-9xl leading-none">{t?.where || "Dove mangi?"}</h1>
          <div className="mt-16 grid gap-8">
            <Button variant="ghost" onClick={() => setDineOption("qui")} className="whitespace-normal">
              <span className="text-8xl">🍽️</span><span className="font-display text-8xl">{t?.qui || "QUI"}</span>
            </Button>
            <Button variant="ghost" onClick={() => setDineOption("asporto")} className="whitespace-normal">
              <span className="text-8xl">🥡</span><span className="font-display text-8xl">{t?.asporto || "ASPORTO"}</span>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-8">
      <div className="flex gap-4 mb-8 overflow-x-auto">
        {categories.map(cat => (
          <Button key={cat} variant={activeCat === cat ? "default" : "outline"} onClick={() => setActiveCat(cat)}>
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {filtered.map(p => (
          <Button key={p.id} variant="ghost" onClick={() => addToCart(p)} className="h-auto flex-col p-4 border">
            <h3 className="font-display text-4xl">{p.name}</h3>
            <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1 font-bold">€{p.price.toFixed(2)}</span>
          </Button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center">
        <div>Carrello: {cart.length} - Tot: €{cart.reduce((s, i) => s + i.price, 0).toFixed(2)}</div>
        <Button onClick={() => {
          const orderId = Date.now().toString()
          alert(`Ordine ${orderId} - ${dineOption.toUpperCase()} - Vai in cassa! Tot €${cart.reduce((s,i)=>s+i.price,0).toFixed(2)}`)
          setCart([])
        }}>ORDINA - PAGA ALLA CASSA</Button>
      </div>
    </main>
  )
}
