import { useQuery } from "@tanstack/react-query";
import { getNews } from "@/lib/menu.functions";

export function NewsTicker() {
  const { data = [] } = useQuery({ queryKey: ["news"], queryFn: () => getNews(), staleTime: 5 * 60_000, refetchInterval: 10 * 60_000 });
  if (!data.length) return null;
  const line = data.join("   •   ") + "   •   ";
  return <div className="flex items-stretch overflow-hidden border-t-2 border-border bg-card text-card-foreground">
    <span className="z-10 flex shrink-0 items-center bg-primary px-6 font-display text-4xl text-primary-foreground">Ultima ora</span>
    <div className="flex-1 overflow-hidden py-3">
      <p className="inline-block whitespace-nowrap font-sans text-3xl font-semibold" style={{ animation: `news-scroll ${Math.max(60, line.length / 4)}s linear infinite` }}>{line}{line}</p>
    </div>
  </div>;
}
