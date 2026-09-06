(async function () {
  const content = document.getElementById("content");
  const nome = qs("nome");
  const anno = qs("anno");

  if (!nome) {
    renderState(content, 'Nessuna gara indicata. Torna a <a href="risultati.html">Risultati</a> e scegline una.', true);
    return;
  }

  let risultati;
  try {
    risultati = await fetchSheet("Risultati");
  } catch (e) {
    renderState(content, ERROR_MSG, true);
    return;
  }

  // stessa manifestazione, edizioni diverse: se conosciamo l'anno lo usiamo
  // per prendere solo l'edizione giusta, non tutte quelle con lo stesso nome
  const righe = risultati.filter(r => r["Gara"] === nome && (!anno || String(r["Data"]).endsWith(anno)))
    .sort((a, b) => (a["Specialità"] || "").localeCompare(b["Specialità"] || "") || (a["Atleta"] || "").localeCompare(b["Atleta"] || ""));

  if (righe.length === 0) {
    renderState(content, `Nessun risultato trovato per la gara "${escapeHtml(nome)}"${anno ? " (" + anno + ")" : ""}. Torna a <a href="risultati.html">Risultati</a>.`, true);
    return;
  }

  function rowClass(r) {
    return rigaEvidenziata(r["Note"]);
  }

  const data = righe[0]["Data"];

  let html = `<h1 class="page-title">${escapeHtml(nome)}</h1>`;
  html += '<p class="page-subtitle">';
  if (data) html += `${escapeHtml(data)} · `;
  html += `${righe.length} risultati dei tuoi atleti`;
  html += "</p>";

  html += '<div class="legend"><span><i class="swatch gold"></i> Personal Best</span><span><i class="swatch azzurro"></i> Season Best</span><span><i class="swatch ri"></i> Record Italiano</span><span><i class="swatch re"></i> Record Europeo</span><span><i class="swatch wr"></i> Record del Mondo</span></div>';
  html += '<div class="table-wrap"><table><thead><tr>' +
    '<th>Atleta</th><th>Specialità</th><th>Cat.</th><th>Sesso</th><th>Risultato</th><th>Vento</th><th>Pos.</th><th>Note</th><th>Link</th>' +
    '</tr></thead><tbody>';
  righe.forEach(r => {
    html += `<tr class="${rowClass(r)}">`;
    html += `<td class="wrap"><a href="${linkToAtleta(r["Atleta"])}">${escapeHtml(r["Atleta"])}</a></td>`;
    html += `<td>${escapeHtml(r["Specialità"])}</td>`;
    html += `<td>${escapeHtml(r["Cat."])}</td>`;
    html += `<td>${escapeHtml(r["Sesso"])}</td>`;
    html += `<td class="num-cell">${escapeHtml(r["Risultato"])}</td>`;
    html += `<td>${escapeHtml(formatVento(r["Vento"]))}</td>`;
    html += `<td>${escapeHtml(r["Posizione"])}</td>`;
    html += `<td class="note-cell">${escapeHtml(r["Note"])}</td>`;
    html += `<td>${r["Link"] ? `<a href="${escapeHtml(r["Link"])}" target="_blank" rel="noopener">link</a>` : ""}</td>`;
    html += "</tr>";
  });
  html += "</tbody></table></div>";

  content.innerHTML = html;
  document.title = `${nome} · Club Azzurro`;
})();
