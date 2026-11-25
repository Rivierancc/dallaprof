import { describe, expect, it } from "vitest";
import { categoryIcon, cleanCategoryLayout } from "./category-layout";
describe("cleanCategoryLayout", () => {
  it("strisce accese, colonna spenta e grandezza normale se mai impostate", () => expect(cleanCategoryLayout({})).toEqual({ strips: true, sidebar: false, size: 3, fingerSpeed: 6, fingerSize: 1 }));
  it("riquadri fissi quando spente", () => expect(cleanCategoryLayout({ catStrips: false }).strips).toBe(false));
  it("colonna a sinistra quando accesa", () => expect(cleanCategoryLayout({ catSidebar: true }).sidebar).toBe(true));
  it("grandezza fuori scala torna normale", () => expect(cleanCategoryLayout({ catSize: 9 }).size).toBe(3));
  it("velocità del dito salvata, spenta (0) o ripristinata se fuori scala", () => {
    expect(cleanCategoryLayout({ fingerSpeed: 4 }).fingerSpeed).toBe(4);
    expect(cleanCategoryLayout({ fingerSpeed: 12 }).fingerSpeed).toBe(12);
    expect(cleanCategoryLayout({ fingerSpeed: 0 }).fingerSpeed).toBe(0);
    expect(cleanCategoryLayout({ fingerSpeed: 99 }).fingerSpeed).toBe(6);
    expect(cleanCategoryLayout({ fingerSpeed: -3 }).fingerSpeed).toBe(6);
  });
  it("grandezza del dito salvata e normale se fuori scala", () => {
    expect(cleanCategoryLayout({ fingerSize: 1.35 }).fingerSize).toBe(1.35);
    expect(cleanCategoryLayout({ fingerSize: 2.2 }).fingerSize).toBe(2.2);
    expect(cleanCategoryLayout({ fingerSize: 9 }).fingerSize).toBe(1);
    expect(cleanCategoryLayout({ fingerSize: "grande" }).fingerSize).toBe(1);
  });
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
