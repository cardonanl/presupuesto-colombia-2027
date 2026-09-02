"""
Combina data/raw/pgn2027_raw.json (Excel 2027) y
data/raw/pgn2026_by_entidad_tipo.json (Datos Abiertos 2026) en el
data/presupuesto.json final que consume el sitio.

Uso: python scripts/3_build_dataset.py
"""
import json
import os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
DEST = os.path.join(ROOT, "data", "presupuesto.json")

TIPO_MAP = {"A": "funcionamiento", "B": "deuda", "C": "inversion"}


def main():
    with open(os.path.join(RAW, "pgn2027_raw.json"), encoding="utf-8") as f:
        sec2027 = json.load(f)
    with open(os.path.join(RAW, "pgn2026_by_entidad_tipo.json"), encoding="utf-8") as f:
        rows2026 = json.load(f)

    # Agregar el detalle 2026 (por entidad) al nivel de seccion de 4 digitos.
    # codigoentidad tiene forma "SS-EE-DD" (sector-seccion-dependencia); los
    # primeros dos segmentos concatenados == codigo de seccion del Excel 2027
    # (ej. "02-01-01" -> seccion "0201").
    agg2026 = defaultdict(lambda: {"funcionamiento": 0.0, "deuda": 0.0, "inversion": 0.0,
                                    "vigente": 0.0, "inicial": 0.0, "entidades": []})
    for row in rows2026:
        parts = row["codigoentidad"].split("-")
        seccode = parts[0] + parts[1]
        tipo = TIPO_MAP.get(row.get("codigotipogasto"), "otro")
        vigente = float(row.get("vigente", 0) or 0)
        inicial = float(row.get("inicial", 0) or 0)
        a = agg2026[seccode]
        a[tipo] = a.get(tipo, 0.0) + vigente
        a["vigente"] += vigente
        a["inicial"] += inicial
        a["entidades"].append({"nombre": row["nombreentidad"], "codigo": row["codigoentidad"], "vigente": vigente})

    def best_name_2026(seccode):
        ents = agg2026[seccode]["entidades"]
        return max(ents, key=lambda e: e["vigente"])["nombre"] if ents else None

    codes_2027 = {s["code"]: s for s in sec2027}
    all_codes = sorted(set(codes_2027) | set(agg2026))

    merged = []
    for code in all_codes:
        s27, s26 = codes_2027.get(code), agg2026.get(code)
        name = (s27["name"] if s27 and s27["name"] else None) or best_name_2026(code) or "(sin nombre)"

        total27 = s27["total"] if s27 else 0.0
        total26 = s26["vigente"] if s26 else 0.0
        var_abs = total27 - total26
        var_pct = (var_abs / total26 * 100.0) if total26 else None

        merged.append({
            "codigo": code,
            "nombre": name,
            "y2026": {
                "vigente": total26, "inicial": s26["inicial"] if s26 else 0.0,
                "funcionamiento": s26["funcionamiento"] if s26 else 0.0,
                "deuda": s26["deuda"] if s26 else 0.0,
                "inversion": s26["inversion"] if s26 else 0.0,
            } if s26 else None,
            "y2027": {
                "total": total27,
                "aporte_nacional": s27["aporte_nacional"] if s27 else 0.0,
                "recursos_propios": s27["recursos_propios"] if s27 else 0.0,
                "funcionamiento": s27["funcionamiento"] if s27 else 0.0,
                "deuda": s27["deuda"] if s27 else 0.0,
                "inversion": s27["inversion"] if s27 else 0.0,
                "programas": [
                    {k: v for k, v in p.items() if k != "subprogramas"}
                    for p in (s27["programas"] if s27 else [])
                ],
            } if s27 else None,
            "variacion_abs": var_abs,
            "variacion_pct": var_pct,
            "estado": "nueva_2027" if (s27 and not s26) else ("eliminada_2027" if (s26 and not s27) else "continua"),
        })

    merged.sort(key=lambda e: -(e["y2027"]["total"] if e["y2027"] else e["y2026"]["vigente"]))

    total_2026 = sum((e["y2026"]["vigente"] if e["y2026"] else 0.0) for e in merged)
    total_2027 = sum((e["y2027"]["total"] if e["y2027"] else 0.0) for e in merged)
    summary = {
        "total_2026_vigente": total_2026,
        "total_2027_proyecto": total_2027,
        "variacion_abs": total_2027 - total_2026,
        "variacion_pct": (total_2027 - total_2026) / total_2026 * 100.0,
        "n_secciones_2026": sum(1 for e in merged if e["y2026"]),
        "n_secciones_2027": sum(1 for e in merged if e["y2027"]),
        "n_nuevas": sum(1 for e in merged if e["estado"] == "nueva_2027"),
        "n_eliminadas": sum(1 for e in merged if e["estado"] == "eliminada_2027"),
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))

    output = {
        "meta": {
            "generado": "2026-09-01",
            "unidad": "pesos colombianos (COP)",
            "fuentes": [
                {
                    "id": "pgn2027",
                    "titulo": "Proyecto de Ley del Presupuesto General de la Nación 2027 (articulado radicado, agosto de 2026)",
                    "detalle": "Presupuesto de Rentas y Ley de Apropiaciones por sección presupuestal. Total: $634,95 billones.",
                },
                {
                    "id": "pgn2026",
                    "titulo": "Ejecución Presupuestal del PGN 2026 - Información de Gastos, Datos Abiertos Colombia (Ministerio de Hacienda)",
                    "detalle": "Apropiación vigente por entidad, corte julio de 2026 (última disponible). Total: $555,82 billones.",
                    "url": "https://www.datos.gov.co/Hacienda-y-Cr-dito-P-blico/Informaci-n-de-Gastos-del-Presupuesto-General-de-l/5phs-yqfw",
                },
            ],
        },
        "summary": summary,
        "secciones": merged,
    }

    with open(DEST, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
    print("Escrito:", DEST)


if __name__ == "__main__":
    main()
