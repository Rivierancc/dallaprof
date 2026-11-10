import { describe, expect, it } from "vitest";
import { manualFor } from "./manual";

const ids = (m?: Parameters<typeof manualFor>[0]) => manualFor(m).map((s) => s.id);

describe("manuale per modalità", () => {
  it("solo ristorante non mostra totem, chiosco e tabellone", () => {
    expect(ids("restaurant")).not.toContain("totem");
    expect(ids("restaurant")).not.toContain("chiosco");
    expect(ids("restaurant")).not.toContain("display");
    expect(ids("restaurant")).toContain("ristorante");
  });
  it("solo fast food non mostra la sala", () => {
    expect(ids("fast_food")).not.toContain("ristorante");
    expect(ids("fast_food")).toContain("totem");
  });
  it("fast food + ristorante mostra tutto", () => {
    expect(ids("both")).toEqual(expect.arrayContaining(["totem", "ristorante"]));
  });
});
