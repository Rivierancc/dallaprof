import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions, euro } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold">Caricamento...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []

  const getProductName = (p:any) => p.name || p.title || p.nome || p.label || p.product_name || p.nome_prodotto || "Prodotto senza nome"
  const getColor = (cat: any, i: number) => cat.color || ["#FFB800","#FF3B30","#007AFF","#AF52DE","#34C759","#FF9500"][i % 6]

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
                className="h-36 rounded-[24px] flex flex-col items-center justify-center shadow-sm active:scale-95">
                <span style={{ color }} className="font-black text-[18px] text-center px-2">{cat.name || cat.title}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const currentCat = categories.find((c:any) => c.id === selectedCategory)
  const filtered = products.filter((p: any) => p.category_id === selectedCategory)
  const color = getColor(currentCat, 0)

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6">
      <button onClick={() => setSelectedCategory(null)}
        style={{ backgroundColor: color }} className="mb-6 text-white px-6 py-3 rounded-full font-bold">
        ← {currentCat?.name || currentCat?.title}
      </button>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((p: any) => (
          <div key={p.id} className="bg-white rounded-[20px] p-5 shadow-sm border">
            <h3 className="font-black text-[17px]">{getProductName(p)}</h3>
            {p.description && <p className="text-gray-600 text-[14px] mt-1">{p.description}</p>}
            <p className="font-black text-lg mt-3">{euro(p.price)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: TotemPage })
