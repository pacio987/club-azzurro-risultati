(async function () {
  const container = document.getElementById("table-container");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  let rows = [];
  let sortKey = "Atleta", sortDir = 1;

  try {
    rows = await fetchSheet("Atleti");
  } catch (e) {
    renderState(container, ERROR_MSG, true);
    return;
  }

  rows = rows.filter(r => nelRosterUfficiale(r["Atleta"]));

  if (rows.length === 0) {
    renderState(container, "Il foglio Atleti risulta vuoto.");
    return;
  }

  // Classe attuale: elenco fisso confermato dall'utente (vedi data.js),
  // non calcolata dal foglio.
  function classeDi(r) {
    return classeUfficiale(r["Atleta"]) || r["Categoria/e"] || "";
  }

  function matches(r, q) {
    if (!q) return true;
    const hay = `${r["Atleta"]} ${classeDi(r)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function render() {
    const q = searchEl.value.trim();
    let filtered = rows.filter(r => matches(r, q) && r["Atleta"]);

    filtered.sort((a, b) => {
      let va = sortKey === "Fascia" ? fasciaAtleta(a["Atleta"]) : (sortKey === "Categoria/e" ? classeDi(a) : (a[sortKey] || ""));
      let vb = sortKey === "Fascia" ? fasciaAtleta(b["Atleta"]) : (sortKey === "Categoria/e" ? classeDi(b) : (b[sortKey] || ""));
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });

    countEl.textContent = `${filtered.length} atleti`;

    if (filtered.length === 0) {
      renderState(container, "Nessun atleta trovato con questa ricerca.");
      return;
    }

    const cols = [
      ["Atleta", "Atleta"], ["Categoria/e", "Classe"], ["Sesso", "Sesso"],
      ["Anno di nascita", "Anno di nascita"], ["Fascia", "Fascia"]
    ];

    let html = '<div class="table-wrap"><table><thead><tr>';
    cols.forEach(([key, label]) => {
      html += `<th data-key="${key}" class="${key === sortKey ? "sorted" : ""}">${label}</th>`;
    });
    html += '</tr></thead><tbody>';

    filtered.forEach(r => {
      html += "<tr>";
      html += `<td class="wrap"><a href="${linkToAtleta(r["Atleta"])}">${escapeHtml(r["Atleta"])}</a></td>`;
      html += `<td>${escapeHtml(classeDi(r))}</td>`;
      html += `<td>${escapeHtml(r["Sesso"])}</td>`;
      html += `<td>${escapeHtml(r["Anno di nascita"])}</td>`;
      html += `<td>${escapeHtml(fasciaAtleta(r["Atleta"]))}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    container.innerHTML = html;

    container.querySelectorAll("thead th").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
        render();
      });
    });
  }

  searchEl.addEventListener("input", render);
  render();
})();
