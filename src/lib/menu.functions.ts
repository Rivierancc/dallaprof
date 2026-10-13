import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "menu-photos";
const SIGN_TTL = 60 * 60;
const MAX_FILE_CHARS = 6_000_000;

type StaffSession = { unlocked?: boolean };

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "kitchen-gate",
  maxAge: 60 * 60 * 14,
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" },
});

const staffOnly = async () => {
  const s = await useSession<StaffSession>(sessionConfig());
  if (!s.data.unlocked) throw new Error("Inserisci il PIN del personale");
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
  description: string;
  ingredients: string[];
  extras: MenuExtra[];
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

export type MenuData = { categories: MenuCategory[]; products: MenuProduct[] };

export const getMenu = createServerFn({ method: "GET" }).handler(async (): Promise<MenuData> => {
  const db = publishable();
  const [c, p] = await Promise.all([
    db.from("menu_categories")
      .select("id, slug, name, image_path, position")
      .eq("active", true)
      .order("position", { ascending: true }),
    db.from("menu_products")
      .select("id, category_id, name, price, image_path, position, sold_out, description, ingredients, extras")
      .eq("active", true)
      .order("position", { ascending: true }),
  ]);
  if (c.error) throw new Error(c.error.message);
  if (p.error) throw new Error(p.error.message);
  const urls = await sign([...(c.data ?? []), ...(p.data ?? [])].map((r) => r.image_path));
  return {
    categories: (c.data ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      image_path: r.image_path,
      image: urls[r.image_path] ?? "",
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
      description: r.description ?? "",
      ingredients: cleanIngredients(r.ingredients),
      extras: cleanExtras(r.extras),
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
