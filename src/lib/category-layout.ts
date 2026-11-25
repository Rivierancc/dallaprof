/** Livello mostrato = valore salvato + 1: il livello più piccolo è salvato come -1, così le scelte già fatte non cambiano. */
/** Aspetto delle categorie sul totem, salvato insieme alle impostazioni condivise del chiosco. */
export type CategoryLayout = { strips: boolean; sidebar: boolean; size: number; fingerSpeed: number; fingerSize: number }
export const CATEGORY_SIZES = ["Molto piccole", "Piccole", "Medie", "Normali", "Grandi", "Molto grandi"] as const
export const FINGER_SPEEDS = [
  { sec: 4, label: "⚡ Veloce (4s)" },
  { sec: 6, label: "🚶 Media (6s)" },
  { sec: 9, label: "🐢 Lenta (9s)" },
  { sec: 12, label: "⏱️ Molto lenta (12s)" },
  { sec: 0, label: "⛔ Spento" },
] as const
/** Misura del dito animato: 1 = come adesso. */
export const FINGER_SIZES = [
  { scale: 1, label: "👈 Normale" },
  { scale: 1.35, label: "👈 Più grande" },
  { scale: 1.75, label: "👈 Grande" },
  { scale: 2.2, label: "👈 Molto grande" },
] as const
export function cleanCategoryLayout(s: Record<string, unknown> | undefined | null): CategoryLayout {
  const size = Number(s?.["catSize"])
  const rawSpeed = s?.["fingerSpeed"]
  const speed = typeof rawSpeed === "number" && Number.isFinite(rawSpeed) && (rawSpeed === 0 || (rawSpeed >= 2 && rawSpeed <= 20)) ? rawSpeed : 6
  const rawSize = s?.["fingerSize"]
  const fsize = typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize >= 0.8 && rawSize <= 3 ? rawSize : 1
  return { strips: s?.["catStrips"] !== false, sidebar: s?.["catSidebar"] === true, size: Number.isInteger(size) && size >= -1 && size <= 4 ? size + 1 : 3, fingerSpeed: speed, fingerSize: fsize }
}

/** Icona automatica quando una categoria non ha ancora una foto (usata nella colonna a sinistra). */
export function categoryIcon(name: string): string {
  const n = name.toLowerCase()
  if (/menu|offerta|combo/.test(n)) return "🍱"
  if (/burger|panin|hamburger|sandwich|toast|hot\s*dog/.test(n)) return "🍔"
  if (/pizz|schiacciat|focacc|pinsa|piadin/.test(n)) return "🍕"
  if (/caff|bar|colazion|cappuccin|tè|caffetter/.test(n)) return "☕"
  if (/bibit|bevand|drink|birr|vin|acqua|aperitiv/.test(n)) return "🥤"
  if (/dolc|dessert|torta|gelat|crepe|waffle|pasticc/.test(n)) return "🍰"
  if (/fritt|patatin|stuzzic|antipast|sfizi/.test(n)) return "🍟"
  if (/insalat|contorn|verdur|poke|bowl/.test(n)) return "🥗"
  if (/past|prim|lasagn|gnocch|risott/.test(n)) return "🍝"
  if (/carn|second|grigl|pollo|bistecc/.test(n)) return "🥩"
  if (/pesc|mare|frutti/.test(n)) return "🐟"
  return "🍽️"
}
/** Altezza riquadro (rem) e grandezza scritta (rem) per ogni livello. */
export const TILE = [
  { h: 7, text: 1.75, cols: 4 },
  { h: 9, text: 2.25, cols: 3 },
  { h: 11, text: 3, cols: 3 },
  { h: 14, text: 3.75, cols: 3 },
  { h: 17, text: 4.5, cols: 2 },
  { h: 21, text: 5.5, cols: 1 },
] as const

/** Aspetto dei piatti dentro ogni categoria: scorrevoli o griglia, e grandezza (0-3). Chiave = id categoria o "__offers". */
export type DishLayout = { scroll: boolean; size: number }
export const DISH_SIZES = ["Mini", "Compatte", "Normali", "Grandi", "Giganti"] as const
export function dishLayoutFor(s: Record<string, unknown> | undefined | null, catId: string): DishLayout {
  const all = s?.["dishLayout"]
  const v = all && typeof all === "object" ? (all as Record<string, unknown>)[catId] : null
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {}
  const size = Number(o["size"])
  return { scroll: o["scroll"] === true, size: Number.isInteger(size) && size >= -1 && size <= 3 ? size + 1 : 2 }
}
/** Larghezza scheda (rem, per lo scorrevole), colonne griglia, altezza foto e testo (rem). */
export const DISH_TILE = [
  { w: 12, cols: 5, img: 6, title: 1.4, price: 1.4, desc: 0.95, lines: 4 },
  { w: 16, cols: 4, img: 8, title: 1.75, price: 1.75, desc: 1.05, lines: 4 },
  { w: 22, cols: 3, img: 11, title: 2.25, price: 2.25, desc: 1.25, lines: 3 },
  { w: 28, cols: 2, img: 16, title: 2.75, price: 2.5, desc: 1.25, lines: 3 },
  { w: 40, cols: 1, img: 24, title: 3.5, price: 3, desc: 1.5, lines: 3 },
] as const
