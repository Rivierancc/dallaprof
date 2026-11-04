// Funzioni cucina attivabili una per una da Admin: avvisi parziali, storico,
// spunta piatti preparati e spunta consegne parziali.
export type KitchenFeatures = {
  partial: boolean;
  history: boolean;
  checklist: boolean;
  delivery: boolean;
};

// Le righe già salvate non hanno ancora la chiave "delivery": tutto ciò che non
// è spento in modo esplicito resta acceso, così nessuno perde le funzioni in corso.
export const cleanKitchenFeatures = (k: Partial<KitchenFeatures> | null | undefined): KitchenFeatures => ({
  partial: k?.partial !== false,
  history: k?.history !== false,
  checklist: k?.checklist !== false,
  delivery: k?.delivery !== false,
});
