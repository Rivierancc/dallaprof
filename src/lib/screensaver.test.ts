import { describe, expect, it } from "vitest";
import { isShowcaseMode, readSaver, resolveActiveSlots, slotMatchesNow, weekdayOf, type SaverSlot } from "./screensaver";

const slot = (p: Partial<SaverSlot>): SaverSlot => ({
  id: "s1", name: "Pranzo", enabled: true, days: [], allDay: false, start: "11:30", end: "15:00", dishIds: ["d1"], photos: [], ...p,
});

// 2026-11-26 è giovedì (4), 2026-11-29 è domenica (7).
const thu = (h: number, m = 0) => new Date(2026, 10, 26, h, m, 0);
const sun = (h: number, m = 0) => new Date(2026, 10, 29, h, m, 0);

describe("calendario settimanale e forzature fuori orario", () => {
  it("riconosce i giorni della settimana in formato Lun=1..Dom=7", () => {
    expect(weekdayOf(thu(12))).toBe(4);
    expect(weekdayOf(sun(12))).toBe(7);
  });

  it("attiva la modalità solo vetrina nei giorni segnati chiusi e rispetta le forzature manuali", () => {
    const base = readSaver({ saverClosedDays: [7], saverOverride: "auto" });
    expect(isShowcaseMode(base, sun(12))).toBe(true);
    expect(isShowcaseMode(base, thu(12))).toBe(false);

    const forcedShowcase = readSaver({ saverClosedDays: [], saverOverride: "showcase" });
    expect(isShowcaseMode(forcedShowcase, thu(12))).toBe(true);

    const forcedOpen = readSaver({ saverClosedDays: [7], saverOverride: "open" });
    expect(isShowcaseMode(forcedOpen, sun(12))).toBe(false);
  });
});

describe("fasce orarie, giorni speciali e vetrina", () => {
  it("abbina le fasce per giorno e fascia oraria, inclusa la mezzanotte", () => {
    const pranzo = slot({ id: "p", start: "12:00", end: "15:00" });
    expect(slotMatchesNow(pranzo, thu(12, 0))).toBe(true);
    expect(slotMatchesNow(pranzo, thu(14, 59))).toBe(true);
    expect(slotMatchesNow(pranzo, thu(15, 0))).toBe(false);

    const notte = slot({ id: "n", start: "22:00", end: "02:00" });
    expect(slotMatchesNow(notte, thu(23, 30))).toBe(true);
    expect(slotMatchesNow(notte, thu(1, 0))).toBe(true);
    expect(slotMatchesNow(notte, thu(12, 0))).toBe(false);

    const trippa = slot({ id: "t", name: "Giovedì Trippa", days: [4], allDay: true });
    expect(slotMatchesNow(trippa, thu(19, 0))).toBe(true);
    expect(slotMatchesNow(trippa, sun(19, 0))).toBe(false);
  });

  it("dà priorità al giorno speciale e permette di forzare una fascia fuori orario", () => {
    const pranzo = slot({ id: "p", name: "Pranzo", days: [], start: "12:00", end: "15:00", dishIds: ["d1"] });
    const trippa = slot({ id: "t", name: "Giovedì Trippa", days: [4], allDay: true, photos: ["saver-a.jpg"] });
    const cena = slot({ id: "c", name: "Cena", days: [], start: "19:00", end: "23:00", enabled: false, dishIds: ["d2"] });

    const cfg = readSaver({ saverSlots: [pranzo, trippa, cena] });
    expect(resolveActiveSlots(cfg, thu(13, 0)).map((x) => x.id)).toEqual(["t", "p"]);

    const forced = readSaver({ saverSlots: [pranzo, trippa, cena], saverForcedSlot: "c" });
    expect(resolveActiveSlots(forced, thu(13, 0)).map((x) => x.id)).toEqual(["c"]);
  });

  it("in modalità solo vetrina ruota tutte le fasce abilitate con contenuto", () => {
    const pranzo = slot({ id: "p", start: "12:00", end: "15:00", dishIds: ["d1"] });
    const cena = slot({ id: "c", start: "19:00", end: "23:00", photos: ["saver-c.jpg"] });
    const spenta = slot({ id: "x", enabled: false, dishIds: ["d3"] });
    const cfg = readSaver({ saverClosedDays: [7], saverShowcaseAll: true, saverSlots: [pranzo, cena, spenta] });
    expect(resolveActiveSlots(cfg, sun(10, 0)).map((x) => x.id)).toEqual(["p", "c"]);
  });
});