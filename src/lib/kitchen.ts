// Funzioni cucina attivabili una per una da Admin: avvisi parziali, storico,
// spunta piatti preparati, spunta consegne parziali e suonerie di «pronto»
// e «parzialmente pronto», scelte una per una.
export const READY_SOUNDS = ["campanello", "dingdong", "trillo", "fanfara", "sirena", "fischio", "nessuno"] as const;
export type ReadySound = (typeof READY_SOUNDS)[number];

export type KitchenFeatures = {
  partial: boolean;
  history: boolean;
  checklist: boolean;
  delivery: boolean;
  readySound: ReadySound;
  partialSound: ReadySound;
};

const sound = (v: unknown, fallback: ReadySound): ReadySound =>
  (READY_SOUNDS as readonly string[]).includes(v as string) ? (v as ReadySound) : fallback;

// Le righe già salvate possono non avere le chiavi nuove: tutto ciò che non
// è spento in modo esplicito resta acceso, così nessuno perde le funzioni in corso.
export const cleanKitchenFeatures = (k: Partial<KitchenFeatures> | null | undefined): KitchenFeatures => ({
  partial: k?.partial !== false,
  history: k?.history !== false,
  checklist: k?.checklist !== false,
  delivery: k?.delivery !== false,
  readySound: sound(k?.readySound, "campanello"),
  partialSound: sound(k?.partialSound, "fischio"),
});
