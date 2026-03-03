from __future__ import annotations
import argparse
import csv
import random
from dataclasses import dataclass
from pathlib import Path
from faker import Faker

# --- DICCIONARIO DE LOCALIZACIONES PARA GENERACIÓN REALISTA (FAKER) ---
ISO_TO_LOCALE = {
    'AT': 'de_AT', 'BE': 'nl_BE', 'BG': 'bg_BG', 'HR': 'hr_HR', 
    'CY': 'el_GR', 'CZ': 'cs_CZ', 'DK': 'da_DK', 'EE': 'et_EE', 
    'FI': 'fi_FI', 'FR': 'fr_FR', 'DE': 'de_DE', 'GR': 'el_GR', 
    'HU': 'hu_HU', 'IE': 'en_IE', 'IT': 'it_IT', 'LV': 'lv_LV', 
    'LT': 'lt_LT', 'LU': 'fr_FR', 'MT': 'en_GB', 'NL': 'nl_NL', 
    'PL': 'pl_PL', 'PT': 'pt_PT', 'RO': 'ro_RO', 'SK': 'sk_SK', 
    'SI': 'sl_SI', 'ES': 'es_ES', 'SE': 'sv_SE', 'GB': 'en_GB', 
    'CH': 'de_CH', 'NO': 'no_NO', 'IS': 'is_IS', 'LI': 'de_DE',
    'BA': 'bs_BA', 'AL': 'sq_AL', 'MC': 'fr_FR'
}

# --- PREPARACIÓN DE FAKER ---
# Creacion de una lista de locales únicos para inicializar Faker, evitando duplicados
UNIQUE_LOCALES = list(set(ISO_TO_LOCALE.values()))

# Inicializacion global en base a los locales únicos
fake = Faker(UNIQUE_LOCALES)

# --- ESTRUCTURA DE DATOS GEOGRÁFICOS ---
# @dataclass simplifica la creación de clases que solo almacenan datos.
# frozen=True hace que, una vez creado un punto (ciudad), sus datos no se puedan modificar.
@dataclass(frozen=True)
class CityPoint:
    country: str        # Código de país
    region: str         # Comunidad Autónoma, Estado, etc.
    city: str           # Nombre de la ciudad
    lat: float          # Latitud (coordenada GPS)
    lon: float          # Longitud (coordenada GPS)
    population: int     # Población (usada para ponderar la selección de ciudades)

# --- CONFIGURACIÓN TOPOLÓGICA Y DE NEGOCIO ---
# CAMBIAR O REVISAR: Codigos de industria para asignar a las empresas, asegurando diversidad sectorial
INDUSTRY_CODES = ["C10", "C20", "C25", "C28", "G46", "H52", "J62", "M70"]
# Bandas de tamaño para las empresas, con una distribución realista (más pymes que grandes empresas)
SIZE_BANDS = ["micro", "pyme", "mid", "enterprise"]
SIZE_WEIGHTS = [0.40, 0.35, 0.20, 0.05]
# Roles de nodo en la red, con una distribución que favorece a los híbridos para mayor conectividad
NODE_ROLES = ["SUPPLIER", "BUYER", "HYBRID"]
ROLE_WEIGHTS = [0.25, 0.25, 0.50]

# ISO codes de países europeos para filtrar el .csv mundial de ciudades
EU_ISO_CODES = {
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO', 
    'IS', 'LI', 'BA', 'AL', 'MC'
}

def load_eu_cities(csv_path: Path) -> tuple[list[CityPoint], list[int]]:
    """
    Carga el dataset geográfico y filtrado estrictamente de las ciudades europeas,
    extrayendo sus pesos poblacionales para mantener una topología Scale-Free espacial.
    
    Retorna dos listas (del mismo tamaño):
        1. eu_cities: Objetos CityPoint con la info de la ciudad.
        2. eu_weights: La población de cada ciudad, que se usará luego como estadistica.
    """
    eu_cities = []
    eu_weights = []
    
    # Apertura del CSV con manejo de encoding y delimitadores estándar
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            iso = row["iso2"].upper() # Extración del código de país de la fila actual
            
            # Filtrado estricto de solo ciudades europeas
            if iso in EU_ISO_CODES:
                population = int(float(row.get("population", 50000) or 50000))
                
                # Creación de un objeto CityPoint para almacenar la información
                city = CityPoint(
                    country=iso,
                    region=row["admin_name"],
                    city=row["city"],
                    lat=float(row["lat"]),
                    lon=float(row["lng"]),
                    population=population
                )
                
                eu_cities.append(city)
                eu_weights.append(population)
                
    # Validación para asegurar que se ha cargado .csv con ciudades europeas                
    if not eu_cities:
        raise ValueError("No se encontraron ciudades europeas en el dataset proporcionado.")
        
    return eu_cities, eu_weights

def _baseline_revenue(size_band: str, rng: random.Random) -> float:
    """
    Calculo de ingresos anuales aleatorios (baseline_revenue) para una empresa,
    asegurando que tenga sentido lógico según su tamaño (size_band).
    """
    ranges = {
            "micro": (50_000, 450_000),                 # Entre 50k y 450k
            "pyme": (450_000, 8_000_000),               # Entre 450k y 8M
            "mid": (8_000_000, 80_000_000),             # Entre 8M y 80M
            "enterprise": (80_000_000, 600_000_000),    # Entre 80M y 600M
    }
    low, high = ranges[size_band]
    # Generación de número aleatorio dentro del rango correspondiente al size_band, con dos decimales
    return round(rng.uniform(low, high), 2)

def synthesize_companies_csv(output_file: Path, cities_csv: Path, rows: int, seed: int) -> Path:
    """
    Función principal que genera el archivo CSV final de empresas (companies.csv).
    
    Retorna la ruta del archivo generado.
    """
    # Validación de parámetros de entrada para asegurar que se solicite una cantidad de filas razonable
    if rows <= 0:
        raise ValueError("El número de filas debe ser > 0")

    # Inicializacion de motores aleatorios (estándar y el de Faker) con la semilla
    rng = random.Random(seed)
    Faker.seed(seed)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Carga de datos geográficos de ciudades europeas y pesos de poblacionales
    cities, population_weights = load_eu_cities(cities_csv)

    # Definimos las columnas que tendrá nuestro CSV de salida
    fieldnames = [
        "company_id", "legal_name", "tax_id", "edi_endpoint", "node_role",
        "country", "region", "city", "latitude", "longitude",
        "industry_code", "size_band", "baseline_revenue", "created_at", "is_active",
    ]
    
    # Creación y escritura del CSV, generando cada fila con datos sintéticos realistas
    with output_file.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for index in range(1, rows + 1):
            # Selección de ciudad basada en densidad de población (Scale-Free geography)
            city_point = rng.choices(cities, weights=population_weights, k=1)[0]
            size_band = rng.choices(SIZE_BANDS, weights=SIZE_WEIGHTS, k=1)[0]
            
            # Buscamos el locale correspondiente al país, usando 'en_US' como fallback de seguridad
            locale = ISO_TO_LOCALE.get(city_point.country, 'en_US')
            
            record = {
                "company_id": f"COMP-{index:07d}",                                                          # ID único
                "legal_name": fake[locale].company(),                                                       # Nombre Compañia generado por Faker según el locale
                "tax_id": f"{city_point.country}{rng.randint(10000000, 99999999)}",                         # Identificador Fiscal
                "edi_endpoint": f"as2://edi.comp-{index:07d}.b2b.local/inbox",                              # Endpoint EDI ficticio
                "node_role": rng.choices(NODE_ROLES, weights=ROLE_WEIGHTS, k=1)[0],                         # Rol dentro de la red de distribución
                "country": city_point.country,                                                              # Código de país de la ciudad
                "region": city_point.region,                                                                # Región de la ciudad    
                "city": city_point.city,                                                                    # Nombre de la ciudad           
                "latitude": round(city_point.lat + rng.uniform(-0.01, 0.01), 6),                            # Latitud con variación aleatorias segun ciudad
                "longitude": round(city_point.lon + rng.uniform(-0.01, 0.01), 6),                           # Longitud con variación aleatorias segun ciudad
                "industry_code": rng.choice(INDUSTRY_CODES),                                                # CAMBIAR O REVISAR: Código de industria  
                "size_band": size_band,                                                                     # Clasificación de tamaño de empresa                 
                "baseline_revenue": _baseline_revenue(size_band, rng),                                      # Ingresos anuales basados en el size_band 
                "created_at": fake[locale].date_time_between(start_date='-8y', end_date='now').isoformat(), # Fecha de creación de la empresa
                "is_active": rng.choices([True, False], weights=[0.95, 0.05], k=1)[0],                      # Flag de actividad activa
            }
            writer.writerow(record)

    return output_file

def build_parser() -> argparse.ArgumentParser:
    """Configuracion de la línea de comandos para poder pasarle parámetros al ejecutar el script."""
    parser = argparse.ArgumentParser(description="Generador sintético para companies.csv")
    parser.add_argument("--rows", type=int, default=1000, help="Número de empresas a sintetizar")
    parser.add_argument("--seed", type=int, default=42, help="Semilla reproducible")
    parser.add_argument("--output", type=str, default="data/synthetic/companies.csv", help="Ruta de salida del CSV de companies")
    return parser

def main() -> None:
    """Punto de entrada del programa."""
    # Lectura de argumentos desde la línea de comandos
    args = build_parser().parse_args()
    
    # Llamada a la función principal para generación del CSV de empresas
    result = synthesize_companies_csv(
        output_file= Path(args.output),
        cities_csv=Path(args.cities),
        rows=args.rows, 
        seed=args.seed
    )
    print(f"[OK] {args.rows} empresas europeas sintetizadas -> {result}")

if __name__ == "__main__":
    main()