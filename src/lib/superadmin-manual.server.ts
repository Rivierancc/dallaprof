// Manuale riservato al fornitore: si legge solo dopo la password Master (getSuperManual).
import { MANUAL_UPDATED, manualFor, type ManualSection } from "@/lib/manual";

export type SuperChapter = { id: string; title: string; intro: string; sections: ManualSection[] };

const SUPER: ManualSection[] = [
  { id: "sa-accesso", title: "🔐 Accesso e password Master", entries: [
    { title: "Entrare nell'area riservata", where: "/superadmin (si scrive l'indirizzo: non c'è nessun pulsante)", steps: ["La prima volta entra in Admin di un locale col PIN, poi apri /superadmin e scegli la password Master (almeno 8 caratteri, da ripetere due volte).", "Le volte successive scrivi la password Master: l'accesso dura alcune ore su quel dispositivo.", "Premi «Esci» per chiudere subito l'area riservata."], tips: ["L'occhio 👁 accanto al campo mostra la password mentre la scrivi."] },
    { title: "Cambiare la password Master", where: "/superadmin → 🔑 La mia password", steps: ["Scrivi la password attuale, poi la nuova due volte e premi Salva.", "Gli altri dispositivi dovranno rientrare con la nuova password."] },
    { title: "Questo manuale", where: "/superadmin → 📖 Manuale fornitore", steps: ["Lo vedi solo tu, dopo la password Master.", "È diviso in capitoli: Super Admin, Fast Food, Ristorante, Fast Food + Ristorante.", "Puoi cercare una parola, scaricarlo in testo o stamparlo in PDF."] },
  ] },
  { id: "sa-locali", title: "🏪 I tuoi locali", entries: [
    { title: "Elenco dei locali", where: "/superadmin → I tuoi locali", steps: ["Per ogni locale vedi stato (Attivo, In prova, Scaduto), nome, sigla, modalità, piano e scadenza.", "Sotto ci sono i link alle sue pagine (Totem, Cucina, Cassa, Tabellone, Menu, Admin): si aprono in una nuova scheda.", "Nei locali «Solo Ristorante» i link Totem e Tabellone non compaiono."] },
    { title: "Creare un nuovo locale", where: "/superadmin → + Nuovo locale", steps: ["Scrivi nome del locale, sigla per il link (es. bellanapoli), email del titolare e PIN del personale.", "Scegli stato, piano e scadenza, poi conferma: si apre subito la scheda «Licenza e dati».", "Il locale si apre su /sigla (es. /bellanapoli/cucina, /bellanapoli/admin)."], tips: ["Ogni locale è completamente separato: menu, ordini, clienti, tablet, PIN e licenza sono solo suoi.", "I clienti registrati in un locale non vengono mai riconosciuti in un altro."] },
    { title: "Reimpostare il PIN del personale", where: "Licenza e dati → PIN del personale", steps: ["Scrivi il nuovo PIN e conferma: non serve conoscere quello vecchio.", "Tutti i dispositivi del locale dovranno rientrare col nuovo PIN.", "Il titolare può comunque cambiarlo da Admin → Password e codici."] },
  ] },
  { id: "sa-licenza", title: "🔑 Licenza, piano e modalità", entries: [
    { title: "Stato e piano", where: "Licenza e dati → Stato e piano", steps: ["Stato: In prova, Attivo o Scaduto.", "Piano: Annuale (scadenza a 1 anno da oggi), Perpetua (nessuna scadenza, evidenziata in blu) oppure data di scadenza a scelta.", "Con Perpetua lo stato «Scaduto» non si può scegliere; se era scaduto torna su «Attivo».", "Premi «Salva»: il locale si adegua entro un minuto."], tips: ["Passata la scadenza il totem mostra «Sistema momentaneamente non disponibile»; menu e Admin restano consultabili.", "Il ristoratore vede in Admin solo il riepilogo, senza poterlo cambiare."] },
    { title: "Modalità del locale", where: "Licenza e dati → Modalità", steps: ["🍔 Solo Fast Food: totem, cassa, cucina e tabellone.", "🍽️ Solo Ristorante: sala camerieri sui tablet, conti per tavolo in cassa, comande in cucina; totem, chiosco e tabellone spariscono.", "🍔+🍽️ Fast Food + Ristorante: tutte e due insieme.", "La modalità la decidi solo tu; il manuale del locale mostra solo le istruzioni della modalità scelta."] },
    { title: "Regole della demo", where: "Licenza e dati → Regole della demo", steps: ["Scegli quanti piatti si possono mostrare in prova.", "Scegli se gli ordini sono veri o solo simulati.", "Scegli se mostrare la scritta «Modalità dimostrativa»."], tips: ["In prova il totem mostra solo i primi piatti fino al numero massimo, seguendo l'ordine delle categorie."] },
    { title: "Dati per fattura", where: "Licenza e dati → Dati per fattura", steps: ["Ragione sociale, P.IVA, indirizzo, città, SDI, PEC, telefono e note: tutti facoltativi.", "Servono solo a te: il ristoratore non li vede."] },
  ] },
];

const BOTH: ManualSection[] = [
  { id: "fr-insieme", title: "🍔+🍽️ Come convivono totem e sala", entries: [
    { title: "Cosa è attivo", where: "Tutto il locale", steps: ["Restano attivi totem, chiosco e tabellone del fast food.", "In più ci sono la sala camerieri (/sala) con i tablet e i conti per tavolo.", "In Admin compaiono sia le impostazioni del fast food sia la sezione «🍽️ Ristorante: tavoli, coperto e tablet»."] },
    { title: "Cucina", where: "/cucina", steps: ["Arrivano insieme gli ordini del totem (col numero, dopo il pagamento in cassa) e le comande dei tavoli (con «🍽️ Tavolo X · Y pers.», subito).", "Gli ordini del totem vanno sul tabellone; i piatti dei tavoli fanno lampeggiare il tavolo sul tablet del cameriere."] },
    { title: "Cassa", where: "/cassa", steps: ["In alto gli ordini del totem da far pagare: finché non paghi non vanno in cucina.", "Sotto «🍽️ Tavoli aperti» con il conto di ogni tavolo (coperto incluso), da chiudere con Contanti o Carta."] },
    { title: "Menu unico", where: "/menu", steps: ["Lo stesso menu serve al totem e ai camerieri: una modifica vale per tutti e due.", "Il coperto si applica solo ai tavoli, mai agli ordini del totem."] },
  ] },
];

export function superManual(): { updated: string; chapters: SuperChapter[] } {
  return { updated: MANUAL_UPDATED, chapters: [
    { id: "superadmin", title: "1. Funzioni Super Admin", intro: "Quello che puoi fare solo tu da /superadmin.", sections: SUPER },
    { id: "fastfood", title: "2. Funzioni Fast Food", intro: "Tutto quello che vede un locale «Solo Fast Food».", sections: manualFor("fast_food") },
    { id: "ristorante", title: "3. Funzioni Ristorante", intro: "Tutto quello che vede un locale «Solo Ristorante».", sections: manualFor("restaurant") },
    { id: "entrambi", title: "4. Funzioni Fast Food + Ristorante", intro: "Il locale vede tutte le funzioni dei capitoli 2 e 3; qui come lavorano insieme.", sections: BOTH },
  ] };
}
