import { describe, it, expect } from "vitest";
import { validatePinChange, validStaffVersion } from "@/lib/access";
import { canExitKiosk } from "@/lib/customer";

describe("Access code changes", () => {
  it("accepts numeric codes of 4 to 12 digits", () => {
    expect(() => validatePinChange("1234", "5678", "5678")).not.toThrow();
    expect(() => validatePinChange("1234", "123456789012", "123456789012")).not.toThrow();
    for (const next of ["123", "1234567890123", "abcd"]) expect(() => validatePinChange("1234", next, next)).toThrow();
  });
  it("requires matching confirmation", () => { expect(() => validatePinChange("1234", "5678", "5679")).toThrow(); });
  it("rejects unchanged codes", () => { expect(() => validatePinChange("1234", "1234", "1234")).toThrow(); });
  it("invalidates previous staff sessions after a PIN change", () => {
    expect(validStaffVersion({ unlocked: true }, "initial")).toBe(true);
    expect(validStaffVersion({ unlocked: true, version: "old" }, "new")).toBe(false);
    expect(validStaffVersion({ unlocked: true, version: "new" }, "new")).toBe(true);
    expect(validStaffVersion({ unlocked: false, version: "new" }, "new")).toBe(false);
  });
  it("accepts the new local exit code and rejects the old one", () => {
    expect(canExitKiosk("5678", "5678")).toBe(true);
    expect(canExitKiosk("1234", "5678")).toBe(false);
  });
});