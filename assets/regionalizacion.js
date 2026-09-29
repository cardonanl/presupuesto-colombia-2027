(async function () {
  let data;
  try {
    const res = await fetch("data/regionalizacion.json");
    if (!res.ok) throw new Error("No se pudo cargar data/regionalizacion.json");
    data = await res.json();
  } catch (err) {
    document.getElementById("resumen-rows").innerHTML = `<p>⚠ Error: ${err.message}</p>`;
    return;
  }

  const mill = (m) => m * 1e6; // los datos vienen en millones de pesos
  const { total_inversion_mill, categorias, regiones, departamentos } = data;

  // ---------- Resumen ----------
  const regionalizado = categorias.find(c => c.categoria === "Regionalizado");
  const nacional = categorias.find(c => c.categoria === "Nacional");
  const porRegionalizar = categorias.find(c => c.categoria === "Por Regionalizar");
  document.getElementById("resumen-rows").innerHTML = `
    ${dottedRow("Presupuesto de inversión 2027 (total)", fmtCOP(mill(total_inversion_mill)), { strong: true })}
    ${dottedRow("Regionalizado (asignable a un departamento)", fmtCOP(mill(regionalizado.mill)) + ` (${regionalizado.pct}%)`)}
    ${dottedRow("Nacional (sin impacto departamental identificable)", fmtCOP(mill(nacional.mill)) + ` (${nacional.pct}%)`)}
    ${dottedRow("Por regionalizar (pendiente de asignar)", fmtCOP(mill(porRegionalizar.mill)) + ` (${porRegionalizar.pct}%)`)}
    <div class="total-row">
      <span>DEPARTAMENTOS CUBIERTOS</span>
      <span class="tabular">${departamentos.length}<span class="sub">32 departamentos + Bogotá D.C., agrupados en 6 regiones</span></span>
    </div>
  `;

  // ---------- Leyenda de regiones ----------
  document.getElementById("region-legend").innerHTML = Object.keys(REGION_COLORS).map(r => `
    <span><span class="swatch" style="background:${REGION_COLORS[r]}"></span>${r}</span>
  `).join("");

  await (async () => { try { await document.fonts.load("700 10px 'Space Mono'"); await document.fonts.ready; } catch (e) {} })();
  Chart.defaults.font.family = "'Space Mono', monospace";
  Chart.defaults.color = "#211d13";

  const valueLabelPlugin = {
    id: "valueLabels",
    afterDatasetsDraw(c) {
      const { ctx: cx, chartArea } = c;
      cx.save();
      cx.font = "700 9px 'Space Mono', monospace";
      cx.textBaseline = "middle";
      c.data.datasets.forEach((ds) => {
        const meta = c.getDatasetMeta(0);
        meta.data.forEach((bar, i) => {
          const v = ds.data[i];
          if (v === null || v === undefined) return;
          cx.fillStyle = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor;
          const txt = ds.labelFmt ? ds.labelFmt(v) : String(v);
          const x = Math.min(bar.x + 5, chartArea.right - cx.measureText(txt).width - 2);
          cx.fillText(txt, x, bar.y);
        });
      });
      cx.restore();
    },
  };

  // ---------- Grafico por region ----------
  const regionLabels = regiones.map(r => r.region);
  new Chart(document.getElementById("region-chart").getContext("2d"), {
    type: "bar",
    data: {
      labels: regionLabels,
      datasets: [{
        data: regiones.map(r => +(mill(r.mill) / 1e12).toFixed(2)),
        backgroundColor: regionLabels.map(r => REGION_COLORS[r]),
        borderRadius: 0, maxBarThickness: 22,
        labelFmt: (v) => "$" + v.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "b",
      }],
    },
    plugins: [valueLabelPlugin],
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 40 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#211d13",
          callbacks: { label: (item) => `$${item.raw.toLocaleString("es-CO", { maximumFractionDigits: 2 })} billones (${regiones[item.dataIndex].pct}%)` },
        },
      },
      scales: {
        x: { title: { display: true, text: "BILLONES DE PESOS (COP)", font: { size: 10 } }, grid: { color: "#d8d0b8", borderDash: [3, 3] } },
        y: { grid: { display: false } },
      },
    },
  });

  // ---------- Grafico por departamento ----------
  const ctx = document.getElementById("dept-chart").getContext("2d");
  let deptChart;
  function renderDeptChart(mode) {
    const sorted = [...departamentos].sort((a, b) =>
      mode === "percapita" ? b.per_capita_mill - a.per_capita_mill : b.presupuesto_2027_mill - a.presupuesto_2027_mill
    );
    const labels = sorted.map(d => d.nombre.length > 28 ? d.nombre.slice(0, 26) + "…" : d.nombre);
    const values = mode === "percapita"
      ? sorted.map(d => d.per_capita_mill)
      : sorted.map(d => +(mill(d.presupuesto_2027_mill) / 1e12).toFixed(3));
    const colors = sorted.map(d => REGION_COLORS[d.region]);

    if (deptChart) deptChart.destroy();
    deptChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values, backgroundColor: colors, borderRadius: 0, maxBarThickness: 10,
          labelFmt: (v) => mode === "percapita"
            ? "$" + v.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " M/hab"
            : "$" + v.toLocaleString("es-CO", { maximumFractionDigits: 2 }) + "b",
        }],
      },
      plugins: [valueLabelPlugin],
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#211d13",
            callbacks: {
              title: (items) => sorted[items[0].dataIndex].nombre,
              label: (item) => {
                const d = sorted[item.dataIndex];
                const top = d.sectores[0];
                return [
                  `Inversión 2027: ${fmtCOP(mill(d.presupuesto_2027_mill))}`,
                  `Per cápita: $${d.per_capita_mill.toLocaleString("es-CO")} millones/habitante`,
                  `Población: ${d.poblacion.toLocaleString("es-CO")}`,
                  `Sector principal: ${top ? top.sector + " (" + top.pct + "%)" : "—"}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: mode === "percapita" ? "MILLONES DE PESOS POR HABITANTE" : "BILLONES DE PESOS (COP)", font: { size: 10 } },
            grid: { color: "#d8d0b8", borderDash: [3, 3] },
          },
          y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10 } } },
        },
      },
    });
  }
  renderDeptChart("total");
  document.querySelectorAll("#dept-chart-mode button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#dept-chart-mode button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderDeptChart(btn.dataset.mode);
    });
  });

  // ---------- Tabla ----------
  const tbody = document.getElementById("table-body");
  const searchBox = document.getElementById("search-box");
  const rowCount = document.getElementById("row-count");
  let sortKey = "presupuesto_2027_mill";
  let sortDir = -1;

  function renderTable() {
    const q = searchBox.value.trim().toLowerCase();
    let rows = departamentos.filter(d => !q || d.nombre.toLowerCase().includes(q) || d.region.toLowerCase().includes(q));
    rows = [...rows].sort((a, b) => {
      if (sortKey === "nombre" || sortKey === "region") return sortDir * String(a[sortKey]).localeCompare(String(b[sortKey]), "es");
      if (sortKey === "sector_top") {
        const av = a.sectores[0] ? a.sectores[0].pct : -Infinity, bv = b.sectores[0] ? b.sectores[0].pct : -Infinity;
        return sortDir * (av - bv);
      }
      return sortDir * (a[sortKey] - b[sortKey]);
    });
    rowCount.textContent = `${rows.length} de ${departamentos.length} departamentos`;

    tbody.innerHTML = rows.map(d => {
      const top = d.sectores[0];
      return `
        <tr>
          <td class="name">${d.nombre}</td>
          <td class="tabular">${d.region}</td>
          <td class="tabular">${d.poblacion.toLocaleString("es-CO")}</td>
          <td class="tabular">${d.nbi_pct.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%</td>
          <td class="tabular">${fmtCOP(mill(d.presupuesto_2027_mill))}</td>
          <td class="tabular">$${d.per_capita_mill.toLocaleString("es-CO")} M</td>
          <td class="tabular">${top ? `${top.sector} (${top.pct}%)` : "—"}</td>
        </tr>
      `;
    }).join("");
  }

  searchBox.addEventListener("input", renderTable);
  document.querySelectorAll("#data-table th[data-key]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = (key === "nombre" || key === "region") ? 1 : -1; }
      document.querySelectorAll("#data-table th").forEach(h => h.classList.remove("sorted"));
      th.classList.add("sorted");
      renderTable();
    });
  });

  renderTable();
})();
