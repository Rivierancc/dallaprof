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
    return () => {
      root.style.removeProperty("--text-scale");
    };
  }, [index]);

  const change = (next: number) => {
    const safe = cleanTextScale(next);
    setIndex(safe);
    writeTextScale(safe);
  };

  return { index, change };
}

/** Tendina compatta: si sceglie la grandezza del testo che si riesce a leggere. */
export function TextScaleToggle({ index, onChange }: { index: number; onChange: (index: number) => void }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-1 text-lg font-bold">
      <span aria-hidden>🔠</span><span className="sr-only">Grandezza del testo</span>
      <select value={index} onChange={(e) => onChange(Number(e.target.value))} className="rounded-lg bg-background px-2 py-1 text-lg">
        {TEXT_SCALES.map((level, i) => <option key={level.label} value={i}>Testo {level.label}</option>)}
      </select>
    </label>
  );
}
