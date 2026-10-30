import { describe, expect, it } from "vitest";
import { cleanCompanyStyle } from "@/lib/company-style";

describe("regolazioni logo", () => {
  it("mantiene al centro e senza zoom i loghi salvati prima delle nuove regolazioni", () => {
    expect(cleanCompanyStyle({ logoShape: "heart" })).toMatchObject({ logoShape: "heart", logoZoom: 100, logoX: 0, logoY: 0 });
  });
  it("conserva spostamento e ingrandimento insieme alla forma", () => {
    expect(cleanCompanyStyle({ logoShape: "oval", logoZoom: 150, logoX: -20, logoY: 15 })).toMatchObject({ logoShape: "oval", logoZoom: 150, logoX: -20, logoY: 15 });
  });
  it("normalizza valori fuori limite o non numerici", () => {
    expect(cleanCompanyStyle({ logoZoom: 300, logoX: -80, logoY: NaN })).toMatchObject({ logoZoom: 250, logoX: -50, logoY: 0 });
  });
  it("accetta la taglia grandissimo e limita oltre il massimo", () => {
    expect(cleanCompanyStyle({ logoSize: 6 }).logoSize).toBe(6);
    expect(cleanCompanyStyle({ logoSize: 9 }).logoSize).toBe(6);
  });
  it("accetta tutti i colori del tema e respinge quelli sconosciuti", () => {
    for (const color of ["foreground", "accent", "primary", "success", "muted", "destructive"] as const) {
      expect(cleanCompanyStyle({ color }).color).toBe(color);
    }
    expect(cleanCompanyStyle({ color: "blue" }).color).toBe("foreground");
  });
  it("accetta una tonalità libera in formato esadecimale", () => {
    expect(cleanCompanyStyle({ color: "#a1b2c3" }).color).toBe("#a1b2c3");
    expect(cleanCompanyStyle({ color: "red" }).color).toBe("foreground");
  });
  it("accetta la descrizione grandissimo e limita oltre il massimo", () => {
    expect(cleanCompanyStyle({ textSize: 6 }).textSize).toBe(6);
    expect(cleanCompanyStyle({ textSize: 9 }).textSize).toBe(6);
  });
});