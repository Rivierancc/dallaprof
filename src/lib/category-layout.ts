/** Aspetto delle categorie sul totem, salvato insieme alle impostazioni condivise del chiosco. */
export type CategoryLayout = { strips: boolean; size: number }
export const CATEGORY_SIZES = ["Piccole", "Medie", "Normali", "Grandi", "Molto grandi"] as const
export function cleanCategoryLayout(s: Record<string, unknown> | undefined | null): CategoryLayout {
  const size = Number(s?.["catSize"])
  return { strips: s?.["catStrips"] !== false, size: Number.isInteger(size) && size >= 0 && size <= 4 ? size : 2 }
}
/** Altezza riquadro (rem) e grandezza scritta (rem) per ogni livello. */
export const TILE = [
  { h: 9, text: 2.25, cols: 3 },
  { h: 11, text: 3, cols: 3 },
  { h: 14, text: 3.75, cols: 3 },
  { h: 17, text: 4.5, cols: 2 },
  { h: 21, text: 5.5, cols: 1 },
] as const

/** Aspetto dei piatti dentro ogni categoria: scorrevoli o griglia, e grandezza (0-3). Chiave = id categoria o "__offers". */
export type DishLayout = { scroll: boolean; size: number }
export const DISH_SIZES = ["Compatte", "Normali", "Grandi", "Giganti"] as const
export function dishLayoutFor(s: Record<string, unknown> | undefined | null, catId: string): DishLayout {
  const all = s?.["dishLayout"]
  const v = all && typeof all === "object" ? (all as Record<string, unknown>)[catId] : null
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {}
  const size = Number(o["size"])
  return { scroll: o["scroll"] === true, size: Number.isInteger(size) && size >= 0 && size <= 3 ? size : 1 }
}
/** Larghezza scheda (rem, per lo scorrevole), colonne griglia, altezza foto e testo (rem). */
export const DISH_TILE = [
  { w: 16, cols: 4, img: 8, title: 1.75, price: 1.75 },
  { w: 22, cols: 3, img: 11, title: 2.25, price: 2.25 },
  { w: 28, cols: 2, img: 16, title: 2.75, price: 2.5 },
  { w: 40, cols: 1, img: 24, title: 3.5, price: 3 },
] as const
