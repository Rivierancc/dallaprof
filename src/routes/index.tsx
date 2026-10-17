import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { menuQueryOptions, type Category, type CartItem, type Product, euro } from "@/lib/menu"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useCustomer } from "@/components/customer-session"
import { Button } from "@/components/ui/button"
import { copy, descriptionFor, orderPayload, type PaymentMethod } from "@/lib/customer"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Totem — Totem Burger" },
      { name: "description", content: "Ordina al totem: mangia qui o asporto, poi paga alla cassa." },
      { property: "og:title", content: "Totem — Totem Burger" },
      { property: "og:description", content: "Ordina al totem: mangia qui o asporto, poi paga alla cassa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Totem,
})

function Totem() {
  const { data, isLoading } = useQuery(menuQueryOptions)
  const queryClient = useQueryClient()
  const { language, orderType: dineOption, setOrderType: setDineOption } = useCustomer()
  const t = copy[language]
  const navigate = useNavigate()
  const [orderError, setOrderError] = useState("")
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [custom, setCustom] = useState<Product | null>(null)
  const [showCart, setShowCart] = useState(false)

  const categories = data?.categories?? []
  const products = useMemo(() => (data?.products?? []).filter((p) =>!p.sold_out), [data])
  const featured = useMemo(() => products.filter((p) => p.is_featured).slice(0, 3), [products])
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const createOrder = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      setOrderError("")
      const payload = orderPayload(dineOption, cart, method)
      const { data: order, error } = await supabase.from("orders").insert(payload).select("id, order_number").single()
      if (error) throw error
      return order
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      localStorage.setItem("last_order_id", order.id)
      setCart([])
      void navigate({ to: "/ordine-confermato/$id", params: { id: order.id } })
    },
    onError: () => setOrderError(t.error),
  })

  if (isLoading) return <div className="grid min-h-screen place-items-center font-display text-6xl text-muted-foreground">{t.loading}</div>

  if (!dineOption) return (
    <main className="grid min-h-screen place-items-center p-8 pt-24">
      
      <div className="w-full max-w-[60rem] text-center">
        <h1 className="font-display text-9xl leading-none">{t.where}</h1>
        {custom && <p className="mt-6 font-display text-5xl text-accent">{t.chosen} {custom.name}: {t.where}</p>}
        <div className="mt-16 grid gap-8">
          <Button variant="ghost" onClick={() => setDineOption("qui")} className="whitespace-normal tap flex h-44 items-center gap-8 rounded-3xl border-4 border-accent bg-card px-10 text-left">
            <span className="text-8xl">🍽️</span><span className="font-display text-8xl">{t.here}</span>
          </Button>
          <Button variant="ghost" onClick={() => setDineOption("asporto")} className="whitespace-normal tap flex h-44 items-center gap-8 rounded-3xl border-4 border-primary bg-card px-10 text-left">
            <span className="text-8xl">🥡</span><span className="font-display text-8xl">{t.takeaway}</span>
          </Button>
        </div>
        {featured.length > 0 && (
          <section className="mt-16 text-left">
            <h2 className="mb-6 text-center font-display text-6xl text-accent">⭐ {t.recommended}</h2>
            <div className="grid grid-cols-3 gap-6">
              {featured.map((p) => (
                <Button variant="ghost" key={p.id} onClick={() => { setActiveCat(p.category_id); setCustom(p); window.scrollTo({ top: 0, behavior: "smooth" }) }} className="whitespace-normal tap flex flex-col overflow-hidden rounded-3xl border-4 border-accent bg-card text-left">
                  {p.image ? <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-muted" />}
                  <div className="p-4">
                    <h3 className="font-display text-4xl leading-tight">{p.name}</h3>
                    <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1 font-display text-3xl text-primary-foreground">{euro(p.price)}</span>
                  </div>
                </Button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )

  if (showCart) return (
    <main className="min-h-screen p-8 pt-20">
      
      <header className="mb-8 flex items-center justify-between pt-8">
        <span className="rounded-full bg-muted px-6 py-2 font-display text-4xl uppercase">{dineOption === "qui"? `🍽️ ${t.here}` : `🥡 ${t.takeaway}`}</span>
        <Button variant="ghost" onClick={() => setShowCart(false)} className="whitespace-normal tap rounded-2xl bg-secondary px-8 py-4 font-display text-4xl">✕ {t.close}</Button>
      </header>
      <h1 className="mb-8 font-display text-8xl">{t.yourOrder}</h1>
      <div className="grid gap-4">
        {cart.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-3xl bg-card p-6">
            <div>
              <p className="font-display text-5xl">{i.qty} × {i.name}</p>
              <p className="text-2xl text-accent">{i.extras?.length || i.removed?.length? [...(i.extras?? []).map((e) => `+ ${e}`),...(i.removed?? []).map((r) => `senza ${r}`)].join(" · ") : ""}</p>
            </div>
            <div className="flex items-center gap-6">
              <p className="font-display text-5xl text-accent">{euro(i.price * i.qty)}</p>
              <Button variant="ghost" onClick={() => setCart((c) => c.filter((x) => x.id!== i.id))} className="whitespace-normal tap h-16 w-16 rounded-full bg-destructive font-display text-4xl text-destructive-foreground">✕</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 border-t-4 border-border pt-8">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-6xl text-muted-foreground">{t.total}</p>
          <p className="font-display text-9xl text-accent">{euro(total)}</p>
        </div>
        {orderError && <p role="alert" className="mt-4 text-2xl text-destructive">{orderError}</p>}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button disabled={createOrder.isPending || !dineOption || cart.length === 0} onClick={() => createOrder.mutate("cash")} className="whitespace-normal tap h-28 whitespace-normal rounded-2xl bg-accent font-display text-5xl text-accent-foreground">{createOrder.isPending ? t.sending : t.cash}</Button>
          <Button disabled={createOrder.isPending || !dineOption || cart.length === 0} onClick={() => createOrder.mutate("card")} className="whitespace-normal tap h-28 whitespace-normal rounded-2xl font-display text-5xl">{createOrder.isPending ? t.sending : t.card}</Button>
        </div>
      </div>
    </main>
  )

  const cat = categories.find((c) => c.id === activeCat)
  const shown = activeCat? products.filter((p) => p.category_id === activeCat) : []

  return (
    <main className="min-h-screen p-8 pb-36">
      
      <header className="mb-6 flex items-center justify-between pt-10">
        <h1 className="font-display text-8xl leading-none">Totem Burger</h1>
        <Button variant="ghost" onClick={() => setDineOption(null)} className="whitespace-normal tap rounded-full bg-secondary px-6 py-3 font-display text-3xl uppercase">{dineOption === "qui"? `🍽️ ${t.here}` : `🥡 ${t.takeaway}`} ▼</Button>
      </header>

      {activeCat === null? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {categories.map((c: Category) => (
            <Button variant="ghost" key={c.id} onClick={() => setActiveCat(c.id)} className="whitespace-normal tap relative h-56 overflow-hidden rounded-3xl bg-card">
              {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
              <span className="glow relative z-10 font-display text-6xl text-accent">{c.name.toUpperCase()}</span>
            </Button>
          ))}
        </div>
      ) : (
        <>
          <Button variant="ghost" onClick={() => setActiveCat(null)} className="whitespace-normal tap mb-6 rounded-full bg-accent px-8 py-4 font-display text-4xl text-accent-foreground">← {t.back} · {cat?.name}</Button>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {shown.map((p: Product) => (
              <Button variant="ghost" key={p.id} onClick={() => setCustom(p)} className="whitespace-normal tap flex min-h-64 flex-col justify-between rounded-3xl bg-card p-5 text-left">
                <div className="grid flex-1 place-items-center overflow-hidden rounded-2xl bg-muted">
                  {p.image? <img src={p.image} alt={p.name} className="h-44 w-full object-cover" /> : <div className="h-44 w-full bg-muted" />}
                </div>
                <div className="mt-4">
                  <h3 className="font-display text-4xl leading-tight">{p.name}</h3>
                  {descriptionFor(p, language) && <p className="mt-1 line-clamp-2 text-xl text-muted-foreground">{descriptionFor(p, language)}</p>}
                </div>
                <span className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-4xl text-primary-foreground">{euro(p.price)}</span>
              </Button>
            ))}
            {shown.length === 0 && <p className="col-span-full text-3xl text-muted-foreground">{t.empty}</p>}
          </div>
        </>
      )}

      {custom && (
        <Customize key={custom.id} product={custom} onClose={() => setCustom(null)} onAdd={(extras, removed) => {
          if (!dineOption) { setShowCart(false); return }
          const price = p2(custom) + extras.reduce((s, e) => s + e.price, 0)
          setCart((c) => [...c, { id: crypto.randomUUID(), productId: custom.id, name: custom.name, price, qty: 1, extras: extras.map((e) => e.name), removed }])
          setCustom(null)
        }} />
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-between bg-card p-6 shadow-lg">
          <div>
            <p className="text-2xl text-muted-foreground">{cart.length} {t.products} · {dineOption === "qui"? `🍽️ ${t.here}` : `🥡 ${t.takeaway}`}</p>
            <p className="font-display text-6xl text-accent">{euro(total)}</p>
          </div>
          <Button variant="ghost" onClick={() => setShowCart(true)} className="whitespace-normal tap rounded-full bg-primary px-12 py-6 font-display text-5xl text-primary-foreground">🛒 {t.cart}</Button>
        </div>
      )}
    </main>
  )
}

const p2 = (p: Product) => Number(p.price) || 0

function Customize({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (extras: { name: string; price: number }[], removed: string[]) => void }) {
  const { language, orderType } = useCustomer()
  const t = copy[language]
  const [removed, setRemoved] = useState<string[]>([])
  const [extras, setExtras] = useState<string[]>([])
  const chosen = product.extras.filter((e) => extras.includes(e.name))
  const total = p2(product) + chosen.reduce((s, e) => s + e.price, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/90" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-t-3xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-auto p-8">
          <h2 className="font-display text-7xl">{product.name}</h2>
          {descriptionFor(product, language) && <p className="mt-2 text-2xl text-muted-foreground">{descriptionFor(product, language)}</p>}
          <p className="mt-3 inline-block rounded-full bg-primary px-6 py-2 font-display text-5xl text-primary-foreground">{euro(product.price)}</p>
          {product.ingredients.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">{t.remove}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.ingredients.map((ing) => {
                  const on = removed.includes(ing)
                  return <Button variant="ghost" key={ing} onClick={() => setRemoved((r) => (on? r.filter((x) => x!== ing) : [...r, ing]))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{on? `${t.without} ` : ""}{ing}</Button>
                })}
              </div>
            </section>
          )}
          {product.extras.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">Extra</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.extras.map((e) => {
                  const on = extras.includes(e.name)
                  return <Button variant="ghost" key={e.name} onClick={() => setExtras((x) => (on? x.filter((n) => n!== e.name) : [...x, e.name]))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on? "bg-success text-success-foreground" : "bg-muted"}`}>+ {e.name} · {euro(e.price)}</Button>
                })}
              </div>
            </section>
          )}
        </div>
        <div className="border-t-4 border-border p-6">
          <Button variant="ghost" disabled={!orderType} onClick={() => { if (orderType) onAdd(chosen, removed) }} className="whitespace-normal tap h-24 w-full rounded-3xl bg-primary font-display text-5xl text-primary-foreground">{t.add} · {euro(total)}</Button>
          <Button variant="ghost" onClick={onClose} className="whitespace-normal tap mt-3 w-full py-2 text-2xl text-muted-foreground">{t.close}</Button>
        </div>
      </div>
    </div>
  )
}
