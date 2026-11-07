export type PreviewLayout = { floating: boolean; x: number; y: number; width: number; height: number; opacity: number };
export const DEFAULT_PREVIEW_LAYOUT: PreviewLayout = { floating: false, x: 16, y: 16, width: 440, height: 270, opacity: 100 };
export const previewLayoutKey = (page: "cassa" | "cucina") => `staff-display-layout-${page}`;
export function cleanPreviewLayout(value: unknown): PreviewLayout {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const number = (key: keyof PreviewLayout, min: number, max: number) => {
    const n = v[key];
    return typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : Number(DEFAULT_PREVIEW_LAYOUT[key]);
  };
  return { floating: v.floating === true, x: number("x", 0, 10000), y: number("y", 0, 10000), width: number("width", 280, 900), height: number("height", 200, 700), opacity: number("opacity", 20, 100) };
}
export function fitPreviewLayout(layout: PreviewLayout, width: number, height: number): PreviewLayout {
  const w = Math.min(layout.width, Math.max(0, width - 16));
  const h = Math.min(layout.height, Math.max(0, height - 16));
  return { ...layout, width: w, height: h, x: Math.max(8, Math.min(layout.x, width - w - 8)), y: Math.max(8, Math.min(layout.y, height - h - 8)) };
}