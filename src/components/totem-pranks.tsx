import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bannerQueryOptions } from "@/components/display-banner";
import { useCustomer } from "@/components/customer-session";
import { saveBanner } from "@/lib/menu.functions";
import { cleanPranks, pickSessionPrank, type PrankCounters, type PrankKind, type PrankRule, type PranksConfig } from "@/lib/pranks";
import { playBurp, playGlassCrack, playPacmanChomp } from "@/lib/sounds";
import { Button } from "@/components/ui/button";

const STORE_KEY = "totem_prank_counters";

function readCounters(): Partial<PrankCounters> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Partial<PrankCounters>; }
  catch { return {}; }
}
function writeCounters(c: Partial<PrankCounters>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/** Overlay visivo non distruttivo: non tocca mai il carrello né le scelte fatte. */
export function PrankOverlay({ kind, origin, onDone }: { kind: PrankKind; origin: { x: number; y: number }; onDone: () => void }) {
  const [canTapClose, setCanTapClose] = useState(false);
  const [phase, setPhase] = useState<"run" | "burp">("run");

  useEffect(() => {
    const arm = setTimeout(() => setCanTapClose(true), 550);
    if (kind === "crack") {
      playGlassCrack();
      const end = setTimeout(onDone, 3100);
      return () => { clearTimeout(arm); clearTimeout(end); };
    }
    // Burger Pac-Man: 3 passate con morsi, poi rutto finale e ripristino.
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 12; i++) timers.push(setTimeout(() => playPacmanChomp(), i * 250));
    timers.push(setTimeout(() => { setPhase("burp"); playBurp(); }, 3150));
    timers.push(setTimeout(onDone, 4800));
    return () => { clearTimeout(arm); timers.forEach(clearTimeout); };
  }, [kind, onDone]);

  const close = () => { if (canTapClose) onDone(); };

  if (kind === "crack") {
    const cx = Math.max(15, Math.min(85, origin.x));
    const cy = Math.max(15, Math.min(85, origin.y));
    const rays: readonly [number, number][] = [
      [-48, -42], [-22, -55], [8, -58], [35, -48], [56, -24], [60, 6],
      [52, 34], [28, 56], [-4, 58], [-34, 50], [-56, 26], [-58, -8],
    ];
    return (
      <div role="status" onClick={close} className="prank-shake fixed inset-0 z-[95] cursor-pointer overflow-hidden bg-background/15">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
          {rays.map(([dx, dy], i) => {
            const mx = cx + dx * 0.48 + (i % 2 ? 2.5 : -2.5);
            const my = cy + dy * 0.48 + (i % 2 ? -2 : 2);
            const bx = cx + dx * 0.72 + (i % 2 ? -4 : 4);
            const by = cy + dy * 0.72 + (i % 2 ? 3 : -3);
            return (
              <g key={i} fill="none" stroke="white" strokeLinecap="round">
                <path d={`M ${cx} ${cy} L ${mx} ${my} L ${cx + dx} ${cy + dy}`} strokeWidth={i % 3 === 0 ? 0.55 : 0.32} opacity="0.92" />
                <path d={`M ${mx} ${my} L ${bx} ${by}`} strokeWidth="0.22" opacity="0.7" />
              </g>
            );
          })}
          {[6, 14, 25].map((r, i) => (
            <polygon key={r} fill="none" stroke="white" strokeWidth={0.28 - i * 0.05} opacity={0.8 - i * 0.18}
              points={rays.map(([dx, dy]) => { const d = Math.hypot(dx, dy) || 1; return `${cx + (dx / d) * r},${cy + (dy / d) * r}`; }).join(" ")} />
          ))}
          <circle cx={cx} cy={cy} r="2.2" fill="white" opacity="0.95" />
        </svg>
        <div className="pointer-events-none fixed inset-x-4 top-8 flex justify-center">
          <p className="rounded-full border-2 border-border bg-background/90 px-7 py-3 text-center font-display text-3xl text-accent shadow-2xl backdrop-blur-md">
            😱 Tranquillo, lo schermo è intero! Continua pure 🍔
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="status" onClick={close} className="fixed inset-0 z-[95] cursor-pointer overflow-hidden">
      <div className="prank-eat-row-1 absolute inset-x-0 top-0 h-[35%] bg-background/95" />
      <div className="prank-eat-row-2 absolute inset-x-0 top-[33%] h-[35%] bg-background/95" />
      <div className="prank-eat-row-3 absolute inset-x-0 bottom-0 h-[35%] bg-background/95" />
      {phase === "run" ? (
        <div className="prank-burger-path pointer-events-none absolute left-0 top-0 h-44 w-44">
          <BurgerPacmanSvg />
        </div>
      ) : (
        <div className="fixed inset-0 grid place-items-center p-6">
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-75 duration-200">
            <div className="rounded-3xl border-4 border-accent bg-card px-8 py-5 text-center shadow-2xl">
              <p className="font-display text-6xl text-accent">BURP! 😋</p>
              <p className="mt-1 text-2xl text-foreground">Scusa, avevo fame! Riprendi pure l&apos;ordine</p>
            </div>
            <div className="h-48 w-48"><BurgerPacmanSvg closed /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function BurgerPacmanSvg({ closed = false }: { closed?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.65)]">
      <g className={closed ? "" : "prank-chomp-top"} style={{ transformOrigin: "55px 60px" }}>
        <path d="M 14 58 C 14 22, 106 22, 106 58 Z" fill="#e59a3c" stroke="#7a4212" strokeWidth="4" />
        <ellipse cx="42" cy="34" rx="4" ry="2.2" fill="#fff2cc" />
        <ellipse cx="64" cy="29" rx="4" ry="2.2" fill="#fff2cc" />
        <ellipse cx="82" cy="39" rx="4" ry="2.2" fill="#fff2cc" />
        <path d="M 12 58 Q 28 66 44 58 Q 60 66 76 58 Q 92 66 108 58" fill="none" stroke="#4ade80" strokeWidth="7" strokeLinecap="round" />
        <circle cx="72" cy="44" r="6" fill="#111" />
        <circle cx="74" cy="42" r="2" fill="#fff" />
      </g>
      <g className={closed ? "" : "prank-chomp-bottom"} style={{ transformOrigin: "55px 60px" }}>
        <rect x="14" y="61" width="92" height="14" rx="7" fill="#6b2f1a" stroke="#3b1609" strokeWidth="3" />
        <path d="M 18 74 L 102 74 C 102 96, 18 96, 18 74 Z" fill="#d9892c" stroke="#7a4212" strokeWidth="4" />
      </g>
    </svg>
  );
}

/** Montato a livello Totem: conta i tocchi della sessione d'ordine e avvia lo scherzetto estratto senza toccare il carrello. */
export function TotemPranks() {
  const { orderType } = useCustomer();
  const active = !!orderType;
  const { data } = useQuery(bannerQueryOptions);
  const cfg = cleanPranks(data);
  const prevActive = useRef(false);
  const pending = useRef<{ kind: PrankKind; clicks: number } | null>(null);
  const taps = useRef(0);
  const [shown, setShown] = useState<{ kind: PrankKind; origin: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (active && !prevActive.current) {
      const res = pickSessionPrank(cfg, readCounters());
      writeCounters(res.counters);
      pending.current = res.selected;
      taps.current = 1; // Il tocco su «Mangia qui» / «Asporto» è il 1° tocco dell'ordine.
      if (res.selected && res.selected.clicks <= 1) {
        pending.current = null;
        setShown({ kind: res.selected.kind, origin: { x: 50, y: 48 } });
      }
    } else if (!active && prevActive.current) {
      pending.current = null;
      taps.current = 0;
      setShown(null);
    }
    prevActive.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onTap = (e: PointerEvent) => {
      if (!pending.current || document.documentElement.classList.contains("saver-open")) return;
      taps.current += 1;
      if (taps.current >= pending.current.clicks) {
        const chosen = pending.current;
        pending.current = null;
        const x = window.innerWidth ? (e.clientX / window.innerWidth) * 100 : 50;
        const y = window.innerHeight ? (e.clientY / window.innerHeight) * 100 : 48;
        setShown({ kind: chosen.kind, origin: { x, y } });
      }
    };
    window.addEventListener("pointerdown", onTap, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", onTap, { capture: true });
  }, [active]);

  if (!shown) return null;
  return <PrankOverlay kind={shown.kind} origin={shown.origin} onDone={() => setShown(null)} />;
}

/** Pannello Admin: attiva/disattiva e imposta frequenza ordini e tocchi per ogni scherzetto. */
export function PranksSettings() {
  const { data: saved } = useQuery(bannerQueryOptions);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<PranksConfig | null>(null);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<PrankKind | null>(null);

  useEffect(() => { if (!draft && saved) setDraft(cleanPranks(saved)); }, [saved, draft]);
  if (!draft || !saved) return null;

  const update = (kind: PrankKind, patch: Partial<PrankRule>) => {
    setMsg("");
    setDraft({ ...draft, [kind]: { ...draft[kind], ...patch } });
  };
  const save = async () => {
    setMsg("Salvo…");
    try {
      await saveBanner({ data: { settings: { ...saved, pranks: draft } } });
      await qc.invalidateQueries({ queryKey: ["banner"] });
      setMsg("Salvato ✓");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };

  const cards: { kind: PrankKind; title: string; desc: string }[] = [
    { kind: "crack", title: "💥 Schermo crepato", desc: "Si vena tutto lo schermo per 3 secondi con il rumore del vetro, poi riprende da solo senza perdere le scelte." },
    { kind: "pacman", title: "🍔 Burger Pac-Man", desc: "Un panino gigante attraversa lo schermo mangiandolo a bocconi e fa un rutto comico alla fine, senza toccare il carrello." },
  ];

  return (
    <div className="space-y-6">
      {preview && <PrankOverlay kind={preview} origin={{ x: 50, y: 45 }} onDone={() => setPreview(null)} />}
      <p className="text-xl text-muted-foreground">Scherzetti a sorpresa mentre il cliente ordina sul totem. Al massimo uno per ordine, senza mai azzerare il carrello.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map(({ kind, title, desc }) => {
          const r = draft[kind];
          return (
            <div key={kind} className="space-y-4 rounded-2xl border-2 border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-3xl text-accent">{title}</h3>
                <Button type="button" variant={r.on ? "default" : "secondary"} onClick={() => update(kind, { on: !r.on })}>{r.on ? "Acceso" : "Spento"}</Button>
              </div>
              <p className="text-lg text-muted-foreground">{desc}</p>
              <Stepper label="Ogni quanti ordini" value={r.everyOrders} min={1} max={30}
                hint={r.everyOrders === 1 ? "Scatta a ogni nuovo ordine" : `Scatta 1 volta a caso ogni ${r.everyOrders} ordini`}
                onChange={(everyOrders) => update(kind, { everyOrders })} />
              <Stepper label="Al tocco numero" value={r.clicks} min={1} max={20}
                hint={r.clicks === 1 ? "Subito al 1° tocco (Mangia qui / Asporto)" : `Al ${r.clicks}° tocco dall'inizio dell'ordine`}
                onChange={(clicks) => update(kind, { clicks })} />
              <Button type="button" variant="secondary" className="w-full" onClick={() => setPreview(kind)}>▶ Prova adesso</Button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={save}>💾 Salva impostazioni</Button>
        {msg && <span role="status" className="text-xl">{msg}</span>}
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, hint, onChange }: { label: string; value: number; min: number; max: number; hint: string; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold">{label}</span>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" aria-label={`Diminuisci ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</Button>
          <input aria-label={label} type="number" min={min} max={max} value={value}
            onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n)))); }}
            className="w-16 rounded-lg bg-muted px-2 py-1 text-center text-xl font-bold select-text" />
          <Button type="button" size="sm" variant="secondary" aria-label={`Aumenta ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}