import { describe, expect, it } from "vitest";
import { inRange, parseDayMonth, pickTheme, type KioskTheme } from "@/lib/themes";

const th = (name: string, mode: KioskTheme["mode"], start: string, end: string, position: number): KioskTheme => ({
  id: name, name, mode, start_md: start, end_md: end, bg: "", primary_color: "", accent: "", decor: "", anim: "fall",
  greeting: "", greeting_en: "", greeting_fr: "", greeting_es: "", position,
});

describe("temi ricorrenze", () => {
  it("un periodo a cavallo di capodanno include gennaio", () => {
    expect(inRange("12-21", "03-20", new Date(2027, 0, 10))).toBe(true);
    expect(inRange("12-21", "03-20", new Date(2027, 5, 10))).toBe(false);
  });
  it("in automatico vince il primo tema in elenco tra quelli in data", () => {
    const list = [th("Autunno", "auto", "09-23", "12-20", 8), th("Halloween", "auto", "10-20", "10-31", 2)];
    expect(pickTheme(list, new Date(2026, 9, 30))?.name).toBe("Halloween");
    expect(pickTheme(list, new Date(2026, 10, 5))?.name).toBe("Autunno");
  });
  it("un tema acceso a mano vince sulle date", () => {
    const list = [th("Halloween", "auto", "10-20", "10-31", 1), th("Natale", "on", "12-01", "12-31", 2)];
    expect(pickTheme(list, new Date(2026, 9, 30))?.name).toBe("Natale");
  });
  it("i temi spenti non si attivano mai", () => {
    expect(pickTheme([th("Natale", "off", "12-01", "12-31", 1)], new Date(2026, 11, 25))).toBeNull();
  });
  it("legge le date scritte giorno/mese", () => {
    expect(parseDayMonth("25/12")).toBe("12-25");
    expect(parseDayMonth("40/12")).toBe("");
  });
});
