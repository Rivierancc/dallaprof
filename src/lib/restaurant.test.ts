import { describe, expect, it } from "vitest";
import { cleanRestaurant, validTabletPin } from "./restaurant";

describe("restaurant rules", () => {
  it("tablet PIN must be exactly 4 digits", () => {
    expect(validTabletPin("1234")).toBe(true);
    expect(validTabletPin("123")).toBe(false);
    expect(validTabletPin("12345")).toBe(false);
    expect(validTabletPin("12a4")).toBe(false);
  });
  it("bell and messages are on by default but can be switched off", () => {
    expect(cleanRestaurant({}).bell_on).toBe(true);
    expect(cleanRestaurant({}).messages_on).toBe(true);
    expect(cleanRestaurant({ bell_on: false, messages_on: false })).toMatchObject({ bell_on: false, messages_on: false });
  });
  it("courses are single unless split is chosen", () => {
    expect(cleanRestaurant({ courses: "x" }).courses).toBe("single");
    expect(cleanRestaurant({ courses: "split" }).courses).toBe("split");
  });
});
