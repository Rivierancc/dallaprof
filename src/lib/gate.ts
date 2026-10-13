// Il browser sa se è dentro un iframe e se la pagina è in https: sono questi i due
// particolari che decidono se il cookie di accesso viene accettato e rinviato.
export const gateFlags = () => ({
  secure: typeof window !== "undefined" && window.isSecureContext,
  partitioned: typeof window !== "undefined" && window.self !== window.top,
});
