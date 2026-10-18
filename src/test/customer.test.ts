import { describe, expect, it } from "vitest";
import { canExitKiosk, CONFIRMATION_DELAY, descriptionFor, EXIT_TAPS, isPaidOrder, orderPayload } from "@/lib/customer";

describe("Customer rules", () => {
  const items = [{ id: "1", name: "Database product", price: 7, qty: 2 }];
  it("requires an order type before checkout", () => { expect(() => orderPayload(null, items, "cash")).toThrow(); });
  it("does not send an unpaid order to the kitchen", () => { expect(orderPayload("qui", items, "cash")).toEqual({ dine_option: "qui", items, total: 14, payment_method: "cash", status: "awaiting_payment" }); });
  it("records card payment choice without treating it as paid", () => { expect(orderPayload("asporto", items, "card").payment_method).toBe("card"); expect(isPaidOrder({ status: "awaiting_payment", paid_at: null })).toBe(false); });
  it("shows preparation only after staff payment confirmation", () => { expect(isPaidOrder({ status: "preparing", paid_at: "2026-10-17T19:35:00Z" })).toBe(true); expect(isPaidOrder({ status: "preparing", paid_at: null })).toBe(false); });
  it("returns home five seconds after payment confirmation", () => { expect(CONFIRMATION_DELAY).toBe(5000); });
  it("uses Italian when translated description is empty", () => { expect(descriptionFor({ description: "Ingredienti", description_en: "" }, "EN")).toBe("Ingredienti"); });
  it("uses selected translated description", () => { expect(descriptionFor({ description: "Ingredienti", description_fr: "Ingrédients" }, "FR")).toBe("Ingrédients"); });
  it("requires five rapid taps for kiosk exit prompt", () => { expect(EXIT_TAPS).toBe(5); });
  it("only accepts the requested local kiosk exit code", () => { expect(canExitKiosk("1234")).toBe(true); expect(canExitKiosk("1235")).toBe(false); });
});