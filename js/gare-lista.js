(async function () {
  const container = document.getElementById("table-container");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  let gare = [];
  let sortKey = "Data", sortDir = -1;

  let risultati;
  try {
    risultati = await fetchSheet("Risultati");
  } catch (e) {
    renderState(container, ERROR_MSG, true);
    return;
  }
  risultati = risultati.filter(r => r["Gara"] && r["Atleta"]);

  if (risultati.length === 0) {
    renderState(container, "Nessuna gara trovata nel foglio Risultati.");
    return;
  }

  // raggruppa i risultati per nome gara: prima data trovata, numero di risultati,
  // numero di atleti distinti coinvolti
  const mappa = {};
  risultati.forEach(r => {
    const nome = r["Gara"];
    if (!mappa[nome]) mappa[nome] = { nome, data: r["Data"], atleti: new Set(), n: 0 };
    mappa[nome].n++;
    mappa[nome].atleti.add(r["Atleta"]);
    if (parseDateValue(r["Data"]) > parseDateValue(mappa[nome].data)) mappa[nome].data = r["Data"];
  });
  gare = Object.values(mappa).map(g => ({ ...g, nAtleti: g.atleti.size }));

  function render() {
    const q = searchEl.value.trim().toLowerCase();
    let filtered = gare.filter(g => !q || g.nome.toLowerCase().includes(q));

    filtered.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "Data") { va = parseDateValue(a.data); vb = parseDateValue(b.data); }
      else if (sortKey === "nome") { va = a.nome; vb = b.nome; }
      else if (sortKey === "n" || sortKey === "nAtleti") { va = a[sortKey]; vb = b[sortKey]; }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });

    countEl.textContent = `${filtered.length} gare`;

    if (filtered.length === 0) {
      renderState(container, "Nessuna gara trovata con questa ricerca.");
      return;
    }

    const cols = [["nome", "Gara"], ["Data", "Data"], ["nAtleti", "Atleti"], ["n", "Risultati"]];
    let html = '<div class="table-wrap"><table><thead><tr>';
    cols.forEach(([key, label]) => {
      html += `<th data-key="${key}" class="${key === sortKey ? "sorted" : ""}">${label}</th>`;
    });
    html += '</tr></thead><tbody>';

    filtered.forEach(g => {
      html += "<tr>";
      html += `<td class="wrap"><a href="${linkToGara(g.nome)}">${escapeHtml(g.nome)}</a></td>`;
      html += `<td>${escapeHtml(g.data)}</td>`;
      html += `<td>${g.nAtleti}</td>`;
      html += `<td>${g.n}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    container.innerHTML = html;

    container.querySelectorAll("thead th").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = key === "Data" ? -1 : 1; }
        render();
      });
    });
  }

  searchEl.addEventListener("input", render);
  render();
})();
