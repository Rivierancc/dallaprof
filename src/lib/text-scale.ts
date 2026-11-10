/**
 * Livelli di ingrandimento del testo per i pannelli del personale.
 * La scelta resta sul dispositivo (localStorage) e vale per Gestione menu e Admin.
 */
export const TEXT_SCALE_KEY = "menu_text_scale";

export type TextScaleLevel = { label: string; factor: number };

/** Almeno tre livelli: il primo è l'aspetto di fabbrica, gli altri ingrandiscono il testo. */
export const TEXT_SCALES: TextScaleLevel[] = [
  { label: "Normale", factor: 1 },
  { label: "Grande", factor: 1.25 },
  { label: "Molto grande", factor: 1.5 },
  { label: "Enorme", factor: 1.8 },
  { label: "Gigante", factor: 2.2 },
  { label: "Massima", factor: 2.6 },
];

/** Il tocco sul pulsante 🔠 passa al livello successivo, ripartendo dal normale. */
export const nextTextScaleIndex = (index: number) => (cleanTextScale(index) + 1) % TEXT_SCALES.length;

/** Qualunque valore salvato (vuoto, scritto male, numero fuori lista) riporta al primo livello. */
export function cleanTextScale(raw: unknown): number {
  const index = Number(raw);
  return Number.isInteger(index) && index >= 0 && index < TEXT_SCALES.length ? index : 0;
}

export const textScaleFactor = (index: number) => TEXT_SCALES[cleanTextScale(index)]?.factor ?? 1;

export function readTextScale(): number {
  try {
    return cleanTextScale(localStorage.getItem(TEXT_SCALE_KEY));
  } catch {
    return 0;
  }
}

export function writeTextScale(index: number) {
  try {
    localStorage.setItem(TEXT_SCALE_KEY, String(cleanTextScale(index)));
  } catch {
    /* memoria non disponibile: la scelta varrà solo per questa sessione */
  }
}
