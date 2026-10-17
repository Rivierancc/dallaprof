import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { canExitKiosk, copy, EXIT_TAPS, EXIT_WINDOW, isLanguage, isOrderType, type Language, type OrderType } from "@/lib/customer";

function store(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Storage may be disabled by the browser. */ }
}
type Session = {
  language: Language; setLanguage: (value: Language) => void;
  orderType: OrderType | null; setOrderType: (value: OrderType | null) => void;
  reset: () => void; fullscreen: boolean; enterKiosk: () => Promise<boolean>; exitKiosk: () => Promise<void>;
  kioskError: string;
};
const CustomerContext = createContext<Session | null>(null);
export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error("Sessione cliente non disponibile");
  return context;
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [language, languageState] = useState<Language>("IT");
  const [orderType, orderState] = useState<OrderType | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [kioskError, setKioskError] = useState("");
  const [exitPrompt, setExitPrompt] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const taps = useRef<number[]>([]);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const customerPage = path === "/" || path.startsWith("/ordine-confermato");
  const setLanguage = (value: Language) => { languageState(value); store("selected_lang", value); };
  const setOrderType = (value: OrderType | null) => { orderState(value); store("order_type", value); };
  const reset = () => { setLanguage("IT"); setOrderType(null); };
  useEffect(() => {
    try {
      const lang = localStorage.getItem("selected_lang");
      const type = localStorage.getItem("order_type");
      if (isLanguage(lang)) languageState(lang); else store("selected_lang", "IT");
      if (isOrderType(type)) orderState(type); else store("order_type", null);
    } catch { /* Keep safe defaults. */ }
    const sync = () => { setFullscreen(!!document.fullscreenElement); if (!document.fullscreenElement) setExitPrompt(false); };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, [fullscreen]);
  useEffect(() => { if (customerPage) document.documentElement.lang = language.toLowerCase(); }, [language, customerPage]);
  const enterKiosk = async () => {
    setKioskError("");
    try {
      if (!document.fullscreenEnabled) throw new Error("Questo browser non consente lo schermo intero. Apri il sito direttamente sul dispositivo.");
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
      return true;
    } catch (error) { setKioskError(error instanceof Error ? error.message : "Schermo intero non disponibile"); return false; }
  };
  const exitKiosk = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); setExitPrompt(false); setPin(""); }
    catch { setKioskError("Non riesco a uscire dallo schermo intero"); }
  };
  const tapCorner = () => {
    if (!fullscreen) return;
    const now = Date.now();
    taps.current = [...taps.current.filter((time) => now - time <= EXIT_WINDOW), now];
    if (taps.current.length >= EXIT_TAPS) { taps.current = []; setPin(""); setPinError(false); setExitPrompt(true); }
  };
  return <CustomerContext.Provider value={{ language, setLanguage, orderType, setOrderType, reset, fullscreen, enterKiosk, exitKiosk, kioskError }}>
    {children}
    {customerPage && <>
      <Clock onTap={tapCorner} />
      <div className="fixed right-3 top-3 z-[100] flex gap-1 rounded-lg border border-border bg-card p-1" aria-label="Lingua">
        {([ ["IT", "🇮🇹"], ["EN", "🇬🇧"], ["FR", "🇫🇷"], ["ES", "🇪🇸"] ] as const).map(([lang, flag]) =>
          <Button key={lang} title={lang} aria-label={lang} aria-pressed={language === lang} variant={language === lang ? "default" : "ghost"} onClick={() => setLanguage(lang)} className="h-10 min-w-10 px-2 text-xl">{flag}</Button>)}
      </div>
    </>}
    {!customerPage && fullscreen && <Button aria-label="Accesso uscita chiosco" variant="ghost" className="fixed left-0 top-0 z-[100] h-12 w-12" onClick={tapCorner}>•</Button>}
    {exitPrompt && <div className="fixed inset-0 z-[150] grid place-items-center bg-background/90 p-6">
      <form onSubmit={(event) => { event.preventDefault(); if (canExitKiosk(pin)) void exitKiosk(); else { setPinError(true); setPin(""); } }} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-4xl">Esci da chiosco</h2>
        <input autoFocus aria-label="PIN uscita chiosco" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} className="w-full rounded-lg bg-muted p-4 text-3xl" />
        {pinError && <p role="alert" className="text-destructive">PIN errato</p>}
        <div className="flex gap-3"><Button type="submit">Esci</Button><Button type="button" variant="secondary" onClick={() => setExitPrompt(false)}>Annulla</Button></div>
      </form>
    </div>}
  </CustomerContext.Provider>;
}

function Clock({ onTap }: { onTap: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1_000); return () => clearInterval(timer); }, []);
  return <Button aria-label="Orologio" variant="secondary" onClick={onTap} className="fixed left-3 top-3 z-[100] h-auto flex-col items-start gap-1 rounded-lg border border-border px-3 py-2 font-mono">
    <span className="text-[11px] uppercase text-muted-foreground">{now?.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) ?? "—"}</span>
    <span className="text-[15px] font-bold">{now?.toLocaleTimeString("it-IT") ?? "—:—:—"}</span>
  </Button>;
}