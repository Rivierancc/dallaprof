export type CompanyStyle = {
  logoSize: number;
  logoShape: "original" | "round" | "oval" | "heart";
  logoZoom: number;
  logoX: number;
  logoY: number;
  textSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  color: string;
};

const themeColors = ["foreground", "accent", "primary", "success", "muted", "destructive"];
const hexColor = /^#[0-9a-fA-F]{6}$/;

export function cleanCompanyStyle(input: unknown): CompanyStyle {
  const d = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const size = (value: unknown, fallback: number, max = 4) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(1, Math.round(value))) : fallback;
  const adjustment = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return {
    logoSize: size(d['logoSize'], 1, 6),
    logoShape: d['logoShape'] === "round" || d['logoShape'] === "oval" || d['logoShape'] === "heart" ? d['logoShape'] : "original",
    logoZoom: adjustment(d['logoZoom'], 100, 50, 250),
    logoX: adjustment(d['logoX'], 0, -50, 50),
    logoY: adjustment(d['logoY'], 0, -50, 50),
    textSize: size(d['textSize'], 2),
    bold: d['bold'] === true, italic: d['italic'] === true, underline: d['underline'] === true,
    align: d['align'] === "left" || d['align'] === "right" ? d['align'] : "center",
    color: typeof d['color'] === "string" && (themeColors.includes(d['color']) || hexColor.test(d['color'])) ? d['color'] : "foreground",
  };
}