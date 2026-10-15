import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { menuQueryOptions, type Category, type CartItem, type Product, euro } from "@/lib/menu"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

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
  const [dineOption, setDineOption] = useState<null | "qui" | "asporto">(null)
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [custom, setCustom] = useState<Product | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  const categories = data?.categories ?? []
  const products = useMemo(() => (data?.products ?? []).filter((p) => !p.sold_out), [data])

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const reset = () => {
    setCart([])
    setShowCart(false)
    setActiveCat(null)
    setDineOption(null)
    setCustom(null)
  }

  // Torna alla schermata iniziale dopo 15 secondi dal numero d'ordine.
  useEffect(() => {
    if (done === null) return
    const t = setTimeout(reset, 15_000)
    return () => clearTimeout(t)
  }, [done])

  const createOrder = useMutation({
    mutationFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ dine_option: dineOption, items: cart, total, status: "awaiting_payment" })
        .select("id, order_number")
        .single()
      if (error) throw error
      return order
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setDone(order.order_number)
    },
    onError: (e) => alert(`Ordine non inviato: ${(e as Error).message}`),
  })

  if (isLoading)
    return <div className="grid min-h-screen place-items-center font-display text-6xl text-muted-foreground">Caricamento…</div>

  if (done !== null)
    return (
      <main className="grid min-h-screen place-items-center p-8 text-center">
        <div className="animate-pop">
          <p className="font-display text-7xl text-muted-foreground">Il tuo ordine è</p>
          <p className="my-6 font-display text-[28rem] leading-none text-accent">{String(done).padStart(2, "0")}</p>
          <p className="font-display text-6xl">Vai in cassa e paga con carta al POS SumUp</p>
          <button onClick={reset} className="tap mt-12 h-28 rounded-3xl bg-primary px-16 font-display text-6xl text-primary-foreground">
            Nuovo ordine
          </button>
        </div>
      </main>
    )

  if (!dineOption)
    return (
      <main className="grid min-h-screen place-items-center p-8">
        <div className="w-full max-w-[60rem] text-center">
          <h1 className="font-display text-9xl leading-none">Dove mangi?</h1>
          <div className="mt-16 grid gap-8">
            <button onClick={() => setDineOption("qui")} className="tap flex h-44 items-center gap-8 rounded-3xl border-4 border-accent bg-card px-10 text-left">
              <span className="text-8xl">🍽️</span>
              <span className="font-display text-8xl">Mangia qui</span>
            </button>
            <button onClick={() => setDineOption("asporto")} className="tap flex h-44 items-center gap-8 rounded-3xl border-4 border-primary bg-card px-10 text-left">
              <span className="text-8xl">🥡</span>
              <span className="font-display text-8xl">Asporto</span>
            </button>
          </div>
        </div>
      </main>
    )

  if (showCart)
    return (
      <main className="min-h-screen p-8">
        <header className="mb-8 flex items-center justify-between">
          <span className="rounded-full bg-muted px-6 py-2 font-display text-4xl uppercase">{dineOption === "qui" ? "🍽️ Mangia qui" : "🥡 Asporto"}</span>
          <button onClick={() => setShowCart(false)} className="tap rounded-2xl bg-secondary px-8 py-4 font-display text-4xl">✕ Chiudi</button>
        </header>
        <h1 className="mb-8 font-display text-8xl">Il tuo ordine</h1>
        <div className="grid gap-4">
          {cart.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-3xl bg-card p-6">
              <div>
                <p className="font-display text-5xl">{i.qty} × {i.name}</p>
                <p className="text-2xl text-accent">{i.extras?.length || i.removed?.length ? [ ...(i.extras ?? []).map((e) => `+ ${e}`), ...(i.removed ?? []).map((r) => `senza ${r}`) ].join(" · ") : ""}</p>
              </div>
              <div className="flex items-center gap-6">
                <p className="font-display text-5xl text-accent">{euro(i.price * i.qty)}</p>
                <button onClick={() => setCart((c) => c.filter((x) => x.id !== i.id))} className="tap h-16 w-16 rounded-full bg-destructive font-display text-4xl text-destructive-foreground">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t-4 border-border pt-8">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-6xl text-muted-foreground">Totale</p>
            <p className="font-display text-9xl text-accent">{euro(total)}</p>
          </div>
          <button
            disabled={createOrder.isPending || cart.length === 0}
            onClick={() => createOrder.mutate()}
            className="tap mt-8 h-32 w-full rounded-3xl bg-primary font-display text-7xl text-primary-foreground disabled:opacity-50"
          >
            {createOrder.isPending ? "Invio…" : "Conferma ordine"}
          </button>
        </div>
      </main>
    )

  const cat = categories.find((c) => c.id === activeCat)
  const shown = activeCat ? products.filter((p) => p.category_id === activeCat) : []

  return (
    <main className="min-h-screen p-8 pb-36">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-8xl leading-none">Totem Burger</h1>
        <button onClick={() => setDineOption(null)} className="tap rounded-full bg-secondary px-6 py-3 font-display text-3xl uppercase">
          {dineOption === "qui" ? "🍽️ Qui" : "🥡 Asporto"} ▼
        </button>
      </header>

      {activeCat === null ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {categories.map((c: Category) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className="tap relative h-56 overflow-hidden rounded-3xl bg-card">
              {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
              <span className="glow relative z-10 font-display text-6xl text-accent">{c.name.toUpperCase()}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button onClick={() => setActiveCat(null)} className="tap mb-6 rounded-full bg-accent px-8 py-4 font-display text-4xl text-accent-foreground">
            ← Indietro · {cat?.name}
          </button>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {shown.map((p: Product) => (
              <button key={p.id} onClick={() => setCustom(p)} className="tap flex min-h-64 flex-col justify-between rounded-3xl bg-card p-5 text-left">
                <div className="grid flex-1 place-items-center overflow-hidden rounded-2xl bg-muted">
                  {p.image
                    ? <img src={p.image} alt={p.name} className="h-44 w-full object-cover" />
                    : <span className="font-display text-7xl text-muted-foreground">{p.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="mt-4">
                  <h3 className="font-display text-4xl leading-tight">{p.name}</h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-xl text-muted-foreground">{p.description}</p>}
                </div>
                <span className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-4xl text-primary-foreground">{euro(p.price)}</span>
              </button>
            ))}
            {shown.length === 0 && <p className="col-span-full text-3xl text-muted-foreground">Nessun prodotto in questa categoria</p>}
          </div>
        </>
      )}

      {custom && (
        <Customize
          product={custom}
          onClose={() => setCustom(null)}
          onAdd={(extras, removed) => {
            const price = p2(custom) + extras.reduce((s, e) => s + e.price, 0)
            setCart((c) => [...c, { id: crypto.randomUUID(), productId: custom.id, name: custom.name, price, qty: 1, extras: extras.map((e) => e.name), removed }])
            setCustom(null)
          }}
        />
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-between bg-card p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div>
            <p className="text-2xl text-muted-foreground">{cart.length} prodotti · {dineOption === "qui" ? "🍽️ Qui" : "🥡 Asporto"}</p>
            <p className="font-display text-6xl text-accent">{euro(total)}</p>
          </div>
          <button onClick={() => setShowCart(true)} className="tap rounded-full bg-primary px-12 py-6 font-display text-5xl text-primary-foreground">
            🛒 Carrello
          </button>
        </div>
      )}
    </main>
  )
}

const p2 = (p: Product) => Number(p.price) || 0

function Customize({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (extras: { name: string; price: number }[], removed: string[]) => void }) {
  const [removed, setRemoved] = useState<string[]>([])
  const [extras, setExtras] = useState<string[]>([])
  const chosen = product.extras.filter((e) => extras.includes(e.name))
  const total = p2(product) + chosen.reduce((s, e) => s + e.price, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-t-3xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-auto p-8">
          <h2 className="font-display text-7xl">{product.name}</h2>
          {product.description && <p className="mt-2 text-2xl text-muted-foreground">{product.description}</p>}
          <p className="mt-3 inline-block rounded-full bg-primary px-6 py-2 font-display text-5xl text-primary-foreground">{euro(product.price)}</p>

          {product.ingredients.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">Togli ingredienti</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.ingredients.map((ing) => {
                  const on = removed.includes(ing)
                  return (
                    <button key={ing} onClick={() => setRemoved((r) => (on ? r.filter((x) => x !== ing) : [...r, ing]))}
                      className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>
                      {on ? "senza " : ""}{ing}
                    </button>
                  )
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
                  return (
                    <button key={e.name} onClick={() => setExtras((x) => (on ? x.filter((n) => n !== e.name) : [...x, e.name]))}
                      className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on ? "bg-success text-success-foreground" : "bg-muted"}`}>
                      + {e.name} · {euro(e.price)}
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
        <div className="border-t-4 border-border p-6">
          <button onClick={() => onAdd(chosen, removed)} className="tap h-24 w-full rounded-3xl bg-primary font-display text-5xl text-primary-foreground">
            Aggiungi · {euro(total)}
          </button>
          <button onClick={onClose} className="tap mt-3 w-full py-2 text-2xl text-muted-foreground">Chiudi</button>
        </div>
      </div>
    </div>
  )
}
