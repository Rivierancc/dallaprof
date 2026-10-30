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
});