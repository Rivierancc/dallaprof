import type { CartItem } from "@/lib/menu";

export type Language = "IT" | "EN" | "FR" | "ES";
export type OrderType = "qui" | "asporto";
export type PaymentMethod = "cash" | "card";
export const CONFIRMATION_DELAY = 5_000;
export const EXIT_TAPS = 5;
export const EXIT_WINDOW = 2_000;
export const isLanguage = (value: unknown): value is Language => ["IT", "EN", "FR", "ES"].includes(String(value));
export const isOrderType = (value: unknown): value is OrderType => value === "qui" || value === "asporto";
export const canExitKiosk = (pin: string) => pin === "1234";
export const isPaidOrder = (order: { status: string; paid_at?: string | null }) =>
  !!order.paid_at && ["preparing", "ready", "done"].includes(order.status);
export const descriptionFor = (product: { description: string; description_en?: string; description_fr?: string; description_es?: string }, language: Language) => {
  const translated = language === "EN" ? product.description_en : language === "FR" ? product.description_fr : language === "ES" ? product.description_es : product.description;
  return translated?.trim() || product.description;
};
export function orderPayload(orderType: unknown, items: CartItem[], method: PaymentMethod) {
  if (!isOrderType(orderType)) throw new Error("Scegli prima mangia qui o asporto");
  if (!items.length) throw new Error("Il carrello è vuoto");
  return { dine_option: orderType, items, total: Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100, payment_method: method, status: "awaiting_payment" as const };
}

export const copy = {
  IT: { where: "Dove mangi?", here: "Mangia qui", takeaway: "Asporto", recommended: "Consigliati dalla Prof", chosen: "Hai scelto", loading: "Caricamento…", close: "Chiudi", yourOrder: "Il tuo ordine", total: "Totale", sending: "Invio…", confirm: "Conferma ordine", back: "Indietro", empty: "Nessun prodotto in questa categoria", products: "prodotti", cart: "Carrello", remove: "Togli ingredienti", without: "senza", add: "Aggiungi", cash: "Paga contanti", card: "Paga carta", waiting: "Vai in cassa per pagare", preparing: "Ordine in preparazione", newOrder: "Nuovo ordine", cancelled: "Ordine annullato", notFound: "Ordine non trovato", error: "Ordine non inviato. Riprova." },
  EN: { where: "Where will you eat?", here: "Eat here", takeaway: "Takeaway", recommended: "Recommended by the Prof", chosen: "You selected", loading: "Loading…", close: "Close", yourOrder: "Your order", total: "Total", sending: "Sending…", confirm: "Confirm order", back: "Back", empty: "No products in this category", products: "items", cart: "Cart", remove: "Remove ingredients", without: "without", add: "Add", cash: "Pay cash", card: "Pay by card", waiting: "Pay at the till", preparing: "Order being prepared", newOrder: "New order", cancelled: "Order cancelled", notFound: "Order not found", error: "Order not sent. Please try again." },
  FR: { where: "Où mangez-vous ?", here: "Sur place", takeaway: "À emporter", recommended: "Conseillés par la Prof", chosen: "Vous avez choisi", loading: "Chargement…", close: "Fermer", yourOrder: "Votre commande", total: "Total", sending: "Envoi…", confirm: "Confirmer", back: "Retour", empty: "Aucun produit dans cette catégorie", products: "articles", cart: "Panier", remove: "Retirer des ingrédients", without: "sans", add: "Ajouter", cash: "Payer en espèces", card: "Payer par carte", waiting: "Payez à la caisse", preparing: "Commande en préparation", newOrder: "Nouvelle commande", cancelled: "Commande annulée", notFound: "Commande introuvable", error: "Commande non envoyée. Réessayez." },
  ES: { where: "¿Dónde comes?", here: "Comer aquí", takeaway: "Para llevar", recommended: "Recomendados por la Prof", chosen: "Has elegido", loading: "Cargando…", close: "Cerrar", yourOrder: "Tu pedido", total: "Total", sending: "Enviando…", confirm: "Confirmar pedido", back: "Atrás", empty: "No hay productos en esta categoría", products: "productos", cart: "Carrito", remove: "Quitar ingredientes", without: "sin", add: "Añadir", cash: "Pagar en efectivo", card: "Pagar con tarjeta", waiting: "Paga en caja", preparing: "Pedido en preparación", newOrder: "Nuevo pedido", cancelled: "Pedido cancelado", notFound: "Pedido no encontrado", error: "Pedido no enviado. Inténtalo de nuevo." },
};