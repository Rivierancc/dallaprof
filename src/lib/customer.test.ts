
import { translatedFor as trFor } from "@/lib/customer";
describe("traduzioni categorie e titolo menu", () => {
  it("usa la lingua scelta se scritta", () => expect(trFor("Bevande", { EN: "Drinks" }, "EN")).toBe("Drinks"));
  it("se vuota resta l'italiano", () => expect(trFor("Bevande", { EN: " " }, "DE")).toBe("Bevande"));
});
