import { describe, expect, it } from "vitest";
import { validPhone as vp10 } from "@/lib/loyalty";
import { it as it10, expect as ex10 } from "vitest";
it10("cellulare: servono almeno 10 cifre", () => { ex10(vp10("333176086")).toBe(false); ex10(vp10("3331760866")).toBe(true); });
import { birthdayNear, cleanLoyalty, discountFor, favourites, normalizePhone, validBirthday } from "@/lib/loyalty";

const rules = cleanLoyalty({ on: true, pct: 5, welcome_pct: 10, birthday_pct: 20, birthday_days: 0 });

describe("programma clienti", () => {
  it("birthday is optional and validated", () => {
    expect(validBirthday(31, 2)).toBeNull();
    expect(validBirthday(29, 2)).toEqual({ day: 29, month: 2 });
    expect(birthdayNear(null, null, 7)).toBe(false);
  });
  it("same number with or without +39 is one customer", () => {
    expect(normalizePhone("+39 333 123 4567")).toBe("3331234567");
    expect(normalizePhone("333-123-4567")).toBe("3331234567");
  });
  it("only the highest discount applies", () => {
    expect(discountFor(rules, { firstOrder: true, birthday: true }, 100)).toMatchObject({ pct: 20, reason: "birthday", amount: 20 });
    expect(discountFor(rules, { firstOrder: true, birthday: false }, 100).pct).toBe(10);
    expect(discountFor(rules, { firstOrder: false, birthday: false }, 30).amount).toBe(1.5);
  });
  it("no discount when the programme is off", () => {
    expect(discountFor({ ...rules, on: false }, { firstOrder: true, birthday: true }, 100).amount).toBe(0);
  });
  it("birthday window counts days ahead", () => {
    const now = new Date(2026, 10, 9);
    expect(birthdayNear(9, 11, 0, now)).toBe(true);
    expect(birthdayNear(12, 11, 0, now)).toBe(false);
    expect(birthdayNear(12, 11, 3, now)).toBe(true);
  });
  it("favourites ordered by quantity", () => {
    expect(favourites([{ items: [{ productId: "a", qty: 1 }, { productId: "b", qty: 3 }] }, { items: [{ productId: "a", qty: 1 }] }])).toEqual(["b", "a"]);
  });
});
