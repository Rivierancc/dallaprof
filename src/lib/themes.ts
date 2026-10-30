export type ThemeMode = "off" | "on" | "auto";
export type ThemeAnim = "fall" | "float" | "none";

export type KioskTheme = {
  id: string;
  name: string;
  mode: ThemeMode;
  start_md: string; // "MM-DD"
  end_md: string;
  bg: string;
  primary_color: string;
  accent: string;
  decor: string;
  anim: ThemeAnim;
  greeting: string;
  greeting_en: string;
  greeting_fr: string;
  greeting_es: string;
  position: number;
};

const mdOf = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const validMd = (s: string) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);

/** True when the date falls in the yearly range (ranges may wrap over New Year). */
export const inRange = (start: string, end: string, d: Date) => {
  if (!validMd(start) || !validMd(end)) return false;
  const t = mdOf(d);
  return start <= end ? t >= start && t <= end : t >= start || t <= end;
};

/** A theme switched on by hand wins; otherwise the first automatic theme whose dates include today (panel order). */
export const pickTheme = (themes: KioskTheme[], d: Date): KioskTheme | null => {
  const sorted = [...themes].sort((a, b) => a.position - b.position);
  return sorted.find((t) => t.mode === "on") ?? sorted.find((t) => t.mode === "auto" && inRange(t.start_md, t.end_md, d)) ?? null;
};

export const greetingFor = (t: KioskTheme, lang: string) =>
  (lang === "en" ? t.greeting_en : lang === "fr" ? t.greeting_fr : lang === "es" ? t.greeting_es : "") || t.greeting;

/** "25/12" or "25-12" → "12-25"; returns "" when invalid. */
export const parseDayMonth = (s: string) => {
  const m = s.trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})$/);
  if (!m) return "";
  const md = `${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return validMd(md) ? md : "";
};
export const showDayMonth = (md: string) => (validMd(md) ? `${md.slice(3)}/${md.slice(0, 2)}` : "");

export const decorList = (s: string) => Array.from(new Intl.Segmenter().segment(s)).map((x) => x.segment).filter((x) => x.trim());
