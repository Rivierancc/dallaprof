import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { menuQueryOptions, euro } from "@/lib/menu"

function TotemPage() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any[]>([])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Caricamento Dalla Prof...</div>

  const categories = (data as any)?.categories || []
  const products = (data as any)?.products || []

  const filtered = selectedCategory ? products.filter((p: any) => p.category_id === selectedCategory) : products

  const getColor = (cat: any, i: number) => cat.color || ["#FFB800","#FF5723","#3498DB","#9B59B6"][i % 4]

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {categories.map((cat: any, i: number) => {
          const color = getColor(cat, i)
          const sel = selectedCategory === cat.id
          return (
            <button key={cat.id} onClick={() => setSelectedCategory(sel? null : cat.id)}
              style={{ backgroundColor: sel? color : color+"18", borderColor: color, color: sel? "white" : color }}
              className="p-6 rounded-2xl border-2 font-bold">
              {cat.name}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((p: any) => (
          <div key={p.id} className="bg-white border rounded-2xl p-4">
            <h3 className="font-bold">{p.name}</h3>
            {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
            <p className="font-black mt-2">{euro(p.price)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({
  component: TotemPage,
})
