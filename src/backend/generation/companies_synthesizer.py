from __future__ import annotations
import argparse
import csv
import random
from dataclasses import dataclass
from datetime import timezone
from pathlib import Path
from faker import Faker

# --- CONFIGURACIÓN TOPOLÓGICA Y DE NEGOCIO ---
# Estándar NACE Rev. 2
INDUSTRY_CODES = ["C10","C13", "C20", "C22", "C25", "C26", 
                  "C28", "C29", "G46", "H52", "J62", "M71"]

SIZE_BANDS = ["micro", "pyme", "mid", "enterprise"]

NODE_ROLES = ["SUPPLIER", "BUYER", "HYBRID"]

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

# Inializacion del generador de datos sintéticos Faker con los locales del diccionario
UNIQUE_LOCALES = list(set(ISO_TO_LOCALE.values()))
fake = Faker(UNIQUE_LOCALES)


@dataclass(frozen=True) # Hace que la clase sea inmutable.
class CityPoint:
    """Punto geográfico de una ciudad europea, con su población para ponderar la topología."""
    country: str    # Código de país
    region: str     
    city: str       
    lat: float      
    lon: float      
    population: int


@dataclass(frozen=True)
class LFRProfile:
    """Perfil latente LFR para condicionar atributos de cada empresa."""
    community_id: int
    anchor_country: str     # País de anclaje para sesgar la ubicación geográfica de la empresa dentro de su comunidad.
    preferred_industries: tuple[str, ...]
    degree_propensity: float
    mixing_mu: float


def load_cities(csv_path: Path) -> tuple[list[CityPoint], list[int]]:
    """
    Carga el dataset geográfico y filtrado estrictamente de las ciudades europeas,
    extrayendo sus pesos poblacionales para mantener una topología Scale-Free espacial.
    
    Retorna dos listas (del mismo tamaño):
        1. cities: Objetos CityPoint con la info de la ciudad.
        2. city_weights: La población de cada ciudad, que se usará luego como estadistica.
    """
    cities = []
    city_weights = []
    
    # Apertura del CSV con manejo de encoding y delimitadores estándar
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            population = int(float(row.get("population", 50000) or 50000))
            
            # Creación de un objeto CityPoint para almacenar la información
            city = CityPoint(
                country=row["iso2"].upper(),
                region=row["admin_name"],
                city=row["city"],
                lat=float(row["lat"]),
                lon=float(row["lng"]),
                population=population
            )
            
            cities.append(city)
            city_weights.append(population)
                
    # Validación para asegurar que se ha cargado .csv con ciudades europeas                
    if not cities:
        raise ValueError("No se encontraron ciudades europeas en el dataset proporcionado.")
        
    return cities, city_weights


def _sample_community_sizes(beta: float, min_comm: int, max_comm: int,rows: int, rng: random.Random) -> list[int]:
    """Genera tamaños de comunidad con distribución tipo power-law acotadas."""
    sizes: list[int] = []
    total = 0
    while total < rows:
        sampled = int(rng.paretovariate(beta - 1.0) * min_comm)
        size = max(min_comm, min(sampled, max_comm))
        if total + size > rows:
            size = rows - total
        sizes.append(size)
        total += size
    return sizes


def _sample_degree_propensity(gamma: float, rng: random.Random) -> float:
    """Calcula el grado esperado usando el gamma proporcionado."""
    alpha = max(gamma - 1.0, 1.05)
    # Distribución de pareto para sesgar hacia nodos con bajo grado
    return max(1.0, min(rng.paretovariate(alpha), 30.0)) 
    # Visualizacion aqui: https://www.wolframalpha.com/input?i=PDF+of+ParetoDistribution%5B1%2C+1.4%5D+from+1+to+10&lang=es


def _sample_mixing_mu(mu: float, rng: random.Random) -> float:
    """Genera la mezcla de comunidades alrededor de mu global, en [0.05, 0.95]."""
    concentration = 18.0
    a = max(mu * concentration, 0.1)
    b = max((1.0 - mu) * concentration, 0.1)
    # Distribución beta para sesgar con varianza controlada alrededor de LFR_MIXING_MU
    return round(max(0.05, min(rng.betavariate(a, b), 0.95)), 3)
    # Visualizacion aqui: https://www.wolframalpha.com/input?i=PDF+of+BetaDistribution%5B5.4%2C+12.6%5D+from+0+to+1&lang=es


def _size_band_from_lfr(degree_propensity: float, rng: random.Random) -> str:
    """Sesga la categoría de size_band según la jerarquía de grado del nodo en la red."""
    if degree_propensity >= 10:
        weights = [0.10, 0.25, 0.40, 0.25]
    elif degree_propensity >= 4:
        weights = [0.25, 0.40, 0.25, 0.10]
    else:
        weights = [0.55, 0.30, 0.12, 0.03]
    return rng.choices(SIZE_BANDS, weights=weights, k=1)[0]


def _baseline_revenue(size_band: str, rng: random.Random) -> float:
    """Asigna ingresos anuales (baseline_revenue) coherentes con el tamaño de la empresa."""
    ranges = {
            "micro": (50_000, 450_000),
            "pyme": (450_000, 8_000_000),
            "mid": (8_000_000, 80_000_000),
            "enterprise": (80_000_000, 600_000_000),
    }
    low, high = ranges[size_band]
    return round(rng.uniform(low, high), 2)


def _industry_from_lfr(preferred_industries: tuple[str, ...], rng: random.Random) -> str:
    """Asigna la industria haciendo que las preferidas del clúster sean 4 veces más probables."""
    weights = [4.0 if code in preferred_industries else 1.0 for code in INDUSTRY_CODES]
    return rng.choices(INDUSTRY_CODES, weights=weights, k=1)[0]


def _node_role_from_lfr(degree_propensity: float, mixing_mu: float, rng: random.Random) -> str:
    """Asigna el rol operativo (SUPPLIER, BUYER, HYBRID) sesgado por la importancia del nodo."""
    if degree_propensity >= 8: # Nodos con alto grado tienden a ser hibridos.
        weights = [0.10, 0.10, 0.80]
    elif mixing_mu >= 0.5: # Nodos con niveles alto de de comunidades tienden a ser compradores o híbridos.
        weights = [0.20, 0.40, 0.40] 
    else:
        weights = [0.25, 0.25, 0.50]
        
    return rng.choices(NODE_ROLES, weights=weights, k=1)[0]


def _build_lfr_profiles(rows: int, cities: list[CityPoint], population_weights: list[int], rng: random.Random, 
                        gamma: float, beta: float, mu: float, min_comm: int, max_comm: int) -> list[LFRProfile]:
    """Construye perfiles LFR latentes para todas las empresas a sintetizar."""
    community_sizes = _sample_community_sizes(beta, min_comm, max_comm, rows, rng)
    profiles: list[LFRProfile] = []
    community_id = 1
    for size in community_sizes:
        anchor_country = rng.choices(cities, weights=population_weights, k=1)[0].country
        preferred_size = min(3, len(INDUSTRY_CODES))
        preferred_industries = tuple(rng.sample(INDUSTRY_CODES, k=preferred_size))
        for _ in range(size):
            profiles.append(
                LFRProfile(
                    community_id=community_id,
                    anchor_country=anchor_country,
                    preferred_industries=preferred_industries,
                    degree_propensity=_sample_degree_propensity(gamma, rng),
                    mixing_mu=_sample_mixing_mu(mu, rng),
                )
            )
        community_id += 1

    rng.shuffle(profiles)
    return profiles


def synthesize_companies_csv(output_file: Path, cities_csv: Path, rows: int, seed: int, 
                             gamma: float, beta: float, mu: float, min_comm: int, max_comm: int) -> Path:
    """Función principal que genera el archivo CSV final de empresas (companies.csv)."""
    # Validación de parámetros de entrada para asegurar que se solicite una cantidad de filas razonable
    if rows <= 0:
        raise ValueError("El número de filas debe ser > 0")

    # Inicializacion de motores aleatorios (estándar y el de Faker) con la semilla
    rng = random.Random(seed)
    Faker.seed(seed)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Carga de datos geográficos de ciudades y generación de perfiles LFR
    cities, population_weights = load_cities(cities_csv)
    profiles = _build_lfr_profiles(
        rows=rows, cities=cities, population_weights=population_weights, rng=rng,
        gamma=gamma, beta=beta, mu=mu, min_comm=min_comm, max_comm=max_comm
    )

    cities_by_country: dict[str, list[CityPoint]] = {}
    for city in cities:
        cities_by_country.setdefault(city.country, []).append(city)

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
            # Aplicamos un perfil latente LFR para sesgar atributos de empresa.
            profile = profiles[index - 1]
            if rng.random() > profile.mixing_mu and profile.anchor_country in cities_by_country:
                country_cities = cities_by_country[profile.anchor_country]
                country_weights = [max(point.population, 1) for point in country_cities]
                city_point = rng.choices(country_cities, weights=country_weights, k=1)[0]
            else:
                city_point = rng.choices(cities, weights=population_weights, k=1)[0]

            size_band = _size_band_from_lfr(profile.degree_propensity, rng)
            
            # Buscamos el locale correspondiente al país, usando 'en_US' como fallback de seguridad
            locale = ISO_TO_LOCALE.get(city_point.country, 'en_US')
            
            record = {
                "company_id": f"COMP-{index:07d}",
                "legal_name": fake[locale].company(),
                "tax_id": f"{city_point.country}{rng.randint(10000000, 99999999)}",
                "edi_endpoint": f"as2://edi.comp-{index:07d}.b2b.local/inbox",
                "node_role": _node_role_from_lfr(profile.degree_propensity, profile.mixing_mu, rng),
                "country": city_point.country,
                "region": city_point.region,
                "city": city_point.city,
                "latitude": round(city_point.lat + rng.uniform(-0.01, 0.01), 6),
                "longitude": round(city_point.lon + rng.uniform(-0.01, 0.01), 6),
                "industry_code": _industry_from_lfr(profile.preferred_industries, rng),
                "size_band": size_band,
                "baseline_revenue": _baseline_revenue(size_band, rng),
                "created_at": fake[locale].date_time_between(start_date='-8y', end_date='now', tzinfo=timezone.utc).isoformat(),
                "is_active": rng.choices([True, False], weights=[0.95, 0.05], k=1)[0],
            }
            writer.writerow(record)

    return output_file


def get_companies_parser() -> argparse.ArgumentParser:
    """Contiene solo los argumentos exclusivos de este módulo."""
    parser = argparse.ArgumentParser(add_help=False)
    # Creamos un grupo visual
    group = parser.add_argument_group("Opciones de companies.csv")
    group.add_argument("--rows", type=int, default=200, help="Número de empresas a sintetizar", metavar="N")
    # Hiperparámetros LFR configurables
    group.add_argument("--gamma", type=float, default=2.4, help="Gamma: Exponente de la distribución de grados (Grado de nodos)", metavar="N")
    group.add_argument("--beta", type=float, default=1.8, help="Beta: Exponente de la distribución de tamaños de comunidad", metavar="N")
    group.add_argument("--mu", type=float, default=0.30, help="Mixing parameter (mu): Proporción de enlaces inter-comunidad", metavar="N")
    group.add_argument("--min-community", type=int, default=6, help="Tamaño mínimo de cada comunidad", metavar="N")
    group.add_argument("--max-community", type=int, default=45, help="Tamaño máximo de cada comunidad", metavar="N")
    return parser
