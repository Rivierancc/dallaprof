import { describe, expect, it } from "vitest";
import { itemTitle, orderLines } from "@/lib/order-lines";
import type { Category, Product } from "@/lib/menu";

const p = (o: Partial<Product>) => ({ extras: [], combo_groups: [], combo_extras: [], ...o }) as unknown as Product;
const picasso = p({ id: "a", name: "Picasso", category_id: "burger", extras: [{ name: "Doppia carne", price: 2 }], combo_groups: [{ name: "Bevanda", min: 1, max: 1, options: [] }, { name: "Contorno", min: 1, max: 1, options: [] }] as never });
const acqua = p({ id: "b", name: "Acqua", category_id: "bev" });
const patatine = p({ id: "c", name: "Patatine", category_id: "contorni" });
const menu = { products: [picasso, acqua, patatine], categories: [{ id: "bev", name: "Bevande", slug: "bevande" }] as Category[] };

describe("righe ordine in cucina", () => {
  it("gli extra del panino restano col panino, non dopo contorno e bevanda", () => {
    const l = orderLines({ id: "1", productId: "a", name: "Scientifico", price: 10, qty: 1, extras: ["Bevanda: Acqua", "Contorno: Patatine", "Doppia carne"], removed: ["Ketchup"] }, menu);
    expect(l.dish).toEqual(["+ Doppia carne", "senza Ketchup"]);
    expect(l.side).toEqual(["Patatine"]);
    expect(l.drink).toEqual(["Acqua"]);
  });
  it("un menu con nome proprio mostra anche il nome del panino", () => {
    expect(itemTitle({ id: "1", name: "Scientifico", price: 1, qty: 1 }, picasso)).toBe("Scientifico · Picasso");
    expect(itemTitle({ id: "1", name: "Scientifico · Picasso", price: 1, qty: 1 }, picasso)).toBe("Scientifico · Picasso");
    expect(itemTitle({ id: "1", name: "Picasso", price: 1, qty: 1 }, picasso)).toBe("Picasso");
  });
  it("in cucina il titolo riporta il panino davvero preso dal cliente", () => {
    const wolf = p({ id: "w", name: "Woolf", category_id: "burger" });
    const withWolf = { ...menu, products: [...menu.products, wolf] };
    const l = orderLines({ id: "1", productId: "a", dishId: "w", name: "Scientifico", price: 9.9, qty: 1, extras: [], removed: [] }, withWolf);
    expect(l.title).toBe("Scientifico · Woolf");
  });
});
