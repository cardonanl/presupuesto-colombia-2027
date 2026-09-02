(async function () {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    document.getElementById("resumen-rows").innerHTML = `<p>⚠ Error de caja: ${err.message}</p>`;
    return;
  }

  const { summary, secciones } = data;
  const stamp = nowStamp();

  // ---------- Meta (fecha/hora/cajero, puro chiste de recibo) ----------
  document.getElementById("meta-rows").innerHTML = [
    dottedRow("Fecha", stamp.fecha),
    dottedRow("Hora", stamp.hora),
    dottedRow("Cajero", "Ministerio de Hacienda"),
    dottedRow("Cliente", "Congreso de la República"),
    dottedRow("Sucursal", "Bogotá D.C."),
    dottedRow("Folio", "N.º " + seudoFolio("pgn2027")),
  ].join("");

  // ---------- Resumen de caja ----------
  document.getElementById("resumen-rows").innerHTML = `
    ${dottedRow("Presupuesto 2026 (vigente)", fmtCOP(summary.total_2026_vigente), { strong: true })}
    ${dottedRow("Presupuesto 2027 (proyecto)", fmtCOP(summary.total_2027_proyecto), { strong: true })}
    <div class="total-row">
      <span>TOTAL RECARGO</span>
      <span class="tabular">${fmtPct(summary.variacion_pct)}<span class="sub">${fmtCOP(summary.variacion_abs)} de diferencia · ${secciones.length} artículos en el tiquete (${summary.n_nuevas} nuevos, ${summary.n_eliminadas} descontinuados)</span></span>
    </div>
  `;

  document.getElementById("an-total-2027").textContent = fmtCOP(summary.total_2027_proyecto) + " (" + fmtCOPFull(summary.total_2027_proyecto) + ")";
  document.getElementById("an-total-2026").textContent = fmtCOP(summary.total_2026_vigente) + " (" + fmtCOPFull(summary.total_2026_vigente) + ")";
  document.getElementById("an-var").textContent = fmtPct(summary.variacion_pct) + " (" + fmtCOP(summary.variacion_abs) + ")";

  // ---------- Principales novedades ----------
  const MIN_BASE = 100e9;
  const continuing = secciones.filter(s => s.y2026 && s.y2027 && s.y2026.vigente >= MIN_BASE);
  const byPctDesc = [...continuing].sort((a, b) => b.variacion_pct - a.variacion_pct);
  const byPctAsc = [...continuing].sort((a, b) => a.variacion_pct - b.variacion_pct);
  const byAbsDesc = [...continuing].sort((a, b) => b.variacion_abs - a.variacion_abs);

  const novedades = [];
  if (byAbsDesc[0]) {
    const s = byAbsDesc[0];
    novedades.push({ tag: "up", tagLabel: "Mayor incremento en pesos", title: s.nombre,
      body: `Pasa de ${fmtCOP(s.y2026.vigente)} en 2026 a ${fmtCOP(s.y2027.total)} en 2027, un aumento de ${fmtCOP(s.variacion_abs)} (${fmtPct(s.variacion_pct)}).`,
      href: seccionUrl(s.codigo) });
  }
  if (byPctDesc[0]) {
    const s = byPctDesc[0];
    novedades.push({ tag: "up", tagLabel: "Mayor incremento porcentual", title: s.nombre,
      body: `Su presupuesto crece ${fmtPct(s.variacion_pct)} frente a 2026 (de ${fmtCOP(s.y2026.vigente)} a ${fmtCOP(s.y2027.total)}).`,
      href: seccionUrl(s.codigo) });
  }
  if (byPctAsc[0]) {
    const s = byPctAsc[0];
    novedades.push({ tag: "down", tagLabel: "Mayor caída porcentual", title: s.nombre,
      body: `Cae ${fmtPct(Math.abs(s.variacion_pct), { signed: false })} frente a 2026 (de ${fmtCOP(s.y2026.vigente)} a ${fmtCOP(s.y2027.total)}). En varios casos esto refleja adiciones puntuales de 2026 que no se repiten en 2027.`,
      href: seccionUrl(s.codigo) });
  }
  if (byAbsDesc[1]) {
    const s = byAbsDesc[1];
    novedades.push({ tag: "up", tagLabel: "Segundo mayor incremento", title: s.nombre,
      body: `Aumenta ${fmtCOP(s.variacion_abs)} (${fmtPct(s.variacion_pct)}), hasta ${fmtCOP(s.y2027.total)} en 2027.`,
      href: seccionUrl(s.codigo) });
  }
  novedades.push({ tag: "info", tagLabel: "Reorganización institucional", title: "Liquidación del Ministerio de Igualdad y Equidad",
    body: `El ICBF, el INSOR y el INCI aparecen en 2026 bajo el Ministerio de Igualdad y Equidad (en liquidación) y en el proyecto 2027 quedan adscritos a otras secciones presupuestales. Esto genera variaciones grandes en ambas secciones que reflejan un cambio de adscripción, no un recorte real.`,
    href: "metodologia.html" });
  novedades.push({ tag: "info", tagLabel: "Dos cifras oficiales para 2027", title: "El total del proyecto varió durante el trámite",
    body: `El Mensaje Presidencial de julio de 2026 citó $575,7 billones para el PGN 2027. El articulado finalmente radicado en agosto de 2026 —usado en este análisis— asciende a $634,95 billones. Ver metodología para el detalle de esta diferencia.`,
    href: "metodologia.html" });

  document.getElementById("novedades-grid").innerHTML = novedades.map(n => `
    <div class="info-card">
      <span class="tkt-tag ${n.tag === "up" ? "up" : n.tag === "down" ? "down" : "flat"}">${n.tagLabel}</span>
      <h3><a class="link-title" href="${n.href}">${n.title}</a></h3>
      <p>${n.body}</p>
    </div>
  `).join("");

  // ---------- Grafico ----------
  // Importante: hay que esperar a que la fuente web termine de cargar antes
  // de que Chart.js mida el ancho de las etiquetas del eje Y; si no, mide
  // con la fuente de reserva (mas angosta) y luego pinta con Space Mono
  // (mas ancha), y los nombres largos quedan recortados por la izquierda.
  try { await document.fonts.load("700 10px 'Space Mono'"); await document.fonts.ready; } catch (e) { /* seguimos igual */ }

  const ctx = document.getElementById("main-chart").getContext("2d");
  let chart;
  Chart.defaults.font.family = "'Space Mono', monospace";
  Chart.defaults.color = "#211d13";

  // Franjas tipo libro contable, para que sea mas facil seguir cada fila.
  const zebraPlugin = {
    id: "zebraStripes",
    beforeDraw(c) {
      const { ctx: cx, chartArea: { left, right, top, bottom }, data } = c;
      const n = data.labels.length;
      if (!n) return;
      const band = (bottom - top) / n;
      cx.save();
      for (let i = 0; i < n; i++) {
        if (i % 2 === 0) continue;
        cx.fillStyle = "rgba(33,29,20,0.045)";
        cx.fillRect(left, bottom - (i + 1) * band, right - left, band);
      }
      cx.restore();
    },
  };

  // Imprime el valor al final de cada barra, como en una cinta de sumadora.
  const valueLabelPlugin = {
    id: "valueLabels",
    afterDatasetsDraw(c) {
      const { ctx: cx, chartArea } = c;
      cx.save();
      cx.font = "700 9px 'Space Mono', monospace";
      cx.textBaseline = "middle";
      c.data.datasets.forEach((ds, dsIndex) => {
        const meta = c.getDatasetMeta(dsIndex);
        meta.data.forEach((bar, i) => {
          const v = ds.data[i];
          if (!v) return;
          cx.fillStyle = ds.backgroundColor;
          const txt = "$" + v.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "b";
          const x = Math.min(bar.x + 5, chartArea.right - cx.measureText(txt).width - 2);
          cx.fillText(txt, x, bar.y);
        });
      });
      cx.restore();
    },
  };

  function computeSubset(mode) {
    if (mode === "top-presupuesto") return [...secciones].filter(s => s.y2027).sort((a, b) => b.y2027.total - a.y2027.total).slice(0, 20).reverse();
    if (mode === "top-aumento") return [...continuing].sort((a, b) => b.variacion_pct - a.variacion_pct).slice(0, 20).reverse();
    return [...continuing].sort((a, b) => a.variacion_pct - b.variacion_pct).slice(0, 20).reverse();
  }

  function navigateFromChart(chartInstance, evtOrIndex) {
    window.location.href = seccionUrl(chartInstance.__subset[evtOrIndex].codigo);
  }

  function renderChart(mode) {
    const subset = computeSubset(mode);
    // Los nombres completos van en `labels` (Chart.js los usa tal cual para
    // el titulo del tooltip); el recorte visual del eje Y se hace aparte con
    // `ticks.callback`, para no perder el nombre completo al pasar el mouse.
    const labels = subset.map(s => s.nombre);
    const truncated = subset.map(s => s.nombre.length > 30 ? s.nombre.slice(0, 28) + "…" : s.nombre);
    const d2026 = subset.map(s => s.y2026 ? +(s.y2026.vigente / 1e12).toFixed(2) : 0);
    const d2027 = subset.map(s => s.y2027 ? +(s.y2027.total / 1e12).toFixed(2) : 0);
    const maxVal = Math.max(...d2026, ...d2027, 0.01);

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "2026 vigente", data: d2026, backgroundColor: PALETTE.y2026, borderRadius: 0, maxBarThickness: 12, categoryPercentage: 0.7, barPercentage: 0.9 },
          { label: "2027 proyecto", data: d2027, backgroundColor: PALETTE.y2027, borderRadius: 0, maxBarThickness: 12, categoryPercentage: 0.7, barPercentage: 0.9 },
        ],
      },
      plugins: [zebraPlugin, valueLabelPlugin],
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 4 } },
        onHover: (evt, elements, c) => {
          const a = c.chartArea;
          const overLabel = a && evt.x < a.left && evt.y >= a.top && evt.y <= a.bottom;
          c.canvas.style.cursor = (elements.length || overLabel) ? "pointer" : "default";
        },
        onClick: (evt, elements, c) => {
          if (elements.length) return navigateFromChart(c, elements[0].index);
          const a = c.chartArea;
          if (a && evt.x < a.left && evt.y >= a.top && evt.y <= a.bottom) {
            const idx = Math.round(c.scales.y.getValueForPixel(evt.y));
            if (subset[idx]) navigateFromChart(c, idx);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#211d13", titleFont: { family: "Space Mono" }, bodyFont: { family: "Space Mono" },
            callbacks: { label: (item) => `${item.dataset.label}: $${item.raw.toLocaleString("es-CO", { maximumFractionDigits: 2 })} billones` },
          },
        },
        scales: {
          x: {
            suggestedMax: maxVal * 1.28,
            title: { display: true, text: "BILLONES DE PESOS (COP)", font: { size: 10 } },
            grid: { color: "#d8d0b8", borderDash: [3, 3] },
          },
          y: {
            grid: { display: false },
            ticks: { autoSkip: false, font: { size: 10 }, color: "#211d13", callback: (value, index) => truncated[index] },
          },
        },
      },
    });
    chart.__subset = subset;
  }

  renderChart("top-presupuesto");
  document.querySelectorAll("#chart-mode button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#chart-mode button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderChart(btn.dataset.mode);
    });
  });

  // ---------- Tabla de todas las dependencias ----------
  const tbody = document.getElementById("table-body");
  const searchBox = document.getElementById("search-box");
  const rowCount = document.getElementById("row-count");
  let sortKey = "var_pct";
  let sortDir = -1;

  function rowsData() {
    return secciones.map(s => ({
      codigo: s.codigo, nombre: s.nombre, estado: s.estado,
      y2026: s.y2026 ? s.y2026.vigente : null,
      y2027: s.y2027 ? s.y2027.total : null,
      var_abs: s.variacion_abs, var_pct: s.variacion_pct,
    }));
  }

  function renderTable() {
    const q = searchBox.value.trim().toLowerCase();
    let rows = rowsData();
    if (q) rows = rows.filter(r => r.nombre.toLowerCase().includes(q) || r.codigo.includes(q));
    rows.sort((a, b) => {
      if (sortKey === "nombre") return sortDir * String(a.nombre).localeCompare(String(b.nombre), "es");
      let av = a[sortKey], bv = b[sortKey];
      av = av === null || av === undefined ? -Infinity : av;
      bv = bv === null || bv === undefined ? -Infinity : bv;
      return sortDir * (av - bv);
    });
    rowCount.textContent = `${rows.length} de ${secciones.length} dependencias`;

    tbody.innerHTML = rows.map(r => {
      const badge = r.estado === "nueva_2027" ? '<span class="badge-mini new">NUEVA 2027</span>'
        : r.estado === "eliminada_2027" ? '<span class="badge-mini gone">SOLO 2026</span>' : "";
      return `
        <tr>
          <td class="name"><a href="${seccionUrl(r.codigo)}">${r.nombre}</a>${badge}<span class="code">Sección ${r.codigo}</span></td>
          <td class="tabular">${r.y2026 !== null ? fmtCOP(r.y2026) : "—"}</td>
          <td class="tabular">${r.y2027 !== null ? fmtCOP(r.y2027) : "—"}</td>
          <td class="tabular">${r.y2026 !== null && r.y2027 !== null ? fmtCOP(r.var_abs) : "—"}</td>
          <td class="tabular">${deltaBadgeHTML(r.var_pct)}</td>
        </tr>
      `;
    }).join("");
  }

  searchBox.addEventListener("input", renderTable);
  document.querySelectorAll("#data-table th[data-key]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = key === "nombre" ? 1 : -1; }
      document.querySelectorAll("#data-table th").forEach(h => h.classList.remove("sorted"));
      th.classList.add("sorted");
      renderTable();
    });
  });

  renderTable();

  // ---------- Codigo de barras decorativo ----------
  document.getElementById("barcode").style.backgroundImage = barcodeBackground("pgn2027-634952040871099");
})();
