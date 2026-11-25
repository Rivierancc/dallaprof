/** 1 = Lunedì ... 7 = Domenica (ordine italiano). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: { id: Weekday; short: string; name: string }[] = [
  { id: 1, short: "Lun", name: "Lunedì" },
  { id: 2, short: "Mar", name: "Martedì" },
  { id: 3, short: "Mer", name: "Mercoledì" },
  { id: 4, short: "Gio", name: "Giovedì" },
  { id: 5, short: "Ven", name: "Venerdì" },
  { id: 6, short: "Sab", name: "Sabato" },
  { id: 7, short: "Dom", name: "Domenica" },
];

export type SaverOverride = "auto" | "showcase" | "open";

export type SaverSlot = {
  id: string;
  name: string;
  enabled: boolean;
  /** Giorni della settimana attivi (vuoto = tutti i giorni). */
  days: Weekday[];
  /** Se attivo ignora start/end e vale tutto il giorno. */
  allDay: boolean;
  start: string;
  end: string;
  dishIds: string[];
  photos: string[];
};

export type Saver = {
  on: boolean;
  after: number;
  kind: "photos" | "video";
  video: string;
  photos: string[];
  closedDays: Weekday[];
  override: SaverOverride;
  forcedSlotId: string;
  showcaseAllSlots: boolean;
  showcaseMessage: string;
  slots: SaverSlot[];
};

export const DEFAULT_SHOWCASE_MSG = "Solo vetrina · Ordini momentaneamente non attivi";

function cleanWeekdays(v: unknown): Weekday[] {
  if (!Array.isArray(v)) return [];
  const out: Weekday[] = [];
  for (const x of v) {
    const n = Number(x);
    if (Number.isInteger(n) && n >= 1 && n <= 7 && !out.includes(n as Weekday)) out.push(n as Weekday);
  }
  return out.sort((a, b) => a - b);
}

function cleanTime(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  return minutesOf(s) !== null ? s : fallback;
}

function cleanStrings(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

function cleanSlot(raw: unknown): SaverSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r["id"] === "string" && r["id"].trim() ? r["id"].trim() : "";
  if (!id) return null;
  return {
    id,
    name: typeof r["name"] === "string" ? r["name"].slice(0, 60) : "",
    enabled: r["enabled"] !== false,
    days: cleanWeekdays(r["days"]),
    allDay: r["allDay"] === true,
    start: cleanTime(r["start"], "11:30"),
    end: cleanTime(r["end"], "15:00"),
    dishIds: cleanStrings(r["dishIds"], 30),
    photos: cleanStrings(r["photos"], 20),
  };
}

export function readSaver(s: Record<string, unknown> | undefined): Saver {
  const v = s ?? {};
  const ov = v["saverOverride"];
  const slots = Array.isArray(v["saverSlots"])
    ? (v["saverSlots"] as unknown[]).map(cleanSlot).filter((x): x is SaverSlot => x !== null).slice(0, 20)
    : [];
  const forced = typeof v["saverForcedSlot"] === "string" ? v["saverForcedSlot"] : "";
  return {
    on: v["saver"] !== false,
    after: Number(v["saverAfter"] ?? 60) || 60,
    kind: v["saverKind"] === "video" ? "video" : "photos",
    video: typeof v["saverVideo"] === "string" ? v["saverVideo"] : "",
    photos: cleanStrings(v["saverPhotos"], 20),
    closedDays: cleanWeekdays(v["saverClosedDays"]),
    override: ov === "showcase" || ov === "open" ? ov : "auto",
    forcedSlotId: slots.some((x) => x.id === forced) ? forced : "",
    showcaseAllSlots: v["saverShowcaseAll"] !== false,
    showcaseMessage: typeof v["saverShowcaseMsg"] === "string" ? v["saverShowcaseMsg"].slice(0, 120) : DEFAULT_SHOWCASE_MSG,
    slots,
  };
}

export function weekdayOf(date: Date): Weekday {
  const d = date.getDay();
  return (d === 0 ? 7 : d) as Weekday;
}

export function minutesOf(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function slotHasContent(slot: SaverSlot): boolean {
  return slot.dishIds.length > 0 || slot.photos.length > 0;
}

export function slotMatchesNow(slot: SaverSlot, now: Date): boolean {
  if (!slot.enabled) return false;
  if (slot.days.length > 0 && !slot.days.includes(weekdayOf(now))) return false;
  if (slot.allDay) return true;
  const start = minutesOf(slot.start);
  const end = minutesOf(slot.end);
  if (start === null || end === null) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  if (start < end) return cur >= start && (end === 1439 ? cur <= end : cur < end);
  // Fascia a cavallo della mezzanotte (es. 22:00 -> 02:00).
  return cur >= start || cur < end;
}

/** True quando il totem deve restare bloccato in modalità solo salvaschermo / vetrina (ordini disabilitati). */
export function isShowcaseMode(cfg: Saver, now: Date): boolean {
  if (cfg.override === "showcase") return true;
  if (cfg.override === "open") return false;
  return cfg.closedDays.includes(weekdayOf(now));
}

/** Restituisce le fasce da mostrare adesso: eventuale fascia forzata, vetrina o fasce del giorno/ora. */
export function resolveActiveSlots(cfg: Saver, now: Date): SaverSlot[] {
  if (cfg.forcedSlotId) {
    const forced = cfg.slots.find((x) => x.id === cfg.forcedSlotId);
    if (forced && slotHasContent(forced)) return [forced];
  }
  const showcase = isShowcaseMode(cfg, now);
  if (showcase) {
    if (cfg.showcaseAllSlots) {
      const all = cfg.slots.filter((x) => x.enabled && slotHasContent(x));
      if (all.length) return all;
    } else {
      const matched = cfg.slots.filter((x) => slotMatchesNow(x, now) && slotHasContent(x));
      if (matched.length) return matched;
      const fallback = cfg.slots.filter((x) => x.enabled && slotHasContent(x));
      if (fallback.length) return fallback;
    }
    return [];
  }
  const matched = cfg.slots.filter((x) => slotMatchesNow(x, now) && slotHasContent(x));
  // Le fasce dedicate a giorni specifici (es. Giovedì Trippa) hanno priorità visiva rispetto a quelle giornaliere.
  return matched.sort((a, b) => (a.days.length === 0 ? 1 : 0) - (b.days.length === 0 ? 1 : 0));
}

export function collectSaverPhotoPaths(cfg: Saver): string[] {
  const set = new Set<string>(cfg.photos);
  for (const slot of cfg.slots) for (const p of slot.photos) set.add(p);
  return Array.from(set);
}

export function makeNewSlot(name: string, start: string, end: string, days: Weekday[] = [], allDay = false): SaverSlot {
  return {
    id: `slot-${Math.random().toString(36).slice(2, 10)}`,
    name,
    enabled: true,
    days,
    allDay,
    start,
    end,
    dishIds: [],
    photos: [],
  };
}