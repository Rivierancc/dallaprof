import { describe, expect, it } from "vitest";
import { cleanCategoryLayout } from "./category-layout";
describe("cleanCategoryLayout", () => {
  it("strisce accese e grandezza normale se mai impostate", () => expect(cleanCategoryLayout({})).toEqual({ strips: true, size: 2 }));
  it("riquadri fissi quando spente", () => expect(cleanCategoryLayout({ catStrips: false }).strips).toBe(false));
  it("grandezza fuori scala torna normale", () => expect(cleanCategoryLayout({ catSize: 9 }).size).toBe(2));
});
