import { useEffect, useState } from "react";
import { TEXT_SCALES, cleanTextScale, readTextScale, textScaleFactor, writeTextScale } from "@/lib/text-scale";

/**
 * Ingrandimento del testo dei pannelli staff.
 * Si applica alla variabile --text-scale, che il foglio di stile usa per la grandezza base
 * del testo: così crescono anche i menù a tendina e nulla si sposta fuori schermo.
 */
export function useTextScale() {
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(readTextScale()), []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--text-scale", String(textScaleFactor(index)));
    return () => root.style.removeProperty("--text-scale");
  }, [index]);

  const change = (next: number) => {
    const safe = cleanTextScale(next);
    setIndex(safe);
    writeTextScale(safe);
  };

  return { index, change };
}

/** Riga di pulsanti: A piccola, A media, A grande... si tocca quella che si riesce a leggere. */
export function TextScaleToggle({ index, onChange }: { index: number; onChange: (index: number) => void }) {
  return (
    <div
      role="group"
      aria-label="Ingrandimento del testo"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl bg-card/60 p-4"
    >
      <span className="px-2 text-xl font-bold text-muted-foreground">🔠 Ingrandisci il testo</span>
      {TEXT_SCALES.map((level, i) => (
        <button
          key={level.label}
          type="button"
          aria-pressed={i === index}
          onClick={() => onChange(i)}
          className={`tap flex items-center gap-3 rounded-2xl px-5 py-3 font-bold ${
            i === index ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <span aria-hidden className="leading-none" style={{ fontSize: `${1 + i * 0.4}em` }}>
            A
          </span>
          <span className="text-xl">{level.label}</span>
        </button>
      ))}
    </div>
  );
}
