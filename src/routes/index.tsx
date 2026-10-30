import { ThemeGreeting } from "@/components/theme-layer"
import { BannerView, useBanner } from "@/components/display-banner"
import { useCustomer as useKiosk } from "@/components/customer-session"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { menuQueryOptions, type Category, type CartItem, type Product, type Ingredient, euro, ingredientLabel, ingredientOff, customIngredients } from "@/lib/menu"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useCustomer } from "@/components/customer-session"
import { Button } from "@/components/ui/button"
import { copy, customTitleFor, descriptionFor, orderPayload, type PaymentMethod } from "@/lib/customer"

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
  const [compose, setCompose] = useState<Category | null>(null)
  const lib = data?.ingredients ?? []

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
      try { localStorage.setItem("last_order_id", order.id) } catch { /* Navigation also carries the order ID. */ }
      setCart([])
      void navigate({ to: "/ordine-confermato/$id", params: { id: order.id } })
    },
    onError: () => setOrderError(t.error),
  })

  if (isLoading) return <div className="grid min-h-screen place-items-center font-display text-6xl text-muted-foreground">{t.loading}</div>

  if (!dineOption) return (
    <main className="flex min-h-dvh flex-col px-6 pb-6 pt-28">
      <div className="-mx-6 mb-4"><HomeBanner /></div>
      <div className="flex-1" />
      
      <div className="mx-auto w-full max-w-[62rem] text-center">
        <ThemeGreeting className="mb-6 [@media(max-height:900px)]:mb-2" />
        <h1 className="font-display text-8xl leading-none [@media(max-height:900px)]:text-6xl">{t.where}</h1>
        {custom ? (
          <p className="mt-5 flex flex-wrap items-center justify-center gap-4 font-display text-5xl text-accent [@media(max-height:900px)]:mt-2 [@media(max-height:900px)]:text-3xl">
            ⭐ {t.chosen} {custom.name}
            <Button variant="ghost" aria-label={t.close} onClick={() => setCustom(null)} className="tap rounded-full bg-secondary px-5 py-1 font-display text-3xl text-secondary-foreground [@media(max-height:900px)]:text-xl">✕</Button>
          </p>
        ) : (
          <p className="mt-3 text-2xl text-muted-foreground [@media(max-height:900px)]:text-lg">{t.pickFirst}</p>
        )}
        <div className="mt-10 grid gap-6 [@media(max-height:900px)]:mt-4 [@media(max-height:900px)]:gap-3">
          <Button variant="ghost" onClick={() => setDineOption("qui")} className={`whitespace-normal tap flex h-40 items-center gap-8 rounded-3xl border-4 border-accent bg-card px-8 text-left [@media(max-height:900px)]:h-20 [@media(max-height:900px)]:gap-4 [@media(max-height:900px)]:px-4 ${custom ? "glow ring-4 ring-accent" : ""}`}>
            <span className="text-7xl [@media(max-height:900px)]:text-4xl">🍽️</span><span className="font-display text-7xl [@media(max-height:900px)]:text-4xl">{t.here}</span>
          </Button>
          <Button variant="ghost" onClick={() => setDineOption("asporto")} className={`whitespace-normal tap flex h-40 items-center gap-8 rounded-3xl border-4 border-primary bg-card px-8 text-left [@media(max-height:900px)]:h-20 [@media(max-height:900px)]:gap-4 [@media(max-height:900px)]:px-4 ${custom ? "glow ring-4 ring-primary" : ""}`}>
            <span className="text-7xl [@media(max-height:900px)]:text-4xl">🥡</span><span className="font-display text-7xl [@media(max-height:900px)]:text-4xl">{t.takeaway}</span>
          </Button>
        </div>
        {featured.length > 0 && (
          <section className="mt-10 text-left [@media(max-height:900px)]:mt-4">
            <h2 className="mb-5 text-center font-display text-5xl text-accent [@media(max-height:900px)]:mb-2 [@media(max-height:900px)]:text-3xl">⭐ {t.recommended}</h2>
            <div className="grid grid-cols-3 gap-5 [@media(max-height:900px)]:gap-2">
              {featured.map((p) => (
                <Button variant="ghost" key={p.id} onClick={() => { setActiveCat(p.category_id); setCustom(p); window.scrollTo({ top: 0, behavior: "smooth" }) }} className="whitespace-normal tap relative flex h-auto flex-col overflow-hidden rounded-3xl border-4 border-accent bg-card p-0 text-left">
                  <Badge p={p} />
                  {p.image ? <img src={p.image} alt={p.name} className="aspect-square w-full object-cover [@media(max-height:900px)]:aspect-[4/3]" /> : <div className="grid aspect-square w-full place-items-center bg-muted text-7xl [@media(max-height:900px)]:aspect-[4/3] [@media(max-height:900px)]:text-4xl">🍽️</div>}
                  <div className="p-3 [@media(max-height:900px)]:p-2">
                    <h3 className="line-clamp-2 font-display text-3xl leading-tight [@media(max-height:900px)]:text-xl">{p.name}</h3>
                    <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1 font-display text-2xl text-primary-foreground [@media(max-height:900px)]:px-2 [@media(max-height:900px)]:text-lg">{euro(p.price)}</span>
                  </div>
                </Button>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="flex-1" />
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
              <p className="text-2xl text-accent">{i.extras?.length || i.removed?.length? [...(i.extras?? []).map((e) => `+ ${e}`),...(i.removed?? []).map((r) => `${t.without} ${r}`)].join(" · ") : ""}</p>
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
      
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 pt-20">
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
            {cat && customIngredients(cat.custom_kind, lib).length > 0 && (
              <Button variant="ghost" onClick={() => setCompose(cat)} className="whitespace-normal tap h-auto flex min-h-64 flex-col justify-between rounded-3xl border-4 border-dashed border-accent bg-card p-5 text-left">
                <div className="grid h-44 w-full place-items-center rounded-2xl bg-muted text-8xl">✨</div>
                <h3 className="mt-4 break-words font-display text-4xl leading-tight">{customTitleFor(cat, language)}</h3>
                <span className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-4xl text-primary-foreground">{euro(cat.custom_price)}</span>
              </Button>
            )}
            {shown.map((p: Product) => (
              <Button variant="ghost" key={p.id} onClick={() => setCustom(p)} className="whitespace-normal tap relative h-auto flex min-h-64 flex-col justify-between rounded-3xl bg-card p-5 text-left">
                <Badge p={p} />
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
            {shown.length === 0 && !(cat && customIngredients(cat.custom_kind, lib).length) && <p className="col-span-full text-3xl text-muted-foreground">{t.empty}</p>}
          </div>
        </>
      )}

      {custom && (
        <Customize key={custom.id} product={custom} lib={lib} onClose={() => setCustom(null)} onAdd={(extras, removed) => {
          if (!dineOption) { setShowCart(false); return }
          const price = p2(custom) + extras.reduce((s, e) => s + e.price, 0)
          setCart((c) => [...c, { id: crypto.randomUUID(), productId: custom.id, name: custom.name, price, qty: 1, extras: extras.map((e) => e.name), removed }])
          setCustom(null)
        }} />
      )}

      {compose && (
        <Compose category={compose} lib={lib} onClose={() => setCompose(null)} onAdd={(chosen) => {
          if (!dineOption) return
          const price = compose.custom_price + chosen.reduce((s, g) => s + g.price, 0)
          setCart((c) => [...c, { id: crypto.randomUUID(), name: customTitleFor(compose, "IT"), price: Math.round(price * 100) / 100, qty: 1, extras: chosen.map((g) => g.name) }])
          setCompose(null)
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

function Customize({ product, lib, onClose, onAdd }: { product: Product; lib: Ingredient[]; onClose: () => void; onAdd: (extras: { name: string; price: number }[], removed: string[]) => void }) {
  const { language, orderType } = useCustomer()
  const t = copy[language]
  const [removed, setRemoved] = useState<string[]>([])
  const [extras, setExtras] = useState<string[]>([])
  const ingredients = product.ingredients.filter((g) => !ingredientOff(g, lib))
  const offers = product.extras.filter((e) => !ingredientOff(e.name, lib))
  const chosen = offers.filter((e) => extras.includes(e.name))
  const L = (n: string) => ingredientLabel(n, lib, language)
  const total = p2(product) + chosen.reduce((s, e) => s + e.price, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/90" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-t-3xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-0 overflow-auto p-8">
          <h2 className="font-display text-7xl">{product.name}</h2>
          {descriptionFor(product, language) && <p className="mt-2 text-2xl text-muted-foreground">{descriptionFor(product, language)}</p>}
          <p className="mt-3 inline-block rounded-full bg-primary px-6 py-2 font-display text-5xl text-primary-foreground">{euro(product.price)}</p>
          {ingredients.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">{t.remove}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {ingredients.map((ing) => {
                  const on = removed.includes(ing)
                  return <Button variant="ghost" key={ing} onClick={() => setRemoved((r) => (on? r.filter((x) => x!== ing) : [...r, ing]))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{on? `${t.without} ` : ""}{L(ing)}</Button>
                })}
              </div>
            </section>
          )}
          {offers.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">Extra</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {offers.map((e) => {
                  const on = extras.includes(e.name)
                  return <Button variant="ghost" key={e.name} onClick={() => setExtras((x) => (on? x.filter((n) => n!== e.name) : [...x, e.name]))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on? "bg-success text-success-foreground" : "bg-muted"}`}>+ {L(e.name)} · {euro(e.price)}</Button>
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

function Compose({ category, lib, onClose, onAdd }: { category: Category; lib: Ingredient[]; onClose: () => void; onAdd: (chosen: Ingredient[]) => void }) {
  const { language, orderType } = useCustomer()
  const t = copy[language]
  const [ids, setIds] = useState<string[]>([])
  const list = customIngredients(category.custom_kind, lib)
  const chosen = list.filter((g) => ids.includes(g.id))
  const total = category.custom_price + chosen.reduce((s, g) => s + g.price, 0)
  const groups = ([["salato", t.savory], ["dolce", t.sweet]] as const).flatMap(([k, title]) => {
    const items = list.filter((g) => g.kind === k)
    const names = [...new Set(items.map((g) => g.group).filter(Boolean))].sort()
    return [...names.map((n) => ({ k: `${k}-${n}`, icon: k === "dolce" ? "🍫" : "🧀", title: n, items: items.filter((g) => g.group === n) })), { k, icon: k === "dolce" ? "🍫" : "🧀", title, items: items.filter((g) => !g.group) }]
  }).filter((g) => g.items.length)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/90" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-t-3xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-0 overflow-auto p-8">
          <h2 className="break-words font-display text-5xl sm:text-7xl">✨ {customTitleFor(category, language)}</h2>
          <p className="mt-2 text-2xl text-muted-foreground">{t.pickIngredients}</p>
          <p className="mt-3 inline-block rounded-full bg-primary px-6 py-2 font-display text-5xl text-primary-foreground">{euro(category.custom_price)}</p>
          {groups.map((g) => (
            <section key={g.k} className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">{g.icon} {g.title}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {g.items.map((x) => {
                  const on = ids.includes(x.id)
                  return <Button variant="ghost" key={x.id} aria-pressed={on} onClick={() => setIds((v) => (on ? v.filter((i) => i !== x.id) : [...v, x.id]))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on ? "bg-success text-success-foreground" : "bg-muted"}`}>{on ? "✓ " : "+ "}{ingredientLabel(x.name, lib, language)}{x.price > 0 ? ` · ${euro(x.price)}` : ""}</Button>
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="border-t-4 border-border p-6">
          <Button variant="ghost" disabled={!orderType || !chosen.length} onClick={() => onAdd(chosen)} className="whitespace-normal tap h-24 w-full rounded-3xl bg-primary font-display text-5xl text-primary-foreground">{t.add} · {euro(total)}</Button>
          <Button variant="ghost" onClick={onClose} className="whitespace-normal tap mt-3 w-full py-2 text-2xl text-muted-foreground">{t.close}</Button>
        </div>
      </div>
    </div>
  )
}

function Badge({ p }: { p: Product }) {
  if (!p.badge_on || !p.badge_text) return null
  return (
    <span className={`absolute right-3 top-3 z-10 -rotate-6 rounded-2xl rounded-br-none border-4 border-background bg-destructive px-4 py-2 font-display text-3xl uppercase leading-none text-destructive-foreground shadow-lg ${p.badge_blink ? "animate-badge" : ""}`}>
      {p.badge_text}
    </span>
  )
}

function HomeBanner() { return <BannerView banner={useBanner()} /> }
function KioskButton() {
  const { fullscreen, enterKiosk, kioskError } = useKiosk()
  if (fullscreen) return null
  return <div className="fixed bottom-3 left-3 z-[100] flex items-center gap-3">
    <Button variant="secondary" onClick={() => void enterKiosk()} className="tap">⛶ Attiva modalità chiosco</Button>
    {kioskError && <span role="alert" className="text-destructive">{kioskError}</span>}
  </div>
}
