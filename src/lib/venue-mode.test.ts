import { describe, expect, it } from "vitest";
import { allowsCustomerDisplay } from "./venue-mode";

describe("customer display availability", () => {
  it("never allows a display for restaurant-only venues", () => {
    expect(allowsCustomerDisplay("restaurant")).toBe(false);
  });
  it("keeps the display disabled until the venue mode is known", () => {
    expect(allowsCustomerDisplay(undefined)).toBe(false);
    expect(allowsCustomerDisplay(null)).toBe(false);
  });
  it("allows the display for confirmed fast-food modes", () => {
    expect(allowsCustomerDisplay("fast_food")).toBe(true);
    expect(allowsCustomerDisplay("both")).toBe(true);
  });
});