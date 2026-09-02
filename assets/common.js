// Utilidades compartidas: formato de cifras, carga de datos, paleta,
// y helpers para el look de "recibo de datáfono".

const PALETTE = {
  y2026: "#1c1a14", // tinta negra (ribbon 1)
  y2027: "#c33d3d", // tinta roja (ribbon 2, impresoras de dos colores)
  grid: "#d8d0b8",
};

function fmtCOP(value, { compact = true } = {}) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const billones = value / 1e12;
  if (compact) {
    if (Math.abs(billones) >= 1) {
      return "$" + billones.toLocaleString("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + " b";
    }
    const milesM = value / 1e9;
    return "$" + milesM.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " MM";
  }
  return "$" + Math.round(value).toLocaleString("es-CO");
}

function fmtCOPFull(value) {
  if (value === null || value === undefined) return "—";
  return "$" + Math.round(value).toLocaleString("es-CO") + " COP";
}

function fmtPct(v, { signed = true, digits = 1 } = {}) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const s = v.toLocaleString("es-CO", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return (signed && v > 0 ? "+" : "") + s + "%";
}

// Insignia de variación: solo flecha + porcentaje, sin jerga de comercio.
function deltaBadgeHTML(pct, { na = "S/D" } = {}) {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return `<span class="tkt-tag flat">${na}</span>`;
  }
  if (pct > 0.05) return `<span class="tkt-tag up">▲ ${fmtPct(pct)}</span>`;
  if (pct < -0.05) return `<span class="tkt-tag down">▼ ${fmtPct(pct)}</span>`;
  return `<span class="tkt-tag flat">■ ${fmtPct(pct)}</span>`;
}

// Fila con "líder" de puntos, el truco tipográfico clásico de recibo/tabla de
// contenido: ETIQUETA .......... VALOR
function dottedRow(label, value, { strong = false, id = "" } = {}) {
  return `
    <div class="dotted-row${strong ? " strong" : ""}">
      <span class="label">${label}</span>
      <span class="leader" aria-hidden="true"></span>
      <span class="value tabular"${id ? ` id="${id}"` : ""}>${value}</span>
    </div>`;
}

async function loadData() {
  const res = await fetch("data/presupuesto.json");
  if (!res.ok) throw new Error("No se pudo cargar data/presupuesto.json");
  return res.json();
}

function seccionUrl(codigo) {
  return `detalle.html?codigo=${encodeURIComponent(codigo)}`;
}

function tipoGastoTotals(y) {
  if (!y) return { funcionamiento: 0, deuda: 0, inversion: 0 };
  return {
    funcionamiento: y.funcionamiento || 0,
    deuda: y.deuda || 0,
    inversion: y.inversion || 0,
  };
}

// Codigo de "factura" falso pero determinista, para el look de recibo.
function seudoFolio(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h).slice(0, 9).padStart(9, "0");
}

// Genera un patron de barras tipo codigo de barras (puramente decorativo),
// determinista a partir de un texto semilla, como fondo CSS.
function barcodeBackground(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 137 + ch.charCodeAt(0)) >>> 0;
  const stops = [];
  let pos = 0;
  for (let i = 0; i < 46 && pos < 100; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const w = 0.6 + (h % 5) * 0.55; // ancho de barra 0.6% - 2.8%
    const gap = 0.5 + ((h >> 3) % 4) * 0.4;
    const black = (h >> 6) % 3 !== 0;
    if (black) {
      stops.push(`var(--ink) ${pos}%`, `var(--ink) ${pos + w}%`);
    } else {
      stops.push(`transparent ${pos}%`, `transparent ${pos + w}%`);
    }
    pos += w + gap;
  }
  stops.push(`transparent ${pos}%`, `transparent 100%`);
  return `linear-gradient(90deg, ${stops.join(",")})`;
}

function nowStamp() {
  return { fecha: "01/09/2026", hora: "14:32:07" };
}
