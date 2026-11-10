// Righe di un piatto/menu per cucina, cassa e comanda stampata: prima il piatto
// (extra e ingredienti tolti), poi il contorno, poi la bevanda.
import type { CartItem, Category, Product } from "@/lib/menu";

export type MenuData = { products: Product[]; categories: Category[] };

export const productOf = (i: CartItem, products: Product[]) =>
  products.find((p) => p.id === i.productId) ?? products.find((p) => p.name.toLowerCase() === i.name.toLowerCase());

// Il piatto davvero preso dal cliente: nei menu con più piatti a scelta è quello segnato in dishId.
export const chosenDish = (i: CartItem, products: Product[]) =>
  (i.dishId ? products.find((p) => p.id === i.dishId) : undefined) ?? productOf(i, products);

// Nome da mostrare: se il menu ha un nome suo, accanto c'è sempre il nome del piatto.
export function itemTitle(i: CartItem, product: Product | undefined) {
  if (!product || i.name.toLowerCase().includes(product.name.toLowerCase())) return i.name;
  return `${i.name} · ${product.name}`;
}

export function splitMenu(item: CartItem, product: Product | undefined, products: Product[], categories: Category[]) {
  const drinkCats = new Set(categories.filter((c) => /bevand|bibit|drink|bere/i.test(c.name + " " + c.slug)).map((c) => c.id));
  const isDrinkName = (n: string) => products.some((p) => p.name.toLowerCase() === n.toLowerCase() && drinkCats.has(p.category_id));
  const comboGroups = new Map((product?.combo_groups ?? []).map((g) => [g.name, g]));
  const comboExtras = new Map((product?.combo_extras ?? []).filter((e) => !(product?.extras ?? []).some((x) => x.name === e.name)).map((e) => [e.name, e]));
  const dishExtras: string[] = [], side: string[] = [], drink: string[] = [];
  for (const e of item.extras ?? []) {
    const k = e.indexOf(": ");
    const group = k > 0 ? e.slice(0, k) : "";
    const opt = k > 0 ? e.slice(k + 2) : e.replace(/^🍱 /, "");
    const g = group ? comboGroups.get(group) : undefined;
    const isProduct = products.some((p) => p.name.toLowerCase() === opt.toLowerCase());
    // Il personale decide in Menu offerta con cosa va ogni scelta/extra; senza indicazione si indovina.
    const to = g ? (g.to ?? (isDrinkName(opt) || /bevand|bibit|drink/i.test(group) ? "drink" : isProduct ? "side" : "dish"))
      : !group && e.startsWith("🍱 ") ? (isDrinkName(opt) ? "drink" : "side")
      : !group ? (comboExtras.get(e)?.to ?? "dish") : "dish";
    const label = g && to !== "dish" && !isProduct ? `${group}: ${opt}` : g ? opt : e;
    if (to === "drink") drink.push(label);
    else if (to === "side") side.push(g || e.startsWith("🍱 ") ? label : `+ ${label}`);
    else dishExtras.push(g ? e : label);
  }
  const dish = [...dishExtras.map((e) => `+ ${e}`), ...(item.removed ?? []).map((r) => `senza ${r}`)];
  return { dish, dishExtras, side, drink };
}

// Bevanda ordinata da sola (non dentro un menu): prodotto di una categoria bevande.
export function isStandaloneDrink(product: Product | undefined, categories: Category[]) {
  if (!product) return false;
  const c = categories.find((x) => x.id === product.category_id);
  return !!c && /bevand|bibit|drink|bere|birr|vin|aperitiv|rinfresc/i.test(c.name + " " + c.slug);
}

// Ciclo al tocco in cucina: da fare → pronto → consegnato → da fare.
export type ItemStep = "todo" | "ready" | "delivered";
export function nextStep(s: ItemStep): ItemStep {
  return s === "todo" ? "ready" : s === "ready" ? "delivered" : "todo";
}

// Versione semplice per chi ha solo l'ordine e il menu (cassa, storico, comanda).
export function orderLines(i: CartItem, menu: MenuData | undefined) {
  const product = menu ? productOf(i, menu.products) : undefined;
  const m = splitMenu(i, product, menu?.products ?? [], menu?.categories ?? []);
  return { title: itemTitle(i, menu ? chosenDish(i, menu.products) : undefined), ...m };
}
