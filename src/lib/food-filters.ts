// Filtri del totem (Pollo, Manzo, Halal…): elenco salvato nelle impostazioni condivise, etichette sui piatti.
export type FoodFilter = { id: string; label: string; emoji: string; on: boolean; words: string[] };

export const DEFAULT_FILTERS: FoodFilter[] = [
  { id: "pollo", label: "Pollo", emoji: "🍗", on: true, words: ["pollo", "chicken"] },
  { id: "manzo", label: "Manzo", emoji: "🥩", on: true, words: ["manzo", "beef", "bovino", "scottona"] },
  { id: "maiale", label: "Maiale", emoji: "🥓", on: true, words: ["maiale", "bacon", "pancetta", "salsiccia", "pulled pork", "prosciutto"] },
  { id: "halal", label: "Halal", emoji: "☪️", on: true, words: [] },
  { id: "vegetariano", label: "Vegetariano", emoji: "🥗", on: true, words: [] },
  { id: "piccante", label: "Piccante", emoji: "🌶️", on: true, words: ["piccante", "jalapeño", "jalapeno", "peperoncino", "spicy", "nduja"] },
  { id: "senza_glutine", label: "Senza glutine", emoji: "🌾", on: true, words: [] },
];

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);

export function cleanFilters(raw: unknown): FoodFilter[] {
  let v: unknown = raw;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
  if (!Array.isArray(v)) return DEFAULT_FILTERS;
  const seen = new Set<string>();
  return v.flatMap((x) => {
    const o = (x ?? {}) as Partial<FoodFilter>;
    const label = String(o.label ?? "").trim().slice(0, 24);
    const id = String(o.id ?? "") || slug(label);
    if (!label || !id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, label, emoji: String(o.emoji ?? "").trim().slice(0, 4), on: o.on !== false, words: (Array.isArray(o.words) ? o.words : []).map((w) => String(w).trim().toLowerCase().slice(0, 24)).filter(Boolean).slice(0, 12) }];
  }).slice(0, 20);
}

export const newFilter = (label: string, emoji: string, list: FoodFilter[]): FoodFilter | null => {
  let id = slug(label);
  if (!id) return null;
  while (list.some((f) => f.id === id)) id += "_";
  return { id, label: label.trim().slice(0, 24), emoji: emoji.trim().slice(0, 4), on: true, words: [label.trim().toLowerCase()] };
};

export const filtersOn = (s: Record<string, unknown> | undefined) => s?.["food_filters_on"] === true;

type Dish = { name: string; description: string; ingredients: string[]; food_tags?: string[] };
/** Un piatto rientra se ha l'etichetta spuntata o se nome/ingredienti/descrizione contengono una parola chiave. */
export function dishMatches(d: Dish, f: FoodFilter): boolean {
  if (d.food_tags?.includes(f.id)) return true;
  const text = [d.name, d.description, ...d.ingredients].join(" ").toLowerCase();
  return f.words.some((w) => text.includes(w));
}
