// ============================================================
// Configurazione: ID del Google Sheet da cui leggere i dati.
// Il foglio deve essere condiviso come "Chiunque abbia il link - Visualizzatore"
// (o pubblicato sul web), altrimenti le richieste falliscono.
// ============================================================
const SHEET_ID = "1wVvXVXfBpli_hTKIDwHiT3sEOfPU2RyFmxxCn9Cuma4";

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

// Converte le righe grezze del CSV (array di array) in array di oggetti,
// individuando da sola la riga di intestazione vera (le schede hanno un
// titolo e note sopra le colonne, quindi l'intestazione non e' la riga 1).
function rowsToObjects(rows) {
  const headerIdx = rows.findIndex(r => r.includes("Atleta") || r.includes("Data"));
  if (headerIdx === -1) return [];
  const headers = rows[headerIdx].map(h => normalizeCell(h));
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
  return rowsToObjects(parsed.data);
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

function linkToAtleta(nome) {
  return `atleta.html?nome=${encodeURIComponent(nome)}`;
}
function linkToGara(nome) {
  return `gara.html?nome=${encodeURIComponent(nome)}`;
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
