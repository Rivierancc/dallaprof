import { describe, expect, it } from "vitest";
import { cleanPublicLicense, productsLeft, realOrders } from "./license";

describe("licenza", () => {
  it("in demo conta i piatti rimasti rispetto al limite scelto", () => {
    const l = cleanPublicLicense({ state: "demo", demo: { max_products: 5 } });
    expect(productsLeft(l, 3)).toBe(2);
    expect(productsLeft(l, 7)).toBe(0);
  });
  it("con licenza attiva i piatti sono illimitati", () => {
    expect(productsLeft(cleanPublicLicense({ state: "active" }), 500)).toBeNull();
  });
  it("in demo gli ordini sono simulati salvo scelta contraria", () => {
    expect(realOrders(cleanPublicLicense({ state: "demo", demo: {} }))).toBe(false);
    expect(realOrders(cleanPublicLicense({ state: "demo", demo: { orders: "real" } }))).toBe(true);
  });
  it("licenza scaduta: nessun ordine", () => {
    expect(realOrders(cleanPublicLicense({ state: "expired" }))).toBe(false);
  });
});
