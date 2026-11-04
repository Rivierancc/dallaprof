import { ThemeGreeting } from "@/components/theme-layer"
import { CompanyIdentity } from "@/components/company-identity"
import { BannerView, useBanner } from "@/components/display-banner"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { menuQueryOptions, type Category, type CartItem, type Product, type Ingredient, euro, ingredientLabel, ingredientOff, customIngredients } from "@/lib/menu"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useCustomer } from "@/components/customer-session"
import { Button } from "@/components/ui/button"
import { basePrice, canAddExtra, groupsValid, isCombo, menuName, suggestPrice } from "@/lib/options"
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
  const [startDish, setStartDish] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [compose, setCompose] = useState<Category | null>(null)
  const lib = data?.ingredients ?? []

  const categories = data?.categories?? []
  const products = useMemo(() => (data?.products?? []).filter((p) =>!p.sold_out), [data])
  const featured = useMemo(() => products.filter((p) => p.is_featured).slice(0, 3), [products])
  const [suggestSeen, setSuggestSeen] = useState(false)
  const [offerPick, setOfferPick] = useState(false)
  // Prodotti suggeriti: prezzo d'offerta ricalcolato sulla spesa del resto del carrello.
  const spent = cart.filter((i) => !i.offer).reduce((s, i) => s + i.price * i.qty, 0)
  const priced = cart.map((i) => {
    const p = i.offer ? products.find((x) => x.id === i.productId) : undefined
    return p ? { ...i, price: Math.round((suggestPrice(p.price, p.suggest, spent) + i.price - p.price) * 100) / 100 } : i
  })
  const total = priced.reduce((s, i) => s + i.price * i.qty, 0)
  const suggestions = products.filter((p) => p.suggest.on && !cart.some((i) => i.productId === p.id))
  const openCart = () => { if (!suggestSeen && suggestions.length) { setSuggestSeen(true); setShowSuggest(true) } else setShowCart(true) }
  const [showSuggest, setShowSuggest] = useState(false)

  const createOrder = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      setOrderError("")
      const payload = orderPayload(dineOption, priced, method)
      const { data: order, error } = await supabase.from("orders").insert(payload).select("id, order_number").single()
      if (error) throw error
      return order
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      try { localStorage.setItem("last_order_id", order.id) } catch { /* Navigation also carries the order ID. */ }
      setCart([])
      setSuggestSeen(false)
      void navigate({ to: "/ordine-confermato/$id", params: { id: order.id } })
    },
    onError: () => setOrderError(t.error),
  })

  if (isLoading) return <div className="grid min-h-screen place-items-center font-display text-6xl text-muted-foreground">{t.loading}</div>

  if (!dineOption) return (
    <main className="flex min-h-dvh flex-col px-6 pb-6 pt-28">
      <div className="-mx-6 mb-4"><HomeBanner /></div>
      <KioskButton />
      <div className="flex-1" />
      
      <div className="mx-auto w-full max-w-[62rem] text-center">
        <CompanyIdentity />
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
        <div className="mt-10 grid grid-cols-2 gap-6 [@media(max-height:900px)]:mt-4 [@media(max-height:900px)]:gap-3">
          <Button variant="ghost" onClick={() => setDineOption("qui")} className={`whitespace-normal tap flex h-28 items-center justify-center gap-4 rounded-3xl border-4 border-accent bg-card px-4 [@media(max-height:900px)]:h-16 [@media(max-height:900px)]:gap-2 ${custom ? "glow ring-4 ring-accent" : ""}`}>
            <span className="text-5xl [@media(max-height:900px)]:text-3xl">🍽️</span><span className="font-display text-5xl [@media(max-height:900px)]:text-3xl">{t.here}</span>
          </Button>
          <Button variant="ghost" onClick={() => setDineOption("asporto")} className={`whitespace-normal tap flex h-28 items-center justify-center gap-4 rounded-3xl border-4 border-primary bg-card px-4 [@media(max-height:900px)]:h-16 [@media(max-height:900px)]:gap-2 ${custom ? "glow ring-4 ring-primary" : ""}`}>
            <span className="text-5xl [@media(max-height:900px)]:text-3xl">🥡</span><span className="font-display text-5xl [@media(max-height:900px)]:text-3xl">{t.takeaway}</span>
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

  if (showSuggest) return (
    <main className="min-h-screen p-8 pt-24">
      <h1 className="mb-8 font-display text-7xl">💡 {t.suggestTitle}</h1>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {suggestions.map((p) => {
          const offer = suggestPrice(p.price, p.suggest, spent)
          const missing = p.suggest.price !== null && spent < p.suggest.min ? p.suggest.min - spent : 0
          const label = (s: string) => s.replace("{x}", euro(missing)).replace("{y}", euro(p.suggest.price ?? 0))
          return (
            <Button variant="ghost" key={p.id} onClick={() => {
              if (p.choice_groups.length || p.extras.length || p.ingredients.length) { setOfferPick(true); setCustom(p); setShowSuggest(false); setShowCart(false) }
              else setCart((c) => [...c, { id: crypto.randomUUID(), productId: p.id, name: p.name, price: p.price, qty: 1, offer: true }])
            }} className="whitespace-normal tap relative flex h-auto flex-col overflow-hidden rounded-3xl border-4 border-accent bg-card p-0 text-left">
              {p.image ? <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square w-full place-items-center bg-muted text-7xl">🍽️</div>}
              <div className="p-4">
                <h3 className="font-display text-4xl leading-tight">{p.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {offer < p.price && <s className="font-display text-3xl text-muted-foreground">{euro(p.price)}</s>}
                  <span className="rounded-full bg-primary px-4 py-1 font-display text-3xl text-primary-foreground">{offer === 0 ? t.free : euro(offer)}</span>
                </div>
                {missing > 0 && <p className="mt-2 text-xl text-accent">{label(p.suggest.price === 0 ? t.spendMoreFree : t.spendMore)}</p>}
                <p className="mt-2 font-display text-3xl text-success">+ {t.add}</p>
              </div>
            </Button>
          )
        })}
      </div>
      {suggestions.length === 0 && <p className="text-3xl text-muted-foreground">✓</p>}
      <Button onClick={() => { setShowSuggest(false); setShowCart(true) }} className="whitespace-normal tap mt-10 h-24 w-full rounded-3xl font-display text-5xl">{t.noThanks} · {euro(total)}</Button>
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
        {priced.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-3xl bg-card p-6">
            <div>
              <p className="font-display text-5xl">{i.qty} × {i.name}</p>
              <p className="text-2xl text-accent">{i.extras?.length || i.removed?.length? [...(i.extras?? []).map((e) => `+ ${e}`),...(i.removed?? []).map((r) => `${t.without} ${r}`)].join(" · ") : ""}</p>
            </div>
            <div className="flex items-center gap-6">
              <p className="font-display text-5xl text-accent">{i.offer && i.price === 0 ? t.free : euro(i.price * i.qty)}</p>
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

  const OFFERS = "__offers"
  const offerMenus = products.filter((p) => isCombo(p) && !p.sold_out).sort((a, b) => Number(b.combo_offer) - Number(a.combo_offer))
  const cat = categories.find((c) => c.id === activeCat)
  const shown = activeCat === OFFERS ? offerMenus : activeCat? products.filter((p) => p.category_id === activeCat) : []
  const isOffers = activeCat === OFFERS

  return (
    <main className="min-h-screen p-8 pb-36">
      
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 pt-20">
        <span />
        <Button variant="ghost" onClick={() => setDineOption(null)} className="whitespace-normal tap rounded-full bg-secondary px-6 py-3 font-display text-3xl uppercase">{dineOption === "qui"? `🍽️ ${t.here}` : `🥡 ${t.takeaway}`} ▼</Button>
      </header>

      {activeCat === null? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {offerMenus.length > 0 && (
            <Button variant="ghost" onClick={() => setActiveCat(OFFERS)} className="whitespace-normal tap relative h-56 overflow-hidden rounded-3xl border-4 border-accent bg-card">
              <span className="glow relative z-10 font-display text-6xl text-accent">🍱 {(data?.offersTitle ?? "Menu in offerta").toUpperCase()}</span>
            </Button>
          )}
          {categories.filter((c) => !c.strip).map((c: Category) => (
            <Button variant="ghost" key={c.id} onClick={() => setActiveCat(c.id)} className="whitespace-normal tap relative h-56 overflow-hidden rounded-3xl bg-card">
              {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
              <span className="glow relative z-10 font-display text-6xl text-accent">{c.name.toUpperCase()}</span>
            </Button>
          ))}
          {[...new Set(categories.map((c) => c.strip).filter(Boolean))].sort((a, b) => a - b).map((n) => (
            <CategoryStrip key={n} cats={categories.filter((c) => c.strip === n)} onPick={setActiveCat} />
          ))}
        </div>
      ) : (
        <>
          <Button variant="ghost" onClick={() => setActiveCat(null)} className="whitespace-normal tap mb-6 rounded-full bg-accent px-8 py-4 font-display text-4xl text-accent-foreground">← {t.back} · {isOffers ? data?.offersTitle : cat?.name}</Button>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {cat && customIngredients(cat.custom_kind, lib).length > 0 && (
              <Button variant="ghost" onClick={() => setCompose(cat)} className="whitespace-normal tap h-auto flex min-h-64 flex-col justify-between rounded-3xl border-4 border-dashed border-accent bg-card p-5 text-left">
                <div className="grid h-44 w-full place-items-center rounded-2xl bg-muted text-8xl">✨</div>
                <h3 className="mt-4 break-words font-display text-4xl leading-tight">{customTitleFor(cat, language)}</h3>
                <span className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-4xl text-primary-foreground">{euro(cat.custom_price)}</span>
              </Button>
            )}
            {shown.map((p: Product) => (
              <Button variant="ghost" key={p.id} onClick={(e) => { const d = (e.target as HTMLElement).closest("[data-dish]")?.getAttribute("data-dish"); setStartDish(isOffers && d ? d : null); setCustom(p) }} className="whitespace-normal tap relative h-auto flex min-h-64 flex-col justify-between rounded-3xl bg-card p-5 text-left hover:bg-secondary!">
                <Badge p={p} pos={isOffers ? "right-3 top-36" : "right-3 top-3"} />
                {isOffers ? <h3 className="shrink-0 font-display text-5xl leading-tight">{p.combo_offer ? "⭐ " : ""}🍱 {menuName(p.name, p.combo_name)}</h3> : null}
                <div className="grid flex-1 place-items-center overflow-hidden rounded-2xl bg-muted">
                  {p.image? <img src={p.image} alt={p.name} className="h-44 w-full object-cover" /> : <div className="h-44 w-full bg-muted" />}
                </div>
                <div className="mt-4">
                  {!isOffers && <h3 className="font-display text-4xl leading-tight">{p.name}</h3>}
                  {isOffers && [p, ...p.combo_alts.map((id) => products.find((x) => x.id === id)).filter((x): x is Product => !!x && !x.sold_out)].map((d) => (
                    <div key={d.id} data-dish={d.id} className="mt-1">
                      <p className="font-display text-3xl text-accent">🍔 {d.name}</p>
                      {descriptionFor(d, language) && <p className="line-clamp-2 text-lg text-muted-foreground">{descriptionFor(d, language)}</p>}
                    </div>
                  ))}
                  {!isOffers && descriptionFor(p, language) && <p className="mt-1 line-clamp-2 text-xl text-muted-foreground">{descriptionFor(p, language)}</p>}
                </div>
                <span className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-4xl text-primary-foreground">{euro(isOffers ? p.combo_price ?? p.price : p.price)}</span>
              </Button>
            ))}
            {shown.length === 0 && !(cat && customIngredients(cat.custom_kind, lib).length) && <p className="col-span-full text-3xl text-muted-foreground">{t.empty}</p>}
          </div>
        </>
      )}

      {custom && (
        <Customize key={custom.id} startDish={startDish} product={offerPick ? { ...custom, price: suggestPrice(custom.price, custom.suggest, spent) } : custom} all={products} lib={lib} onClose={() => { setCustom(null); if (offerPick) { setOfferPick(false); setShowSuggest(true) } }} onAdd={(extras, removed, base, asMenu, dish) => {
          if (!dineOption) { setShowCart(false); return }
          const price = Math.round((base + extras.reduce((s, e) => s + e.price, 0)) * 100) / 100
          setCart((c) => [...c, { id: crypto.randomUUID(), productId: custom.id, ...(asMenu && dish.id !== custom.id ? { dishId: dish.id } : {}), name: asMenu ? menuName(dish.name, custom.combo_name) : custom.name, price, qty: 1, extras: extras.map((e) => e.name), removed, ...(offerPick ? { offer: true } : {}) }])
          setCustom(null)
          if (offerPick) { setOfferPick(false); setShowSuggest(true) }
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
          <Button variant="ghost" onClick={openCart} className="whitespace-normal tap rounded-full bg-primary px-12 py-6 font-display text-5xl text-primary-foreground">🛒 {t.cart}</Button>
        </div>
      )}
    </main>
  )
}

const p2 = (p: Product) => Number(p.price) || 0

function Customize({ product, startDish, all, lib, onClose, onAdd }: { product: Product; startDish?: string | null; all: Product[]; lib: Ingredient[]; onClose: () => void; onAdd: (extras: { name: string; price: number }[], removed: string[], base: number, asMenu: boolean, dish: Product) => void }) {
  const { language, orderType } = useCustomer()
  const t = copy[language]
  const [removed, setRemoved] = useState<string[]>([])
  const [extras, setExtras] = useState<string[]>([])
  const [dishId, setDishId] = useState(startDish ?? product.id)
  const ingredients = (all.find((x) => x.id === dishId) ?? product).ingredients.filter((g) => !ingredientOff(g, lib))
  const L = (n: string) => ingredientLabel(n, lib, language)
  const [picks, setPicks] = useState<Record<string, string[]>>({})
  const combo = product.combo_items.map((id) => all.find((x) => x.id === id)).filter((x): x is Product => !!x)
  const comboLines = combo.map((x) => ({ name: `🍱 ${x.name}`, price: 0 }))
  const hasCombo = isCombo(product)
  const hasMenuPrice = hasCombo && product.combo_price !== null
  const [asMenu, setAsMenu] = useState(true)
  const menuOn = hasCombo && (!hasMenuPrice || asMenu)
  const alts = menuOn ? [product, ...product.combo_alts.map((id) => all.find((x) => x.id === id)).filter((x): x is Product => !!x && !x.sold_out)] : []
  const dish = alts.find((x) => x.id === dishId) ?? product
  const pickDish = (id: string) => { setDishId(id); setRemoved([]); setExtras([]); setPicks({}) }
  const offers = [...dish.extras, ...(menuOn ? product.combo_extras.filter((e) => !dish.extras.some((x) => x.name === e.name)) : [])].filter((e) => !ingredientOff(e.name, lib))
  const groups = [...(menuOn ? product.combo_groups : []), ...dish.choice_groups].map((g) => ({ ...g, options: g.options.filter((o) => !ingredientOff(o.name, lib) && !all.some((x) => x.name === o.name && x.sold_out)) })).filter((g) => g.options.length)
  const ok = groupsValid(groups, picks)
  const picked = groups.flatMap((g) => g.options.filter((o) => (picks[g.name] ?? []).includes(o.name)).map((o) => ({ name: `${g.name}: ${o.name}`, price: o.price })))
  const base = basePrice(p2(product), product.combo_price, hasMenuPrice && asMenu)
  const lines = menuOn ? comboLines : []
  const chosen = offers.filter((e) => extras.includes(e.name))
  const total = base + [...chosen, ...picked].reduce((s, e) => s + e.price, 0)
  const toggle = (g: { name: string; max: number }, o: string) => setPicks((cur) => {
    const list = cur[g.name] ?? []
    if (list.includes(o)) return { ...cur, [g.name]: list.filter((x) => x !== o) }
    if (g.max === 1) return { ...cur, [g.name]: [o] }
    return list.length >= g.max ? cur : { ...cur, [g.name]: [...list, o] }
  })
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/90" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-t-3xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-0 overflow-auto p-8">
          <Button variant="secondary" onClick={onClose} className="tap float-right ml-4 rounded-full px-6 py-3 font-display text-3xl">✕ {t.exit}</Button>
          <h2 className="font-display text-7xl">{menuOn ? menuName(dish.name, product.combo_name) : product.name}</h2>
          {menuOn && <p className="mt-1 font-display text-4xl text-accent">🍔 {dish.name}</p>}
          {descriptionFor(dish, language) && <p className="mt-2 text-2xl text-muted-foreground">{descriptionFor(dish, language)}</p>}
          <p className="mt-3 inline-block rounded-full bg-primary px-6 py-2 font-display text-5xl text-primary-foreground">{euro(base)}</p>
          {hasMenuPrice && (
            <div className="mt-4 flex gap-3">
              {[false, true].map((m) => <Button variant="ghost" key={String(m)} aria-pressed={asMenu === m} onClick={() => setAsMenu(m)} className={`tap h-auto flex-1 whitespace-normal rounded-2xl py-4 font-display text-4xl ${asMenu === m ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{m ? `🍱 Menu · ${euro(product.combo_price ?? 0)}` : `${({ IT: "Solo piatto", EN: "Single item", FR: "Seul", ES: "Solo" } as const)[language]} · ${euro(p2(product))}`}</Button>)}
            </div>
          )}
          {alts.length > 1 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">🍔 {({ IT: "Scegli il piatto", EN: "Choose your main", FR: "Choisissez le plat", ES: "Elige el plato" } as const)[language]}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {alts.map((x) => <Button variant="ghost" key={x.id} aria-pressed={dish.id === x.id} onClick={() => pickDish(x.id)} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${dish.id === x.id ? "bg-success text-success-foreground" : "bg-muted"}`}>{dish.id === x.id ? "✓ " : ""}{x.name}</Button>)}
              </div>
            </section>
          )}
          {lines.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">🍱 {t.includes}</h3>
              <ul className="mt-3 flex flex-wrap gap-3">{combo.map((x) => <li key={x.id} className="rounded-full bg-muted px-6 py-3 text-2xl font-bold">{x.name}</li>)}</ul>
            </section>
          )}
          {groups.map((g) => {
            const n = (picks[g.name] ?? []).length
            return (
              <section key={g.name} className="mt-6">
                <h3 className="flex flex-wrap items-center gap-3 font-display text-4xl text-muted-foreground">
                  {L(g.name)}
                  {g.min > 0 && <span className={`rounded-full px-3 py-1 font-sans text-lg font-bold ${n >= g.min ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>{n >= g.min ? "✓" : "!"} {t.required}</span>}
                  <span className="font-sans text-xl">{g.min === g.max ? `${g.min}` : g.min > 0 ? t.pickN.replace("{a}", String(g.min)).replace("{b}", String(g.max)) : t.upTo.replace("{n}", String(g.max))}</span>
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {g.options.map((o) => {
                    const on = (picks[g.name] ?? []).includes(o.name)
                    return <Button variant="ghost" key={o.name} aria-pressed={on} onClick={() => toggle(g, o.name)} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on ? "bg-success text-success-foreground" : "bg-muted"}`}>{on ? "✓ " : ""}{L(o.name)}{o.price > 0 ? ` · ${euro(o.price)}` : ""}</Button>
                  })}
                </div>
              </section>
            )
          })}
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
              <h3 className="font-display text-4xl text-muted-foreground">Extra{dish.max_extras > 0 ? ` · ${t.maxExtras.replace("{n}", String(dish.max_extras))} (${chosen.length}/${dish.max_extras})` : ""}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {offers.map((e) => {
                  const on = extras.includes(e.name)
                  const full = !on && !canAddExtra(dish.max_extras, chosen.length)
                  return <Button variant="ghost" key={e.name} disabled={full} onClick={() => setExtras((x) => (on? x.filter((n) => n!== e.name) : canAddExtra(dish.max_extras, x.length) ? [...x, e.name] : x))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on? "bg-success text-success-foreground" : "bg-muted"}`}>+ {L(e.name)} · {euro(e.price)}</Button>
                })}
              </div>
            </section>
          )}
        </div>
        <div className="border-t-4 border-border p-6">
          <Button variant="ghost" disabled={!orderType || !ok} onClick={() => { if (orderType && ok) onAdd([...lines, ...picked, ...chosen], removed, base, menuOn, dish) }} className="whitespace-normal tap h-24 w-full rounded-3xl bg-primary font-display text-5xl text-primary-foreground">{t.add} · {euro(total)}</Button>
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

function Badge({ p, pos = "right-3 top-3" }: { p: Product; pos?: string }) {
  if (!p.badge_on || !p.badge_text) return null
  return (
    <span className={`absolute ${pos} z-10 -rotate-6 rounded-2xl rounded-br-none border-4 border-background bg-destructive px-4 py-2 font-display text-3xl uppercase leading-none text-destructive-foreground shadow-lg ${p.badge_blink ? "animate-badge" : ""}`}>
      {p.badge_text}
    </span>
  )
}

function HomeBanner() { return <BannerView banner={useBanner()} /> }
function KioskButton() {
  const { fullscreen, enterKiosk, kioskError } = useCustomer()
  if (fullscreen) return null
  return <div className="fixed left-3 top-24 z-[100] flex items-center gap-3">
    <Button variant="secondary" onClick={() => void enterKiosk()} className="tap">⛶ Attiva modalità chiosco</Button>
    {kioskError && <span role="alert" className="text-destructive">{kioskError}</span>}
  </div>
}

function CategoryStrip({ cats, onPick }: { cats: Category[]; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [center, setCenter] = useState(0)
  const update = () => {
    const el = ref.current; if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, dist = Infinity
    Array.from(el.children).forEach((ch, i) => { const c = ch as HTMLElement; const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i } })
    setCenter(best)
  }
  useEffect(() => { update() }, [cats.length])
  return (
    <div ref={ref} onScroll={update} className="col-span-full flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-[30%] py-4 [scrollbar-width:none]">
      {cats.map((c, i) => (
        <Button variant="ghost" key={c.id} onClick={() => onPick(c.id)} className={`whitespace-normal tap relative shrink-0 snap-center overflow-hidden rounded-3xl bg-card transition-all duration-300 ${i === center ? "h-64 w-[40%] border-4 border-accent" : "h-44 w-[28%] opacity-70"}`}>
          {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
          <span className={`glow relative z-10 font-display text-accent ${i === center ? "text-6xl" : "text-4xl"}`}>{c.name.toUpperCase()}</span>
        </Button>
      ))}
    </div>
  )
}
