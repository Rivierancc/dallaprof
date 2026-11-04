export const RESET_ORDER_NUMBER = 1;

export function validateOrderNumber(input: { next: number; confirmed: boolean }) {
  if (input.confirmed !== true) throw new Error("Conferma la modifica della numerazione");
  if (!Number.isInteger(input.next) || input.next < 1 || input.next > 99) throw new Error("Scegli un numero intero da 1 a 99");
  return { next: input.next, confirmed: true };
}