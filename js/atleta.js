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
  const storico = risultati.filter(r => r["Atleta"] === nome)
    .sort((a, b) => parseDateValue(b["Data"]) - parseDateValue(a["Data"]));
  const anagrafica = atleti.find(r => r["Atleta"] === nome);

  if (speclista.length === 0 && storico.length === 0 && !anagrafica) {
    renderState(content, `Nessun atleta trovato con il nome "${escapeHtml(nome)}". Torna al <a href="index.html">Riepilogo</a>.`, true);
    return;
  }

  const classe = anagrafica ? anagrafica["Categoria/e"] : (speclista[0] ? speclista[0]["Classe/i"] : "");
  const sesso = anagrafica ? anagrafica["Sesso"] : "";
  const anno = anagrafica ? anagrafica["Anno di nascita"] : "";

  function rowClass(r) {
    const note = r["Note"] || "";
    if (note.includes("PB")) return "is-pb";
    if (note.includes("SB")) return "is-sb";
    return "";
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
      html += `<td class="num-cell">${escapeHtml(r["Personal Best"])}</td>`;
      html += `<td>${escapeHtml(r["Data PB"])}</td>`;
      html += `<td class="wrap">${r["Gara PB"] ? `<a href="${linkToGara(r["Gara PB"])}">${escapeHtml(r["Gara PB"])}</a>` : ""}</td>`;
      html += `<td class="num-cell">${escapeHtml(r["Season Best"])}</td>`;
      html += `<td>${escapeHtml(r["Data SB"])}</td>`;
      html += `<td class="wrap">${r["Gara SB"] ? `<a href="${linkToGara(r["Gara SB"])}">${escapeHtml(r["Gara SB"])}</a>` : ""}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
  }

  html += `<h2 class="section-title">Storico risultati (${storico.length})</h2>`;
  if (storico.length === 0) {
    html += '<p class="state-msg">Nessun risultato ancora registrato.</p>';
  } else {
    html += '<div class="legend"><span><i class="swatch gold"></i> Personal Best</span><span><i class="swatch azzurro"></i> Season Best</span></div>';
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>Data</th><th>Gara</th><th>Specialità</th><th>Risultato</th><th>Vento</th><th>Pos.</th><th>Note</th>' +
      '</tr></thead><tbody>';
    storico.forEach(r => {
      html += `<tr class="${rowClass(r)}">`;
      html += `<td>${escapeHtml(r["Data"])}</td>`;
      html += `<td class="wrap">${r["Gara"] ? `<a href="${linkToGara(r["Gara"])}">${escapeHtml(r["Gara"])}</a>` : ""}</td>`;
      html += `<td>${escapeHtml(r["Specialità"])}</td>`;
      html += `<td class="num-cell">${escapeHtml(r["Risultato"])}</td>`;
      html += `<td>${escapeHtml(r["Vento"])}</td>`;
      html += `<td>${escapeHtml(r["Posizione"])}</td>`;
      html += `<td class="wrap">${escapeHtml(r["Note"])}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
  }

  content.innerHTML = html;
  document.title = `${nome} · Club Azzurro`;
})();
