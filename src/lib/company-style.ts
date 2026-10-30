export type CompanyStyle = {
  logoSize: number;
  logoShape: "original" | "round" | "oval" | "heart";
  textSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  color: "foreground" | "accent" | "primary" | "success";
};

export function cleanCompanyStyle(input: unknown): CompanyStyle {
  const d = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const size = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(4, Math.max(1, Math.round(value))) : fallback;
  return {
    logoSize: size(d['logoSize'], 1),
    logoShape: d['logoShape'] === "round" || d['logoShape'] === "oval" || d['logoShape'] === "heart" ? d['logoShape'] : "original",
    textSize: size(d['textSize'], 2),
    bold: d['bold'] === true, italic: d['italic'] === true, underline: d['underline'] === true,
    align: d['align'] === "left" || d['align'] === "right" ? d['align'] : "center",
    color: d['color'] === "accent" || d['color'] === "primary" || d['color'] === "success" ? d['color'] : "foreground",
  };
}