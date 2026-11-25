import { describe, expect, it } from "vitest";
import { cleanPranks, DEFAULT_PRANKS, pickSessionPrank, type PrankCounters } from "./pranks";

describe("cleanPranks", () => {
  it("usa i valori predefiniti spenti quando mancano le impostazioni", () => {
    expect(cleanPranks(undefined)).toEqual(DEFAULT_PRANKS);
    expect(cleanPranks({})).toEqual(DEFAULT_PRANKS);
  });

  it("limita valori negativi, fuori scala o non numerici per entrambi gli scherzetti", () => {
    const res = cleanPranks({
      pranks: {
        crack: { on: true, everyOrders: -5, clicks: 99 },
        pacman: { on: true, everyOrders: 120, clicks: "abc" },
      },
    });
    expect(res.crack).toEqual({ on: true, everyOrders: 1, clicks: 20 });
    expect(res.pacman).toEqual({ on: true, everyOrders: 30, clicks: 3 });
  });
});

describe("pickSessionPrank", () => {
  it("non attiva nulla quando entrambi gli scherzetti sono spenti", () => {
    const out = pickSessionPrank(DEFAULT_PRANKS, {}, () => 0);
    expect(out.selected).toBeNull();
  });

  it("con everyOrders = 5 scatta esattamente 1 volta ogni blocco di 5 ordini con i suoi tocchi", () => {
    const cfg = {
      crack: { on: true, everyOrders: 5, clicks: 4 },
      pacman: { on: false, everyOrders: 5, clicks: 3 },
    };
    let counters: Partial<PrankCounters> = {};
    let hits = 0;
    for (let i = 0; i < 15; i++) {
      const res = pickSessionPrank(cfg, counters, () => 0.4); // target = 2 in ogni blocco da 5
      counters = res.counters;
      if (res.selected) {
        expect(res.selected).toEqual({ kind: "crack", clicks: 4 });
        hits++;
      }
    }
    expect(hits).toBe(3);
  });

  it("con entrambi accesi a ogni ordine sceglie uno solo dei due per sessione", () => {
    const cfg = {
      crack: { on: true, everyOrders: 1, clicks: 2 },
      pacman: { on: true, everyOrders: 1, clicks: 6 },
    };
    const a = pickSessionPrank(cfg, {}, () => 0.1);
    expect(a.selected).toEqual({ kind: "crack", clicks: 2 });
    const b = pickSessionPrank(cfg, {}, () => 0.9);
    expect(b.selected).toEqual({ kind: "pacman", clicks: 6 });
  });
});