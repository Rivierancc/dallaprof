import { describe, expect, it } from "vitest";
import { FIXED_TAG } from "@/lib/food-filters";
import { removableOf } from "@/lib/options";

describe("removableOf", () => {
  it("ricava gli ingredienti dalla descrizione quando l'elenco salvato è vuoto", () => {
    expect(
      removableOf({
        ingredients: [],
        description: "Pane schiacciata, prosciutto cotto, maionese, pomodoro, olio EVO",
      }),
    ).toEqual(["Pane schiacciata", "Prosciutto cotto", "Maionese", "Pomodoro", "Olio EVO"]);
  });

  it("usa l'elenco salvato quando il personale lo personalizza (es. senza il pane)", () => {
    expect(
      removableOf({
        ingredients: ["Prosciutto cotto", "Maionese", "Pomodoro", "Olio EVO"],
        description: "Pane schiacciata, prosciutto cotto, maionese, pomodoro, olio EVO",
      }),
    ).toEqual(["Prosciutto cotto", "Maionese", "Pomodoro", "Olio EVO"]);
  });

  it("restituisce elenco vuoto se il piatto è segnato come già pronto", () => {
    expect(
      removableOf({
        ingredients: ["Besciamella"],
        description: "Ragù, besciamella, parmigiano",
        food_tags: [FIXED_TAG],
      }),
    ).toEqual([]);
  });
});