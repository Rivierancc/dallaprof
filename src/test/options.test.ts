import { describe, expect, it } from "vitest";
import { basePrice, canAddExtra, cleanComboPrice, cleanGroups, groupsValid, suggestPrice } from "@/lib/options";

describe("Product options rules", () => {
  const salse = cleanGroups([{ name: "Salsa", min: 1, max: 2, options: [{ name: "Ketchup" }, { name: "Maionese" }, { name: "BBQ" }] }]);
  it("blocks a mandatory choice until something is picked", () => { expect(groupsValid(salse, {})).toBe(false); expect(groupsValid(salse, { Salsa: ["Ketchup"] })).toBe(true); });
  it("rejects more than the max choices", () => { expect(groupsValid(salse, { Salsa: ["Ketchup", "Maionese", "BBQ"] })).toBe(false); });
  it("limits how many extras can be added", () => { expect(canAddExtra(2, 1)).toBe(true); expect(canAddExtra(2, 2)).toBe(false); expect(canAddExtra(0, 9)).toBe(true); });
  it("gives the free gift only above the spending threshold", () => { const s = { on: true, price: 0, min: 15 }; expect(suggestPrice(1.5, s, 14.99)).toBe(1.5); expect(suggestPrice(1.5, s, 15)).toBe(0); });
  it("applies a discount regardless of spending when threshold is zero", () => { expect(suggestPrice(3, { on: true, price: 2, min: 0 }, 0)).toBe(2); });
});

describe("Combo menu price", () => {
  it("uses the menu price chosen by staff", () => { expect(basePrice(8, 11.5, true)).toBe(11.5); expect(basePrice(8, 11.5, false)).toBe(8); });
  it("costs like the dish when no menu price is set (items free)", () => { expect(basePrice(8, null, true)).toBe(8); });
  it("empty menu price means none", () => { expect(cleanComboPrice("")).toBe(null); expect(cleanComboPrice("9,90")).toBe(9.9); });
});

describe("Offer menu name", () => {
  it("uses the staff name when set, otherwise the main dish", async () => {
    const { menuName } = await import("@/lib/options");
    expect(menuName("Picasso", "Menu Studente")).toBe("Menu Studente · Picasso");
    expect(menuName("Picasso", "  ")).toBe("Menu Picasso");
  });
});

import { cleanExtras, isCombo } from "@/lib/options";
describe("menu con scelte", () => {
  it("un menu con sole scelte (contorno/bevanda) è un menu", () => {
    expect(isCombo({ combo_items: [], combo_groups: [{ name: "Bevanda", min: 1, max: 1, options: [{ name: "Acqua", price: 0 }] }] })).toBe(true);
    expect(isCombo({ combo_items: [], combo_groups: [] })).toBe(false);
  });
  it("extra del menu tengono il prezzo", () => {
    expect(cleanExtras([{ name: "Bacon", price: "1,5" }, { name: "" }])).toEqual([{ name: "Bacon", price: 1.5 }]);
  });
});
