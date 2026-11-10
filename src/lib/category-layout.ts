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
