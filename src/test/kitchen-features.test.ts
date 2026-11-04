import { describe, expect, it } from "vitest";
import { cleanKitchenFeatures } from "@/lib/kitchen";

describe("cleanKitchenFeatures", () => {
  it("accende tutto quando non c'è nulla di salvato", () => {
    expect(cleanKitchenFeatures(null)).toEqual({ partial: true, history: true, checklist: true, delivery: true });
    expect(cleanKitchenFeatures({})).toEqual({ partial: true, history: true, checklist: true, delivery: true });
  });

  it("lascia accese le spunta consegne nelle righe salvate prima di questa funzione", () => {
    expect(cleanKitchenFeatures({ partial: false, history: false, checklist: false }).delivery).toBe(true);
  });

  it("rispetta lo spegnimento esplicito di ogni singola funzione", () => {
    expect(cleanKitchenFeatures({ delivery: false })).toEqual({ partial: true, history: true, checklist: true, delivery: false });
    expect(cleanKitchenFeatures({ checklist: false })).toEqual({ partial: true, history: true, checklist: false, delivery: true });
  });
});
