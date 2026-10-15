import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions, euro } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])

  if (isLoading) return <div className="p-10">Caricamento...</div>
  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []

  if (!selectedCategory) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-3xl font-black mb-6">Dalla Prof - DEBUG</h1>
        <div className="grid grid-cols-3 gap-4">
          {categories.map((c:any) => (
            <button key={c.id} onClick={() => setSelectedCategory(c.id)} className="h-32 bg-white border-2 rounded-2xl font-bold">
              {c.name || c.title || JSON.stringify(c).slice(0,30)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const filtered = products.filter((p:any) => p.category_id === selectedCategory)

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <button onClick={() => setSelectedCategory(null)} className="mb-6 bg-black text-white px-6 py-3 rounded-full">← Indietro</button>

      <h2 className="font-black mb-4">Prodotti trovati: {filtered.length}</h2>

      {filtered.map((p:any) => (
        <div key={p.id} className="bg-white p-4 mb-4 rounded-xl border-2">
          <p className="font-black text-red-600">COSA C'E' DENTRO IL TUO PRODOTTO:</p>
          <pre className="text-[11px] bg-black text-green-400 p-3 rounded mt-2 overflow-auto">
            {JSON.stringify(p, null, 2)}
          </pre>
        </div>
      ))}

      <div className="mt-10 bg-yellow-100 p-4 rounded">
        <p className="font-bold">Fai uno screenshot di questo riquadro nero e mandamelo!</p>
        <p>Così vedo il nome esatto di nome, prezzo, descrizione nel tuo Supabase</p>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
