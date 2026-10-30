import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCustomer } from "@/components/customer-session";
import { getThemes } from "@/lib/menu.functions";
import { decorList, greetingFor, pickTheme, type KioskTheme } from "@/lib/themes";

export const themesQueryOptions = queryOptions({
  queryKey: ["themes"],
  queryFn: () => getThemes(),
  staleTime: 15_000,
  refetchInterval: 30_000,
});

const VARS = ["--background", "--card", "--popover", "--muted", "--secondary", "--border", "--input", "--primary", "--accent", "--ring", "--foreground", "--card-foreground", "--primary-foreground", "--accent-foreground", "--muted-foreground", "--secondary-foreground", "--popover-foreground"];

const light = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
};

const customerPath = (p: string) => p === "/" || p.startsWith("/ordine-confermato") || p.startsWith("/display");

/** The theme active right now on customer screens (null on staff pages or when none applies). */
export function useActiveTheme(): KioskTheme | null {
  const { data } = useQuery(themesQueryOptions);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!now || !data || !customerPath(path)) return null;
  return pickTheme(data, now);
}

export function ThemeLayer() {
  const theme = useActiveTheme();
  useEffect(() => {
    const root = document.documentElement;
    if (!theme) return;
    const fg = light(theme.bg) ? "#1a1410" : "#fbf5e6";
    const mix = (pct: number) => `color-mix(in oklab, ${theme.bg}, ${fg} ${pct}%)`;
    const set: Record<string, string> = {
      "--background": theme.bg, "--card": mix(9), "--popover": mix(9), "--muted": mix(14), "--secondary": mix(18),
      "--border": mix(24), "--input": mix(24), "--primary": theme.primary_color, "--accent": theme.accent, "--ring": theme.accent,
      "--foreground": fg, "--card-foreground": fg, "--popover-foreground": fg, "--secondary-foreground": fg,
      "--muted-foreground": `color-mix(in oklab, ${fg}, ${theme.bg} 30%)`,
      "--primary-foreground": light(theme.primary_color) ? "#1a1410" : "#ffffff",
      "--accent-foreground": light(theme.accent) ? "#1a1410" : "#ffffff",
    };
    Object.entries(set).forEach(([k, v]) => root.style.setProperty(k, v));
    return () => VARS.forEach((k) => root.style.removeProperty(k));
  }, [theme]);

  if (!theme || theme.anim === "none") return null;
  const items = decorList(theme.decor);
  if (!items.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className={theme.anim === "float" ? "theme-float" : "theme-fall"}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 1.7) % 12}s`, animationDuration: `${10 + ((i * 3) % 9)}s`, fontSize: `${2 + ((i * 5) % 3)}rem` }}
        >
          {items[i % items.length]}
        </span>
      ))}
    </div>
  );
}

/** Scritta di auguri del tema attivo, nella lingua del cliente. */
export function ThemeGreeting({ className = "" }: { className?: string }) {
  const theme = useActiveTheme();
  const { language } = useCustomer();
  const text = theme ? greetingFor(theme, language) : "";
  if (!text) return null;
  return <p className={`animate-pop mx-auto w-fit rounded-full bg-primary px-8 py-2 text-center font-display text-5xl text-primary-foreground [@media(max-height:900px)]:text-3xl ${className}`}>{text}</p>;
}
