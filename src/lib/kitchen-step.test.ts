import { describe, expect, it } from "vitest";
import { isStandaloneDrink, nextStep } from "@/lib/order-lines";
import type { Category, Product } from "@/lib/menu";

describe("tocco sul piatto in cucina", () => {
  it("da fare → pronto → consegnato → di nuovo da fare", () => {
    expect(nextStep("todo")).toBe("ready");
    expect(nextStep("ready")).toBe("delivered");
    expect(nextStep("delivered")).toBe("todo");
  });
  it("una bevanda ordinata da sola è riconosciuta, un panino no", () => {
    const cats = [{ id: "b", name: "Bevande", slug: "x" }, { id: "p", name: "Burger", slug: "burger" }] as Category[];
    expect(isStandaloneDrink({ category_id: "b" } as Product, cats)).toBe(true);
    expect(isStandaloneDrink({ category_id: "p" } as Product, cats)).toBe(false);
  });
});
