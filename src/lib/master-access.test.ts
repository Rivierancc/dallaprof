import { describe, expect, it } from "vitest";
import { isMasterAccessExpired, MASTER_ACCESS_EXPIRED } from "./master-access";

describe("Master access recovery", () => {
  it("requests a fresh Master login for expired or missing authorization", () => {
    expect(isMasterAccessExpired(new Error(MASTER_ACCESS_EXPIRED))).toBe(true);
    expect(isMasterAccessExpired(new Error("Accesso riservato"))).toBe(true);
  });
  it("does not interpret validation or database failures as expired access", () => {
    expect(isMasterAccessExpired(new Error("Questo nome breve è già usato da un altro locale"))).toBe(false);
    expect(isMasterAccessExpired(new Error("Email del titolare non valida"))).toBe(false);
    expect(isMasterAccessExpired(null)).toBe(false);
  });
});