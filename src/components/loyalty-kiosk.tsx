import { useState } from "react";
import { Button } from "@/components/ui/button";
import { findCustomer, registerCustomer } from "@/lib/loyalty.functions";
import { normalizePhone, validPhone } from "@/lib/loyalty";
import type { Language } from "@/lib/customer";

export type Member = Awaited<ReturnType<typeof findCustomer>> & {};

const T = {
  IT: { ask: "🎁 Sei registrato? Inserisci il cellulare", phone: "Il tuo cellulare", go: "Avanti", notFound: "Numero non ancora registrato: iscriviti in 10 secondi!", name: "Nome", bday: "Data di nascita (facoltativa): una sorpresa per il tuo compleanno 🎂", day: "Giorno", month: "Mese", consent: "Acconsento al trattamento dei miei dati da parte di questo locale per offerte e sconti", join: "Iscriviti", cancel: "Annulla", hi: "Bentornato", welcome: "Benvenuto", out: "Esci", favs: "⭐ I tuoi preferiti", birthday: "🎂 Buon compleanno! Sconto", discount: "Sconto", member: "fedeltà", welcomeD: "benvenuto", gift: "🎁 Il tuo regalo di compleanno" },
  EN: { ask: "🎁 Member? Enter your mobile", phone: "Your mobile", go: "Next", notFound: "Number not registered yet: join in 10 seconds!", name: "Name", bday: "Birthday (optional): a surprise on your birthday 🎂", day: "Day", month: "Month", consent: "I agree that this restaurant may process my data for offers and discounts", join: "Join", cancel: "Cancel", hi: "Welcome back", welcome: "Welcome", out: "Log out", favs: "⭐ Your favourites", birthday: "🎂 Happy birthday! Discount", discount: "Discount", member: "member", welcomeD: "welcome", gift: "🎁 Your birthday gift" },
  FR: { ask: "🎁 Inscrit ? Entrez votre portable", phone: "Votre portable", go: "Suivant", notFound: "Numéro non inscrit : inscrivez-vous en 10 secondes !", name: "Prénom", bday: "Date de naissance (facultative) : une surprise pour votre anniversaire 🎂", day: "Jour", month: "Mois", consent: "J'accepte que ce restaurant traite mes données pour des offres et réductions", join: "S'inscrire", cancel: "Annuler", hi: "Bon retour", welcome: "Bienvenue", out: "Sortir", favs: "⭐ Vos favoris", birthday: "🎂 Joyeux anniversaire ! Réduction", discount: "Réduction", member: "fidélité", welcomeD: "bienvenue", gift: "🎁 Votre cadeau d'anniversaire" },
  ES: { ask: "🎁 ¿Registrado? Introduce tu móvil", phone: "Tu móvil", go: "Siguiente", notFound: "Número no registrado: ¡regístrate en 10 segundos!", name: "Nombre", bday: "Fecha de nacimiento (opcional): una sorpresa en tu cumpleaños 🎂", day: "Día", month: "Mes", consent: "Acepto que este local trate mis datos para ofertas y descuentos", join: "Registrarme", cancel: "Cancelar", hi: "Bienvenido de nuevo", welcome: "Bienvenido", out: "Salir", favs: "⭐ Tus favoritos", birthday: "🎂 ¡Feliz cumpleaños! Descuento", discount: "Descuento", member: "fidelidad", welcomeD: "bienvenida", gift: "🎁 Tu regalo de cumpleaños" },
  DE: { ask: "🎁 Registriert? Handynummer eingeben", phone: "Deine Handynummer", go: "Weiter", notFound: "Nummer noch nicht registriert: in 10 Sekunden anmelden!", name: "Name", bday: "Geburtstag (freiwillig): eine Überraschung an deinem Geburtstag 🎂", day: "Tag", month: "Monat", consent: "Ich stimme zu, dass dieses Lokal meine Daten für Angebote und Rabatte verarbeitet", join: "Anmelden", cancel: "Abbrechen", hi: "Willkommen zurück", welcome: "Willkommen", out: "Abmelden", favs: "⭐ Deine Favoriten", birthday: "🎂 Alles Gute zum Geburtstag! Rabatt", discount: "Rabatt", member: "Treue", welcomeD: "Willkommen", gift: "🎁 Dein Geburtstagsgeschenk" },
  AR: { ask: "🎁 هل أنت مسجل؟ أدخل رقم هاتفك", phone: "رقم هاتفك", go: "التالي", notFound: "الرقم غير مسجل: سجّل في 10 ثوانٍ!", name: "الاسم", bday: "تاريخ الميلاد (اختياري): مفاجأة في عيد ميلادك 🎂", day: "اليوم", month: "الشهر", consent: "أوافق على معالجة هذا المطعم لبياناتي للعروض والخصومات", join: "سجّل", cancel: "إلغاء", hi: "مرحبًا بعودتك", welcome: "مرحبًا", out: "خروج", favs: "⭐ أطباقك المفضلة", birthday: "🎂 عيد ميلاد سعيد! خصم", discount: "خصم", member: "الولاء", welcomeD: "ترحيب", gift: "🎁 هدية عيد ميلادك" },
} satisfies Record<Language, Record<string, string>>;
export const loyaltyCopy = (l: Language) => T[l];

/** Tastierino del cellulare e iscrizione rapida (nome + consenso; compleanno facoltativo). */
export function LoyaltyDialog({ language, onClose, onMember }: { language: Language; onClose: () => void; onMember: (m: NonNullable<Member>) => void }) {
  const t = T[language];
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "join">("phone");
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ok = validPhone(normalizePhone(phone));
  const lookup = async () => {
    setBusy(true); setErr("");
    try { const m = await findCustomer({ data: { phone } }); if (m) onMember(m); else setStep("join"); }
    catch { setErr("⚠️"); } finally { setBusy(false); }
  };
  const join = async () => {
    setBusy(true); setErr("");
    try { onMember(await registerCustomer({ data: { phone, name, day: day ? Number(day) : undefined, month: month ? Number(month) : undefined, consent } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "⚠️"); } finally { setBusy(false); }
  };
  const key = (k: string) => setPhone((p) => (k === "⌫" ? p.slice(0, -1) : p.length < 13 ? p + k : p));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/90" onClick={onClose}>
      <div dir="ltr" className="max-h-[92vh] w-full max-w-[52rem] overflow-auto rounded-t-3xl bg-card p-8" onClick={(e) => e.stopPropagation()}>
        {step === "phone" ? <>
          <h2 className="font-display text-5xl text-accent">{t.ask}</h2>
          <p aria-label={t.phone} className="mt-6 min-h-24 rounded-3xl bg-background p-6 text-center font-display text-7xl tracking-widest">{phone || <span className="text-muted-foreground">{t.phone}</span>}</p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "⌫"].map((k) => <Button key={k} variant="secondary" onClick={() => key(k === "+" ? "" : k)} disabled={k === "+"} className={`tap h-24 rounded-3xl font-display text-6xl ${k === "+" ? "invisible" : ""}`}>{k}</Button>)}
          </div>
          <Button disabled={!ok || busy} onClick={lookup} className="tap mt-6 h-24 w-full rounded-3xl font-display text-5xl">{busy ? "…" : t.go}</Button>
        </> : <>
          <p className="font-display text-4xl text-accent">{t.notFound}</p>
          <p className="mt-2 text-2xl text-muted-foreground">📱 {phone}</p>
          <label className="mt-6 block text-2xl font-bold">{t.name}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-2 h-20 w-full rounded-2xl bg-background px-5 text-4xl" />
          </label>
          <p className="mt-6 text-2xl">{t.bday}</p>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <select aria-label={t.day} value={day} onChange={(e) => setDay(e.target.value)} className="h-20 rounded-2xl bg-background px-4 text-3xl"><option value="">{t.day}</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            <select aria-label={t.month} value={month} onChange={(e) => setMonth(e.target.value)} className="h-20 rounded-2xl bg-background px-4 text-3xl"><option value="">{t.month}</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleString(language.toLowerCase(), { month: "long" })}</option>)}</select>
          </div>
          <label className="mt-6 flex items-start gap-4 text-2xl"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-10 w-10 shrink-0" />{t.consent}</label>
          <Button disabled={busy || name.trim().length < 2 || !consent} onClick={join} className="tap mt-6 h-24 w-full rounded-3xl font-display text-5xl">{busy ? "…" : t.join}</Button>
        </>}
        {err && <p role="alert" className="mt-4 text-2xl text-destructive">{err}</p>}
        <Button variant="ghost" onClick={onClose} className="tap mt-3 w-full py-2 text-2xl text-muted-foreground">{t.cancel}</Button>
      </div>
    </div>
  );
}
