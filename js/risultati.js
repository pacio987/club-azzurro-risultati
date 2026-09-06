(async function () {
  const container = document.getElementById("table-container");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  const specEl = document.getElementById("filter-spec");
  const yearEl = document.getElementById("filter-year");
  let rows = [];
  let sortKey = "Data", sortDir = -1;

  try {
    rows = await fetchSheet("Risultati");
  } catch (e) {
    renderState(container, ERROR_MSG, true);
    return;
  }
  rows = rows.filter(r => r["Atleta"] && r["Data"]);

  if (rows.length === 0) {
    renderState(container, "Il foglio Risultati risulta vuoto.");
    return;
  }

  const specs = [...new Set(rows.map(r => r["Specialità"]).filter(Boolean))].sort();
  specs.forEach(s => specEl.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`));
  const years = [...new Set(rows.map(r => (r["Data"].match(/\d{4}$/) || [])[0]).filter(Boolean))].sort().reverse();
  years.forEach(y => yearEl.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`));

  function matches(r) {
    const q = searchEl.value.trim().toLowerCase();
    if (q && !`${r["Atleta"]} ${r["Gara"]}`.toLowerCase().includes(q)) return false;
    if (specEl.value && r["Specialità"] !== specEl.value) return false;
    if (yearEl.value && !r["Data"].endsWith(yearEl.value)) return false;
    return true;
  }

  function rowClass(r) {
    return rigaEvidenziata(r["Note"]);
  }

  function render() {
    const filtered = rows.filter(matches);

    filtered.sort((a, b) => {
      let va = a[sortKey] || "", vb = b[sortKey] || "";
      if (sortKey === "Data") { va = parseDateValue(va); vb = parseDateValue(vb); }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });

    countEl.textContent = `${filtered.length} risultati`;

    if (filtered.length === 0) {
      renderState(container, "Nessun risultato trovato con questi filtri.");
      return;
    }

    const cols = [
      ["Data", "Data"], ["Gara", "Gara"], ["Specialità", "Specialità"], ["Cat.", "Cat."],
      ["Sesso", "Sesso"], ["Atleta", "Atleta"], ["Risultato", "Risultato"],
      ["Vento", "Vento"], ["Note", "Note"], ["Link", "Link"]
    ];

    let html = '<div class="table-wrap"><table><thead><tr>';
    cols.forEach(([key, label]) => {
      html += `<th data-key="${key}" class="${key === sortKey ? "sorted" : ""}">${label}</th>`;
    });
    html += '</tr></thead><tbody>';

    filtered.slice(0, 1000).forEach(r => {
      html += `<tr class="${rowClass(r)}">`;
      html += `<td>${escapeHtml(r["Data"])}</td>`;
      html += `<td class="wrap">${r["Gara"] ? `<a href="${linkToGara(r["Gara"])}">${escapeHtml(r["Gara"])}</a>` : ""}</td>`;
      html += `<td>${escapeHtml(r["Specialità"])}</td>`;
      html += `<td>${escapeHtml(r["Cat."])}</td>`;
      html += `<td>${escapeHtml(r["Sesso"])}</td>`;
      html += `<td class="wrap"><a href="${linkToAtleta(r["Atleta"])}">${escapeHtml(r["Atleta"])}</a></td>`;
      html += `<td class="num-cell">${escapeHtml(r["Risultato"])}</td>`;
      html += `<td>${escapeHtml(r["Vento"])}</td>`;
      html += `<td class="wrap">${escapeHtml(r["Note"])}</td>`;
      html += `<td>${r["Link"] ? `<a href="${escapeHtml(r["Link"])}" target="_blank" rel="noopener">link</a>` : ""}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    if (filtered.length > 1000) {
      html += `<p class="result-count">Mostrati i primi 1000 di ${filtered.length}: affina la ricerca per vederne altri.</p>`;
    }
    container.innerHTML = html;

    container.querySelectorAll("thead th").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = key === "Data" ? -1 : 1; }
        render();
      });
    });
  }

  [searchEl, specEl, yearEl].forEach(el => el.addEventListener("input", render));
  render();
})();
