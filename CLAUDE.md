# Presupuesto General de la Nación (Colombia) 2027 — Dashboard comparativo 2026 vs 2027

## Qué es esto

Sitio estático (HTML/CSS/JS vanilla, sin build, deployable directo en Vercel) que
compara el Proyecto de Ley del Presupuesto General de la Nación (PGN) 2027 de
Colombia contra el presupuesto vigente de 2026, sección por sección
(ministerio/dependencia). Es un análisis independiente, no oficial.

Vive en: `C:\Users\NicolasCardona\Documents\nicolas\prespuestocolombia2027`
(no es un repo git todavía).

## Estado actual

Completo y funcional. Probado localmente con `python -m http.server` +
Chrome headless (screenshots limpios, sin errores de consola). Falta:
publicarlo en Vercel (el usuario aún no lo ha desplegado).

## Estructura de archivos

```
├── index.html              landing: stats, análisis, novedades, gráfico, tabla completa
├── detalle.html             vista por dependencia (?codigo=NNNN)
├── metodologia.html         fuentes y caveats explicados
├── assets/
│   ├── style.css            paleta inspirada en senado.gov.co + colores de datos validados
│   ├── common.js            helpers: fmtCOP, fmtPct, deltaBadgeHTML, loadData(), PALETTE
│   ├── home.js               lógica de index.html (stat tiles, novedades, Chart.js, tabla)
│   └── detail.js             lógica de detalle.html
├── data/
│   ├── presupuesto.json     dataset FINAL que consume el sitio (fetch relativo)
│   └── raw/                  cachés intermedios para poder regenerar presupuesto.json
│       ├── pgn2027_raw.json           (salida de scripts/1_extract_2027_xlsx.py)
│       └── pgn2026_by_entidad_tipo.json  (salida de scripts/2_fetch_2026.sh)
├── scripts/
│   ├── 1_extract_2027_xlsx.py   Excel 2027 -> data/raw/pgn2027_raw.json
│   ├── 2_fetch_2026.sh          Datos Abiertos 2026 -> data/raw/pgn2026_by_entidad_tipo.json
│   └── 3_build_dataset.py       combina los dos raw -> data/presupuesto.json
├── *.pdf / *.xlsx           documentos fuente originales que el usuario puso en la carpeta
```

Para regenerar todo desde cero: `python scripts/1_extract_2027_xlsx.py`,
luego `bash scripts/2_fetch_2026.sh` (opcional si el caché en `data/raw/` ya
está bien), luego `python scripts/3_build_dataset.py`. Requiere
`pip install openpyxl`.

## Los 5 archivos fuente que dio el usuario (carpeta raíz)

| Archivo | Qué es | Total que reporta |
|---|---|---|
| `1.Mensaje Presidencial 2027.pdf` | Mensaje presidencial que acompaña el proyecto (narrativa + cifras macro) | Dice **$575,7 billones** para el PGN 2027 |
| `3. Proyecto de Ley PGN 2027..pdf` | Articulado del proyecto de ley, fechado **"Agosto de 2026"** (sin la palabra "Proyecto" en la portada → versión más avanzada/final) | **$634.952.040.871.099** ($634,95 billones) — Art. 1 y Art. 2 |
| `3.PROYECTO DE LEY PGN 2027.pdf` | Articulado, fechado **"Proyecto, Julio 29 de 2026"** (un borrador anterior) | $545.486.661.518.981 ($545,49 billones) |
| `Gastos Presupuesto General de la Nación.xlsx` | Detalle por sección presupuestal, hoja "PGN" | $575.699.169.518.981 — **coincide con el Mensaje Presidencial**, NO con el archivo usado en el sitio |
| `Presupuesto General de la Nación..xlsx` | Detalle por sección presupuestal, misma estructura | $634.952.040.871.099 — **coincide exacto con el PDF de agosto** → **este es el que se usó** |

**Hallazgo clave (ya reportado al usuario y confirmado por él):** el Gobierno
produjo al menos tres versiones del total del PGN 2027 durante el trámite del
proyecto ($545,49B borrador jul → $575,7B mensaje presidencial → $634,95B
articulado radicado ago). El usuario decidió explícitamente:

> "el de 634 es el mas reciente y el que debemos usar. Para el del 2026 busca en la web"

Por eso el sitio usa `Presupuesto General de la Nación..xlsx` (634.95B) para
2027, y **ninguno de los 5 archivos originales se usa para 2026** — ver abajo.

⚠️ Si en el futuro el usuario trae una versión aún más nueva del proyecto de
ley (p. ej. tras el primer debate en comisiones económicas, que suele
modificar el articulado), hay que repetir la extracción con
`scripts/1_extract_2027_xlsx.py` apuntando al nuevo Excel, y probablemente
reescribir partes de `metodologia.html`/`index.html` que citan las cifras de
las tres versiones anteriores.

## De dónde salió el dato de 2026

Ninguno de los archivos del usuario tenía el presupuesto 2026 desglosado por
dependencia (todos son sobre 2027, en distintas versiones). Se buscó en la
web y se usó:

- **Dataset:** "Información de Gastos del Presupuesto General de la Nación",
  Datos Abiertos Colombia (MHCP), Socrata id `5phs-yqfw`
  (`https://www.datos.gov.co/resource/5phs-yqfw.json`)
- **Corte usado:** `anio=2026`, `nombremes='Julio'` (el más reciente
  disponible al 2026-09-01; verificar si hay un mes más nuevo antes de
  regenerar)
- **Campo usado:** `apropiacionvigente` (no `apropiacioninicial`), agregado
  por `codigoentidad` + `codigotipogasto` (A=funcionamiento, B=deuda,
  C=inversión)
- **Total resultante:** $555.820.613.056.517 ($555,82 billones) — esto
  coincide con lo que el propio Mensaje Presidencial reporta como
  "apropiación vigente a 30 de junio de 2026" ($555,8 billones, Cuadro 6 del
  mensaje), lo cual valida que el dataset y el corte elegido son correctos.
  El `apropiacioninicial` agregado da $546.975.198.920.436, que coincide con
  el presupuesto aprobado por el Congreso vía Ley 2559 de 2025 ($546,9
  billones) — otra validación cruzada.

**Cómo se emparejó con las secciones de 2027:** el dataset de 2026 usa
`codigoentidad` con formato `SS-EE-DD` (ej. `15-01-01`); se agregó por los
primeros dos segmentos concatenados (`1501`) para que coincida con el código
de 4 dígitos de "SECCIÓN" del Excel 2027 (ej. `1501` = Ministerio de Defensa
Nacional). Ver `scripts/3_build_dataset.py`.

⚠️ **Nota de precaución sobre WebFetch/herramientas de resumen con IA:** al
intentar traer esta data pública vía la herramienta de fetch-con-resumen, el
modelo se negó alegando que era "información financiera sensible" (falso
positivo — es presupuesto público agregado por ministerio, publicado en un
portal de datos abiertos oficial, no PII ni datos personales). Se resolvió
usando `curl` directo. Si un futuro Claude necesita traer más datos de
`datos.gov.co` u otro portal de datos abiertos gubernamentales, usar `curl`/
`Bash` en vez de WebFetch para evitar este falso positivo.

## Estructura del Excel 2027 (para quien toque `scripts/1_extract_2027_xlsx.py`)

Hoja `"PGN"`, columnas relevantes (confirmadas celda por celda, no fiarse del
texto concatenado que muestra un dump por filas):

- **C**: código de programa (ej. `0199`) O etiqueta `A. PRESUPUESTO DE
  FUNCIONAMIENTO` / `B. ...DEUDA PÚBLICA` / `C. ...INVERSIÓN` O el texto
  literal `TOTAL PRESUPUESTO SECCIÓN`
- **D**: código de subprograma (ej. `1000`), presente solo cuando C está vacío
- **E**: nombre del programa o subprograma
- **F**: `SECCIÓN:  NNNN` en una fila, nombre de la sección en la fila
  siguiente
- **G**: Aporte Nación · **H**: Recursos propios · **I**: Total

## Rediseño visual: "recibo de datáfono" (2026-09-01, v2)

A pedido explícito del usuario ("que imite un poco a los recibos que
imprimen los datáfonos, medio chistoso, atractivo, bastante consistente en
tamaños"), se reemplazó el diseño institucional inicial (header oscuro tipo
gobierno, tarjetas, tabla) por un concepto de **recibo de punto de venta**:

- Todo el sitio es un único `.receipt` (rollo de papel) centrado sobre un
  fondo oscuro tipo "mostrador" (`--counter`), con bordes en zigzag
  (`::before`/`::after` con gradientes) simulando el papel arrancado.
- Tipografía única monoespaciada **Space Mono** (Google Fonts) para todo —
  esa restricción de una sola familia es justamente lo que garantiza la
  consistencia de tamaños que pidió el usuario. Escala fija de tamaños
  (`--fs-xs` a `--fs-xxl`) y espaciados (`--sp-1` a `--sp-7`) en `style.css`,
  no usar valores sueltos fuera de esa escala.
- Filas "ETIQUETA . . . . . . VALOR" (`dottedRow()` en `common.js` /
  `.dotted-row` en CSS) — el truco tipográfico de recibo/factura, reutilizado
  en meta, resumen de caja, precios del detalle y programas.
- Variaciones se muestran como **RECARGO** (sube) / **DESCUENTO** (baja) en
  vez de "aumenta/disminuye" — humor de caja registradora
  (`deltaBadgeHTML()` en `common.js`, clase `.tkt-tag`).
- "Principales novedades" son ahora **cupones recortables** (`.coupon`, con
  un pseudo-elemento `✂ - - - -` arriba simulando línea de corte).
- Código de barras puramente decorativo generado de forma determinista a
  partir de un texto semilla (`barcodeBackground()` en `common.js`) — mismo
  código siempre para la misma sección, distinto por sección/página.
- El listado completo de dependencias dejó de ser una `<table>` con headers
  clicables y pasó a ser una lista de "líneas de ticket" (`.tkt-item`) con
  un `<select>` + botón de dirección para ordenar (`#sort-select`,
  `#sort-dir`) — más natural en un layout de una sola columna angosta
  (`.receipt-shell { max-width: 640px }`).
- Chistes ya escritos en el copy (mantenerlos si se edita texto): "Método de
  pago: deuda pública. Cambio: $0.", "No se aceptan devoluciones de
  presupuesto.", "Política de devoluciones" en metodología, "¡Gracias por su
  consolidación fiscal!". Tono: chistoso sobre el formato/gimmick del
  recibo, nunca burlón hacia una dependencia o cifra específica (son datos
  fiscales reales).

**Paleta de datos (charts y recargo/descuento):** se abandonó el par
azul/naranja de la skill `dataviz` (v1) por un dúo tinta negra + tinta roja
(`--ribbon-1: #1c1a14`, `--ribbon-2: #c33d3d`), imitando las impresoras
matriciales/POS de cinta bicolor. Justificación de accesibilidad: la
diferencia de luminosidad entre negro y rojo es grande, así que se
distinguen aunque falle la percepción de matiz (daltonismo); no se pudo
correr el validador de la skill (`scripts/validate_palette.js`, requiere
`node`, no instalado en esta máquina) para confirmarlo formal-mente — si en
algún momento hay `node` disponible, vale la pena correrlo contra este par
antes de dar por sentada la accesibilidad al 100%. El rojo `#c33d3d` es el
mismo que se usó como acento de marca en la v1 (tomado de senado.gov.co), así
que hay continuidad de marca aunque cambió todo lo demás.

Archivos reescritos por completo en este rediseño: `index.html`,
`detalle.html`, `metodologia.html`, `assets/style.css`, `assets/home.js`,
`assets/detail.js`, `assets/common.js` (se le agregaron `dottedRow()`,
`seudoFolio()`, `barcodeBackground()`, `nowStamp()`). La lógica de datos
(qué se compara, cómo se ordena/filtra, `data/presupuesto.json` y los
scripts en `scripts/`) **no cambió** — el rediseño es puramente de
presentación.

### Ajuste posterior: landing page + gráfico interactivo (mismo día)

El usuario pidió pulir específicamente el landing (`index.html`) al mismo
nivel que el recibo de detalle, y mejorar el gráfico comparativo:

- "Notas del cajero" y el resumen de caja ahora usan los mismos componentes
  que el recibo de detalle (`.comment-box`, `dotted-row` + `.total-row`) en
  vez de párrafos sueltos y una lista plana de filas — coherencia visual
  entre landing y detalle.
- El gráfico (`#main-chart` en `assets/home.js`) ahora tiene: franjas tipo
  libro contable (plugin `zebraStripes`), el valor impreso al final de cada
  barra (plugin `valueLabels`, ambos definidos inline en `home.js`, no son
  paquetes npm), y **las etiquetas del eje Y (nombres de dependencia) son
  clicables** — no solo las barras — y llevan a `detalle.html?codigo=...`.
  Esto se hizo a mano con `onClick`/`onHover` de Chart.js comprobando si el
  clic cae a la izquierda de `chart.chartArea.left` (zona de etiquetas) y
  usando `scale.getValueForPixel()` para mapear a un índice, porque Chart.js
  no expone las etiquetas de eje como elementos clicables nativamente.
- **Bug encontrado y corregido:** Chart.js media el ancho de las etiquetas
  del eje Y antes de que la fuente web "Space Mono" terminara de cargar, así
  que reservaba de menos y los nombres largos se recortaban por la
  izquierda. Fix: `await document.fonts.load(...); await
  document.fonts.ready;` **antes** de crear cualquier `new Chart(...)`, en
  `home.js` y `detail.js`. Si se agregan más gráficos a futuro, replicar
  este mismo `await` antes de instanciarlos o va a volver a pasar.
- El panel del gráfico ahora tiene un borde punteado con una pestañita
  "REGISTRADORA" arriba (`.chart-panel::before`), para que se sienta parte
  del mismo lenguaje visual que los cupones de novedades.

### Ajuste posterior: landing a pantalla completa y colores claros (mismo día)

El usuario pidió explícitamente que **solo el landing** (`index.html`) dejara
de ser angosto tipo recibo y pasara a pantalla completa con colores casi
blancos "para lectura rápida", manteniendo todo lo demás (recibos
individuales `detalle.html`, `metodologia.html`, y todos los componentes:
dotted-row, cupones, tags RECARGO/DESCUENTO, código de barras, humor, fuente
Space Mono) intacto.

Cómo se implementó (todo con CSS con scope, cero cambios a `home.js` más
allá de lo ya hecho antes — los `id` no se tocaron):

- `index.html` ahora tiene `<body class="landing">` y
  `<div class="receipt-shell wide">`. `detalle.html`/`metodologia.html`
  **no** tienen esa clase, así que conservan el mostrador oscuro + papel
  angosto de siempre.
- En `style.css`, todo el bloque `body.landing { ... }` al final del archivo
  redefine: fondo casi blanco (`--page-bg: #f3f2ee`, papel `#fffefc`), quita
  la rotación/sombra fuerte del papel, sube `.receipt-shell.wide` a
  `max-width: 1240px`.
- Patrón de layout: **columna angosta de lectura + secciones anchas**. El
  encabezado/meta/resumen/notas/pie van envueltos en `.prose-col`
  (`max-width: 760px`, centrado) para que las líneas no se hagan
  eternas; las ofertas (`.coupon-grid`), el gráfico y el listado de
  dependencias (`#items-list` / `.tkt-items`) SÍ usan el ancho completo del
  recibo — con `.tkt-items` pasando a grid de 2 columnas (>=760px) o 3
  columnas (>=1080px) vía media queries en `body.landing .tkt-items`, en vez
  del cuadro con scroll interno que tenía antes. Si se agrega contenido
  nuevo al landing, seguir este mismo criterio (prose-col si es texto para
  leer, ancho completo si es una grilla de datos).

**Lección de testing para la próxima sesión:** al probar el layout mobile
con Chrome headless (`chrome.exe --headless=new --window-size=390,... 
--screenshot=...`), `window.innerWidth` terminó siendo ~500px en vez de 390
(confirmado inyectando un script de debug temporal que leía
`window.innerWidth`/`scrollWidth` en el DOM) — es decir, **`--window-size`
no fija de forma confiable el viewport de layout en `--headless=new` en esta
máquina**, aunque el PNG de salida sí respeta las dimensiones pedidas (o sea
que termina siendo un recorte del layout de ~500px, no un layout real a
390px). Esto generó una falsa alarma de "texto cortado por overflow" que
resultó ser un artefacto de la herramienta de prueba, no un bug real (se
verificó que `document.documentElement.scrollWidth` <= `window.innerWidth`
en el viewport que Chrome realmente usó). El sitio tiene
`<meta name="viewport" content="width=device-width, initial-scale=1">`, así
que en un celular real sí se ajusta al ancho correcto. **No volver a gastar
tiempo persiguiendo overflow "visto" en un screenshot mobile de Chrome
headless sin antes confirmar `window.innerWidth` con un script de debug** —
si hace falta probar mobile de verdad, usar Chrome DevTools Protocol con
`Emulation.setDeviceMetricsOverride` (requiere un cliente CDP, p. ej. via
`node`, que no está instalado en esta máquina) en vez de `--window-size`.
De todas formas se dejó un arreglo de higiene real y correcto en el camino:
`.total-row .sub` ahora tiene `white-space: normal` explícito (antes heredaba
`nowrap` de `.dotted-row .value`, lo cual sí podía causar problemas en textos
largos aunque no fue la causa de lo que se vio en las pruebas).

### Ajuste posterior: menos "lenguaje de supermercado" + tabla de vuelta (mismo día)

El usuario pidió que, **solo en el landing**, todo lo que va **después** de
la fila "TOTAL RECARGO" del resumen de caja dejara de usar humor/lenguaje de
tienda (para no confundir la lectura de los datos), y que el listado final
de dependencias volviera a ser una tabla en vez de tarjetas tipo ticket. El
encabezado, meta (fecha/cajero/cliente/folio) y "Resumen de caja" —la
"primera parte"— se dejaron intactos porque el usuario los excluyó
explícitamente.

Cambios (todos dentro de `index.html` / `assets/home.js` / `assets/style.css`;
`detalle.html` y `metodologia.html` NO se tocaron, siguen con el humor
completo):

- "Notas del cajero" → **"Análisis general"**; se reescribió el texto sin
  metáforas de caja ("en caja", "no reembolsable", "recarga") y se eliminó
  el chiste "Método de pago: deuda pública...".
- "Ofertas y novedades del día" → **"Principales novedades"**; las tarjetas
  dejaron de ser cupones recortables (se quitó el pseudo-elemento de
  tijeras `✂`, ahora es `.info-card`, borde sólido simple) y los rótulos
  chistosos ("¡Recargo estrella!", "2x1 en recargo %", "Liquidación total",
  "Segundo premio", "Cambio de empaque", "Dos precios distintos") volvieron
  a texto plano descriptivo (mismo wording que la v1 original: "Mayor
  incremento en pesos", "Reorganización institucional", etc.).
- Botones del gráfico: "Top gasto/recargo %/descuento %" → **"Mayor
  presupuesto / Mayor aumento % / Mayor caída %"**. Se quitó la pestañita
  "REGISTRADORA" del borde del panel del gráfico.
- `deltaBadgeHTML()` en `common.js` ya NO dice "RECARGO"/"DESCUENTO" — ahora
  es solo flecha + porcentaje (▲/▼/■ + `%`). **Ojo:** esta función es
  compartida, pero `detalle.html` no la usa (arma su propio texto
  RECARGO/DESCUENTO a mano dentro de `detail.js`), así que el detalle
  individual conserva el lenguaje de recibo sin cambios.
- El listado final ("Todas las dependencias") volvió a ser un `<table
  class="data-table">` con encabezados de columna clicables para ordenar
  (`th[data-key]`, igual que la v1 original), en vez de la grilla de
  tarjetas `.tkt-item`. Las clases viejas `.tkt-items`, `.tkt-item`,
  `.item-name`, `.item-code`, `.item-nums`, `.arrow-vals`, `.tkt-sort`,
  `.dir-btn`, `.tkt-count` se borraron de `style.css` (ya no las usa nada);
  `.badge-mini` se conservó porque la tabla la sigue usando.

**Bug real encontrado y corregido de paso:** el tooltip del gráfico
mostraba el nombre de la dependencia **truncado** (el mismo string acortado
que se usaba para las etiquetas del eje Y), porque Chart.js usa
`data.labels` tanto para el eje como para el título del tooltip por
defecto. Fix en `renderChart()` (`home.js`): `data.labels` ahora lleva el
nombre **completo** (así el tooltip lo muestra completo), y el recorte
visual del eje Y se hace aparte con `scales.y.ticks.callback: (value,
index) => truncated[index]` sobre un array `truncated` separado. Si se
agregan más gráficos con etiquetas largas, replicar este mismo patrón en
vez de truncar directamente el array `labels`.
- **Unidad de agregación = "sección presupuestal"** (código de 4 dígitos),
  que es literalmente el nivel "ministerio/dependencia" que pidió el
  usuario. Deliberadamente NO se agrupó en categorías más amplias tipo
  "Sector Defensa" / "Sector Salud" porque el mapeo sección→sector no está en
  ninguno de los archivos fuente y hubiera requerido inventar una taxonomía.
- **Filtro de $100 mil millones** en el gráfico principal (modos "mayor
  aumento %" / "mayor caída %") para que secciones muy pequeñas con
  variaciones porcentuales absurdas (por una adición puntual de 2026) no
  dominen visualmente. La tabla completa no tiene este filtro.
- Secciones que existen en un año y no en el otro (reorganizaciones) se
  marcan `estado: "nueva_2027"` / `"eliminada_2027"` y NO se les calcula
  `variacion_pct` (queda `null`), para no mostrar falsas caídas/subidas del
  100%. Caso real detectado: ICBF, INSOR e INCI estaban bajo "Ministerio de
  Igualdad y Equidad (en liquidación)" en 2026 y aparecen reasignados a otras
  secciones en 2027.

## Pendientes / posibles próximos pasos

- [ ] Desplegar en Vercel — guía completa paso a paso ya escrita en
      `DEPLOY.md` (GitHub Desktop → import en Vercel → dominio propio). El
      usuario aún no lo ha ejecutado.
- [ ] Dominio objetivo confirmado por el usuario:
      `presupuesto2027.nicolascardona.com` (con "u" — se le consultó
      explícitamente porque había escrito "prespuesto2027" sin la u, y
      confirmó que quiere la ortografía correcta).
- [ ] No es un repo git todavía (`git --version` sí está instalado en esta
      máquina; `node`/`npm`/`gh` NO están instalados — por eso `DEPLOY.md`
      recomienda GitHub Desktop + panel web de Vercel en vez de la CLI de
      Vercel, para no depender de Node).
- [ ] Si aparece una versión más nueva del proyecto de ley (post primer
      debate en comisiones), regenerar `data/raw/pgn2027_raw.json` con el
      nuevo Excel y actualizar las menciones a "$634,95 billones" /
      "articulado de agosto de 2026" en `index.html` y `metodologia.html`.
- [ ] Si se quiere refrescar el corte de 2026 a un mes más reciente que
      julio, correr `scripts/2_fetch_2026.sh <NombreMes>` (verificar antes
      qué meses hay disponibles, ver comentario dentro del script).
