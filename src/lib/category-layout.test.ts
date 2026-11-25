import { describe, expect, it } from "vitest";
import { categoryIcon, cleanCategoryLayout } from "./category-layout";
describe("cleanCategoryLayout", () => {
  it("strisce accese, colonna spenta e grandezza normale se mai impostate", () => expect(cleanCategoryLayout({})).toEqual({ strips: true, sidebar: false, size: 3 }));
  it("riquadri fissi quando spente", () => expect(cleanCategoryLayout({ catStrips: false }).strips).toBe(false));
  it("colonna a sinistra quando accesa", () => expect(cleanCategoryLayout({ catSidebar: true }).sidebar).toBe(true));
  it("grandezza fuori scala torna normale", () => expect(cleanCategoryLayout({ catSize: 9 }).size).toBe(3));
});
describe("categoryIcon", () => {
  it("sceglie un'icona coerente col nome quando manca la foto", () => {
    expect(categoryIcon("Schiacciate")).toBe("🍕");
    expect(categoryIcon("Caffetteria")).toBe("☕");
    expect(categoryIcon("Bibite fresche")).toBe("🥤");
    expect(categoryIcon("Specialità della casa")).toBe("🍽️");
  });
});

import { dishLayoutFor as dlf } from "./category-layout"
import { test as t2, expect as e2 } from "vitest"
t2("piatti: griglia normale di default, scelta per categoria", () => {
  e2(dlf({}, "a")).toEqual({ scroll: false, size: 2 })
  e2(dlf({ dishLayout: { a: { scroll: true, size: 3 } } }, "a")).toEqual({ scroll: true, size: 4 })
  e2(dlf({ dishLayout: { a: { scroll: true, size: 3 } } }, "b")).toEqual({ scroll: false, size: 2 })
})
t2("livello più piccolo salvato come -1", () => {
  e2(cleanCategoryLayout({ catSize: -1 }).size).toBe(0)
  e2(dlf({ dishLayout: { a: { size: -1 } } }, "a").size).toBe(0)
})
