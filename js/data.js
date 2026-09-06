// ============================================================
// Configurazione: ID del Google Sheet da cui leggere i dati.
// Il foglio deve essere condiviso come "Chiunque abbia il link - Visualizzatore"
// (o pubblicato sul web), altrimenti le richieste falliscono.
// ============================================================
const SHEET_ID = "1wVvXVXfBpli_hTKIDwHiT3sEOfPU2RyFmxxCn9Cuma4";

// Intestazioni reali di ogni scheda, definite qui invece che lette dal foglio:
// dopo la conversione in Google Sheets, titolo/note e intestazione a volte
// finiscono appiccicati nella stessa riga (celle unite che si comportano
// diversamente), quindi non ci si può affidare a leggerle dal CSV.
const CANONICAL_HEADERS = {
  "Riepilogo": ["Atleta", "Classe/i", "Specialita'", "Tipo", "Personal Best",
                "Data PB", "Gara PB", "Season Best", "Data SB", "Gara SB"],
  "Risultati": ["Data", "Gara", "Specialità", "Cat.", "Sesso", "Link", "Atleta",
                "Risultato", "Posizione", "Note", "Tipo", "Risultato numerico",
                "Vento", "Attrezzo", "Anno", "Chiave", "ChiaveStagione", "Valido PB/SB"],
  "Atleti": ["Atleta", "Categoria/e", "Sesso", "Anno di nascita",
             "N. risultati importati", "Scheda personale"]
};

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

// Converte le righe grezze del CSV (array di array) in array di oggetti.
// Trova la riga dove iniziano i dati cercando una cella che contenga "Atleta"
// (presente nell'intestazione di ogni scheda, anche se mescolata ad altro
// testo) e usa le intestazioni note invece di provare a interpretarle dal
// foglio stesso.
function rowsToObjects(rows, sheetName) {
  const headers = CANONICAL_HEADERS[sheetName];
  const headerIdx = rows.findIndex(r => r.some(c => (c || "").includes("Atleta")));
  if (headerIdx === -1) return [];
  return rows
    .slice(headerIdx + 1)
    .filter(r => r.some(c => (c || "").trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = normalizeCell(r[i]); });
      return obj;
    });
}

// Rimuove a-capo interni alle celle (alcuni nomi di gara sono scritti su due righe
// nel foglio originale) e gli spazi superflui, per una visualizzazione pulita e
// collegamenti tra pagine affidabili.
function normalizeCell(v) {
  return (v || "").replace(/\s+/g, " ").trim();
}

// Scarica e interpreta una scheda del foglio. Lancia un errore descrittivo
// se il foglio non e' raggiungibile (es. non condiviso pubblicamente).
async function fetchSheet(sheetName) {
  let resp;
  try {
    resp = await fetch(csvUrl(sheetName));
  } catch (e) {
    throw new Error("network");
  }
  if (!resp.ok) throw new Error("network");
  const text = await resp.text();
  const parsed = Papa.parse(text.trim(), { skipEmptyLines: false });
  return rowsToObjects(parsed.data, sheetName);
}

// Converte una data in formato "gg/mm/aaaa" (o simile) in un valore
// ordinabile; se il formato non e' riconosciuto, ritorna 0 (va in fondo).
function parseDateValue(s) {
  if (!s) return 0;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Determina l'evidenziazione della riga in base alle sigle scritte nella
// colonna Note: priorita' dal record piu' importante al piu' comune.
function rigaEvidenziata(note) {
  const n = note || "";
  if (/\bWR\b/.test(n)) return "is-wr";
  if (/\bRE\b/.test(n)) return "is-re";
  if (/\bRI\b/.test(n)) return "is-ri";
  if (/\bPB\b/.test(n)) return "is-pb";
  if (/\bSB\b/.test(n)) return "is-sb";
  return "";
}

// Converte un valore numerico (es. "145,50", secondi) nel formato tradizionale
// usato nel resto del database: 1'01"01 se sopra il minuto, 13"28 se sotto.
// Per le misure (lanci/salti) mostra semplicemente il numero con la virgola.
function formatRisultato(valore, tipo) {
  if (!valore) return "";
  const num = parseFloat(String(valore).replace(",", "."));
  if (isNaN(num)) return valore;
  if (tipo !== "tempo") return num.toFixed(2).replace(".", ",");
  if (num >= 60) {
    const minuti = Math.floor(num / 60);
    const secondi = (num - minuti * 60).toFixed(2).padStart(5, "0");
    const [s, c] = secondi.split(".");
    return `${minuti}'${s}"${c}`;
  }
  const [s, c] = num.toFixed(2).split(".");
  return `${s}"${c}`;
}

function linkToAtleta(nome) {
  return `atleta.html?nome=${encodeURIComponent(nome)}`;
}
// Il nome della gara da solo non basta: la stessa manifestazione si ripete
// ogni anno con lo stesso nome, quindi aggiungiamo l'anno (ricavato dalla
// data del risultato) per distinguere le diverse edizioni.
function linkToGara(nome, data) {
  const anno = data ? (String(data).match(/\d{4}$/) || [])[0] : null;
  const base = `gara.html?nome=${encodeURIComponent(nome)}`;
  return anno ? `${base}&anno=${anno}` : base;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Mostra un messaggio di stato (caricamento / errore / vuoto) al posto di una tabella.
function renderState(container, message, isError) {
  container.innerHTML = `<p class="state-msg${isError ? " error" : ""}">${message}</p>`;
}

const ERROR_MSG = 'Non riesco a leggere il foglio Google. Controlla che sia condiviso come "Chiunque abbia il link - Visualizzatore" e riprova.';

// ============================================================
// Elenco ufficiale Club Azzurro: unici atleti da mostrare nella pagina Atleti.
// Le altre pagine (Risultati, Gare, schede) restano invariate e mostrano
// tutto lo storico.
// ============================================================
const ROSTER_UFFICIALE = [
  "Bagaini Riccardo", "Bottazzini Fabio", "Calcagni Carlo", "Cicchetti Marco",
  "Dedaj Arjola", "Dieng Ndiaga", "Filippi Giuliana Chiara", "Legnante Assunta",
  "Loragno Francesco", "Manu Maxcel Amo", "Petrillo Valentina", "Sabatini Ambra",
  "Tapia Oney", "Antolini Greta", "Cavallero Edoardo", "Dalla Mana Riccardo",
  "Fascetta Giorgia", "Inga Antonella", "Morana Davide Bartolo",
  "Poggiani Ange Bertin", "Tonetto Lorenzo", "Bona Ephrem", "Chiarlone Matteo",
  "Cortinovis Francesco", "Di Rosa Francesco", "Diane Saliou", "Fiore Davide",
  "Francullo Viola", "Friscia Alessia", "Imperio Francesco", "Morato Laura",
  "Pirola Gabriele", "Zani Nicholas", "Jacome Navas Marcelo Sebastian",
  "Vio Grandis Beatrice Maria", "Chiarizia Riccardo", "El Idrissi Mohammed Amine",
  "Maselli Marco", "Mastrandrea Felice"
];

// Toglie accenti, spazi e punteggiatura per confrontare due nomi in modo
// tollerante a piccole differenze di scrittura (es. "Mohamed" / "Mohammed").
function normalizzaNome(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // toglie accenti
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function distanzaLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) d.push([i]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
    }
  }
  return d[m][n];
}

// Vero se il nome del foglio corrisponde a uno dell'elenco ufficiale, anche
// con piccole differenze (nome completo con un secondo nome in piu', o un
// paio di lettere diverse per un refuso di battitura).
function nelRosterUfficiale(nomeFoglio) {
  const key = normalizzaNome(nomeFoglio);
  if (!key) return false;
  return ROSTER_UFFICIALE.some(ufficiale => {
    const u = normalizzaNome(ufficiale);
    if (u === key) return true;
    if (u.startsWith(key) || key.startsWith(u)) return true;
    return distanzaLevenshtein(u, key) <= 2;
  });
}

// Fascia di ciascun atleta secondo l'elenco ufficiale Club Azzurro. Chi non
// ha una fascia assegnata (i "monitorati") viene etichettato "Interesse".
const FASCIA_UFFICIALE = {
  "Bagaini Riccardo": "Elite", "Bottazzini Fabio": "Elite", "Calcagni Carlo": "Elite",
  "Cicchetti Marco": "Elite", "Dedaj Arjola": "Elite", "Dieng Ndiaga": "Elite",
  "Filippi Giuliana Chiara": "Elite", "Legnante Assunta": "Elite", "Loragno Francesco": "Elite",
  "Manu Maxcel Amo": "Elite", "Petrillo Valentina": "Elite", "Sabatini Ambra": "Elite",
  "Tapia Oney": "Elite",
  "Antolini Greta": "Top", "Cavallero Edoardo": "Top", "Dalla Mana Riccardo": "Top",
  "Fascetta Giorgia": "Top", "Inga Antonella": "Top", "Morana Davide Bartolo": "Top",
  "Poggiani Ange Bertin": "Top", "Tonetto Lorenzo": "Top",
  "Bona Ephrem": "Promo", "Chiarlone Matteo": "Promo", "Cortinovis Francesco": "Promo",
  "Di Rosa Francesco": "Promo", "Diane Saliou": "Promo", "Fiore Davide": "Promo",
  "Francullo Viola": "Promo", "Friscia Alessia": "Promo", "Imperio Francesco": "Promo",
  "Morato Laura": "Promo", "Pirola Gabriele": "Promo", "Zani Nicholas": "Promo",
  "Jacome Navas Marcelo Sebastian": "Interesse", "Vio Grandis Beatrice Maria": "Interesse",
  "Chiarizia Riccardo": "Interesse", "El Idrissi Mohammed Amine": "Interesse",
  "Maselli Marco": "Interesse", "Mastrandrea Felice": "Interesse"
};

function fasciaAtleta(nomeFoglio) {
  const key = normalizzaNome(nomeFoglio);
  for (const nome in FASCIA_UFFICIALE) {
    const u = normalizzaNome(nome);
    if (u === key || u.startsWith(key) || key.startsWith(u) || distanzaLevenshtein(u, key) <= 2) {
      return FASCIA_UFFICIALE[nome];
    }
  }
  return "Interesse";
}
