import { describe, expect, it } from "vitest";
import { cleanPreviewLayout, DEFAULT_PREVIEW_LAYOUT, fitPreviewLayout, previewLayoutKey } from "@/lib/display-preview-layout";

describe("Regolazioni miniatura", () => {
  it("usa memorie indipendenti per cassa e cucina", () => {
    expect(previewLayoutKey("cassa")).not.toBe(previewLayoutKey("cucina"));
  });
  it("mantiene spostamento, dimensioni e trasparenza", () => {
    const layout = { floating: true, x: 100, y: 200, width: 600, height: 400, opacity: 45 };
    expect(cleanPreviewLayout(layout)).toEqual(layout);
  });
  it("recupera da valori non validi", () => {
    expect(cleanPreviewLayout(null)).toEqual(DEFAULT_PREVIEW_LAYOUT);
    expect(cleanPreviewLayout({ opacity: 0 }).opacity).toBe(20);
  });
  it("mantiene l'intera miniatura dentro lo schermo", () => {
    const layout = fitPreviewLayout({ ...DEFAULT_PREVIEW_LAYOUT, x: 1200, y: 1700, width: 900, height: 700 }, 843, 640);
    expect(layout).toMatchObject({ x: 8, y: 8, width: 827, height: 624 });
  });
});