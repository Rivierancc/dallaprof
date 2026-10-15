import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions, euro } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold">Caricamento Dalla Prof...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []

  const getColor = (cat: any, i: number) => cat.color || ["#FFB800","#FF3B30","#007AFF","#AF52DE","#34C759","#FF9500"][i % 6]

  // === PAGINA 1: SOLO CATEGORIE ===
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-8">
        <h1 className="text-4xl font-black mb-2">Dalla Prof</h1>
        <p className="text-gray-500 mb-8">Scegli una categoria</p>
        <div className="grid grid-cols-3 gap-5">
          {categories.map((cat: any, i: number) => {
            const color = getColor(cat, i)
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                style={{ backgroundColor: "white", borderColor: color, borderWidth: 2.5 }}
                className="h-36 rounded-[24px] flex flex-col items-center justify-center shadow-sm active:scale-95 transition">
                <span style={{ color }} className="font-black text-[18px] text-center px-2">{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // === PAGINA 2: SOLO PRODOTTI DELLA CATEGORIA SCELTA ===
  const currentCat = categories.find((c:any) => c.id === selectedCategory)
  const filtered = products.filter((p: any) => p.category_id === selectedCategory)
  const color = getColor(currentCat, 0)

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6">
      <button onClick={() => setSelectedCategory(null)}
        style={{ backgroundColor: color }} className="mb-6 text-white px-6 py-3 rounded-full font-bold">
        ← {currentCat?.name}
      </button>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((p: any) => (
          <div key={p.id} className="bg-white rounded-[20px] p-5 shadow-sm border">
            <h3 className="font-bold text-[16px]">{p.name}</h3>
            {p.description && <p className="text-gray-500 text-[13px] mt-1 line-clamp-2">{p.description}</p>}
            <p className="font-black text-lg mt-3">{euro(p.price)}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 mt-20">Nessun prodotto in questa categoria</p>
      )}
    </div>
  )
}

export const Route = createFileRoute("/")({
  component: TotemPage,
})
