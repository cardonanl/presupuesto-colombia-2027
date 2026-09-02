(async function () {
  const content = document.getElementById("content");
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo");
  const stamp = nowStamp();

  let data;
  try {
    data = await loadData();
  } catch (err) {
    content.innerHTML = `<p>⚠ Error de caja: ${err.message}</p>`;
    return;
  }

  const s = data.secciones.find(x => x.codigo === codigo);
  if (!s) {
    content.innerHTML = `
      <div class="notfound">
        <div class="tkt-header"><div class="country">★ REPÚBLICA DE COLOMBIA ★</div><div class="store">ARTÍCULO NO ENCONTRADO</div></div>
        <p>No hay recibo para el código "${codigo || ""}". Puede que se haya devuelto, cambiado de nombre o nunca haya existido.</p>
        <a class="back-link" href="index.html">← Volver al tiquete principal</a>
      </div>`;
    return;
  }

  document.title = `Recibo — ${s.nombre}`;

  const has26 = !!s.y2026, has27 = !!s.y2027;

  function buildComment() {
    const parts = [];
    if (has26 && has27) {
      const dir = s.variacion_pct > 0 ? "recarga" : s.variacion_pct < 0 ? "descuenta" : "deja igual";
      parts.push(`Esta línea del tiquete ${dir} ${fmtPct(Math.abs(s.variacion_pct), { signed: false })} entre 2026 y 2027: de ${fmtCOP(s.y2026.vigente)} a ${fmtCOP(s.y2027.total)} (diferencia de ${fmtCOP(s.variacion_abs)}).`);
      const t26 = tipoGastoTotals(s.y2026), t27 = tipoGastoTotals(s.y2027);
      const drivers = ["funcionamiento", "deuda", "inversion"].map(k => ({ k, diff: (t27[k] || 0) - (t26[k] || 0) }));
      drivers.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      const top = drivers[0];
      const label = { funcionamiento: "el gasto de funcionamiento", deuda: "el servicio de la deuda", inversion: "la inversión" }[top.k];
      if (Math.abs(top.diff) > 1e9) {
        parts.push(`Lo que más pesa en el recibo es ${label}, que ${top.diff > 0 ? "sube" : "baja"} ${fmtCOP(Math.abs(top.diff))}.`);
      }
    } else if (has27 && !has26) {
      parts.push(`Este artículo es nuevo en el tiquete 2027 — no aparece como sección independiente en los datos de 2026 usados aquí (puede ser una sección nueva o venir empacada bajo otra dependencia por una reorganización). Precio en 2027: ${fmtCOP(s.y2027.total)}.`);
    } else if (has26 && !has27) {
      parts.push(`Este artículo salió de catálogo: tenía ${fmtCOP(s.y2026.vigente)} en 2026 pero no aparece como sección independiente en el proyecto 2027 — probablemente sus recursos se reasignaron a otra dependencia.`);
    }
    return parts.join(" ");
  }

  const metaRows = [
    dottedRow("Fecha", stamp.fecha),
    dottedRow("Folio", "N.º " + seudoFolio(s.codigo)),
    dottedRow("Sección", s.codigo),
  ].join("");

  const priceRows = `
    ${has26 ? dottedRow("Precio 2026 (vigente)", fmtCOP(s.y2026.vigente), { strong: true }) : dottedRow("Precio 2026", "no disponible")}
    ${has27 ? dottedRow("Precio 2027 (proyecto)", fmtCOP(s.y2027.total), { strong: true }) : dottedRow("Precio 2027", "no disponible")}
    <div class="total-row">
      <span>${(has26 && has27) ? (s.variacion_pct >= 0 ? "RECARGO" : "DESCUENTO") : "VARIACIÓN"}</span>
      <span class="tabular">${(has26 && has27) ? fmtPct(Math.abs(s.variacion_pct), { signed: false }) : "S/D"}<span class="sub">${(has26 && has27) ? fmtCOP(s.variacion_abs) + " de diferencia" : "sin año comparable"}</span></span>
    </div>
  `;

  let programasBlock = "";
  if (has27 && s.y2027.programas && s.y2027.programas.length) {
    const progs = [...s.y2027.programas].sort((a, b) => b.total - a.total);
    programasBlock = `
      <hr class="rule" />
      <h2>Detalle de la bolsa (2027)</h2>
      <p><small>Desglose por programa presupuestal. No hay equivalente por programa disponible para 2026 en los datos abiertos usados.</small></p>
      <div class="prog-list">
        ${progs.map(p => `
          <div class="prog-row">
            <div class="prog-name">${p.nombre}</div>
            <div class="prog-code">${p.codigo}</div>
            ${dottedRow("Aporte Nación", fmtCOP(p.aporte_nacional))}
            ${p.recursos_propios ? dottedRow("Recursos propios", fmtCOP(p.recursos_propios)) : ""}
            ${dottedRow("Total línea", fmtCOP(p.total), { strong: true })}
          </div>
        `).join("")}
      </div>
    `;
  }

  content.innerHTML = `
    <a class="back-link" href="index.html">← Volver al tiquete principal</a>
    <div class="tkt-header">
      <div class="country">★ REPÚBLICA DE COLOMBIA ★</div>
      <div class="store" style="font-size:var(--fs-lg);">${s.nombre}</div>
      <div class="tagline">RECIBO INDIVIDUAL DE PARTIDA PRESUPUESTAL</div>
      <span class="code-pill">SECCIÓN ${s.codigo}</span>
    </div>

    <hr class="rule" />
    <div class="tkt-meta">${metaRows}</div>

    <hr class="rule" />
    <h2>Detalle del cobro</h2>
    ${priceRows}

    <hr class="rule" />
    <h2>Nota del cajero</h2>
    <div class="comment-box"><p>${buildComment()}</p></div>

    ${(has26 && has27) ? `
    <hr class="rule" />
    <h2>Composición por tipo de gasto</h2>
    <div class="legend-row">
      <span><span class="swatch" style="background:var(--ribbon-1)"></span>2026</span>
      <span><span class="swatch" style="background:var(--ribbon-2)"></span>2027</span>
    </div>
    <div class="chart-wrap short"><canvas id="tipo-chart"></canvas></div>` : ""}

    ${programasBlock}

    <div class="perforation"></div>
    <div class="barcode-block">
      <div class="barcode-bars" id="barcode"></div>
      <div class="barcode-number">*SEC-${s.codigo}-${seudoFolio(s.codigo)}*</div>
    </div>
    <div class="tkt-footer">
      <p>Este recibo es un ejercicio independiente de visualización de datos públicos.</p>
      <p><a href="metodologia.html">Ver letra pequeña / metodología completa</a></p>
    </div>
  `;

  document.getElementById("barcode").style.backgroundImage = barcodeBackground(s.codigo);

  if (has26 && has27) {
    try { await document.fonts.load("700 10px 'Space Mono'"); await document.fonts.ready; } catch (e) { /* seguimos igual */ }
    const t26 = tipoGastoTotals(s.y2026), t27 = tipoGastoTotals(s.y2027);
    Chart.defaults.font.family = "'Space Mono', monospace";
    Chart.defaults.color = "#211d13";
    const ctx = document.getElementById("tipo-chart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Funcionamiento", "Servicio deuda", "Inversión"],
        datasets: [
          { label: "2026", data: [t26.funcionamiento, t26.deuda, t26.inversion].map(v => v / 1e9), backgroundColor: PALETTE.y2026, borderRadius: 0, maxBarThickness: 40 },
          { label: "2027", data: [t27.funcionamiento, t27.deuda, t27.inversion].map(v => v / 1e9), backgroundColor: PALETTE.y2027, borderRadius: 0, maxBarThickness: 40 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#211d13", callbacks: { label: (item) => `${item.dataset.label}: $${item.raw.toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil millones` } },
        },
        scales: {
          y: { title: { display: true, text: "MILES DE MILLONES (COP)", font: { size: 10 } }, grid: { color: "#d8d0b8", borderDash: [3, 3] } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }
})();
