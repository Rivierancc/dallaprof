import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getLanguages } from "@/lib/menu.functions";
import { canExitKiosk, EXIT_TAPS, EXIT_WINDOW, isLanguage, isRtl, LANGUAGES, isOrderType, type Language, type OrderType } from "@/lib/customer";
import { DEFAULT_EXIT_PIN, EXIT_PIN_KEY, validatePinChange } from "@/lib/access";

function store(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Storage may be disabled by the browser. */ }
}
type Session = {
  language: Language; setLanguage: (value: Language) => void;
  orderType: OrderType | null; setOrderType: (value: OrderType | null) => void;
  reset: () => void; fullscreen: boolean; enterKiosk: () => Promise<boolean>; exitKiosk: () => Promise<void>;
  kioskError: string;
  changeExitPin: (current: string, next: string, confirmation: string) => void;
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
  const [exitPin, setExitPin] = useState(DEFAULT_EXIT_PIN);
  const changeExitPin = (current: string, next: string, confirmation: string) => {
    validatePinChange(current, next, confirmation);
    if (!canExitKiosk(current, exitPin)) throw new Error("Codice attuale errato");
    try { localStorage.setItem(EXIT_PIN_KEY, next); }
    catch { throw new Error("Questo browser non permette di salvare il codice"); }
    setExitPin(next);
  };
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
      const savedExit = localStorage.getItem(EXIT_PIN_KEY);
      if (savedExit && /^\d{4,12}$/.test(savedExit)) setExitPin(savedExit);
      if (isLanguage(lang)) languageState(lang); else store("selected_lang", "IT");
      // Il totem riparte sempre dalla schermata iniziale: la scelta qui/asporto non sopravvive al ricaricamento.
      void type; store("order_type", null);
    } catch { /* Keep safe defaults. */ }
    const sync = () => { setFullscreen(!!document.fullscreenElement); if (!document.fullscreenElement) setExitPrompt(false); };
    sync();
    document.addEventListener("fullscreenchange", sync);
    const syncExitPin = (event: StorageEvent) => {
      if (event.key === EXIT_PIN_KEY) setExitPin(event.newValue && /^\d{4,12}$/.test(event.newValue) ? event.newValue : DEFAULT_EXIT_PIN);
    };
    window.addEventListener("storage", syncExitPin);
    return () => { document.removeEventListener("fullscreenchange", sync); window.removeEventListener("storage", syncExitPin); };
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, [fullscreen]);
  const { data: enabled } = useQuery({ queryKey: ["languages"], queryFn: () => getLanguages(), staleTime: 15_000, refetchInterval: 30_000 });
  const shown = LANGUAGES.filter((l) => l.code === "IT" || (enabled ?? []).includes(l.code));
  useEffect(() => { if (enabled && language !== "IT" && !enabled.includes(language)) setLanguage("IT"); }, [enabled, language]);
  useEffect(() => {
    const html = document.documentElement;
    if (customerPage) { html.lang = language.toLowerCase(); html.dir = isRtl(language) ? "rtl" : "ltr"; }
    else { html.lang = "it"; html.dir = "ltr"; }
  }, [language, customerPage]);
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
  return <CustomerContext.Provider value={{ language, setLanguage, orderType, setOrderType, reset, fullscreen, enterKiosk, exitKiosk, kioskError, changeExitPin }}>
    {children}
    {customerPage && <>
      <Clock onTap={tapCorner} />
      {shown.length > 1 && <div dir="ltr" className="fixed right-2 top-2 z-[100] flex max-w-[calc(100vw-7.5rem)] flex-wrap justify-end gap-1 rounded-2xl border-2 border-border bg-card p-1 sm:right-3 sm:top-3 sm:max-w-none sm:gap-2 sm:p-2" aria-label="Lingua">
        {shown.map(({ code, flag }) =>
          <Button key={code} title={code} aria-label={code} aria-pressed={language === code} variant={language === code ? "default" : "ghost"} onClick={() => setLanguage(code)} className="tap h-10 min-w-10 gap-2 rounded-xl px-1.5 sm:h-16 sm:min-w-16 sm:px-3"><span aria-hidden="true" className="text-2xl leading-none sm:text-4xl">{flag}</span><span className="hidden font-sans text-xl font-bold sm:inline">{code}</span></Button>)}
      </div>}
    </>}
    {!customerPage && fullscreen && <Button aria-label="Accesso uscita chiosco" variant="ghost" className="fixed left-0 top-0 z-[100] h-12 w-12" onClick={tapCorner}>•</Button>}
    {exitPrompt && <div className="fixed inset-0 z-[150] grid place-items-center bg-background/90 p-6">
      <form onSubmit={(event) => { event.preventDefault(); if (canExitKiosk(pin, exitPin)) void exitKiosk(); else { setPinError(true); setPin(""); } }} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-4xl">Esci da chiosco</h2>
        <input autoFocus aria-label="PIN uscita chiosco" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={12} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} className="w-full rounded-lg bg-muted p-4 text-3xl" />
        {pinError && <p role="alert" className="text-destructive">PIN errato</p>}
        <div className="flex gap-3"><Button type="submit">Esci</Button><Button type="button" variant="secondary" onClick={() => setExitPrompt(false)}>Annulla</Button></div>
      </form>
    </div>}
  </CustomerContext.Provider>;
}

function Clock({ onTap }: { onTap: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1_000); return () => clearInterval(timer); }, []);
  return <Button aria-label="Orologio" variant="secondary" onClick={onTap} className="fixed left-2 top-2 z-[100] h-auto flex-col items-start gap-0.5 rounded-lg border border-border px-2 py-1 font-mono sm:left-3 sm:top-3 sm:gap-1 sm:px-3 sm:py-2">
    <span className="text-[11px] uppercase text-muted-foreground">{now?.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) ?? "—"}</span>
    <span className="text-[13px] font-bold sm:text-[15px]">{now?.toLocaleTimeString("it-IT") ?? "—:—:—"}</span>
  </Button>;
}