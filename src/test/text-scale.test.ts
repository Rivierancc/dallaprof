import { describe, expect, it } from "vitest";
import { TEXT_SCALES, cleanTextScale, nextTextScaleIndex, textScaleFactor } from "@/lib/text-scale";

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
  it("si può ingrandire ben oltre «Enorme»", () => {
    const enormous = TEXT_SCALES.findIndex((l) => l.label === "Enorme");
    expect(enormous).toBeGreaterThan(0);
    const after = TEXT_SCALES.slice(enormous + 1);
    expect(after.length).toBeGreaterThanOrEqual(2);
    expect(after.every((l) => l.factor > textScaleFactor(enormous))).toBe(true);
    expect(textScaleFactor(TEXT_SCALES.length - 1)).toBeGreaterThanOrEqual(2.2);
  });
  it("il pulsante 🔠 passa al livello più grande e poi riparte dal normale", () => {
    expect(nextTextScaleIndex(0)).toBe(1);
    expect(nextTextScaleIndex(TEXT_SCALES.length - 1)).toBe(0);
    expect(nextTextScaleIndex(NaN)).toBe(1);
    for (let i = 0; i < TEXT_SCALES.length; i++) {
      expect(nextTextScaleIndex(i)).toBe(i + 1 < TEXT_SCALES.length ? i + 1 : 0);
    }
  });
});
