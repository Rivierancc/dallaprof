import { describe, expect, it } from "vitest";
import { venuePageTitle } from "./page-title";

describe("venue browser titles", () => {
  it("uses the licensed venue name on every page", () => {
    for (const page of ["Admin", "Cucina", "Cassa", "Gestione menu", "Sala camerieri", "Display ordini"]) {
      expect(venuePageTitle(page, [{ id: "__root__", loaderData: { venueName: "Da Mario" } }])).toBe(`${page} — Da Mario`);
    }
  });
  it("keeps each venue's name independent", () => {
    expect(venuePageTitle("Admin", [{ id: "__root__", loaderData: { venueName: "Dalla Prof" } }])).toBe("Admin — Dalla Prof");
  });
  it("does not substitute the platform name when the venue name is unavailable", () => {
    expect(venuePageTitle("Admin", [])).toBe("Admin");
  });
});