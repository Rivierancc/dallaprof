import { useState } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NameKeyboard } from "@/components/name-keyboard";
import { findCustomer, registerCustomer } from "@/lib/loyalty.functions";
import { normalizePhone, validPhone } from "@/lib/loyalty";
import type { Language } from "@/lib/customer";

export type Member = Awaited<ReturnType<typeof findCustomer>> & {};

const T = {
  IT: { surname: "Cognome", email: "Email (facoltativa)", useEmail: "Usa l'email", usePhone: "Usa il cellulare", ask: "🎁 Sei registrato? Inserisci il cellulare", phone: "Il tuo cellulare", go: "Avanti", notFound: "Numero non ancora registrato: iscriviti in 10 secondi!", name: "Nome", bday: "Data di nascita (facoltativa): una sorpresa per il tuo compleanno 🎂", day: "Giorno", month: "Mese", consent: "Acconsento al trattamento dei miei dati da parte di questo locale per offerte e sconti", join: "Iscriviti", cancel: "Annulla", hi: "Bentornato", welcome: "Benvenuto", out: "Esci", favs: "⭐ I tuoi preferiti", birthday: "🎂 Buon compleanno! Sconto", discount: "Sconto", member: "fedeltà", welcomeD: "benvenuto", gift: "🎁 Il tuo regalo di compleanno" },
  EN: { surname: "Surname", email: "Email (optional)", useEmail: "Use email", usePhone: "Use mobile", ask: "🎁 Member? Enter your mobile", phone: "Your mobile", go: "Next", notFound: "Number not registered yet: join in 10 seconds!", name: "Name", bday: "Birthday (optional): a surprise on your birthday 🎂", day: "Day", month: "Month", consent: "I agree that this restaurant may process my data for offers and discounts", join: "Join", cancel: "Cancel", hi: "Welcome back", welcome: "Welcome", out: "Log out", favs: "⭐ Your favourites", birthday: "🎂 Happy birthday! Discount", discount: "Discount", member: "member", welcomeD: "welcome", gift: "🎁 Your birthday gift" },
  FR: { surname: "Nom", email: "Email (facultatif)", useEmail: "Utiliser l'email", usePhone: "Utiliser le portable", ask: "🎁 Inscrit ? Entrez votre portable", phone: "Votre portable", go: "Suivant", notFound: "Numéro non inscrit : inscrivez-vous en 10 secondes !", name: "Prénom", bday: "Date de naissance (facultative) : une surprise pour votre anniversaire 🎂", day: "Jour", month: "Mois", consent: "J'accepte que ce restaurant traite mes données pour des offres et réductions", join: "S'inscrire", cancel: "Annuler", hi: "Bon retour", welcome: "Bienvenue", out: "Sortir", favs: "⭐ Vos favoris", birthday: "🎂 Joyeux anniversaire ! Réduction", discount: "Réduction", member: "fidélité", welcomeD: "bienvenue", gift: "🎁 Votre cadeau d'anniversaire" },
  ES: { surname: "Apellido", email: "Email (opcional)", useEmail: "Usar email", usePhone: "Usar móvil", ask: "🎁 ¿Registrado? Introduce tu móvil", phone: "Tu móvil", go: "Siguiente", notFound: "Número no registrado: ¡regístrate en 10 segundos!", name: "Nombre", bday: "Fecha de nacimiento (opcional): una sorpresa en tu cumpleaños 🎂", day: "Día", month: "Mes", consent: "Acepto que este local trate mis datos para ofertas y descuentos", join: "Registrarme", cancel: "Cancelar", hi: "Bienvenido de nuevo", welcome: "Bienvenido", out: "Salir", favs: "⭐ Tus favoritos", birthday: "🎂 ¡Feliz cumpleaños! Descuento", discount: "Descuento", member: "fidelidad", welcomeD: "bienvenida", gift: "🎁 Tu regalo de cumpleaños" },
  DE: { surname: "Nachname", email: "E-Mail (freiwillig)", useEmail: "E-Mail verwenden", usePhone: "Handy verwenden", ask: "🎁 Registriert? Handynummer eingeben", phone: "Deine Handynummer", go: "Weiter", notFound: "Nummer noch nicht registriert: in 10 Sekunden anmelden!", name: "Name", bday: "Geburtstag (freiwillig): eine Überraschung an deinem Geburtstag 🎂", day: "Tag", month: "Monat", consent: "Ich stimme zu, dass dieses Lokal meine Daten für Angebote und Rabatte verarbeitet", join: "Anmelden", cancel: "Abbrechen", hi: "Willkommen zurück", welcome: "Willkommen", out: "Abmelden", favs: "⭐ Deine Favoriten", birthday: "🎂 Alles Gute zum Geburtstag! Rabatt", discount: "Rabatt", member: "Treue", welcomeD: "Willkommen", gift: "🎁 Dein Geburtstagsgeschenk" },
  AR: { surname: "اسم العائلة", email: "البريد الإلكتروني (اختياري)", useEmail: "استخدم البريد", usePhone: "استخدم الهاتف", ask: "🎁 هل أنت مسجل؟ أدخل رقم هاتفك", phone: "رقم هاتفك", go: "التالي", notFound: "الرقم غير مسجل: سجّل في 10 ثوانٍ!", name: "الاسم", bday: "تاريخ الميلاد (اختياري): مفاجأة في عيد ميلادك 🎂", day: "اليوم", month: "الشهر", consent: "أوافق على معالجة هذا المطعم لبياناتي للعروض والخصومات", join: "سجّل", cancel: "إلغاء", hi: "مرحبًا بعودتك", welcome: "مرحبًا", out: "خروج", favs: "⭐ أطباقك المفضلة", birthday: "🎂 عيد ميلاد سعيد! خصم", discount: "خصم", member: "الولاء", welcomeD: "ترحيب", gift: "🎁 هدية عيد ميلادك" },
} satisfies Record<Language, Record<string, string>>;
export const loyaltyCopy = (l: Language) => T[l];

/** Tastierino del cellulare e iscrizione rapida (nome + consenso; compleanno facoltativo). */
export function LoyaltyDialog({ language, onClose, onMember }: { language: Language; onClose: () => void; onMember: (m: NonNullable<Member>) => void }) {
  const t = T[language];
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "join">("phone");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const byEmail = false; // Il cellulare è obbligatorio: evita clienti doppi.
  const [field, setField] = useState<"name" | "surname" | "email">("name");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const okMail = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());
  const ok = byEmail ? okMail : validPhone(normalizePhone(phone));
  const lookup = async () => {
    setBusy(true); setErr("");
    try { const m = await findCustomer({ data: byEmail ? { email } : { phone } }); if (m) onMember(m); else setStep("join"); }
    catch { setErr("⚠️"); } finally { setBusy(false); }
  };
  const join = async () => {
    setBusy(true); setErr("");
    try { onMember(await registerCustomer({ data: { phone: byEmail ? "" : phone, email, name, surname, day: day ? Number(day) : undefined, month: month ? Number(month) : undefined, consent } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "⚠️"); } finally { setBusy(false); }
  };
  const key = (k: string) => setPhone((p) => (k === "⌫" ? p.slice(0, -1) : p.length < 13 ? p + k : p));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/90" onClick={onClose}>
      <div dir="ltr" className="max-h-[92vh] w-full max-w-[52rem] overflow-auto rounded-t-3xl bg-card p-8" onClick={(e) => e.stopPropagation()}>
        {step === "phone" ? <>
          <h2 className="font-display text-5xl text-accent">{t.ask}</h2>
          {byEmail ? <>
            <p aria-label={t.email} className="mt-6 min-h-20 break-all rounded-3xl bg-background p-5 text-center text-4xl">{email || <span className="text-muted-foreground">email@…</span>}</p>
            <EmailKeyboard value={email} onChange={setEmail} />
          </> : <>
          <p aria-label={t.phone} className="mt-6 min-h-24 rounded-3xl bg-background p-6 text-center font-display text-7xl tracking-widest">{phone || <span className="text-muted-foreground">{t.phone}</span>}</p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "⌫"].map((k) => <Button key={k} variant="secondary" onClick={() => key(k === "+" ? "" : k)} disabled={k === "+"} className={`tap h-24 rounded-3xl font-display text-6xl ${k === "+" ? "invisible" : ""}`}>{k}</Button>)}
          </div></>}
          <Button disabled={!ok || busy} onClick={lookup} className="tap mt-6 h-24 w-full rounded-3xl font-display text-5xl">{busy ? "…" : t.go}</Button>
        </> : <>
          <p className="font-display text-4xl text-accent">{t.notFound}</p>
          <p className="mt-2 text-2xl text-muted-foreground">{byEmail ? email : phone}</p>
          {([{ f: "name", label: t.name, v: name, set: setName }, { f: "surname", label: t.surname, v: surname, set: setSurname }, ...(byEmail ? [] : [{ f: "email", label: t.email, v: email, set: setEmail }])] as { f: "name" | "surname" | "email"; label: string; v: string; set: (x: string) => void }[]).map(({ f, label, v, set }) => (
            <label key={f} className="mt-4 block text-2xl font-bold">{label}
              <input value={v} onFocus={() => setField(f)} onChange={(e) => set(e.target.value)} maxLength={f === "email" ? 254 : 60} inputMode="none" dir="auto" className={`mt-2 h-20 w-full rounded-2xl bg-background px-5 text-4xl ${field === f ? "ring-4 ring-accent" : ""}`} />
            </label>))}
          {field === "email" ? <EmailKeyboard value={email} onChange={setEmail} /> : <NameKeyboard language={language} value={field === "name" ? name : surname} onChange={field === "name" ? setName : setSurname} />}
          <p className="mt-6 text-2xl">{t.bday}</p>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <select aria-label={t.day} value={day} onChange={(e) => setDay(e.target.value)} className="h-20 rounded-2xl bg-background px-4 text-3xl"><option value="">{t.day}</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            <select aria-label={t.month} value={month} onChange={(e) => setMonth(e.target.value)} className="h-20 rounded-2xl bg-background px-4 text-3xl"><option value="">{t.month}</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleString(language.toLowerCase(), { month: "long" })}</option>)}</select>
          </div>
          <label className="mt-6 flex items-start gap-4 text-2xl"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-10 w-10 shrink-0" />{t.consent}</label>
          <Button disabled={busy || name.trim().length < 2 || !consent || (!byEmail && email.trim() !== "" && !okMail)} onClick={join} className="tap mt-6 h-24 w-full rounded-3xl font-display text-5xl">{busy ? "…" : t.join}</Button>
        </>}
        {err && <p role="alert" className="mt-4 text-2xl text-destructive">{err}</p>}
        <Button variant="ghost" onClick={onClose} className="tap mt-3 w-full py-2 text-2xl text-muted-foreground">{t.cancel}</Button>
      </div>
    </div>
  );
}

/** Tastiera touch per l'email: minuscole, numeri, @ e domini più usati. */
function EmailKeyboard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"].map((r) => r.split(""));
  const add = (k: string) => { if (value.length + k.length <= 254) onChange(value + k); };
  const key = "tap flex h-16 min-w-0 flex-1 items-center justify-center rounded-xl bg-secondary text-3xl text-secondary-foreground active:bg-accent active:text-accent-foreground";
  return <div dir="ltr" className="mt-3 space-y-2">
    {rows.map((r, i) => <div key={i} className="flex justify-center gap-2">{r.map((k) => <button type="button" key={k} onClick={() => add(k)} className={key}>{k}</button>)}</div>)}
    <div className="flex gap-2">{["@", ".", "-", "_"].map((k) => <button type="button" key={k} onClick={() => add(k)} className={key}>{k}</button>)}
      <button type="button" aria-label="Cancella" onClick={() => onChange(value.slice(0, -1))} className={key}><Delete className="h-8 w-8" /></button></div>
    <div className="flex flex-wrap gap-2">{["@gmail.com", "@hotmail.it", "@libero.it", "@yahoo.it", "@icloud.com", ".it", ".com"].map((k) => <button type="button" key={k} onClick={() => add(k)} className={`${key} px-3 text-2xl`}>{k}</button>)}</div>
  </div>;
}
