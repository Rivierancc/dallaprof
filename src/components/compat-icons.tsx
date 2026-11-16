import { ShoppingCart, Utensils, ShoppingBag, Gift } from "lucide-react";
import type { Language } from "@/lib/customer";

// Bandierine disegnate (non emoji): Windows 7 non ha i caratteri delle bandiere.
// I colori delle bandiere sono quelli ufficiali e non seguono il tema.
const FLAGS: Record<string, React.ReactNode> = {
  IT: <><rect width="1" height="2" fill="#009246" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#ce2b37" /></>,
  FR: <><rect width="1" height="2" fill="#0055a4" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#ef4135" /></>,
  ES: <><rect width="3" height="2" fill="#aa151b" /><rect y="0.5" width="3" height="1" fill="#f1bf00" /></>,
  DE: <><rect width="3" height="0.67" fill="#000" /><rect y="0.67" width="3" height="0.67" fill="#dd0000" /><rect y="1.33" width="3" height="0.67" fill="#ffce00" /></>,
  EN: <><rect width="3" height="2" fill="#012169" /><path d="M0 0L3 2M3 0L0 2" stroke="#fff" strokeWidth="0.4" /><path d="M0 0L3 2M3 0L0 2" stroke="#c8102e" strokeWidth="0.15" /><path d="M1.5 0V2M0 1H3" stroke="#fff" strokeWidth="0.6" /><path d="M1.5 0V2M0 1H3" stroke="#c8102e" strokeWidth="0.35" /></>,
  AR: <><rect width="3" height="2" fill="#006c35" /><rect x="0.7" y="0.6" width="1.6" height="0.25" rx="0.1" fill="#fff" /><rect x="0.9" y="1.15" width="1.2" height="0.08" fill="#fff" /></>,
};

export function Flag({ code, className = "" }: { code: Language | string; className?: string }) {
  const f = FLAGS[code];
  if (!f) return <span className={`font-sans font-bold ${className}`}>{code}</span>;
  return <svg viewBox="0 0 3 2" aria-hidden="true" className={`inline-block h-[1em] w-[1.5em] rounded-[0.12em] shadow-sm ${className}`} preserveAspectRatio="none">{f}</svg>;
}

export const HereIcon = ({ className = "" }: { className?: string }) => <Utensils aria-hidden="true" className={`inline-block h-[1em] w-[1em] align-[-0.1em] ${className}`} />;
export const TakeawayIcon = ({ className = "" }: { className?: string }) => <ShoppingBag aria-hidden="true" className={`inline-block h-[1em] w-[1em] align-[-0.1em] ${className}`} />;
export const OffersIcon = ({ className = "" }: { className?: string }) => <Gift aria-hidden="true" className={`inline-block h-[1em] w-[1em] align-[-0.1em] ${className}`} />;
export const CartIcon = ({ className = "" }: { className?: string }) => <ShoppingCart aria-hidden="true" className={`inline-block h-[1em] w-[1em] align-[-0.1em] ${className}`} />;
