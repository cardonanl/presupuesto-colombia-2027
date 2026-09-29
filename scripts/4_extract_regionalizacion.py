# -*- coding: utf-8 -*-
"""
Extrae del "Libro de Regionalización Inicial PGN Inversión 2027" (DNP,
16-sep-2026) la distribución del presupuesto de INVERSIÓN 2027 por
departamento, y arma data/regionalizacion.json para el sitio.

Fuente: libroregionalizacion2027_inicial(16092026).pdf (403 páginas).
Solo cubre el componente de INVERSIÓN del PGN 2027 ($86,96 billones), que es
un subconjunto de los $634,95 billones totales que usa el resto del sitio
(funcionamiento + deuda + inversión). No existe un documento equivalente
para 2026, así que esta vista es exclusiva de 2027 -- no hay comparación
2026 vs 2027 aquí.

Cada departamento tiene su "ficha" en una página fija del PDF (una tabla de
contenido la referencia); esa página trae población, %NBI, presupuesto,
inversión per cápita y el top de sectores. Los totales por región y por
categoría se tomaron directamente del libro (págs. 19-20) y se validaron
sumando los 33 departamentos por región: coincide al peso con las cifras
oficiales (ver scripts/4b_validate_regionalizacion.py si se quiere repetir
la validación).

Uso: python scripts/4_extract_regionalizacion.py
Requiere: pip install pypdf
"""
import json
import os
import re

import pypdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "libroregionalizacion2027_inicial(16092026).pdf")
DEST = os.path.join(ROOT, "data", "regionalizacion.json")

# (nombre, pagina_pie_de_documento) -- la pagina real del PDF es esa + 1
# (portada + hoja de creditos desfasan la numeracion en exactamente 1).
DEPARTAMENTOS = [
    ("Amazonas", 23), ("Antioquia", 32), ("Arauca", 46), ("Atlántico", 56),
    ("Bogotá D.C.", 67), ("Bolívar", 79), ("Boyacá", 91), ("Caldas", 103),
    ("Caquetá", 114), ("Casanare", 124), ("Cauca", 133), ("Cesar", 147),
    ("Chocó", 159), ("Córdoba", 171), ("Cundinamarca", 183), ("Guainía", 197),
    ("Guaviare", 206), ("Huila", 215), ("La Guajira", 228), ("Magdalena", 239),
    ("Meta", 250), ("Nariño", 262), ("Norte de Santander", 276), ("Putumayo", 289),
    ("Quindío", 301), ("Risaralda", 311),
    ("Archipiélago de San Andrés, Providencia", 323),
    ("Santander", 332), ("Sucre", 345), ("Tolima", 357), ("Valle del Cauca", 369),
    ("Vaupés", 383), ("Vichada", 391),
]

REGIONES = {
    "Amazonas": "Amazonía", "Caquetá": "Amazonía", "Guainía": "Amazonía",
    "Guaviare": "Amazonía", "Putumayo": "Amazonía", "Vaupés": "Amazonía",
    "Bogotá D.C.": "Bogotá D.C.",
    "Atlántico": "Caribe", "Bolívar": "Caribe", "Cesar": "Caribe", "Córdoba": "Caribe",
    "La Guajira": "Caribe", "Magdalena": "Caribe", "Sucre": "Caribe",
    "Archipiélago de San Andrés, Providencia": "Insular",
    "Antioquia": "Andina", "Boyacá": "Andina", "Caldas": "Andina", "Cundinamarca": "Andina",
    "Huila": "Andina", "Norte de Santander": "Andina", "Quindío": "Andina",
    "Risaralda": "Andina", "Santander": "Andina", "Tolima": "Andina",
    "Cauca": "Pacífico", "Chocó": "Pacífico", "Nariño": "Pacífico", "Valle del Cauca": "Pacífico",
    "Arauca": "Orinoquía", "Casanare": "Orinoquía", "Meta": "Orinoquía", "Vichada": "Orinoquía",
}

# Tomado directamente del libro (Cuadro pag. 19 y pag. 20). Cifras en
# millones de pesos. Validado: la suma de los 33 departamentos por region
# cuadra exacto con estos totales.
CATEGORIAS = [
    {"categoria": "Regionalizado", "mill": 63815482, "pct": 73.4},
    {"categoria": "Nacional", "mill": 21955684, "pct": 25.2},
    {"categoria": "Por Regionalizar", "mill": 1188656, "pct": 1.4},
]
TOTAL_INVERSION_MILL = 86959823

REGIONES_TOTAL = [
    {"region": "Andina", "mill": 22268064, "pct": 25.6},
    {"region": "Caribe", "mill": 15791167, "pct": 18.2},
    {"region": "Pacífico", "mill": 10789248, "pct": 12.4},
    {"region": "Bogotá D.C.", "mill": 8983397, "pct": 10.3},
    {"region": "Amazonía", "mill": 2924430, "pct": 3.4},
    {"region": "Orinoquía", "mill": 2749617, "pct": 3.2},
    {"region": "Insular", "mill": 309559, "pct": 0.4},
]


def to_num(s):
    return float(s.replace(".", "").replace(",", "."))


def extract_departamento(reader, nombre, doc_page):
    text = (reader.pages[doc_page].extract_text() or "")
    text = re.sub(r"[ \t]+", " ", text)

    entry = {"nombre": nombre, "region": REGIONES[nombre]}

    m = re.search(r"Población\s+([\d.,]+)", text)
    entry["poblacion"] = int(to_num(m.group(1))) if m else None

    m = re.search(r"%\s*NBI\s*\(DANE\)\s*([\d.,]+)", text)
    entry["nbi_pct"] = to_num(m.group(1)) if m else None

    m = re.search(r"Presupuesto Inversión\s*202\s*7\s*\(Mill\s*pesos\)\s*([\d.,]+)", text, re.DOTALL)
    entry["presupuesto_2027_mill"] = to_num(m.group(1)) if m else None

    m = re.search(r"Recursos Per Cápita\s*202\s*7\s*\(Mill pesos\)\s*([\d.,]+)", text, re.DOTALL)
    entry["per_capita_mill"] = to_num(m.group(1)) if m else None

    m = re.search(r"Sector % Sectorial(.*?)Resto\s*([\d.,]+)%", text, re.DOTALL)
    sectores = []
    if m:
        for line in m.group(1).strip().split("\n"):
            line = line.strip()
            sm = re.match(r"^(.*?)\s+([\d.,]+)%$", line)
            if sm:
                sectores.append({"sector": sm.group(1).strip(), "pct": to_num(sm.group(2))})
        sectores.append({"sector": "Resto", "pct": to_num(m.group(2))})
    entry["sectores"] = sectores
    return entry


def main():
    reader = pypdf.PdfReader(SRC)
    departamentos = [extract_departamento(reader, nombre, doc_page) for nombre, doc_page in DEPARTAMENTOS]

    for d in departamentos:
        for campo in ("poblacion", "presupuesto_2027_mill", "per_capita_mill"):
            if d[campo] is None:
                raise ValueError(f"No se pudo extraer '{campo}' para {d['nombre']}; revisar el PDF/regex.")

    suma_departamentos = sum(d["presupuesto_2027_mill"] for d in departamentos)
    print(f"Departamentos: {len(departamentos)}")
    print(f"Suma presupuesto departamentos (mill): {suma_departamentos:.0f}")
    print(f"Categoria 'Regionalizado' oficial (mill): {CATEGORIAS[0]['mill']}")

    departamentos.sort(key=lambda d: -d["presupuesto_2027_mill"])

    output = {
        "meta": {
            "fuente": "Regionalización inicial PGN Inversión 2027 (Preliminar e indicativa), DNP, 16 de septiembre de 2026",
            "nota": "Cubre solo el componente de INVERSIÓN del PGN 2027 ($86,96 billones de $634,95 billones totales). Cifras preliminares e indicativas, sujetas a la ejecución real durante 2027. No existe un libro de regionalización equivalente para 2026 con el que comparar.",
            "unidad": "millones de pesos salvo donde se indique",
        },
        "total_inversion_mill": TOTAL_INVERSION_MILL,
        "categorias": CATEGORIAS,
        "regiones": REGIONES_TOTAL,
        "departamentos": departamentos,
    }

    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    with open(DEST, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))
    print("Escrito:", DEST)


if __name__ == "__main__":
    main()
