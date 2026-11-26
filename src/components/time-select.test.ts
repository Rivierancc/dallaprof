import { describe, expect, it } from "vitest";
import { minuteOptionsFor, parseTimeParts } from "./time-select";

describe("selettore orario a due tendine", () => {
  it("normalizza ore e minuti validi e gestisce valori fuori scala o vuoti", () => {
    expect(parseTimeParts("9:5")).toEqual({ hour: "09", minute: "05" });
    expect(parseTimeParts("23:59")).toEqual({ hour: "23", minute: "59" });
    expect(parseTimeParts("28:75")).toEqual({ hour: "23", minute: "59" });
    expect(parseTimeParts("")).toEqual({ hour: "00", minute: "00" });
  });

  it("include scatti di 5 minuti più 59 e preserva minuti personalizzati esistenti", () => {
    expect(minuteOptionsFor("30")).toContain("00");
    expect(minuteOptionsFor("30")).toContain("59");
    expect(minuteOptionsFor("30")).toHaveLength(13);
    const withCustom = minuteOptionsFor("17");
    expect(withCustom).toContain("17");
    expect(withCustom.indexOf("17")).toBeGreaterThan(withCustom.indexOf("15"));
    expect(withCustom.indexOf("17")).toBeLessThan(withCustom.indexOf("20"));
  });
});