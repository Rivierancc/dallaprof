export type Restaurant = {
  tables: number; // pulsanti numerati in sala
  table_required: boolean;
  cover_on: boolean;
  cover_price: number;
  courses: "single" | "split";
  bell_on: boolean; // campanella dalla cucina
  messages_on: boolean; // messaggi cucina <-> sala
};

export const DEFAULT_RESTAURANT: Restaurant = { tables: 20, table_required: true, cover_on: false, cover_price: 2, courses: "single", bell_on: true, messages_on: true };

export function cleanRestaurant(raw: unknown): Restaurant {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Restaurant, unknown>>;
  const n = Math.trunc(Number(r.tables));
  const p = Math.round(Number(r.cover_price) * 100) / 100;
  return {
    tables: Number.isFinite(n) && n >= 1 ? Math.min(n, 200) : DEFAULT_RESTAURANT.tables,
    table_required: r.table_required !== false,
    cover_on: r.cover_on === true,
    cover_price: Number.isFinite(p) && p >= 0 ? Math.min(p, 50) : DEFAULT_RESTAURANT.cover_price,
    courses: r.courses === "split" ? "split" : "single",
    bell_on: r.bell_on !== false,
    messages_on: r.messages_on !== false,
  };
}

/** PIN dei tablet: esattamente 4 cifre. */
export const validTabletPin = (pin: unknown) => typeof pin === "string" && /^\d{4}$/.test(pin);
