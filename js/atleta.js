(async function () {
  const content = document.getElementById("content");
  const nome = qs("nome");

  if (!nome) {
    renderState(content, 'Nessun atleta indicato. Torna al <a href="index.html">Riepilogo</a> e scegline uno.', true);
    return;
  }

  let riepilogo, risultati, atleti;
  try {
    [riepilogo, risultati, atleti] = await Promise.all([
      fetchSheet("Riepilogo"), fetchSheet("Risultati"), fetchSheet("Atleti")
    ]);
  } catch (e) {
    renderState(content, ERROR_MSG, true);
    return;
  }

  const speclista = riepilogo.filter(r => r["Atleta"] === nome);
  const specKeyOrdinamento = speclista.length > 0 && speclista[0]["Specialita'"] !== undefined ? "Specialita'" : "Specialità";
  speclista.sort((a, b) => confrontaSpecialita(a[specKeyOrdinamento], b[specKeyOrdinamento]));
  const storico = risultati.filter(r => r["Atleta"] === nome)
    .sort((a, b) => parseDateValue(b["Data"]) - parseDateValue(a["Data"]));
  const anagrafica = atleti.find(r => r["Atleta"] === nome);

  if (speclista.length === 0 && storico.length === 0 && !anagrafica) {
    renderState(content, `Nessun atleta trovato con il nome "${escapeHtml(nome)}". Torna al <a href="index.html">Riepilogo</a>.`, true);
    return;
  }

  const classe = classeUfficiale(nome) || (anagrafica ? anagrafica["Categoria/e"] : (speclista[0] ? speclista[0]["Classe/i"] : ""));
  const sesso = anagrafica ? anagrafica["Sesso"] : "";
  const anno = anagrafica ? anagrafica["Anno di nascita"] : "";

  function rowClass(r) {
    return rigaEvidenziata(r["Note"]);
  }

  let html = `<h1 class="page-title">${escapeHtml(nome)}</h1>`;
  html += '<p class="athlete-meta">';
  if (classe) html += `<span>Classe: <strong>${escapeHtml(classe)}</strong></span>`;
  if (sesso) html += `<span>Sesso: <strong>${escapeHtml(sesso)}</strong></span>`;
  if (anno) html += `<span>Anno di nascita: <strong>${escapeHtml(anno)}</strong></span>`;
  html += "</p>";

  if (speclista.length > 0) {
    const specKey = speclista[0]["Specialita'"] !== undefined ? "Specialita'" : "Specialità";
    html += '<h2 class="section-title">Personal Best e Season Best</h2>';
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>Specialità</th><th>PB</th><th>Data PB</th><th>Gara PB</th><th>SB</th><th>Data SB</th><th>Gara SB</th>' +
      '</tr></thead><tbody>';
    speclista.forEach(r => {
      html += "<tr>";
      html += `<td>${escapeHtml(r[specKey])}</td>`;
      html += `<td class="num-cell">${escapeHtml(formatRisultato(r["Personal Best"], r["Tipo"]))}</td>`;
      html += `<td>${escapeHtml(r["Data PB"])}</td>`;
      html += `<td class="wrap">${r["Gara PB"] ? `<a href="${linkToGara(r["Gara PB"], r["Data PB"])}">${escapeHtml(r["Gara PB"])}</a>` : ""}</td>`;
      html += `<td class="num-cell">${escapeHtml(formatRisultato(r["Season Best"], r["Tipo"]))}</td>`;
      html += `<td>${escapeHtml(r["Data SB"])}</td>`;
      html += `<td class="wrap">${r["Gara SB"] ? `<a href="${linkToGara(r["Gara SB"], r["Data SB"])}">${escapeHtml(r["Gara SB"])}</a>` : ""}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
  }

  // Storico Season Best per anno: calcolato qui dai risultati completi (non dal
  // foglio, che tiene solo l'anno impostato in "Stagione corrente"), cosi' si
  // vede il migliore di ogni anno invece di uno solo alla volta. Usa la colonna
  // "Valido PB/SB" gia' calcolata dal foglio, che tiene conto anche del vento.
  const sbPerAnno = {};
  storico.forEach(r => {
    const spec = r["Specialità"], tipo = r["Tipo"];
    const validoStr = r["Valido PB/SB"];
    if (!spec || !tipo || !validoStr) return;
    const valore = parseFloat(String(validoStr).replace(",", "."));
    if (isNaN(valore)) return;
    const anno = (String(r["Data"]).match(/\d{4}$/) || [])[0];
    if (!anno) return;
    const chiave = spec + "|" + anno;
    const attuale = sbPerAnno[chiave];
    const migliore = !attuale ||
      (tipo === "tempo" ? valore < attuale.valore : valore > attuale.valore);
    if (migliore) sbPerAnno[chiave] = { specialita: spec, tipo, anno, valore, data: r["Data"], gara: r["Gara"] };
  });
  const righeSbAnno = Object.values(sbPerAnno).sort((a, b) =>
    confrontaSpecialita(a.specialita, b.specialita) || b.anno.localeCompare(a.anno));

  if (righeSbAnno.length > 0) {
    html += '<h2 class="section-title">Season Best per anno</h2>';
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>Specialità</th><th>Anno</th><th>SB</th><th>Data</th><th>Gara</th>' +
      '</tr></thead><tbody>';
    righeSbAnno.forEach(r => {
      html += "<tr>";
      html += `<td>${escapeHtml(r.specialita)}</td>`;
      html += `<td>${r.anno}</td>`;
      html += `<td class="num-cell">${escapeHtml(formatRisultato(String(r.valore), r.tipo))}</td>`;
      html += `<td>${escapeHtml(r.data)}</td>`;
      html += `<td class="wrap">${r.gara ? `<a href="${linkToGara(r.gara, r.data)}">${escapeHtml(r.gara)}</a>` : ""}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
  }

  html += `<h2 class="section-title">Storico risultati (${storico.length})</h2>`;
  if (storico.length === 0) {
    html += '<p class="state-msg">Nessun risultato ancora registrato.</p>';
  } else {
    html += '<div class="legend"><span><i class="swatch gold"></i> Personal Best</span><span><i class="swatch azzurro"></i> Season Best</span><span><i class="swatch ri"></i> Record Italiano</span><span><i class="swatch re"></i> Record Europeo</span><span><i class="swatch wr"></i> Record del Mondo</span></div>';
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>Data</th><th>Gara</th><th>Specialità</th><th>Risultato</th><th>Vento</th><th>Pos.</th><th>Note</th>' +
      '</tr></thead><tbody>';
    storico.forEach(r => {
      html += `<tr class="${rowClass(r)}">`;
      html += `<td>${escapeHtml(r["Data"])}</td>`;
      html += `<td class="wrap">${r["Gara"] ? `<a href="${linkToGara(r["Gara"], r["Data"])}">${escapeHtml(r["Gara"])}</a>` : ""}</td>`;
      html += `<td>${escapeHtml(r["Specialità"])}</td>`;
      html += `<td class="num-cell">${escapeHtml(r["Risultato"])}</td>`;
      html += `<td>${escapeHtml(r["Vento"])}</td>`;
      html += `<td>${escapeHtml(r["Posizione"])}</td>`;
      html += `<td class="note-cell">${escapeHtml(r["Note"])}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
  }

  content.innerHTML = html;
  document.title = `${nome} · Club Azzurro`;
})();
