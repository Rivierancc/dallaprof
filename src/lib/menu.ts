import type { ChoiceGroup, Suggest } from "@/lib/options";
import { queryOptions } from "@tanstack/react-query";
import { getMenu } from "@/lib/menu.functions";

// id = riga del carrello (piatto + scelte); price = prezzo unitario già con gli extra.
export type CartItem = {
  id: string;
  productId?: string;
  dishId?: string; // panino scelto in alternativa dentro un menu
  name: string;
  price: number;
  qty: number;
  extras?: string[];
  removed?: string[];
  offer?: boolean; // prodotto suggerito: prezzo ricalcolato in base alla spesa
};

export const itemNotes = (i: CartItem) => [
  ...(i.extras ?? []).map((e) => `+ ${e}`),
  ...(i.removed ?? []).map((r) => `senza ${r}`),
];

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  image_path: string;
  category_id: string;
  position: number;
  sold_out: boolean;
  is_featured: boolean;
  badge_on: boolean;
  badge_text: string;
  badge_blink: boolean;
  description: string;
  description_en: string;
  description_fr: string;
  description_es: string;
  ingredients: string[];
  extras: { name: string; price: number }[];
  max_extras: number;
  choice_groups: ChoiceGroup[];
  combo_items: string[];
  combo_price: number | null;
  combo_groups: ChoiceGroup[];
  combo_extras: { name: string; price: number; to?: "dish" | "side" | "drink" | undefined }[];
  combo_offer: boolean;
  combo_name: string;
  combo_alts: string[];
  suggest: Suggest;
  recipe_on: boolean;
  recipe: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  image: string;
  image_path: string;
  position: number;
  custom_kind: "none" | "dolce" | "salato" | "entrambi";
  custom_price: number;
  custom_title: string;
  custom_title_en: string;
  custom_title_fr: string;
  custom_title_es: string;
  strip: number;
};

export type Ingredient = {
  id: string;
  name: string;
  name_en: string;
  name_fr: string;
  name_es: string;
  kind: "dolce" | "salato";
  group: string;
  price: number;
  available: boolean;
  position: number;
};

// Nome dell'ingrediente nella lingua scelta (sempre italiano se manca la traduzione).
export const ingredientLabel = (name: string, list: Ingredient[], language: "IT" | "EN" | "FR" | "ES") => {
  const g = list.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!g || language === "IT") return name;
  const t = language === "EN" ? g.name_en : language === "FR" ? g.name_fr : g.name_es;
  return t.trim() || name;
};
// Un ingrediente dell'archivio segnato "non disponibile" sparisce dal totem.
export const ingredientOff = (name: string, list: Ingredient[]) =>
  list.some((x) => x.name.toLowerCase() === name.toLowerCase() && !x.available);
export const customIngredients = (kind: Category["custom_kind"], list: Ingredient[]) =>
  kind === "none" ? [] : list.filter((g) => g.available && (kind === "entrambi" || g.kind === kind));

export const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

export const menuQueryOptions = queryOptions({
  queryKey: ["menu"],
  queryFn: () => getMenu(),
  staleTime: 15_000,
  refetchInterval: 30_000,
});

export type Order = {
  id: string;
  order_number: number;
  dine_option: string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
  paid_at?: string | null;
  partial_notes?: string[];
  checked_items?: string[];
  delivered_items?: string[];
};
