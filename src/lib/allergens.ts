// I 14 allergeni di legge (Reg. UE 1169/2011) con nome nelle lingue del totem.
type Lang = "IT" | "EN" | "FR" | "ES" | "DE" | "AR";
export const ALLERGENS = [
  { id: "glutine", icon: "🌾", IT: "Glutine", EN: "Gluten", FR: "Gluten", ES: "Gluten", DE: "Gluten", AR: "غلوتين" },
  { id: "crostacei", icon: "🦐", IT: "Crostacei", EN: "Crustaceans", FR: "Crustacés", ES: "Crustáceos", DE: "Krebstiere", AR: "قشريات" },
  { id: "uova", icon: "🥚", IT: "Uova", EN: "Eggs", FR: "Œufs", ES: "Huevos", DE: "Eier", AR: "بيض" },
  { id: "pesce", icon: "🐟", IT: "Pesce", EN: "Fish", FR: "Poisson", ES: "Pescado", DE: "Fisch", AR: "سمك" },
  { id: "arachidi", icon: "🥜", IT: "Arachidi", EN: "Peanuts", FR: "Arachides", ES: "Cacahuetes", DE: "Erdnüsse", AR: "فول سوداني" },
  { id: "soia", icon: "🫘", IT: "Soia", EN: "Soy", FR: "Soja", ES: "Soja", DE: "Soja", AR: "صويا" },
  { id: "latte", icon: "🥛", IT: "Latte", EN: "Milk", FR: "Lait", ES: "Leche", DE: "Milch", AR: "حليب" },
  { id: "frutta_guscio", icon: "🌰", IT: "Frutta a guscio", EN: "Tree nuts", FR: "Fruits à coque", ES: "Frutos de cáscara", DE: "Schalenfrüchte", AR: "مكسرات" },
  { id: "sedano", icon: "🥬", IT: "Sedano", EN: "Celery", FR: "Céleri", ES: "Apio", DE: "Sellerie", AR: "كرفس" },
  { id: "senape", icon: "🟡", IT: "Senape", EN: "Mustard", FR: "Moutarde", ES: "Mostaza", DE: "Senf", AR: "خردل" },
  { id: "sesamo", icon: "⚪", IT: "Sesamo", EN: "Sesame", FR: "Sésame", ES: "Sésamo", DE: "Sesam", AR: "سمسم" },
  { id: "solfiti", icon: "🍷", IT: "Solfiti", EN: "Sulphites", FR: "Sulfites", ES: "Sulfitos", DE: "Sulfite", AR: "كبريتات" },
  { id: "lupini", icon: "🌼", IT: "Lupini", EN: "Lupin", FR: "Lupin", ES: "Altramuces", DE: "Lupinen", AR: "ترمس" },
  { id: "molluschi", icon: "🦪", IT: "Molluschi", EN: "Molluscs", FR: "Mollusques", ES: "Moluscos", DE: "Weichtiere", AR: "رخويات" },
] as const;
export type AllergenId = (typeof ALLERGENS)[number]["id"];
const IDS = new Set<string>(ALLERGENS.map((a) => a.id));
export const cleanAllergens = (v: unknown): AllergenId[] =>
  [...new Set((Array.isArray(v) ? v : []).filter((x): x is AllergenId => typeof x === "string" && IDS.has(x)))];
export const allergenLabel = (id: string, lang: Lang) => ALLERGENS.find((a) => a.id === id)?.[lang] ?? id;

export const FROZEN_TEXT: Record<Lang, string> = {
  IT: "Può contenere prodotti congelati o surgelati",
  EN: "May contain frozen products",
  FR: "Peut contenir des produits congelés ou surgelés",
  ES: "Puede contener productos congelados",
  DE: "Kann tiefgekühlte Produkte enthalten",
  AR: "قد يحتوي على منتجات مجمدة",
};
export const ALLERGENS_TITLE: Record<Lang, string> = { IT: "Allergeni", EN: "Allergens", FR: "Allergènes", ES: "Alérgenos", DE: "Allergene", AR: "مسببات الحساسية" };

type Lib = { name: string; allergens: string[]; frozen: boolean }[];
/** Allergeni e gelo di un piatto, ricavati dagli ingredienti dell'archivio con lo stesso nome. */
const norm = (s: string) => s.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
/** Ingredienti dell'archivio citati nella descrizione italiana (parola intera, senza asterischi). */
export function namesInText(text: string, lib: Lib) {
  const t = ` ${norm(text).replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ")} `;
  return lib.filter((g) => { const n = norm(g.name); return n.length > 2 && t.includes(` ${n} `); }).map((g) => g.name);
}
export function dishInfo(names: string[], lib: Lib, description = "") {
  const set = new Set<string>();
  let frozen = false;
  for (const n of [...names, ...(description ? namesInText(description, lib) : [])]) {
    const g = lib.find((x) => norm(x.name) === norm(n));
    if (!g) continue;
    g.allergens.forEach((a) => set.add(a));
    if (g.frozen) frozen = true;
  }
  return { allergens: ALLERGENS.filter((a) => set.has(a.id)).map((a) => a.id), frozen };
}

/** Interruttori per locale, salvati nelle impostazioni condivise del totem. Spenti di default. */
export const infoFlags = (s: Record<string, unknown> | null | undefined) => ({
  stock: s?.["stock_on"] === true,
  allergens: s?.["allergens_on"] === true,
  frozen: s?.["frozen_on"] === true,
  underline: s?.["allergen_underline_on"] === true,
});
