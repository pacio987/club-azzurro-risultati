(async function () {
  const container = document.getElementById("table-container");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  let rows = [];
  let sortKey = "Atleta", sortDir = 1;

  try {
    rows = await fetchSheet("Riepilogo");
  } catch (e) {
    renderState(container, ERROR_MSG, true);
    return;
  }

  if (rows.length === 0) {
    renderState(container, "Il foglio Riepilogo risulta vuoto.");
    return;
  }

  function matches(r, q) {
    if (!q) return true;
    const hay = `${r["Atleta"]} ${r["Specialita'"] || r["Specialità"] || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function render() {
    const q = searchEl.value.trim();
    const specKey = rows[0]["Specialita'"] !== undefined ? "Specialita'" : "Specialità";
    let filtered = rows.filter(r => matches(r, q) && r["Atleta"] && r[specKey]);

    filtered.sort((a, b) => {
      let va = a[sortKey] || "", vb = b[sortKey] || "";
      if (sortKey === "Personal Best" || sortKey === "Season Best") {
        va = parseFloat((va || "").replace(",", ".")) || 0;
        vb = parseFloat((vb || "").replace(",", ".")) || 0;
      }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });

    countEl.textContent = `${filtered.length} righe`;

    if (filtered.length === 0) {
      renderState(container, "Nessun atleta trovato con questa ricerca.");
      return;
    }

    const cols = [
      ["Atleta", "Atleta"], ["Classe/i", "Classe"], [specKey, "Specialità"],
      ["Personal Best", "PB"], ["Data PB", "Data PB"], ["Gara PB", "Gara PB"],
      ["Season Best", "SB"], ["Data SB", "Data SB"], ["Gara SB", "Gara SB"]
    ];

    let html = '<div class="table-wrap"><table><thead><tr>';
    cols.forEach(([key, label]) => {
      html += `<th data-key="${key}" class="${key === sortKey ? "sorted" : ""}">${label}</th>`;
    });
    html += '</tr></thead><tbody>';

    filtered.forEach(r => {
      html += "<tr>";
      html += `<td><a href="${linkToAtleta(r["Atleta"])}">${escapeHtml(r["Atleta"])}</a></td>`;
      html += `<td>${escapeHtml(r["Classe/i"])}</td>`;
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
