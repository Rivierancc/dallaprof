import { describe, expect, it } from "vitest";
import { cleanFilters, dishMatches, DEFAULT_FILTERS } from "./food-filters";

const halal = DEFAULT_FILTERS.find((f) => f.id === "halal")!;
const pollo = DEFAULT_FILTERS.find((f) => f.id === "pollo")!;
describe("filtri piatti", () => {
  it("include piccante e senza glutine di base", () => {
    expect(cleanFilters(undefined).map((f) => f.id)).toEqual(expect.arrayContaining(["piccante", "senza_glutine"]));
  });
  it("halal solo con etichetta spuntata", () => {
    expect(dishMatches({ name: "Chicken burger", description: "", ingredients: ["pollo"] }, halal)).toBe(false);
    expect(dishMatches({ name: "X", description: "", ingredients: [], food_tags: ["halal"] }, halal)).toBe(true);
  });
  it("pollo riconosciuto dagli ingredienti", () => {
    expect(dishMatches({ name: "Crispy", description: "", ingredients: ["Petto di pollo"] }, pollo)).toBe(true);
  });
  it("piatto escluso a mano non compare anche se gli ingredienti lo riconoscono", () => {
    expect(dishMatches({ name: "Crispy", description: "", ingredients: ["Petto di pollo"], food_tags: ["!pollo"] }, pollo)).toBe(false);
  });
});
