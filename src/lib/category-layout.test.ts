import { describe, expect, it } from "vitest";
import { cleanCategoryLayout } from "./category-layout";
describe("cleanCategoryLayout", () => {
  it("strisce accese e grandezza normale se mai impostate", () => expect(cleanCategoryLayout({})).toEqual({ strips: true, size: 2 }));
  it("riquadri fissi quando spente", () => expect(cleanCategoryLayout({ catStrips: false }).strips).toBe(false));
  it("grandezza fuori scala torna normale", () => expect(cleanCategoryLayout({ catSize: 9 }).size).toBe(2));
});

import { dishLayoutFor as dlf } from "./category-layout"
import { test as t2, expect as e2 } from "vitest"
t2("piatti: griglia normale di default, scelta per categoria", () => {
  e2(dlf({}, "a")).toEqual({ scroll: false, size: 1 })
  e2(dlf({ dishLayout: { a: { scroll: true, size: 3 } } }, "a")).toEqual({ scroll: true, size: 3 })
  e2(dlf({ dishLayout: { a: { scroll: true, size: 3 } } }, "b")).toEqual({ scroll: false, size: 1 })
})
