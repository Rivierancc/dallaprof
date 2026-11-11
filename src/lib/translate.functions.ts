import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";

const COLS = { EN: "description_en", FR: "description_fr", ES: "description_es", DE: "description_de", AR: "description_ar" } as const;
type Lang = keyof typeof COLS;
const NAMES: Record<Lang, string> = { EN: "English", FR: "French", ES: "Spanish", DE: "German", AR: "Arabic" };

const admin = createServerOnlyFn(async () => (await import("@/lib/venue.server")).venueAdmin());

async function translateOne(text: string, langs: Lang[]): Promise<Partial<Record<Lang, string>>> {
  const { generateResponse } = await import("@lovable.dev/ai-gateway");
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions:
      "You translate short Italian restaurant menu descriptions for a self-order kiosk. Keep it natural and appetising, keep dish names, brand names and quantities (e.g. 180g) unchanged. Reply ONLY with a JSON object whose keys are the requested language codes and values the translations, max 300 characters each.",
    input: `Languages: ${langs.map((l) => `${l} (${NAMES[l]})`).join(", ")}\nItalian text: ${text}`,
  });
  const out = (res as unknown as { output?: { content?: { type: string; text?: string }[] }[] }).output ?? [];
  const raw = out.flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const result: Partial<Record<Lang, string>> = {};
  for (const l of langs) if (typeof parsed[l] === "string") result[l] = String(parsed[l]).trim().slice(0, 300);
  return result;
}

/** Traduce le descrizioni italiane. overwrite=false riempie solo le lingue vuote. */
export const translateDescriptions = createServerFn({ method: "POST" })
  .inputValidator((d: { ids?: string[]; overwrite: boolean }) => ({
    ids: Array.isArray(d.ids) ? d.ids.map(String).slice(0, 500) : undefined,
    overwrite: !!d.overwrite,
  }))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const db = await admin();
    let q = db.from("menu_products").select("id, description, description_en, description_fr, description_es, description_de, description_ar");
    if (data.ids) q = q.in("id", data.ids);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let done = 0, failed = 0;
    for (const r of rows ?? []) {
      const text = (r.description ?? "").trim();
      if (!text) continue;
      const langs = (Object.keys(COLS) as Lang[]).filter((l) => data.overwrite || !String((r as Record<string, unknown>)[COLS[l]] ?? "").trim());
      if (!langs.length) continue;
      try {
        const t = await translateOne(text, langs);
        const patch: Record<string, string> = {};
        for (const l of langs) if (t[l]) patch[COLS[l]] = t[l]!;
        if (Object.keys(patch).length) {
          const { error: e } = await db.from("menu_products").update(patch as never).eq("id", r.id);
          if (e) throw e;
          done++;
        }
      } catch (e) {
        console.error("translate failed", r.id, e);
        failed++;
      }
    }
    return { done, failed };
  });
