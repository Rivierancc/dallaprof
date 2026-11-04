// Manuale d'uso: va aggiornato a ogni nuova funzione o cambiamento dell'app.
export type ManualEntry = { title: string; where: string; steps: string[]; tips?: string[] };
export type ManualSection = { id: string; title: string; entries: ManualEntry[] };

export const MANUAL_UPDATED = "4 novembre 2026";

export const MANUAL: ManualSection[] = [
  { id: "totem", title: "🍔 Totem clienti (pagina iniziale)", entries: [
    { title: "Ordinare dal totem", where: "Pagina iniziale /", steps: ["Il cliente sceglie la lingua con le bandierine in alto a destra (IT, EN, FR, ES).", "Sceglie «Mangia qui» o «Asporto».", "Tocca una categoria, poi un piatto; personalizza togliendo ingredienti, aggiungendo extra e facendo le scelte obbligatorie.", "Il carrello è sempre visibile: tocca «Ordina» per confermare.", "Riceve un numero a due cifre e va a pagare in Cassa."], tips: ["Gli ordini non pagati non arrivano mai in cucina."] },
    { title: "Consigliati dalla Prof", where: "Pagina iniziale", steps: ["Mostra fino a 3 piatti con la stellina accesa in Gestione menu.", "Toccandone uno il cliente sceglie Qui/Asporto e si apre il piatto."], tips: ["Se nessun piatto ha la stellina la sezione non compare."] },
    { title: "Crea il tuo piatto", where: "Pagina iniziale → categoria", steps: ["Compare la scheda «Crea il tuo…» nelle categorie abilitate.", "Il cliente sceglie gli ingredienti divisi per gruppo (salumi, formaggi, salse…); il prezzo si somma al prezzo base."] },
    { title: "Prodotti suggeriti e offerte", where: "Carrello", steps: ["Prima di confermare il totem propone i piatti suggeriti non ancora nel carrello.", "Se c'è una spesa minima, appare «Spendi ancora … e lo hai in omaggio/scontato»."] },
    { title: "Fumetto sui piatti", where: "Schede dei piatti", steps: ["Il fumetto rosso (es. Vegano, Piccante) compare in alto a destra del piatto, fisso o lampeggiante."] },
  ]},
  { id: "chiosco", title: "⛶ Modalità chiosco", entries: [
    { title: "Attivare il chiosco", where: "Totem (pulsante sotto l'orologio) oppure Admin", steps: ["Tocca «Attiva modalità chiosco»: lo schermo va a tutto schermo e il tasto destro è bloccato."] },
    { title: "Uscire dal chiosco", where: "Totem", steps: ["Tocca 5 volte di fila l'orologio in alto a sinistra (entro 2 secondi).", "Inserisci il codice di uscita (di fabbrica 1234).", "In alternativa: pulsante «Esci da chiosco» in Admin oppure tasto ESC."], tips: ["Il codice di uscita vale solo per quel dispositivo e si cambia in Admin → Password e codici."] },
  ]},
  { id: "cassa", title: "💶 Cassa", entries: [
    { title: "Confermare un pagamento", where: "/cassa (serve il PIN)", steps: ["Trova l'ordine per numero.", "Tocca «Contanti» o «Carta» dopo aver incassato (anche col POS SumUp).", "Solo ora l'ordine passa in cucina e il cliente vede «Ordine in preparazione»."], tips: ["«Annulla» toglie un ordine non pagato."] },
    { title: "Stampanti Epson", where: "/cassa → stampante", steps: ["Usa «Cerca stampanti» per trovarle sulla rete del locale.", "Scegli la stampante: lo scontrino si stampa da solo; la scelta resta su quel dispositivo."] },
  ]},
  { id: "cucina", title: "👨‍🍳 Cucina", entries: [
    { title: "Lavorare gli ordini", where: "/cucina (serve il PIN)", steps: ["Gli ordini pagati arrivano in tempo reale con un suono.", "Premi «Pronto» quando è tutto pronto: il numero passa a «Pronto» sul tabellone.", "Premi «Consegnato» per chiuderlo."] },
    { title: "Avvisi «parzialmente pronto»", where: "Scheda ordine in cucina", steps: ["Tocca «+ Bevande pronte», «+ Patatine pronte»… o scrivi un testo libero.", "Il messaggio compare sul tabellone; la ✕ lo toglie. L'ordine resta aperto fino a «Pronto»."] },
    { title: "Spunta piatti preparati e consegnati", where: "Scheda ordine", steps: ["Quadratino ✅ accanto al piatto: lo segna come preparato.", "Quadratino 🚚: lo segna come consegnato; in alto si legge quanti sono consegnati."] },
    { title: "Ingredienti di preparazione", where: "Scheda ordine → nome del piatto", steps: ["Tocca il nome di un piatto (📖) per aprire la scheda ingredienti.", "Gli ingredienti tolti dal cliente sono barrati in rosso con «SENZA».", "Puoi aprire più schede; «Apri tutti gli ingredienti» le apre tutte per un ordine.", "Gli ingredienti in comune fra le schede aperte sono evidenziati in blu 🔵."] },
    { title: "Storico del giorno", where: "Cucina → pulsante Storico", steps: ["Mostra tutti gli ordini di oggi con ora, stato, piatti e totale incassato."] },
  ]},
  { id: "display", title: "📺 Tabellone clienti", entries: [
    { title: "Tabellone", where: "/display (pubblico)", steps: ["Mostra i numeri «In preparazione» e «Pronto» e gli avvisi parziali.", "Suona quando un ordine è pronto o parzialmente pronto."], tips: ["Tocca lo schermo una volta dopo l'apertura, altrimenti il browser può tenerlo muto."] },
  ]},
  { id: "menu", title: "📋 Gestione menu", entries: [
    { title: "Accesso", where: "/menu", steps: ["Inserisci il PIN del personale. L'accesso dura alcune ore su quel dispositivo."] },
    { title: "Categorie e piatti", where: "Gestione menu → Categorie e piatti", steps: ["Apri la sezione, poi «Apri i piatti ▼» su una categoria (o «In una pagina a sé»).", "«+ Nuovo piatto» per aggiungere; modifica nome, prezzo, descrizioni in 4 lingue e foto.", "«Esaurito» nasconde il piatto senza cancellarlo; la ⭐ lo mette nei Consigliati.", "«Chiudi i piatti» chiude solo quella categoria e resti nello stesso punto."] },
    { title: "Opzioni del piatto", where: "Piatto → Opzioni", steps: ["Ingredienti da togliere ed extra con prezzo.", "Quanti extra al massimo.", "Scelte del cliente (es. salse) con minimo e massimo: minimo 1 = obbligatoria.", "Menu combinato con articoli di altre categorie.", "Scelta nel menu (es. bevanda a scelta): crea un gruppo in Scelte del cliente e usa «Aggiungi un articolo» o «Aggiungi tutta una categoria» per riempirlo con i prodotti del menu.", "Suggerisci con prezzo d'offerta e spesa minima.", "Scheda ingredienti in cucina accesa/spenta e note di preparazione."] },
    { title: "Fumetto", where: "Piatto → 💬 Fumetto", steps: ["Scrivi un testo breve (max 24 lettere), scegli Acceso/Spento e Fisso/Lampeggia."] },
    { title: "Scheda ingredienti per tutta la categoria", where: "Categoria aperta → in cima", steps: ["Un tocco spegne o accende la scheda ingredienti in cucina per tutti i piatti della categoria."] },
    { title: "Ingredienti salati e dolci", where: "Gestione menu → Ingredienti", steps: ["Aggiungi ingredienti con nome in 4 lingue, prezzo, gruppo (salumi, formaggi…) e disponibilità.", "Usa gli stessi nomi italiani nelle opzioni dei piatti: il totem li traduce da solo."] },
    { title: "Crea il tuo piatto", where: "Gestione menu → Crea il tuo piatto", steps: ["Per ogni categoria scegli ingredienti salati, dolci o entrambi e il prezzo base.", "Scrivi il titolo in 4 lingue (es. «Componi la tua piadina») e premi Salva titoli."] },
    { title: "Ingrandire il testo", where: "Gestione menu e Admin, sotto il titolo", steps: ["Scegli Normale, Grande, Molto grande o Enorme. Resta salvato sul dispositivo."] },
  ]},
  { id: "admin", title: "⚙️ Admin", entries: [
    { title: "Password e codici", where: "/admin → Password e codici", steps: ["Cambia il PIN del personale inserendo quello attuale e due volte il nuovo: gli altri dispositivi dovranno rientrare.", "Cambia il codice di uscita chiosco di questo dispositivo."] },
    { title: "Ordine categorie", where: "/admin → Ordine categorie", steps: ["Sposta le categorie con ▲ ▼ e premi Salva ordine."] },
    { title: "Temi delle ricorrenze", where: "/admin → Temi", steps: ["Per ogni tema: Spento, Automatico (tra due date ogni anno) o Sempre acceso.", "Scegli colori, decorazioni emoji e auguri in 4 lingue.", "Ricorda di aggiornare le date di Pasqua e Festa della mamma ogni anno."] },
    { title: "Logo e descrizione azienda", where: "/admin → Logo e descrizione", steps: ["Carica il logo (PNG), scegli forma (tonda, ovale, cuore), grandezza, zoom e posizione.", "Scrivi la descrizione e formattala: grandezza, grassetto, corsivo, allineamento, colore."] },
    { title: "Scritta in alto sul totem", where: "/admin → Scritta in alto", steps: ["Scrivi il testo, scegli colori, grandezza ed effetto (fisso, lampeggia, svanisce, scorre) e velocità."] },
    { title: "Notizie ultima ora", where: "/admin → Notizie", steps: ["Accendi la striscia, scegli una o più fonti e le pagine dove mostrarla, poi Salva."] },
    { title: "Linea tra i piatti", where: "/admin → Linea tra i piatti", steps: ["Accendi/spegni e scegli colore, stile e spessore."] },
    { title: "Funzioni cucina e suonerie", where: "/admin → Funzioni cucina", steps: ["Accendi o spegni: avvisi parziali, spunta piatti, spunta consegne, storico.", "Scegli la suoneria «ordine pronto» e quella «parzialmente pronto» (▶ per ascoltare), poi Salva."] },
  ]},
];

export function searchManual(query: string): ManualSection[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return MANUAL;
  return MANUAL.map((s) => ({ ...s, entries: s.entries.filter((e) => {
    const text = [s.title, e.title, e.where, ...e.steps, ...(e.tips ?? [])].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  }) })).filter((s) => s.entries.length);
}

export function manualAsText(): string {
  const out = [`MANUALE TOTEM BURGER — aggiornato al ${MANUAL_UPDATED}`, ""];
  for (const s of MANUAL) {
    out.push(s.title.toUpperCase(), "");
    for (const e of s.entries) {
      out.push(`■ ${e.title}  (${e.where})`);
      e.steps.forEach((st, i) => out.push(`   ${i + 1}. ${st}`));
      e.tips?.forEach((t) => out.push(`   💡 ${t}`));
      out.push("");
    }
  }
  return out.join("\n");
}
