import { describe, expect, it } from "vitest";
import { TEXT_SCALES, cleanTextScale, textScaleFactor } from "@/lib/text-scale";

describe("ingrandimento del testo nei pannelli staff", () => {
  it("offre almeno tre livelli di lettura", () => {
    expect(TEXT_SCALES.length).toBeGreaterThanOrEqual(3);
    expect(TEXT_SCALES[0]).toMatchObject({ label: "Normale", factor: 1 });
  });
  it("i livelli crescono uno dopo l'altro", () => {
    const factors = TEXT_SCALES.map((level) => level.factor);
    expect(factors).toEqual([...factors].sort((a, b) => a - b));
    expect(new Set(factors).size).toBe(factors.length);
  });
  it("un valore salvato a caso o fuori lista riporta al livello normale", () => {
    for (const raw of [null, undefined, "", "abc", "-1", "99", "1.5"]) {
      expect(cleanTextScale(raw)).toBe(0);
    }
  });
  it("i livelli conosciuti restano al loro posto", () => {
    expect(cleanTextScale("2")).toBe(2);
    expect(textScaleFactor(2)).toBe(TEXT_SCALES[2]!.factor);
    expect(textScaleFactor(99)).toBe(1);
  });
});
