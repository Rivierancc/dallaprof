import { HereIcon, TakeawayIcon, OffersIcon, CartIcon } from "@/components/compat-icons";
import { Screensaver } from "@/components/screensaver"
import { venuePageTitle } from "@/lib/page-title";
import { useRestaurantOnly } from "@/lib/venue-mode";
import { Link as SalaLink } from "@tanstack/react-router";
import { ThemeGreeting } from "@/components/theme-layer"
import { browserVenueId } from "@/lib/venue-client"
import { CompanyIdentity } from "@/components/company-identity"
import { BannerView, useBanner, bannerQueryOptions } from "@/components/display-banner"
import { ALLERGENS, ALLERGENS_TITLE, FROZEN_TEXT, dishInfo, infoFlags } from "@/lib/allergens"
import { cleanFilters, dishMatches, filtersOn } from "@/lib/food-filters"
import { cleanCategoryLayout, TILE, dishLayoutFor, DISH_TILE } from "@/lib/category-layout"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { menuQueryOptions, type Category, type CartItem, type CartEdit, type Product, type Ingredient, euro, ingredientLabel, ingredientOff, customIngredients } from "@/lib/menu"
import { useQuery } from "@tanstack/react-query"
import { licenseQueryOptions, realOrders } from "@/lib/license"
import { supabase } from "@/integrations/supabase/client"
import { useCustomer } from "@/components/customer-session"
import { Button } from "@/components/ui/button"
import { basePrice, canAddExtra, groupsValid, isCombo, menuName, suggestPrice } from "@/lib/options"
import { LoyaltyDialog, loyaltyCopy, type Member } from "@/components/loyalty-kiosk"
import { getLoyalty, linkOrderCustomer } from "@/lib/loyalty.functions"
import { discountFor } from "@/lib/loyalty"
import { playBirthdaySong } from "@/lib/sounds"
import { productOf, splitMenu } from "@/lib/order-lines"
import { copy, translatedFor, customTitleFor, descriptionFor, orderPayload, type PaymentMethod } from "@/lib/customer"

export const Route = createFileRoute("/")({
  head: ({ matches }) => ({
    meta: [
      { title: venuePageTitle("Totem", matches) },
      { name: "description", content: "Ordina al totem: mangia qui o asporto, poi paga alla cassa." },
      { property: "og:title", content: venuePageTitle("Totem", matches) },
      { property: "og:description", content: "Ordina al totem: mangia qui o asporto, poi paga alla cassa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Totem,
})

function Totem() {
  const { data: license } = useQuery(licenseQueryOptions)
  const restaurantOnly = useRestaurantOnly()
  if (restaurantOnly) return (
    <main className="grid min-h-dvh place-items-center p-10 text-center">
      <div><p className="font-display text-7xl text-accent"><HereIcon /> Servizio al tavolo</p>
      <p className="mt-6 text-3xl text-muted-foreground">In questo locale le ordinazioni le prende il cameriere.</p>
      <SalaLink to="/sala" className="tap mt-10 inline-block rounded-2xl bg-primary px-8 py-4 text-3xl font-bold text-primary-foreground">Apri la sala camerieri</SalaLink></div>
    </main>
  )
  if (license?.state === "expired") return (
    <main className="grid min-h-dvh place-items-center p-10 text-center">
      <div><p className="font-display text-7xl text-accent">Sistema momentaneamente non disponibile</p>
      <p className="mt-6 text-3xl text-muted-foreground">Contattare il gestore</p></div>
    </main>
  )
  return <>
    {license?.state === "demo" && license.demo.badge && <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-full bg-accent px-4 py-1 font-display text-xl text-accent-foreground">Modalità dimostrativa</div>}
    <TotemMain simulate={!!license && !realOrders(license)} limit={license?.state === "demo" ? license.demo.max_products : null} />
  </>
}

function TotemMain({ simulate, limit }: { simulate: boolean; limit: number | null }) {
  const { data: bannerSettings } = useQuery(bannerQueryOptions)
  const catLayout = cleanCategoryLayout(bannerSettings)
  const tile = TILE[catLayout.size]!
  const { data, isLoading } = useQuery(menuQueryOptions)
  const [demoDone, setDemoDone] = useState(false)
  const queryClient = useQueryClient()
  const { language, orderType: dineOption, setOrderType: setDineOption } = useCustomer()
  const t = copy[language]
  const navigate = useNavigate()
  const [orderError, setOrderError] = useState("")
  const [activeCat, setActiveCat] = useState<string | null>(null)
  // Ultima categoria aperta: la striscia torna centrata lì quando si esce dai piatti.
  const [lastCat, setLastCat] = useState<string | null>(null)
  useEffect(() => { if (activeCat) setLastCat(activeCat) }, [activeCat])
  const [cart, setCart] = useState<CartItem[]>([])
  const [custom, setCustom] = useState<Product | null>(null)
  const [startDish, setStartDish] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [foodFilter, setFoodFilter] = useState<string | null>(null)
  const [compose, setCompose] = useState<Category | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const lib = data?.ingredients ?? []
  const { reset: resetCustomer } = useCustomer()
  const idle = Number(useBanner().idle ?? 60)

  const products = useMemo(() => {
    const all = data?.products ?? []
    if (limit == null) return all.filter((p) => !p.sold_out)
    // Demo: solo i primi N piatti, nell'ordine delle categorie
    const catPos = new Map((data?.categories ?? []).map((c, i) => [c.id, i]))
    const allowed = new Set([...all].sort((a, b) => (catPos.get(a.category_id) ?? 999) - (catPos.get(b.category_id) ?? 999)).slice(0, limit).map((p) => p.id))
    return all.filter((p) => !p.sold_out && allowed.has(p.id))
  }, [data, limit])
  const categories = (data?.categories ?? []).filter((c) => limit == null || products.some((p) => p.category_id === c.id))
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
  // Cliente registrato: riconosciuto solo in questo locale; sconto più alto tra fedeltà, benvenuto e compleanno.
  const { data: loyalty } = useQuery({ queryKey: ["loyalty"], queryFn: () => getLoyalty(), staleTime: 30_000 })
  const [member, setMember] = useState<NonNullable<Member> | null>(null)
  const [askMember, setAskMember] = useState(false)
  useEffect(() => { if (!dineOption) setMember(null) }, [dineOption])
  // Inattività: dopo il tempo scelto in Admin il totem torna alla schermata iniziale.
  const busy = language !== "IT" || !!dineOption || cart.length > 0 || !!custom || activeCat !== null
  useEffect(() => {
    if (!busy || !idle || idle <= 0) return
    let timer = setTimeout(go, idle * 1000)
    function go() { setCart([]); setCustom(null); setActiveCat(null); setLastCat(null); setShowCart(false); setShowSuggest(false); setSuggestSeen(false); setMember(null); setAskMember(false); setCompose(null); resetCustomer(); window.scrollTo({ top: 0 }) }
    const bump = () => { clearTimeout(timer); timer = setTimeout(go, idle * 1000) }
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"] as const
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true, capture: true }))
    return () => { clearTimeout(timer); evs.forEach((e) => window.removeEventListener(e, bump, { capture: true })) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, idle])
  const [party, setParty] = useState(false)
  const lt = loyaltyCopy(language)
  const disc = loyalty && member ? discountFor(loyalty, member, total) : { pct: 0, reason: null, amount: 0, step: false }
  const toPay = Math.round((total - disc.amount) * 100) / 100
  const favs = member ? member.favourites.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p) : []
  const addFav = (p: Product) => {
    if (p.choice_groups.length || p.extras.length || p.ingredients.length || isCombo(p)) { setActiveCat(p.category_id); setCustom(p); setShowCart(false) }
    else setCart((c) => [...c, { id: crypto.randomUUID(), productId: p.id, name: p.name, price: p.price, qty: 1 }])
  }
  // Regali di compleanno: aggiunti gratis al carrello, il nome per la cucina resta in italiano.
  const addGifts = (m: NonNullable<Member>) => {
    const gifts = m.gifts.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p)
    if (gifts.length) setCart((c) => [...c.filter((i) => !i.gift), ...gifts.map((p) => ({ id: crypto.randomUUID(), productId: p.id, name: `🎁 OMAGGIO ${p.name}`, price: 0, qty: 1, gift: true }))])
  }
  const memberBar = loyalty?.on ? (member ? (
    <div className="mb-6 rounded-3xl border-4 border-success bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-4xl text-success">{member.firstOrder ? lt.welcome : lt.hi} {member.firstName}! {member.birthday && loyalty.birthday_pct > 0 ? "🎂" : "🎉"}</p>
        <Button variant="ghost" onClick={() => { setMember(null); setCart((c) => c.filter((i) => !i.gift)) }} className="tap rounded-full bg-secondary px-5 py-2 text-xl">✕ {lt.out}</Button>
      </div>
      {disc.amount > 0 && <p className="mt-2 text-2xl text-accent">{disc.reason === "birthday" ? lt.birthday : `${lt.discount} ${disc.reason === "welcome" ? lt.welcomeD : lt.member}`} {disc.step ? `-${euro(disc.amount)} (${euro(loyalty.step_off)} / ${euro(loyalty.step_every)})` : `-${disc.pct}%`}</p>}
      {member.gifts.length > 0 && <p className="mt-2 text-2xl text-accent">{lt.gift}: {member.gifts.map((id) => products.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}</p>}
      {member.lastOrder.length > 0 && <div className="mt-4 rounded-2xl bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-display text-3xl">🧾 {CX[language].last}</p>
          <Button variant="ghost" onClick={() => setCart((c) => [...c, ...member.lastOrder.filter((i) => !i.productId || products.some((p) => p.id === i.productId)).map((i) => ({ ...i, id: crypto.randomUUID() }))])} className="tap h-auto rounded-full bg-accent px-6 py-3 font-display text-3xl text-accent-foreground">🔁 {CX[language].again}</Button></div>
        <div className="mt-3 grid gap-3">{member.lastOrder.map((i, k) => <CartDetails key={k} item={i} products={products} categories={categories} />)}</div>
      </div>}
      {favs.length > 0 && <div className="mt-4"><p className="font-display text-3xl">{lt.favs}</p>
        <div className="mt-2 flex flex-wrap gap-3">{favs.map((p) => <Button key={p.id} variant="ghost" onClick={() => addFav(p)} className="tap h-auto rounded-full bg-accent px-6 py-3 font-display text-3xl text-accent-foreground">+ {p.name} · {euro(p.price)}</Button>)}</div></div>}
    </div>
  ) : (
    <Button variant="ghost" onClick={() => setAskMember(true)} className="tap mb-6 h-auto w-full whitespace-normal rounded-3xl border-4 border-dashed border-accent bg-card py-5 font-display text-4xl text-accent">{lt.ask}</Button>
  )) : null
  const memberDialog = askMember ? <LoyaltyDialog language={language} onClose={() => setAskMember(false)} onMember={(m) => { setMember(m); setAskMember(false); addGifts(m); if (m.greet) { setParty(true); setTimeout(() => setParty(false), 6000); if (loyalty?.birthday_song) playBirthdaySong() } }} /> : null
  const partyBanner = party && loyalty ? <div role="status" onClick={() => setParty(false)} className="fixed inset-0 z-[80] grid place-items-center bg-background/70 p-10"><p className="animate-pulse rounded-[3rem] border-8 border-accent bg-card px-12 py-16 text-center font-display text-8xl text-accent shadow-2xl">🎂 {loyalty.birthday_msg}{member ? ` ${member.firstName}!` : ""}</p></div> : null

  const createOrder = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      setOrderError("")
      const payload = { ...orderPayload(dineOption, priced, method), total: toPay, discount: disc.amount }
      if (simulate) return null
      const newId = crypto.randomUUID()
      const { error } = await supabase.from("orders").insert({ ...payload, id: newId, venue_id: await browserVenueId() })
      if (error) throw error
      const order = { id: newId }
      if (member) await linkOrderCustomer({ data: { orderId: order.id, customerId: member.id } }).catch(() => undefined)
      return order
    },
    onSuccess: (order) => {
      if (!order) { setCart([]); setSuggestSeen(false); setShowCart(false); setDemoDone(true); return }
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      try { localStorage.setItem("last_order_id", order.id) } catch { /* Navigation also carries the order ID. */ }
      setCart([])
      setSuggestSeen(false)
      setMember(null)
      void navigate({ to: "/ordine-confermato/$id", params: { id: order.id } })
    },
    onError: () => setOrderError(t.error),
  })

  if (isLoading) return <div className="grid min-h-screen place-items-center font-display text-6xl text-muted-foreground">{t.loading}</div>

  if (demoDone) return (
    <main className="grid min-h-dvh place-items-center p-10 text-center">
      <div><p className="font-display text-7xl text-accent">Versione dimostrativa</p>
      <p className="mt-6 text-3xl">Ordine di prova completato senza invio alla cassa.</p>
      <Button onClick={() => { setDemoDone(false); setDineOption(null) }} className="tap mt-10 h-24 rounded-2xl px-12 font-display text-4xl">OK</Button></div>
    </main>
  )

  if (!dineOption) return (
    <main className="flex min-h-dvh flex-col px-6 pb-6 pt-28">
      <Screensaver />
      <div className="-mx-6 mb-4"><HomeBanner /></div>
      <div className="flex-1" />
      
      <div className="mx-auto w-full max-w-[62rem] text-center">
        <div className="relative">
          <CompanyIdentity />
          <KioskButton />
        </div>
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
            <span className="text-5xl [@media(max-height:900px)]:text-3xl"><HereIcon /></span><span className="font-display text-5xl [@media(max-height:900px)]:text-3xl">{t.here}</span>
          </Button>
          <Button variant="ghost" onClick={() => setDineOption("asporto")} className={`whitespace-normal tap flex h-28 items-center justify-center gap-4 rounded-3xl border-4 border-primary bg-card px-4 [@media(max-height:900px)]:h-16 [@media(max-height:900px)]:gap-2 ${custom ? "glow ring-4 ring-primary" : ""}`}>
            <span className="text-5xl [@media(max-height:900px)]:text-3xl"><TakeawayIcon /></span><span className="font-display text-5xl [@media(max-height:900px)]:text-3xl">{t.takeaway}</span>
          </Button>
        </div>
        {featured.length > 0 && (
          <section className="mt-10 text-left [@media(max-height:900px)]:mt-4">
            <h2 className="mb-5 text-center font-display text-5xl text-accent [@media(max-height:900px)]:mb-2 [@media(max-height:900px)]:text-3xl">⭐ {t.recommended}</h2>
            <div className="grid grid-cols-3 gap-5 [@media(max-height:900px)]:gap-2">
              {featured.map((p) => (
                <Button variant="ghost" key={p.id} onClick={() => { setActiveCat(p.category_id); setCustom(p); window.scrollTo({ top: 0, behavior: "smooth" }) }} className="whitespace-normal tap relative flex h-auto flex-col overflow-hidden rounded-3xl border-4 border-accent bg-card p-0 text-left">
                  <Badge p={p} />
                  {p.image ? <img src={p.image} alt={p.name} className="aspect-square w-full object-cover [@media(max-height:900px)]:aspect-[4/3]" /> : <div className="grid aspect-square w-full place-items-center bg-muted text-7xl [@media(max-height:900px)]:aspect-[4/3] [@media(max-height:900px)]:text-4xl"><HereIcon /></div>}
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
              {p.image ? <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square w-full place-items-center bg-muted text-7xl"><HereIcon /></div>}
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
        <span className="rounded-full bg-muted px-6 py-2 font-display text-4xl uppercase">{dineOption === "qui" ? <><HereIcon /> {t.here}</> : <><TakeawayIcon /> {t.takeaway}</>}</span>
        <Button variant="ghost" onClick={() => setShowCart(false)} className="whitespace-normal tap rounded-2xl bg-secondary px-8 py-4 font-display text-4xl">✕ {t.close}</Button>
      </header>
      {memberDialog}
      {partyBanner}
      <h1 className="mb-8 font-display text-8xl">{t.yourOrder}</h1>
      {memberBar}
      <div className="grid gap-4">
        {priced.map((i) => {
          const prod = i.productId ? products.find((x) => x.id === i.productId) : undefined
          const setQty = (q: number) => setCart((c) => q < 1 ? c.filter((x) => x.id !== i.id) : c.map((x) => x.id === i.id ? { ...x, qty: q } : x))
          return (
          <div key={i.id} className="flex flex-wrap items-start justify-between gap-6 rounded-3xl bg-card p-6">
            <div className="min-w-0 flex-1"><CartDetails item={i} products={products} categories={categories} /></div>
            <div className="flex flex-col items-end gap-4">
              <p className="font-display text-5xl text-accent">{(i.offer || i.gift) && i.price === 0 ? t.free : euro(i.price * i.qty)}</p>
              {!i.gift && <div className="flex items-center gap-3">
                <Button variant="ghost" aria-label="-" onClick={() => setQty(i.qty - 1)} className="tap h-16 w-16 rounded-full bg-secondary font-display text-4xl">−</Button>
                <span className="w-12 text-center font-display text-5xl">{i.qty}</span>
                <Button variant="ghost" aria-label="+" onClick={() => setQty(i.qty + 1)} className="tap h-16 w-16 rounded-full bg-accent font-display text-4xl text-accent-foreground">+</Button>
              </div>}
              <div className="flex items-center gap-3">
                {i.edit && prod && <Button variant="ghost" onClick={() => { setEditing(i.id); setStartDish(i.edit!.dishId); setCustom(prod); setActiveCat(prod.category_id); setShowCart(false) }} className="tap h-16 rounded-full bg-secondary px-6 font-display text-3xl">✏️ {CX[language].edit}</Button>}
                <Button variant="ghost" aria-label={t.close} onClick={() => setCart((c) => c.filter((x) => x.id!== i.id))} className="whitespace-normal tap h-16 w-16 rounded-full bg-destructive font-display text-4xl text-destructive-foreground">✕</Button>
              </div>
            </div>
          </div>
        )})}
      </div>
      <div className="mt-10 border-t-4 border-border pt-8">
        {disc.amount > 0 && <div className="mb-4 flex items-baseline justify-between text-success">
          <p className="font-display text-4xl">🎁 {lt.discount}{disc.step ? "" : ` -${disc.pct}%`}</p>
          <p className="font-display text-5xl">-{euro(disc.amount)}</p>
        </div>}
        <div className="flex items-baseline justify-between">
          <p className="font-display text-6xl text-muted-foreground">{t.total}</p>
          <p className="font-display text-9xl text-accent">{euro(toPay)}</p>
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
  const foodFilters = filtersOn(bannerSettings) ? cleanFilters(bannerSettings?.["food_filters"]).filter((f) => f.on) : []
  const ffOn = foodFilters.find((f) => f.id === foodFilter)
  // Filtri sulla prima striscia: «__ff:id» raccoglie i piatti adatti da tutte le categorie.
  const FF = "__ff:"
  const ffCat = activeCat?.startsWith(FF) ? foodFilters.find((f) => FF + f.id === activeCat) : undefined
  const inCat = activeCat === OFFERS ? offerMenus : ffCat ? products.filter((p) => !isCombo(p) && dishMatches(p, ffCat)) : activeCat? products.filter((p) => p.category_id === activeCat) : []
  const shown = ffOn ? inCat.filter((p) => dishMatches(p, ffOn)) : inCat
  const isOffers = activeCat === OFFERS
  const dl = dishLayoutFor(bannerSettings, activeCat ?? "")
  const dt = DISH_TILE[dl.size]!
  const cartLift = Math.min(20, Math.max(0, Number(bannerSettings?.["cart_lift"] ?? 4) || 0))

  return (
    <main className="min-h-screen p-8" style={{ paddingBottom: `${12 + cartLift}rem` }}>
      
      <div className={activeCat !== null ? "sticky top-0 z-30 -mx-8 -mt-8 mb-6 bg-background px-8 pt-8 pb-2" : ""}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 pt-20">
        <span />
        <Button variant="ghost" onClick={() => resetCustomer()} className="whitespace-normal tap rounded-full bg-secondary px-6 py-3 font-display text-3xl uppercase">{dineOption === "qui" ? <><HereIcon /> {t.here}</> : <><TakeawayIcon /> {t.takeaway}</>} ▼</Button>
      </header>
      {activeCat !== null && <>
          <Button variant="ghost" onClick={() => setActiveCat(null)} className="whitespace-normal tap mb-4 rounded-full bg-accent px-8 py-4 font-display text-4xl text-accent-foreground">← {t.back} · {isOffers ? translatedFor(data?.offersTitle ?? "", data?.offersTitleTr, language) : ffCat ? `${ffCat.emoji} ${ffCat.label}` : cat && translatedFor(cat.name, cat.name_tr, language)}</Button>
          {foodFilters.length > 0 && !ffCat && (
            <div dir="ltr" className="mb-2 flex gap-3 overflow-x-auto pb-2">
              {foodFilters.map((f) => (
                <Button variant="ghost" key={f.id} aria-pressed={foodFilter === f.id} onClick={() => setFoodFilter(foodFilter === f.id ? null : f.id)} className={`tap h-auto shrink-0 rounded-full px-6 py-3 font-display text-3xl ${foodFilter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{f.emoji} {f.label}{foodFilter === f.id ? " ✕" : ""}</Button>
              ))}
            </div>
          )}
      </>}
      </div>
      {memberDialog}
      {partyBanner}
      {activeCat === null && memberBar}

      {activeCat === null? (
        <div className={`grid gap-6 ${tile.cols === 1 ? "grid-cols-1" : tile.cols === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
          {catLayout.strips && (offerMenus.length > 0 || foodFilters.length > 0 || categories.some((c) => !c.strip)) && (
            <div className="col-span-full flex items-center gap-3">
              {offerMenus.length > 0 && <Button variant="ghost" onClick={() => setActiveCat(OFFERS)} style={{ height: `${TILE[catLayout.size]!.h * 0.65}rem` }} className="whitespace-normal tap relative w-[26%] shrink-0 overflow-hidden rounded-3xl bg-secondary"><span style={{ fontSize: `${TILE[catLayout.size]!.text * 0.75}rem` }} className="glow font-display leading-none text-accent"><OffersIcon /> {translatedFor(data?.offersTitle ?? "Menu in offerta", data?.offersTitleTr, language).toUpperCase()}</span></Button>}
              <div className="min-w-0 flex-1"><CategoryStrip light size={catLayout.size} initial={lastCat} onPick={setActiveCat} cats={[...categories.filter((c) => !c.strip), ...foodFilters.map((f) => ({ id: FF + f.id, name: `${f.emoji} ${f.label}`, name_tr: null, image: null } as unknown as Category))]} /></div>
            </div>
          )}
          {!catLayout.strips && offerMenus.length > 0 && (
            <Button variant="ghost" onClick={() => setActiveCat(OFFERS)} style={{ height: `${tile.h}rem` }} className="whitespace-normal tap relative overflow-hidden rounded-3xl bg-secondary">
              <span style={{ fontSize: `${tile.text}rem` }} className="glow relative z-10 font-display leading-none text-accent"><OffersIcon /> {translatedFor(data?.offersTitle ?? "Menu in offerta", data?.offersTitleTr, language).toUpperCase()}</span>
            </Button>
          )}
          {categories.filter(() => !catLayout.strips).map((c: Category) => (
            <Button variant="ghost" key={c.id} onClick={() => setActiveCat(c.id)} style={{ height: `${tile.h}rem` }} className="whitespace-normal tap relative overflow-hidden rounded-3xl border-4 border-accent bg-card">
              {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
              <span style={{ fontSize: `${tile.text}rem` }} className="glow relative z-10 font-display leading-none text-accent">{translatedFor(c.name, c.name_tr, language).toUpperCase()}</span>
            </Button>
          ))}
          {catLayout.strips && [...new Set(categories.map((c) => c.strip).filter(Boolean))].sort((a, b) => a - b).map((n) => (
            <CategoryStrip key={n} size={catLayout.size} cats={categories.filter((c) => c.strip === n)} initial={lastCat} onPick={setActiveCat} />
          ))}
        </div>
      ) : (
        <>
          {ffOn && shown.length === 0 && <p className="mb-6 text-3xl text-muted-foreground">{ffOn.emoji} {ffOn.label}: —</p>}
          <div className={dl.scroll ? "flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [&>*]:shrink-0 [&>*]:snap-start" : "grid gap-6"} style={dl.scroll ? undefined : { gridTemplateColumns: `repeat(${dt.cols}, minmax(0, 1fr))` }}>
            {cat && customIngredients(cat.custom_kind, lib).length > 0 && (
              <Button variant="ghost" onClick={() => setCompose(cat)} style={dl.scroll ? { width: `${dt.w}rem` } : undefined} className="whitespace-normal tap h-auto flex min-h-64 flex-col justify-between rounded-3xl border-4 border-dashed border-accent bg-card p-5 text-left">
                <div className="grid h-44 w-full place-items-center rounded-2xl bg-muted text-8xl">✨</div>
                <h3 className="mt-4 break-words font-display text-4xl leading-tight">{customTitleFor(cat, language)}</h3>
                <span className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-4xl text-primary-foreground">{euro(cat.custom_price)}</span>
              </Button>
            )}
            {shown.map((p: Product) => (
              <Button variant="ghost" key={p.id} onClick={(e) => { const d = (e.target as HTMLElement).closest("[data-dish]")?.getAttribute("data-dish"); setStartDish(isOffers && d ? d : null); setCustom(p) }} style={dl.scroll ? { width: `${dt.w}rem` } : undefined} className="whitespace-normal tap relative h-auto flex min-h-64 flex-col justify-between rounded-3xl bg-card p-5 text-left hover:bg-secondary!">
                <Badge p={p} pos={isOffers ? "right-3 top-36" : "right-3 top-3"} />
                {isOffers ? <h3 className="shrink-0 font-display text-5xl leading-tight">{p.combo_offer ? "★ " : ""}<OffersIcon /> {menuName(p.name, p.combo_name)}</h3> : null}
                <div className="grid flex-1 place-items-center overflow-hidden rounded-2xl bg-muted">
                  {p.image? <img src={p.image} alt={p.name} style={{ height: `${dt.img}rem` }} className="w-full object-cover" /> : <div style={{ height: `${dt.img}rem` }} className="w-full bg-muted" />}
                </div>
                <div className="mt-4">
                  {!isOffers && <h3 style={{ fontSize: `${dt.title}rem` }} className="font-display leading-tight">{p.name}</h3>}
                  {isOffers && [p, ...p.combo_alts.map((id) => products.find((x) => x.id === id)).filter((x): x is Product => !!x && !x.sold_out)].map((d) => (
                    <div key={d.id} data-dish={d.id} className="mt-1">
                      <p className="font-display text-3xl text-accent">🍔 {d.name}</p>
                      {descriptionFor(d, language) && <p style={{ fontSize: `${dt.desc}rem`, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: dt.lines, overflow: "hidden" }} className="leading-snug text-muted-foreground">{descriptionFor(d, language)}</p>}
                    </div>
                  ))}
                  {!isOffers && descriptionFor(p, language) && <p style={{ fontSize: `${dt.desc}rem`, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: dt.lines, overflow: "hidden" }} className="mt-1 leading-snug text-muted-foreground">{descriptionFor(p, language)}</p>}
                </div>
                <span style={{ fontSize: `${dt.price}rem` }} className="mt-3 inline-block w-fit rounded-full bg-primary px-5 py-2 font-display text-primary-foreground">{euro(isOffers ? p.combo_price ?? p.price : p.price)}</span>
              </Button>
            ))}
            {shown.length === 0 && !(cat && customIngredients(cat.custom_kind, lib).length) && <p className="col-span-full text-3xl text-muted-foreground">{t.empty}</p>}
          </div>
        </>
      )}

      {custom && (
        <Customize key={custom.id + (editing ?? "")} initial={editing ? cart.find((x) => x.id === editing)?.edit : undefined} startDish={startDish} product={offerPick ? { ...custom, price: suggestPrice(custom.price, custom.suggest, spent) } : custom} all={products} lib={lib} onSwitch={(host, d) => { setStartDish(d); setCustom(host) }} onClose={() => { setCustom(null); if (editing) { setEditing(null); setShowCart(true) } if (offerPick) { setOfferPick(false); setShowSuggest(true) } }} onAdd={(extras, removed, base, asMenu, dish, edit) => {
          if (!dineOption) { setShowCart(false); return }
          const price = Math.round((base + extras.reduce((s, e) => s + e.price, 0)) * 100) / 100
          const prev = editing ? cart.find((x) => x.id === editing) : undefined
          const row: CartItem = { id: prev?.id ?? crypto.randomUUID(), productId: custom.id, ...(asMenu && dish.id !== custom.id ? { dishId: dish.id } : {}), name: asMenu ? menuName(dish.name, custom.combo_name) : custom.name, price, qty: prev?.qty ?? 1, extras: extras.map((e) => e.name), removed, edit, ...(offerPick || prev?.offer ? { offer: true } : {}) }
          setCart((c) => prev ? c.map((x) => x.id === prev.id ? row : x) : [...c, row])
          setCustom(null)
          if (prev) { setEditing(null); setShowCart(true) }
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
        <div style={{ bottom: `${cartLift}rem` }} className="fixed inset-x-6 z-40 flex items-center justify-between rounded-3xl border-4 border-accent bg-card p-6 shadow-2xl">
          <div>
            <p className="text-2xl text-muted-foreground">{cart.length} {t.products} · {dineOption === "qui" ? <><HereIcon /> {t.here}</> : <><TakeawayIcon /> {t.takeaway}</>}</p>
            <p className="font-display text-6xl text-accent">{euro(total)}</p>
          </div>
          <Button variant="ghost" onClick={openCart} className="whitespace-normal tap h-auto rounded-full bg-primary px-14 py-8 font-display text-6xl text-primary-foreground"><CartIcon /> {t.cart}</Button>
        </div>
      )}
    </main>
  )
}

const p2 = (p: Product) => Number(p.price) || 0

function Customize({ product, startDish, initial, all, lib, onSwitch, onClose, onAdd }: { product: Product; startDish?: string | null; initial?: CartEdit | undefined; all: Product[]; lib: Ingredient[]; onSwitch: (host: Product, dish: string | null) => void; onClose: () => void; onAdd: (extras: { name: string; price: number }[], removed: string[], base: number, asMenu: boolean, dish: Product, edit: CartEdit) => void }) {
  const { language, orderType } = useCustomer()
  const t = copy[language]
  const [removed, setRemoved] = useState<string[]>(initial?.removed ?? [])
  const [extras, setExtras] = useState<string[]>(initial?.extras ?? [])
  const [dishId, setDishId] = useState(startDish ?? product.id)
  const { data: bannerS } = useQuery(bannerQueryOptions)
  const flags = infoFlags(bannerS)
  const ingredients = (all.find((x) => x.id === dishId) ?? product).ingredients.filter((g) => !ingredientOff(g, lib))
  const L = (n: string) => ingredientLabel(n, lib, language)
  const [picks, setPicks] = useState<Record<string, string[]>>(initial?.picks ?? {})
  const combo = product.combo_items.map((id) => all.find((x) => x.id === id)).filter((x): x is Product => !!x)
  const comboLines = combo.map((x) => ({ name: `🍱 ${x.name}`, price: 0 }))
  const hasCombo = isCombo(product)
  const hasMenuPrice = hasCombo && product.combo_price !== null
  const [asMenu, setAsMenu] = useState(initial?.asMenu ?? true)
  const menuOn = hasCombo && (!hasMenuPrice || asMenu)
  const alts = menuOn ? [product, ...product.combo_alts.map((id) => all.find((x) => x.id === id)).filter((x): x is Product => !!x && !x.sold_out)] : []
  const dish = alts.find((x) => x.id === dishId) ?? product
  const pickDish = (id: string) => { setDishId(id); setRemoved([]); setExtras([]); setPicks({}) }
  const offers = [...dish.extras, ...(menuOn ? product.combo_extras.filter((e) => !dish.extras.some((x) => x.name === e.name)) : [])].filter((e) => !ingredientOff(e.name, lib))
  const clean = (gs: typeof dish.choice_groups) => gs.map((g) => ({ ...g, options: g.options.filter((o) => !ingredientOff(o.name, lib) && !all.some((x) => x.name === o.name && x.sold_out)) })).filter((g) => g.options.length)
  const dishGroups = clean(dish.choice_groups)
  const menuGroups = menuOn ? clean(product.combo_groups) : []
  // Opzioni del prodotto scelto in una scelta del menu (es. salse del contorno): subito sotto.
  const subGroups = (g: { name: string }) => (picks[g.name] ?? []).flatMap((o) => { const x = all.find((y) => y.name === o); return x ? clean(x.choice_groups).map((sg) => ({ ...sg, name: `${g.name} › ${sg.name}` })) : [] })
  const groups = [...dishGroups, ...menuGroups.flatMap((g) => [g, ...subGroups(g)])]
  const ok = groupsValid(groups, picks)
  const picked = groups.flatMap((g) => g.options.filter((o) => (picks[g.name] ?? []).includes(o.name)).map((o) => ({ name: `${g.name}: ${o.name}`, price: o.price })))
  const base = basePrice(p2(product), product.combo_price, hasMenuPrice && asMenu)
  const lines = menuOn ? comboLines : []
  const chosen = offers.filter((e) => extras.includes(e.name))
  const total = base + [...chosen, ...picked].reduce((s, e) => s + e.price, 0)
  // Menu a cassetti: si apre una portata alla volta, si passa alla successiva solo con «Conferma».
  const drawers = menuOn && menuGroups.length > 0
  const steps = 1 + menuGroups.length
  const [step, setStep] = useState(0)
  const stepRefs = useRef<(HTMLElement | null)[]>([])
  useEffect(() => { if (drawers && step >= 0) stepRefs.current[step]?.scrollIntoView({ block: "start", behavior: "smooth" }) }, [step, drawers])
  const drawer = (i: number, title: string, summary: string, body: ReactNode, valid: boolean) => !drawers ? body : (
    <section key={`step-${i}`} ref={(el) => { stepRefs.current[i] = el }} className={`mt-6 scroll-mt-4 rounded-3xl border-4 p-5 ${step === i ? "border-accent bg-background" : valid ? "border-success" : "border-border"}`}>
      <button type="button" onClick={() => setStep(step === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="font-display text-4xl">{valid && step !== i ? "✓ " : `${i + 1}. `}{title}</span><span className="text-3xl">{step === i ? "▲" : "▼"}</span>
      </button>
      {step !== i && summary && <p className="mt-2 text-2xl text-muted-foreground">{summary}</p>}
      {step === i && <>{body}<Button variant="ghost" disabled={!valid} onClick={() => setStep(i + 1 < steps ? i + 1 : -1)} className="tap mt-6 h-20 w-full whitespace-normal rounded-2xl bg-success font-display text-4xl text-success-foreground">{i + 1 < steps ? CX[language].next : CX[language].done}</Button></>}
    </section>
  )
  const dishSummary = [dish.name, ...dishGroups.flatMap((g) => (picks[g.name] ?? []).map(L)), ...removed.map((r) => `${t.without} ${L(r)}`), ...extras.map((e) => `+ ${L(e)}`)].join(" · ")
  const toggle = (g: { name: string; max: number }, o: string) => setPicks((cur) => {
    const list = cur[g.name] ?? []
    if (list.includes(o)) return { ...cur, [g.name]: list.filter((x) => x !== o) }
    if (g.max === 1) return { ...cur, [g.name]: [o] }
    return list.length >= g.max ? cur : { ...cur, [g.name]: [...list, o] }
  })
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/90 pt-[12vh]" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-3xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-0 overflow-auto p-8">
          <Button variant="secondary" onClick={onClose} className="tap float-right ml-4 rounded-full px-6 py-3 font-display text-3xl">✕ {t.exit}</Button>
          <h2 className="font-display text-7xl">{menuOn ? menuName(dish.name, product.combo_name) : product.name}</h2>
          {menuOn && <p className="mt-1 font-display text-4xl text-accent">🍔 {dish.name}</p>}
          {descriptionFor(dish, language) && <p className="mt-2 text-2xl text-muted-foreground">{descriptionFor(dish, language)}</p>}
          <p className="mt-3 inline-block rounded-full bg-primary px-6 py-2 font-display text-5xl text-primary-foreground">{euro(base)}</p>
          {(() => {
            const info = dishInfo(dish.ingredients, lib, dish.description)
            const a = flags.allergens && info.allergens.length > 0, f = flags.frozen && info.frozen
            if (!a && !f) return null
            return <div className="mt-4 space-y-2">
              {a && <p className="text-2xl"><span className="font-bold">{ALLERGENS_TITLE[language]}:</span> {info.allergens.map((id, i) => <span key={id}>{i > 0 ? ", " : ""}<u className="font-bold underline-offset-4">{ALLERGENS.find((y) => y.id === id)![language]}</u></span>)}</p>}
              {f && <p className="text-2xl font-bold text-muted-foreground">❄️ {FROZEN_TEXT[language]}</p>}
            </div>
          })()}
          {(() => {
            const cur = menuOn ? dish : product
            const hosts = all.filter((x) => x.id !== product.id && !x.sold_out && isCombo(x) && x.combo_price !== null && (x.id === cur.id || x.combo_alts.includes(cur.id)))
            if (!hosts.length) return null
            const single = !(hasMenuPrice && asMenu)
            return (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="ghost" aria-pressed={single} onClick={() => { if (cur.id !== product.id) onSwitch(cur, null); else setAsMenu(false) }} className={`tap h-auto flex-1 whitespace-normal rounded-2xl py-4 font-display text-4xl ${single ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{({ IT: "Solo piatto", EN: "Single item", FR: "Seul", ES: "Solo", DE: "Nur Gericht", AR: "الطبق فقط" } as const)[language]} · {euro(p2(cur))}</Button>
                {hasMenuPrice && <Button variant="ghost" aria-pressed={!single} onClick={() => setAsMenu(true)} className={`tap h-auto flex-1 whitespace-normal rounded-2xl py-4 font-display text-4xl ${!single ? "bg-accent text-accent-foreground" : "bg-muted"}`}><OffersIcon /> {menuName(cur.name, product.combo_name)} · {euro(product.combo_price ?? 0)}</Button>}
                {hosts.map((h) => <Button variant="ghost" key={h.id} onClick={() => onSwitch(h, cur.id)} className="tap h-auto flex-1 whitespace-normal rounded-2xl bg-muted py-4 font-display text-4xl"><OffersIcon /> {menuName(cur.name, h.combo_name)} · {euro(h.combo_price ?? 0)}</Button>)}
              </div>
            )
          })() ?? (hasMenuPrice && (
            <div className="mt-4 flex gap-3">
              {[false, true].map((m) => <Button variant="ghost" key={String(m)} aria-pressed={asMenu === m} onClick={() => setAsMenu(m)} className={`tap h-auto flex-1 whitespace-normal rounded-2xl py-4 font-display text-4xl ${asMenu === m ? "bg-accent text-accent-foreground" : "bg-muted"}`}>{m ? <><OffersIcon /> Menu · {euro(product.combo_price ?? 0)}</> : `${({ IT: "Solo piatto", EN: "Single item", FR: "Seul", ES: "Solo", DE: "Nur Gericht", AR: "الطبق فقط" } as const)[language]} · ${euro(p2(product))}`}</Button>)}
            </div>
          ))}
          {drawer(0, `🍔 ${CX[language].main}`, dishSummary, <>
          {alts.length > 1 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">🍔 {({ IT: "Scegli il piatto", EN: "Choose your main", FR: "Choisissez le plat", ES: "Elige el plato", DE: "Wähle das Gericht", AR: "اختر الطبق" } as const)[language]}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {alts.map((x) => <Button variant="ghost" key={x.id} aria-pressed={dish.id === x.id} onClick={() => pickDish(x.id)} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${dish.id === x.id ? "bg-success text-success-foreground" : "bg-muted"}`}>{dish.id === x.id ? "✓ " : ""}{x.name}</Button>)}
              </div>
            </section>
          )}
          {(() => { const G = (g: (typeof groups)[number]) => {
            const n = (picks[g.name] ?? []).length
            return (
              <section key={g.name} className="mt-6">
                <h3 className="flex flex-wrap items-center gap-3 font-display text-4xl text-muted-foreground">
                  {g.name.includes(" › ") ? g.name.split(" › ").map(L).join(" › ") : L(g.name)}
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
          }
            return <>{dishGroups.map(G)}</> })()}
          {ingredients.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground">{t.remove}</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {ingredients.map((ing) => {
                  const on = removed.includes(ing)
                  return <Button variant="ghost" key={ing} onClick={() => setRemoved((r) => (on? r.filter((x) => x!== ing) : [...r, ing]))} className={`tap rounded-full px-6 py-3 text-2xl font-bold ${on? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{on? `${t.without} ` : ""}{flags.allergens && flags.underline && dishInfo([ing], lib).allergens.length > 0 ? <u className="underline-offset-4">{L(ing)}</u> : L(ing)}</Button>
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
          </>, groupsValid(dishGroups, picks))}
          {(() => { const G = (g: (typeof groups)[number]) => {
            const n = (picks[g.name] ?? []).length
            return (
              <section key={g.name} className="mt-6">
                <h3 className="flex flex-wrap items-center gap-3 font-display text-4xl text-muted-foreground">
                  {g.name.includes(" › ") ? g.name.split(" › ").map(L).join(" › ") : L(g.name)}
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
          }
            return <>{menuGroups.map((g, k) => <Fragment key={g.name}>{drawer(k + 1, L(g.name), [...(picks[g.name] ?? []), ...subGroups(g).flatMap((sg) => picks[sg.name] ?? [])].map(L).join(" · "), <>{G(g)}{subGroups(g).map((sg) => <div key={sg.name} className="ml-8 border-l-4 border-border pl-4">{G(sg)}</div>)}</>, groupsValid([g, ...subGroups(g)], picks))}</Fragment>)}</> })()}
          {lines.length > 0 && (
            <section className="mt-6">
              <h3 className="font-display text-4xl text-muted-foreground"><OffersIcon /> {t.includes}</h3>
              <ul className="mt-3 flex flex-wrap gap-3">{combo.map((x) => <li key={x.id} className="rounded-full bg-muted px-6 py-3 text-2xl font-bold">{x.name}</li>)}</ul>
            </section>
          )}
        </div>
        <div className="border-t-4 border-border p-6">
          <Button variant="ghost" disabled={!orderType || !ok} onClick={() => { if (orderType && ok) onAdd([...lines, ...picked, ...chosen], removed, base, menuOn, dish, { asMenu: menuOn, dishId: dish.id, picks, extras, removed }) }} className="whitespace-normal tap h-24 w-full rounded-3xl bg-primary font-display text-5xl text-primary-foreground">{t.add} · {euro(total)}</Button>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/90 pt-[12vh]" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-[52rem] flex-col overflow-hidden rounded-3xl bg-card" onClick={(e) => e.stopPropagation()}>
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
  const { data: kb } = useQuery(bannerQueryOptions)
  if (fullscreen || !kb || kb["kiosk_button"] === false) return null
  // Accanto al logo, fuori dal flusso: il logo resta centrato. Su schermi stretti va sotto il logo.
  return <div className="mb-4 flex flex-col items-center gap-2 md:absolute md:right-0 md:top-0 md:mb-0 md:items-end">
    <Button variant="secondary" onClick={() => void enterKiosk()} className="tap h-auto whitespace-normal md:max-w-[10rem]">⛶ Attiva modalità chiosco</Button>
    {kioskError && <span role="alert" className="text-destructive">{kioskError}</span>}
  </div>
}

function CategoryStrip({ cats, onPick, size, initial, light }: { cats: Category[]; onPick: (id: string) => void; size: number; initial?: string | null; light?: boolean }) {
  const tile = TILE[size]!
  const { language } = useCustomer()
  const ref = useRef<HTMLDivElement>(null)
  const [center, setCenter] = useState(0)
  const raf = useRef(0)
  const update = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(measure) }
  const measure = () => {
    const el = ref.current; if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, dist = Infinity
    Array.from(el.querySelectorAll("[data-strip-item]")).forEach((ch, i) => { const c = ch as HTMLElement; const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i } })
    setCenter(best)
  }
  useEffect(() => {
    const el = ref.current
    const i = initial ? cats.findIndex((c) => c.id === initial) : -1
    if (el && i >= 0) {
      const item = el.querySelectorAll("[data-strip-item]")[i] as HTMLElement | undefined
      if (item) { setCenter(i); requestAnimationFrame(() => { el.scrollLeft = item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2; update() }) ; return }
    }
    update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.length])
  return (
    <div ref={ref} onScroll={update} className="relative col-span-full flex snap-x snap-mandatory items-center gap-4 overflow-x-auto py-4 [scrollbar-width:none]">
      <div aria-hidden className={`${light ? "w-[4%]" : "w-[20%]"} shrink-0`} />
      {cats.map((c, i) => (
        <Button variant="ghost" data-strip-item key={c.id} onClick={() => onPick(c.id)} className={`whitespace-normal tap relative shrink-0 snap-center overflow-hidden rounded-3xl ${light ? "bg-secondary" : "bg-card"} transition-[opacity,border-color] duration-300 ${light ? "w-[36%]" : "w-[55%] border-4"} ${i === center ? (light ? "" : "border-accent") : `${light ? "" : "border-transparent"} opacity-70`}`} style={{ height: `${tile.h * 1.15 * (light ? 0.5 : 1)}rem` }}>
          {c.image && <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
          <span style={{ fontSize: `${tile.text * 0.85}rem` }} className="glow relative z-10 font-display leading-none text-accent">{translatedFor(c.name, c.name_tr, language).toUpperCase()}</span>
        </Button>
      ))}
      <div aria-hidden className={`${light ? "w-[4%]" : "w-[20%]"} shrink-0`} />
    </div>
  )
}

const CX = {
  IT: { last: "Il tuo ultimo ordine", again: "Riordina", edit: "Modifica", next: "Conferma e avanti ➔", done: "Conferma ✓", main: "Piatto principale", menu: "MENU" },
  EN: { last: "Your last order", again: "Order again", edit: "Edit", next: "Confirm and next ➔", done: "Confirm ✓", main: "Main dish", menu: "MENU" },
  FR: { last: "Votre dernière commande", again: "Commander à nouveau", edit: "Modifier", next: "Confirmer et suivant ➔", done: "Confirmer ✓", main: "Plat principal", menu: "MENU" },
  ES: { last: "Tu último pedido", again: "Repetir pedido", edit: "Modificar", next: "Confirmar y seguir ➔", done: "Confirmar ✓", main: "Plato principal", menu: "MENÚ" },
  DE: { last: "Deine letzte Bestellung", again: "Nochmal bestellen", edit: "Ändern", next: "Bestätigen und weiter ➔", done: "Bestätigen ✓", main: "Hauptgericht", menu: "MENÜ" },
  AR: { last: "طلبك الأخير", again: "اطلب مجدداً", edit: "تعديل", next: "تأكيد والتالي ➔", done: "تأكيد ✓", main: "الطبق الرئيسي", menu: "وجبة" },
} as const

// Riepilogo di una voce: nei menu prima il piatto con le sue aggiunte, poi contorno e bevanda.
function CartDetails({ item: i, products, categories }: { item: Omit<CartItem, "id">; products: Product[]; categories: Category[] }) {
  const { language } = useCustomer()
  const t = copy[language]
  const prod = productOf({ id: "", ...i }, products)
  const dish = (i.dishId ? products.find((x) => x.id === i.dishId) : undefined) ?? prod
  const isMenu = !!prod && isCombo(prod) && (i.edit ? i.edit.asMenu : i.name !== prod.name || !!i.dishId)
  const desc = dish ? descriptionFor(dish, language) : ""
  const removed = (i.removed ?? []).map((r) => <li key={"r" + r} className="text-destructive">✕ {t.without} {r}</li>)
  if (!isMenu) return (<>
    <p className="font-display text-5xl">{i.qty} × {i.name}</p>
    {desc && <p className="mt-1 text-2xl text-muted-foreground">{desc}</p>}
    <ul className="mt-2 space-y-1 text-2xl font-bold">{(i.extras ?? []).map((e) => <li key={e} className="text-accent">+ {e.split(" › ").join(" → ")}</li>)}{removed}</ul>
  </>)
  const m = splitMenu({ id: "", ...i }, prod, products, categories)
  const clean = (x: string) => x.replace(/^🍱 /, "").replace(/^\+ /, "+ ")
  return (
    <div className="rounded-2xl border-4 border-accent p-4">
      <p className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-accent px-4 py-1 font-display text-3xl text-accent-foreground"><OffersIcon /> {CX[language].menu}</span><span className="font-display text-5xl">{i.qty} × {i.name}</span></p>
      {dish && <div className="mt-3"><p className="font-display text-4xl">🍔 {dish.name}</p>
        {desc && <p className="text-2xl text-muted-foreground">{desc}</p>}
        <ul className="mt-1 space-y-1 pl-4 text-2xl font-bold">{m.dishExtras.map((e) => <li key={e} className="text-accent">+ {e.split(" › ").join(" → ")}</li>)}{removed}</ul></div>}
      {m.side.length > 0 && <ul className="mt-3 space-y-1 text-2xl font-bold">{m.side.map((x) => <li key={x}>🍟 {clean(x)}</li>)}</ul>}
      {m.drink.length > 0 && <ul className="mt-3 space-y-1 text-2xl font-bold">{m.drink.map((x) => <li key={x}>🥤 {clean(x)}</li>)}</ul>}
    </div>
  )
}
