/** The server still validates the encrypted Master session on every operation. */
export const MASTER_ACCESS_EXPIRED = "Accesso scaduto: inserisci di nuovo la password Master";

export function isMasterAccessExpired(error: unknown): boolean {
  return error instanceof Error && (error.message === MASTER_ACCESS_EXPIRED || error.message === "Accesso riservato");
}