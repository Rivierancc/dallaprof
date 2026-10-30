export const DEFAULT_EXIT_PIN = "1234";
export const EXIT_PIN_KEY = "kiosk_exit_pin";

export function validatePinChange(current: string, next: string, confirmation: string) {
  if (!/^\d{4,12}$/.test(current)) throw new Error("Inserisci il codice attuale (da 4 a 12 cifre)");
  if (!/^\d{4,12}$/.test(next)) throw new Error("Il nuovo codice deve avere da 4 a 12 cifre");
  if (next !== confirmation) throw new Error("I nuovi codici non coincidono");
  if (current === next) throw new Error("Scegli un codice diverso da quello attuale");
}

export const validStaffVersion = (session: { unlocked?: boolean; version?: string }, version: string) =>
  session.unlocked === true && (session.version ?? "initial") === version;