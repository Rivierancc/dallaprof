import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { cleanNews, NEWS_SOURCES, type NewsSettings } from "@/lib/news";
import { cleanCompanyStyle, type CompanyStyle } from "@/lib/company-style";
import { cleanCombo, cleanComboPrice, cleanGroups, cleanMaxExtras, cleanSuggest, type ChoiceGroup, type Suggest } from "@/lib/options";
import { cleanLanguages, cleanTranslations, type Translations } from "@/lib/customer";
import { cleanKitchenFeatures, type KitchenFeatures } from "@/lib/kitchen";

const BUCKET = "menu-photos";
const SIGN_TTL = 60 * 60;
const MAX_FILE_CHARS = 6_000_000;

const staffOnly = async () => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
};

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

// Public read-only client: the menu is shown to anyone at the totem.
const publishable = () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
};

const sign = async (paths: string[]) => {
  const uniq = [...new Set(paths.filter(Boolean))];
  const map: Record<string, string> = {};
  if (!uniq.length) return map;
  const supabase = await admin();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(uniq, SIGN_TTL);
  if (error) return map;
  (data ?? []).forEach((r, i) => {
    const path = uniq[i];
    if (path && r.signedUrl) map[path] = r.signedUrl;
  });
  return map;
};

export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  image: string;
  image_path: string;
  position: number;
  custom_kind: CustomKind;
  custom_price: number;
  custom_title: string;
  custom_title_en: string;
  custom_title_fr: string;
  custom_title_es: string;
  custom_title_de: string;
  custom_title_ar: string;
  name_tr: Translations;
  strip: number;
};

export type CustomKind = "none" | "dolce" | "salato" | "entrambi";
export type MenuIngredient = {
  id: string;
  name: string;
  name_en: string;
  name_fr: string;
  name_es: string;
  name_de: string;
  name_ar: string;
  kind: "dolce" | "salato";
  group: string;
  price: number;
  available: boolean;
  position: number;
};

export type MenuProduct = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  image: string;
  image_path: string;
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
  description_de: string;
  description_ar: string;
  ingredients: string[];
  extras: MenuExtra[];
  max_extras: number;
  choice_groups: ChoiceGroup[];
  combo_items: string[];
  combo_price: number | null;
  combo_offer: boolean;
  combo_name: string;
  combo_alts: string[];
  combo_groups: ChoiceGroup[];
  combo_extras: { name: string; price: number; to?: "dish" | "side" | "drink" | undefined }[];
  suggest: Suggest;
  recipe_on: boolean;
  recipe: string;
};

export type MenuExtra = { name: string; price: number };

const cleanIngredients = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim().slice(0, 40)).filter(Boolean).slice(0, 20);
const cleanExtras = (v: unknown): MenuExtra[] =>
  (Array.isArray(v) ? v : [])
    .map((x) => {
      const o = (x ?? {}) as { name?: unknown; price?: unknown };
      const price = Number(String(o.price ?? "").replace(",", "."));
      return { name: String(o.name ?? "").trim().slice(0, 40), price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0 };
    })
    .filter((x) => x.name)
    .slice(0, 20);

export type MenuData = { categories: MenuCategory[]; products: MenuProduct[]; ingredients: MenuIngredient[]; offersTitle: string; offersTitleTr: Translations };

export const getMenu = createServerFn({ method: "GET" }).handler(async (): Promise<MenuData> => {
  const db = publishable();
  const [c, p, g, b] = await Promise.all([
    db.from("menu_categories")
      .select("id, slug, name, image_path, position, custom_kind, custom_price, custom_title, custom_title_en, custom_title_fr, custom_title_es, custom_title_de, custom_title_ar, name_tr, strip")
      .eq("active", true)
      .order("position", { ascending: true }),
    db.from("menu_products")
      .select("id, category_id, name, price, image_path, position, sold_out, description, description_en, description_fr, description_es, description_de, description_ar, ingredients, extras, is_featured, badge_on, badge_text, badge_blink, max_extras, choice_groups, combo_items, combo_price, combo_offer, combo_name, combo_alts, combo_groups, combo_extras, suggest, recipe_on, recipe")
      .eq("active", true)
      .order("position", { ascending: true }),
    db.from("menu_ingredients")
      .select("id, name, name_en, name_fr, name_es, name_de, name_ar, kind, grp, price, available, position")
      .order("kind", { ascending: true })
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    db.from("kiosk_banner").select("offers_title, offers_title_tr").eq("id", 1).maybeSingle(),
  ]);
  if (g.error) throw new Error(g.error.message);
  if (c.error) throw new Error(c.error.message);
  if (p.error) throw new Error(p.error.message);
  const urls = await sign([...(c.data ?? []), ...(p.data ?? [])].map((r) => r.image_path));
  return {
    offersTitle: (b.data?.offers_title ?? "").trim() || "Menu in offerta",
    offersTitleTr: cleanTranslations(b.data?.offers_title_tr),
    categories: (c.data ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      image_path: r.image_path,
      image: urls[r.image_path] ?? "",
      position: r.position,
      custom_kind: (["dolce", "salato", "entrambi"].includes(r.custom_kind) ? r.custom_kind : "none") as CustomKind,
      custom_price: Number(r.custom_price) || 0,
      custom_title: r.custom_title,
      custom_title_en: r.custom_title_en,
      custom_title_fr: r.custom_title_fr,
      custom_title_es: r.custom_title_es,
      custom_title_de: r.custom_title_de ?? "",
      custom_title_ar: r.custom_title_ar ?? "",
      name_tr: cleanTranslations(r.name_tr),
      strip: Number(r.strip) || 0,
    })),
    ingredients: (g.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      name_en: r.name_en ?? "",
      name_fr: r.name_fr ?? "",
      name_es: r.name_es ?? "",
      name_de: r.name_de ?? "",
      name_ar: r.name_ar ?? "",
      kind: r.kind === "dolce" ? "dolce" : "salato",
      group: r.grp ?? "",
      price: Number(r.price) || 0,
      available: !!r.available,
      position: r.position,
    })),
    products: (p.data ?? []).map((r) => ({
      id: r.id,
      category_id: r.category_id,
      name: r.name,
      price: Number(r.price),
      image_path: r.image_path,
      image: urls[r.image_path] ?? "",
      position: r.position,
      sold_out: !!r.sold_out,
      is_featured: !!r.is_featured,
      badge_on: !!r.badge_on,
      badge_text: r.badge_text ?? "",
      badge_blink: !!r.badge_blink,
      description: r.description ?? "",
      description_en: r.description_en ?? "",
      description_fr: r.description_fr ?? "",
      description_es: r.description_es ?? "",
      description_de: r.description_de ?? "",
      description_ar: r.description_ar ?? "",
      ingredients: cleanIngredients(r.ingredients),
      extras: cleanExtras(r.extras),
      max_extras: cleanMaxExtras(r.max_extras),
      choice_groups: cleanGroups(r.choice_groups),
      combo_items: cleanCombo(r.combo_items),
      combo_price: cleanComboPrice(r.combo_price),
      combo_offer: !!r.combo_offer,
      combo_name: r.combo_name ?? "",
      combo_alts: cleanCombo(r.combo_alts).filter((x) => x !== r.id),
      combo_groups: cleanGroups(r.combo_groups),
      combo_extras: cleanExtras(r.combo_extras),
      suggest: cleanSuggest(r.suggest),
      recipe_on: r.recipe_on !== false,
      recipe: r.recipe ?? "",
    })),
  };
});

export const setDescription = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; description: string }) => ({
    id: String(d.id),
    description: String(d.description ?? "").trim().slice(0, 300),
  }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase.from("menu_products").update({ description: data.description }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setProductOptions = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; ingredients: string[]; extras: MenuExtra[] }) => ({
    id: String(d.id),
    ingredients: cleanIngredients(d.ingredients),
    extras: cleanExtras(d.extras),
  }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase
      .from("menu_products")
      .update({ ingredients: data.ingredients, extras: data.extras })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setProductRules = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; maxExtras: number; groups: ChoiceGroup[]; combo: string[]; comboPrice?: number | null; suggest: Suggest; comboGroups?: ChoiceGroup[]; comboExtras?: { name: string; price: number }[]; comboAlts?: string[] }) => ({
    ...(d.comboAlts ? { combo_alts: cleanCombo(d.comboAlts).filter((x) => x !== String(d.id)) } : {}),
    ...(d.comboGroups ? { combo_groups: cleanGroups(d.comboGroups) } : {}),
    ...(d.comboExtras ? { combo_extras: cleanExtras(d.comboExtras) } : {}),
    combo_price: cleanComboPrice(d.comboPrice),
    id: String(d.id),
    max_extras: cleanMaxExtras(d.maxExtras),
    choice_groups: cleanGroups(d.groups),
    combo_items: cleanCombo(d.combo).filter((x) => x !== String(d.id)),
    suggest: cleanSuggest(d.suggest),
  }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { id, ...row } = data;
    const { error } = await supabase.from("menu_products").update(row as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Menu in offerta: mostra il piatto come menu nella sezione dedicata del totem, con un nome a scelta.
export const setComboOffer = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; on: boolean; name: string }) => ({ id: String(d.id), on: !!d.on, name: String(d.name ?? "").trim().slice(0, 60) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("menu_products").update({ combo_offer: data.on, combo_name: data.name }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setOffersTitle = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; tr?: unknown }) => ({ title: String(d.title ?? "").trim().slice(0, 40), tr: cleanTranslations(d.tr) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").update({ offers_title: data.title || "Menu in offerta", offers_title_tr: data.tr as never }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setProductRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; on: boolean; recipe: string }) => ({ id: String(d.id), on: !!d.on, recipe: String(d.recipe ?? "").slice(0, 1000) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase.from("menu_products").update({ recipe_on: data.on, recipe: data.recipe }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Accende/spegne la scheda ingredienti in cucina per TUTTI i piatti di una categoria.
export const setCategoryRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: { categoryId: string; on: boolean }) => ({ categoryId: String(d.categoryId), on: !!d.on }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase.from("menu_products").update({ recipe_on: data.on }).eq("category_id", data.categoryId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setSoldOut = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; soldOut: boolean }) => ({ id: String(d.id), soldOut: !!d.soldOut }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase.from("menu_products").update({ sold_out: data.soldOut }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "categoria";

export const saveCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; name: string; imagePath?: string; position?: number }) => {
    const name = String(d.name ?? "").trim().slice(0, 40);
    if (!name) throw new Error("Il nome della categoria è obbligatorio");
    const position = Number(d.position ?? 0);
    return {
      id: d.id ? String(d.id) : null,
      name,
      imagePath: String(d.imagePath ?? "").slice(0, 200),
      position: Number.isFinite(position) ? Math.trunc(position) : 0,
    };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    if (data.id) {
      const { error } = await supabase
        .from("menu_categories")
        .update({ name: data.name, image_path: data.imagePath, position: data.position })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const base = slugify(data.name);
    const { data: clash } = await supabase.from("menu_categories").select("slug").eq("slug", base).maybeSingle();
    const slug = clash ? `${base}-${Math.random().toString(36).slice(2, 5)}` : base;
    const { data: row, error } = await supabase
      .from("menu_categories")
      .insert({ name: data.name, slug, image_path: data.imagePath, position: data.position })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// Riscrive la posizione di TUTTE le categorie (0..N) nell'ordine ricevuto.
export const reorderCategories = createServerFn({ method: "POST" })
  .inputValidator((d: { ids: string[] }) => {
    if (!Array.isArray(d.ids) || d.ids.length > 500) throw new Error("Elenco non valido");
    return { ids: d.ids.map(String) };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const results = await Promise.all(
      data.ids.map((id, i) => supabase.from("menu_categories").update({ position: i }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("reorderCategories", failed.error);
      throw new Error(failed.error.message);
    }
    return { ok: true as const };
  });

export const setCategoryStrip = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; strip: number }) => ({ id: String(d.id), strip: Math.max(0, Math.min(9, Math.trunc(Number(d.strip) || 0))) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const { error } = await db.from("menu_categories").update({ strip: data.strip }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase.from("menu_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; category_id: string; name: string; price: number; imagePath?: string; position?: number }) => {
    const name = String(d.name ?? "").trim().slice(0, 60);
    const price = Number(String(d.price ?? "").replace(",", "."));
    if (!name) throw new Error("Il nome del piatto è obbligatorio");
    if (!Number.isFinite(price) || price < 0) throw new Error("Prezzo non valido");
    const position = Number(d.position ?? 0);
    return {
      id: d.id ? String(d.id) : null,
      category_id: String(d.category_id),
      name,
      price: Math.round(price * 100) / 100,
      imagePath: String(d.imagePath ?? "").slice(0, 200),
      position: Number.isFinite(position) ? Math.trunc(position) : 0,
    };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { data: cat } = await supabase.from("menu_categories").select("id").eq("id", data.category_id).maybeSingle();
    if (!cat) throw new Error("Categoria non trovata");
    if (data.id) {
      const { error } = await supabase
        .from("menu_products")
        .update({
          category_id: data.category_id,
          name: data.name,
          price: data.price,
          image_path: data.imagePath,
          position: data.position,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("menu_products")
      .insert({
        category_id: data.category_id,
        name: data.name,
        price: data.price,
        image_path: data.imagePath,
        position: data.position,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase.from("menu_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const uploadMenuPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: { file: string }) => {
    const file = String(d.file ?? "");
    if (!file.startsWith("data:image/") || file.length > MAX_FILE_CHARS) throw new Error("Foto non valida o troppo grande");
    return { file };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const b64 = data.file.slice(data.file.indexOf(",") + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const supabase = await admin();
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return { path };
  });

// Max 3 piatti in evidenza: attivandone un quarto si toglie il più vecchio.
export const setFeatured = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; featured: boolean }) => ({ id: String(d.id), featured: !!d.featured }))
  .handler(async ({ data }) => {
    await staffOnly();
    const supabase = await admin();
    const { error } = await supabase
      .from("menu_products")
      .update({ is_featured: data.featured, featured_at: data.featured ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.featured) {
      const { data: rows } = await supabase
        .from("menu_products")
        .select("id")
        .eq("is_featured", true)
        .order("featured_at", { ascending: false, nullsFirst: false });
      const extra = (rows ?? []).slice(3).map((r) => r.id);
      if (extra.length) await supabase.from("menu_products").update({ is_featured: false, featured_at: null }).in("id", extra);
    }
    return { ok: true as const };
  });

export const setBadge = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; on: boolean; text: string; blink: boolean }) => ({
    id: String(d.id), on: !!d.on, blink: !!d.blink, text: String(d.text ?? "").trim().slice(0, 24),
  }))
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const { error } = await db.from("menu_products").update({ badge_on: data.on && !!data.text, badge_text: data.text, badge_blink: data.blink }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const TR_COLS = { EN: "description_en", FR: "description_fr", ES: "description_es", DE: "description_de", AR: "description_ar" } as const;
export const setTranslation = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; language: keyof typeof TR_COLS; description: string }) => {
    const column = TR_COLS[d.language];
    if (!column) throw new Error("Lingua non valida");
    return { id: String(d.id), column, description: String(d.description ?? "").trim().slice(0, 300) };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const { error } = await db.from("menu_products").update({ [data.column]: data.description } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLanguages = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publishable().from("kiosk_banner").select("languages").eq("id", 1).maybeSingle();
  return cleanLanguages(data?.languages);
});

export const saveLanguages = createServerFn({ method: "POST" })
  .inputValidator((d: { languages: unknown }) => ({ languages: cleanLanguages(d?.languages) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").update({ languages: data.languages as never }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getCustomerOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.id)) throw new Error("Ordine non valido");
    return { id: d.id };
  })
  .handler(async ({ data }) => {
    const { data: order, error } = await publishable().from("orders").select("id, order_number, status, paid_at, total").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return order;
  });

const txt = (v: unknown, n = 40) => String(v ?? "").trim().slice(0, n);

export const saveIngredient = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string; name: string; name_en?: string; name_fr?: string; name_es?: string; name_de?: string; name_ar?: string; group?: string; kind: string; price: number | string; available?: boolean }) => {
    const name = txt(d.name);
    if (!name) throw new Error("Il nome dell'ingrediente è obbligatorio");
    const price = Number(String(d.price ?? "0").replace(",", "."));
    if (!Number.isFinite(price) || price < 0) throw new Error("Prezzo non valido");
    return {
      id: d.id ? String(d.id) : null,
      row: {
        name,
        name_en: txt(d.name_en),
        name_fr: txt(d.name_fr),
        name_es: txt(d.name_es),
        name_de: txt(d.name_de),
        name_ar: txt(d.name_ar),
        grp: txt(d.group, 30),
        kind: d.kind === "dolce" ? "dolce" : "salato",
        price: Math.round(price * 100) / 100,
        available: d.available !== false,
      },
    };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const q = data.id
      ? db.from("menu_ingredients").update(data.row).eq("id", data.id)
      : db.from("menu_ingredients").insert(data.row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteIngredient = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const { error } = await db.from("menu_ingredients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setCategoryCustom = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; kind: string; price: number | string }) => {
    const price = Number(String(d.price ?? "0").replace(",", "."));
    if (!Number.isFinite(price) || price < 0) throw new Error("Prezzo non valido");
    const kind = ["dolce", "salato", "entrambi"].includes(d.kind) ? d.kind : "none";
    return { id: String(d.id), kind, price: Math.round(price * 100) / 100 };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const { error } = await db.from("menu_categories").update({ custom_kind: data.kind, custom_price: data.price }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setCategoryCustomTitles = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; custom_title: string; custom_title_en: string; custom_title_fr: string; custom_title_es: string; custom_title_de?: string; custom_title_ar?: string }) => ({
    id: String(d.id),
    custom_title: txt(d.custom_title, 120),
    custom_title_en: txt(d.custom_title_en, 120),
    custom_title_fr: txt(d.custom_title_fr, 120),
    custom_title_es: txt(d.custom_title_es, 120),
    custom_title_de: txt(d.custom_title_de, 120),
    custom_title_ar: txt(d.custom_title_ar, 120),
  }))
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    const { id, ...titles } = data;
    const { error } = await db.from("menu_categories").update(titles).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setCategoryNameTr = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; tr: unknown }) => ({ id: String(d.id), tr: cleanTranslations(d.tr) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("menu_categories").update({ name_tr: data.tr as never }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Temi delle ricorrenze (lettura pubblica, scrittura solo personale) ----
import type { KioskTheme } from "@/lib/themes";

const hex = (v: unknown, d: string) => (/^#[0-9a-fA-F]{6}$/.test(String(v ?? "")) ? String(v) : d);
const md = (v: unknown) => (/^\d\d-\d\d$/.test(String(v ?? "")) ? String(v) : "");

export const getThemes = createServerFn({ method: "GET" }).handler(async (): Promise<KioskTheme[]> => {
  const { data, error } = await publishable().from("kiosk_themes").select("*").order("position").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id, name: r.name,
    mode: (["on", "auto"].includes(r.mode) ? r.mode : "off") as KioskTheme["mode"],
    start_md: r.start_md, end_md: r.end_md, bg: r.bg, primary_color: r.primary_color, accent: r.accent,
    decor: r.decor, anim: (["float", "none"].includes(r.anim) ? r.anim : "fall") as KioskTheme["anim"],
    greeting: r.greeting, greeting_en: r.greeting_en, greeting_fr: r.greeting_fr, greeting_es: r.greeting_es, position: r.position,
  }));
});

export const saveTheme = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<KioskTheme>) => {
    const name = txt(d.name, 40);
    if (!name) throw new Error("Il nome del tema è obbligatorio");
    return {
      id: d.id ? String(d.id) : null,
      row: {
        name,
        mode: ["on", "auto"].includes(String(d.mode)) ? String(d.mode) : "off",
        start_md: md(d.start_md), end_md: md(d.end_md),
        bg: hex(d.bg, "#1a1410"), primary_color: hex(d.primary_color, "#e0432b"), accent: hex(d.accent, "#f5c842"),
        decor: txt(d.decor, 60), anim: ["float", "none"].includes(String(d.anim)) ? String(d.anim) : "fall",
        greeting: txt(d.greeting, 60), greeting_en: txt(d.greeting_en, 60), greeting_fr: txt(d.greeting_fr, 60), greeting_es: txt(d.greeting_es, 60),
        position: Number.isFinite(Number(d.position)) ? Math.round(Number(d.position)) : 0,
      },
    };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const db = await admin();
    // Un solo tema può essere "sempre acceso": accenderne uno spegne gli altri accesi a mano.
    if (data.row.mode === "on") {
      const q = db.from("kiosk_themes").update({ mode: "off" }).eq("mode", "on");
      const { error } = data.id ? await q.neq("id", data.id) : await q;
      if (error) throw new Error(error.message);
    }
    const { error } = data.id
      ? await db.from("kiosk_themes").update(data.row).eq("id", data.id)
      : await db.from("kiosk_themes").insert(data.row);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteTheme = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_themes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getCompany = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publishable().from("kiosk_banner").select("company_description, company_logo_path, company_style").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  const path = data?.company_logo_path ?? "";
  const urls = await sign([path]);
  return { description: data?.company_description ?? "", logoPath: path, logo: urls[path] ?? "", style: cleanCompanyStyle(data?.company_style) };
});

export const saveCompany = createServerFn({ method: "POST" })
  .inputValidator((d: { description: string; logoPath: string; style?: CompanyStyle }) => {
    const logoPath = String(d.logoPath ?? "");
    if (logoPath && !/^logo-[a-z0-9-]+\.png$/.test(logoPath)) throw new Error("Logo non valido");
    return { description: String(d.description ?? "").trim().slice(0, 500), logoPath, style: cleanCompanyStyle(d.style) };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").upsert({ id: 1, company_description: data.description, company_logo_path: data.logoPath, company_style: data.style });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadCompanyLogo = createServerFn({ method: "POST" })
  .inputValidator((d: { file: string }) => {
    const file = String(d.file ?? "");
    if (!file.startsWith("data:image/png;base64,") || file.length > MAX_FILE_CHARS) throw new Error("Logo non valido o troppo grande");
    return { file };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const bin = atob(data.file.slice(data.file.indexOf(",") + 1));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    if (![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) throw new Error("Logo non valido");
    const path = `logo-${crypto.randomUUID()}.png`;
    const { error } = await (await admin()).storage.from(BUCKET).upload(path, bytes, { contentType: "image/png" });
    if (error) throw new Error(error.message);
    return { path };
  });

export const getBanner = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, string | number | boolean>> => {
  const { data, error } = await publishable().from("kiosk_banner").select("settings").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.settings ?? {}) as Record<string, string | number | boolean>;
});

export const saveBanner = createServerFn({ method: "POST" })
  .inputValidator((d: { settings: Record<string, unknown> }) => {
    if (!d || typeof d.settings !== "object" || JSON.stringify(d.settings).length > 2000) throw new Error("Dati non validi");
    return d;
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").upsert({ id: 1, settings: data.settings as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Linea di separazione tra i piatti in Gestione menu: lettura libera, scrittura solo personale.
export const getDivider = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, string | boolean>> => {
  const { data, error } = await publishable().from("kiosk_banner").select("divider").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.divider ?? {}) as Record<string, string | boolean>;
});

export const saveDivider = createServerFn({ method: "POST" })
  .inputValidator((d: { on: boolean; color: string; style: string; width: string }) => {
    const color = String(d.color ?? "");
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Colore non valido");
    if (!["solid", "dashed", "dotted", "double"].includes(String(d.style))) throw new Error("Stile non valido");
    if (!["s", "m", "l"].includes(String(d.width))) throw new Error("Spessore non valido");
    return { on: !!d.on, color, style: String(d.style), width: String(d.width) };
  })
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").update({ divider: data as never }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNewsSettings = createServerFn({ method: "GET" }).handler(async (): Promise<NewsSettings> => {
  const { data } = await publishable().from("kiosk_banner").select("news").eq("id", 1).maybeSingle();
  return cleanNews(data?.news);
});

export const saveNewsSettings = createServerFn({ method: "POST" })
  .inputValidator((d: NewsSettings) => cleanNews(d))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").update({ news: data as never }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const decode = (t: string) => t.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/<[^>]+>/g, "").trim();
async function feedTitles(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "TotemBurger/1.0" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item[\s>][\s\S]*?<title>([\s\S]*?)<\/title>/g)].map((m) => decode(m[1] ?? "")).filter(Boolean).slice(0, 10);
  } catch { return []; }
}

/** Titoli delle fonti scelte, alternati tra loro, per la striscia che scorre. */
export const getNews = createServerFn({ method: "GET" }).handler(async (): Promise<{ source: string; title: string }[]> => {
  const { data } = await publishable().from("kiosk_banner").select("news").eq("id", 1).maybeSingle();
  const settings = cleanNews(data?.news);
  if (!settings.on) return [];
  const lists = await Promise.all(settings.sources.map(async (s) => (await feedTitles(NEWS_SOURCES[s].url)).map((title) => ({ source: NEWS_SOURCES[s].name, title }))));
  const out: { source: string; title: string }[] = [];
  for (let i = 0; i < 10; i++) for (const l of lists) if (l[i]) out.push(l[i]!);
  return out.slice(0, 30);
});

// Funzioni cucina attivabili da Admin: avvisi parziali, storico, spunta piatti, consegne.
export type { KitchenFeatures } from "@/lib/kitchen";

export const getKitchenFeatures = createServerFn({ method: "GET" }).handler(async (): Promise<KitchenFeatures> => {
  const { data, error } = await publishable().from("kiosk_banner").select("kitchen").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return cleanKitchenFeatures(data?.kitchen as Partial<KitchenFeatures> | null);
});

export const saveKitchenFeatures = createServerFn({ method: "POST" })
  .inputValidator((d: KitchenFeatures) => cleanKitchenFeatures({ partial: !!d.partial, history: !!d.history, checklist: !!d.checklist, delivery: !!d.delivery, displayTill: d.displayTill, displayKitchen: d.displayKitchen, readySound: d.readySound, partialSound: d.partialSound }))
  .handler(async ({ data }) => {
    await staffOnly();
    const { error } = await (await admin()).from("kiosk_banner").update({ kitchen: data as never }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOrderKitchenInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; partial_notes?: string[]; checked_items?: string[]; delivered_items?: string[] }) => ({
    id: String(d.id),
    partial_notes: d.partial_notes?.map((s) => String(s).trim().slice(0, 80)).filter(Boolean).slice(0, 10),
    checked_items: d.checked_items?.map(String).slice(0, 100),
    delivered_items: d.delivered_items?.map(String).slice(0, 100),
  }))
  .handler(async ({ data }) => {
    await staffOnly();
    const patch: Record<string, unknown> = {};
    if (data.partial_notes) patch["partial_notes"] = data.partial_notes;
    if (data.checked_items) patch["checked_items"] = data.checked_items;
    if (data.delivered_items) patch["delivered_items"] = data.delivered_items;
    const { error } = await (await admin()).from("orders").update(patch as never).eq("id", data.id).in("status", ["preparing", "ready"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
