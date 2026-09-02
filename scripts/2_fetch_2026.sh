#!/usr/bin/env bash
# Descarga el detalle 2026 (apropiacion vigente por entidad y tipo de gasto)
# desde el portal de Datos Abiertos Colombia y lo guarda en
# data/raw/pgn2026_by_entidad_tipo.json
#
# Dataset: "Informacion de Gastos del Presupuesto General de la Nacion"
# (Ministerio de Hacienda), id Socrata 5phs-yqfw.
#
# IMPORTANTE: usar curl directo (no el WebFetch/resumen de un LLM) -- el
# resumen automatico de una herramienta de fetch puede negarse a devolver el
# JSON crudo por confundir datos presupuestales publicos con "datos
# sensibles". Es informacion publica de un portal de datos abiertos oficial.
#
# El corte de mes disponible cambia con el tiempo; verificar primero cual es
# el mas reciente para el anio 2026 con:
#   curl -s "https://www.datos.gov.co/resource/5phs-yqfw.json?\$select=nombremes,count(*)&\$where=anio=2026&\$group=nombremes"
# En este proyecto se uso "Julio" (el mas reciente disponible el 2026-09-01).

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MES="${1:-Julio}"
OUT="$ROOT/data/raw/pgn2026_by_entidad_tipo.json"

mkdir -p "$ROOT/data/raw"

curl -s "https://www.datos.gov.co/resource/5phs-yqfw.json?\$select=codigoentidad,nombreentidad,codigotipogasto,sum(apropiacioninicial)%20as%20inicial,sum(apropiacionvigente)%20as%20vigente&\$where=anio=2026%20AND%20nombremes=%27${MES}%27&\$group=codigoentidad,nombreentidad,codigotipogasto&\$order=codigoentidad&\$limit=2000" \
  -o "$OUT"

echo "Escrito: $OUT (mes=$MES)"
python3 -c "import json; d=json.load(open(r'$OUT', encoding='utf-8')); print('filas:', len(d))"
