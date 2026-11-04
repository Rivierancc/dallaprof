import { describe, expect, it } from "vitest";
import { RESET_ORDER_NUMBER, validateOrderNumber } from "@/lib/order-number";

describe("Numerazione ordini", () => {
  it("il reset riparte da 01", () => { expect(RESET_ORDER_NUMBER).toBe(1); });
  it("non consente modifiche senza conferma", () => {
    expect(() => validateOrderNumber({ next: 1, confirmed: false })).toThrow("Conferma");
  });
  it("accetta un nuovo numero a due cifre da 1 a 99", () => {
    expect(validateOrderNumber({ next: 1, confirmed: true }).next).toBe(1);
    expect(validateOrderNumber({ next: 42, confirmed: true }).next).toBe(42);
    expect(validateOrderNumber({ next: 99, confirmed: true }).next).toBe(99);
    for (const next of [0, 100, 1.5, NaN]) expect(() => validateOrderNumber({ next, confirmed: true })).toThrow();
  });
});