from __future__ import annotations
import argparse
import csv
import random
from dataclasses import dataclass
from pathlib import Path
from faker import Faker

ISO_TO_LOCALE = {
    # UE 27
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

# Extraemos los locales únicos del diccionario
UNIQUE_LOCALES = list(set(ISO_TO_LOCALE.values()))

# Inicializamos Faker con todos los locales europeos necesarios
fake = Faker(UNIQUE_LOCALES)

@dataclass(frozen=True)
class CityPoint:
    country: str
    region: str
    city: str
    lat: float
    lon: float
    population: int

# --- CONFIGURACIÓN TOPOLÓGICA Y DE NEGOCIO ---
INDUSTRY_CODES = ["C10", "C20", "C25", "C28", "G46", "H52", "J62", "M70"]
SIZE_BANDS = ["micro", "pyme", "mid", "enterprise"]
NODE_ROLES = ["SUPPLIER", "BUYER", "HYBRID"]
ROLE_WEIGHTS = [0.25, 0.25, 0.50]
SIZE_WEIGHTS = [0.40, 0.35, 0.20, 0.05]

# Set de acceso O(1) con los códigos ISO de los países objetivo (Espacio Europeo)
EU_ISO_CODES = {
    # UE 27
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH', 'NO', 
    'IS', 'LI', 'BA', 'AL', 'MC'
}

def load_eu_cities(csv_path: Path) -> tuple[list[CityPoint], list[int]]:
    """
    Carga el dataset geográfico y filtra estrictamente las ciudades europeas,
    extrayendo sus pesos poblacionales para mantener una topología Scale-Free espacial.
    """
    eu_cities = []
    eu_weights = []
    
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            iso = row["iso2"].upper()
            
            # Filtrado estricto en la ingesta del catálogo de ciudades
            if iso in EU_ISO_CODES:
                pop = int(float(row.get("population", 50000) or 50000))
                
                city = CityPoint(
                    country=iso,
                    region=row["admin_name"],
                    city=row["city"],
                    lat=float(row["lat"]),
                    lon=float(row["lng"]),
                    population=pop
                )
                
                eu_cities.append(city)
                eu_weights.append(pop)
                
    if not eu_cities:
        raise ValueError("No se encontraron ciudades europeas en el dataset proporcionado.")
        
    return eu_cities, eu_weights

def _baseline_revenue(size_band: str, rng: random.Random) -> float:
    """Calcula el volumen de facturación base según el estrato de la empresa."""
    ranges = {
        "micro": (50_000, 450_000),
        "pyme": (450_000, 8_000_000),
        "mid": (8_000_000, 80_000_000),
        "enterprise": (80_000_000, 600_000_000),
    }
    low, high = ranges[size_band]
    return round(rng.uniform(low, high), 2)

def synthesize_companies_csv(output_file: Path, cities_csv: Path, rows: int, seed: int) -> Path:
    if rows <= 0:
        raise ValueError("El número de filas debe ser > 0")

    rng = random.Random(seed)
    Faker.seed(seed)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Carga de la geografía (ahora garantizada 100% europea)
    cities, population_weights = load_eu_cities(cities_csv)

    fieldnames = [
        "company_id", "legal_name", "tax_id", "edi_endpoint", "node_role",
        "country", "region", "city", "latitude", "longitude",
        "industry_code", "size_band", "baseline_revenue", "created_at", "is_active",
    ]
    
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
                "company_id": f"COMP-{index:07d}",
                # AQUI ESTÁ LA MAGIA: Usamos fake[locale] en lugar de fake
                "legal_name": fake[locale].company(),
                "tax_id": f"{city_point.country}{rng.randint(10000000, 99999999)}",
                "edi_endpoint": f"as2://edi.comp-{index:07d}.b2b.local/inbox",
                "node_role": rng.choices(NODE_ROLES, weights=ROLE_WEIGHTS, k=1)[0],
                "country": city_point.country,
                "region": city_point.region,
                "city": city_point.city,
                "latitude": round(city_point.lat + rng.uniform(-0.01, 0.01), 6),
                "longitude": round(city_point.lon + rng.uniform(-0.01, 0.01), 6),
                "industry_code": rng.choice(INDUSTRY_CODES),
                "size_band": size_band,
                "baseline_revenue": _baseline_revenue(size_band, rng),
                "created_at": fake[locale].date_time_between(start_date='-8y', end_date='now').isoformat(),
                "is_active": rng.choices([True, False], weights=[0.95, 0.05], k=1)[0],
            }
            writer.writerow(record)

    return output_file

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generador sintético para companies.csv (Red 100% Europea)")
    parser.add_argument("--rows", type=int, default=1000, help="Número de empresas a sintetizar")
    parser.add_argument("--seed", type=int, default=42, help="Semilla reproducible")
    parser.add_argument("--output", type=str, default="data/synthetic/companies.csv", help="Ruta de salida del CSV de companies")
    return parser

def main() -> None:
    args = build_parser().parse_args()
    target = Path(args.output)
    cities_source = Path("data/raw/worldcities.csv")
    result = synthesize_companies_csv(target, cities_source, rows=args.rows, seed=args.seed)
    print(f"[OK] {args.rows} empresas europeas sintetizadas -> {result}")

if __name__ == "__main__":
    main()