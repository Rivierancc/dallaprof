import type { MenuProduct } from "@/lib/menu.functions";

export type DishFilter = { min: number | null; max: number | null; ingredient: string };
export type DishHit = { product: MenuProduct; where: string[] };

// Filtra i piatti per fascia di prezzo (estremi inclusi) e per ingrediente
// cercato in ingredienti, scelte, extra e descrizione.
export function filterDishes(products: MenuProduct[], f: DishFilter): DishHit[] {
  const q = f.ingredient.trim().toLowerCase();
  const out: DishHit[] = [];
  for (const p of products) {
    if (f.min != null && !Number.isNaN(f.min) && p.price < f.min) continue;
    if (f.max != null && !Number.isNaN(f.max) && p.price > f.max) continue;
    const where: string[] = [];
    if (q) {
      const has = (xs: string[]) => xs.some((x) => x.toLowerCase().includes(q));
      if (has(p.ingredients)) where.push("ingredienti");
      if (has(p.choice_groups.flatMap((g) => g.options.map((o) => o.name)))) where.push("scelte");
      if (has(p.extras.map((e) => e.name))) where.push("extra");
      if ((p.description ?? "").toLowerCase().includes(q)) where.push("descrizione");
      if (!where.length) continue;
    }
    out.push({ product: p, where });
  }
  return out.sort((a, b) => a.product.price - b.product.price || a.product.name.localeCompare(b.product.name, "it"));
}
