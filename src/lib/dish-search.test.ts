import { describe, it, expect } from "vitest";
import { filterDishes } from "./dish-search";
const p = (name: string, price: number, ingredients: string[] = [], description = "") => ({ id: name, name, price, ingredients, description, extras: [], choice_groups: [] }) as never;
const list = [p("A", 5), p("B", 8, ["Mortadella"]), p("C", 12, [], "Pane, mortadella")];
describe("filterDishes", () => {
  it("fascia di prezzo con estremi inclusi", () => expect(filterDishes(list, { min: 5, max: 8, ingredient: "" }).map((h) => h.product.name)).toEqual(["A", "B"]));
  it("ingrediente anche nella descrizione", () => expect(filterDishes(list, { min: null, max: null, ingredient: "mortadella" }).map((h) => h.product.name)).toEqual(["B", "C"]));
});
