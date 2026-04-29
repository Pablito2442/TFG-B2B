from __future__ import annotations
import argparse
import csv
import random
from dataclasses import dataclass
from datetime import timezone
from pathlib import Path
from faker import Faker
from src.backend.generation.csv_templates import CSV_SCHEMAS

# =============================================================================
# CABECERA (Configuración y Modelos)
# =============================================================================
INDUSTRY_CODES = ["C10","C13", "C20", "C22", "C25", "C26", 
                  "C28", "C29", "G46", "H52", "J62", "M71"] # Estándar NACE Rev. 2
SIZE_BANDS = ["micro", "pyme", "mid", "enterprise"]
NODE_ROLES = ["SUPPLIER", "BUYER", "HYBRID"]
GEO_JITTER_DEG = 0.015
fake = Faker("es_ES")


@dataclass(frozen=True) # Hace que la clase sea inmutable.
class MunicipalityPoint:
    """Punto geográfico de un municipio español, con su población para ponderar la topología."""
    province: str
    municipality: str
    lat: float      
    lon: float      
    population: int


@dataclass(frozen=True)
class LFRProfile:
    """Perfil latente LFR para condicionar atributos de cada empresa."""
    community_id: int
    anchor_province: str      # Provincia de anclaje para sesgar la ubicación geográfica de la empresa dentro de su comunidad.
    preferred_industries: tuple[str, ...]
    degree_propensity: float
    mixing_mu: float


# =============================================================================
# INTERFAZ PÚBLICA (CLI)
# =============================================================================
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


# =============================================================================
# FUNCIÓN PRINCIPAL (MAIN)
# =============================================================================
def synthesize_companies_csv(output_file: Path, cities_csv: Path, rows: int, seed: int, 
                             gamma: float, beta: float, mu: float, min_comm: int, max_comm: int) -> Path:
    """Función principal que genera el archivo CSV final de empresas (companies.csv)."""
    if rows <= 0: raise ValueError("El número de filas debe ser > 0")
    if gamma <= 1.0: raise ValueError("gamma (distribución de grados) debe ser > 1.0")
    if beta <= 1.0: raise ValueError("beta (distribución de comunidades) debe ser > 1.0")
    if not (0 <= mu <= 1): raise ValueError("mu (mixing parameter) debe estar entre 0.0 y 1.0")
    if min_comm <= 0: raise ValueError("min_community debe ser mayor que 0")
    if min_comm > max_comm: raise ValueError("min_community no puede ser mayor que max_community")

    # Inicializacion de motores aleatorios (estándar y el de Faker) con la semilla
    rng = random.Random(seed)
    Faker.seed(seed)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Carga de datos geográficos de municipios y generación de perfiles LFR
    municipalities, municipality_weights = load_municipalities(cities_csv)
    profiles = _build_lfr_profiles(
        rows=rows, municipalities=municipalities, municipality_weights=municipality_weights, rng=rng,
        gamma=gamma, beta=beta, mu=mu, min_comm=min_comm, max_comm=max_comm
    )

    cities_by_province: dict[str, list[MunicipalityPoint]] = {}
    weights_by_province: dict[str, list[int]] = {} 

    for municipality in municipalities:
        cities_by_province.setdefault(municipality.province, []).append(municipality)
        
    for prov, cities_list in cities_by_province.items():
        weights_by_province[prov] = [max(point.population, 1) for point in cities_list]
        
    fieldnames = CSV_SCHEMAS["companies.csv"]
    
    used_tax_ids = set()
    
    # Creación y escritura del CSV, generando cada fila con datos sintéticos realistas
    with output_file.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for index in range(1, rows + 1):
            # Aplicamos un perfil latente LFR para sesgar atributos de empresa.
            profile = profiles[index - 1]
            if rng.random() > profile.mixing_mu and profile.anchor_province in cities_by_province:
                province_cities = cities_by_province[profile.anchor_province]
                province_weights = weights_by_province[profile.anchor_province]
                city_point = rng.choices(province_cities, weights=province_weights, k=1)[0]
            else:
                city_point = rng.choices(municipalities, weights=municipality_weights, k=1)[0]

            # El tamaño de la empresa se sesga el grado esperado del nodo en la red.
            size_band = _size_band_from_lfr(profile.degree_propensity, rng)
            
            # Generamos un ID de empresa único y un CIF (tax_id) asegurando la unicidad.
            company_id = f"COMP-{index:07d}"
            
            attempts = 0
            max_attempts = 50
            while attempts < max_attempts:
                cif_candidate = f"ES{fake.cif()}"
                if cif_candidate not in used_tax_ids:
                    used_tax_ids.add(cif_candidate)
                    break
                attempts += 1
            
            if attempts == max_attempts:
                cif_candidate = f"ESX{index:07d}"
                used_tax_ids.add(cif_candidate)
                
            record = {
                "company_id:ID(Company)": company_id,
                "legal_name:string": fake.company(),
                "tax_id:string": cif_candidate,
                "edi_endpoint:string": f"as2://edi.{company_id.lower()}.b2b.local/inbox",
                "node_role:string": _node_role_from_lfr(profile.degree_propensity, profile.mixing_mu, rng),
                "country:string": "ES",
                "region:string": city_point.province,
                "city:string": city_point.municipality,
                "latitude:float": round(city_point.lat + rng.uniform(-GEO_JITTER_DEG, GEO_JITTER_DEG), 6),
                "longitude:float": round(city_point.lon + rng.uniform(-GEO_JITTER_DEG, GEO_JITTER_DEG), 6),
                "industry_code:string": _industry_from_lfr(profile.preferred_industries, rng),
                "size_band:string": size_band,
                "baseline_revenue:float": _baseline_revenue(size_band, rng),
                "created_at:datetime": fake.date_time_between(start_date='-8y', end_date='now', tzinfo=timezone.utc).isoformat(),
                "is_active:boolean": rng.choices([True, False], weights=[0.95, 0.05], k=1)[0],
            }
            writer.writerow(record)

    return output_file


# =============================================================================
# LÓGICA DE ALTO NIVEL (FUNCIONES AUXILIARES PARA SINTETIZAR EMPRESAS)
# =============================================================================
def load_municipalities(csv_path: Path) -> tuple[list[MunicipalityPoint], list[int]]:
    """Carga el dataset geográfico de municipios extrayendo sus pesos poblacionales."""
    municipalities = []
    municipality_weights = []
    
    # Apertura del CSV con manejo de codificación y delimitador.
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            province = (row.get("Provincia") or "").strip()
            municipality = (row.get("Población") or "").strip()
            
            if not municipality or not province:
                continue
            
            pop = _safe_int(row.get("Habitantes"), 50_000)
            
            mun = MunicipalityPoint(
                province=province,
                municipality=municipality,
                lat=_safe_float(row.get("Latitud"), 0.0),
                lon=_safe_float(row.get("Longitud"), 0.0),
                population=pop
            )
            
            municipalities.append(mun)
            municipality_weights.append(pop)
                
    if not municipalities:
        raise ValueError("No se encontraron municipios válidos en el dataset proporcionado.")
        
    return municipalities, municipality_weights


def _build_lfr_profiles(rows: int, municipalities: list[MunicipalityPoint], municipality_weights: list[int], rng: random.Random, 
                        gamma: float, beta: float, mu: float, min_comm: int, max_comm: int) -> list[LFRProfile]:
    """Construye perfiles LFR latentes para todas las empresas a sintetizar."""
    community_sizes = _sample_community_sizes(beta, min_comm, max_comm, rows, rng)
    community_sizes.sort(reverse=True)
    most_populated_province = _get_most_populated_province(municipalities)
    
    profiles: list[LFRProfile] = []
    community_id = 1
    
    # Para cada comunidad, asignamos una provincia ancla y preferencia industrial.
    for idx, size in enumerate(community_sizes):
        if idx == 0:
            anchor_province = most_populated_province
        else:
            anchor_province = rng.choices(municipalities, weights=municipality_weights, k=1)[0].province
            
        preferred_size = min(3, len(INDUSTRY_CODES))
        preferred_industries = tuple(rng.sample(INDUSTRY_CODES, k=preferred_size))
        
        for _ in range(size):
            profiles.append(
                LFRProfile(
                    community_id=community_id,
                    anchor_province=anchor_province,
                    preferred_industries=preferred_industries,
                    degree_propensity=_sample_degree_propensity(gamma, rng),
                    mixing_mu=_sample_mixing_mu(mu, rng),
                )
            )
        community_id += 1
    
    # Mezclamos los perfiles para romper cualquier ordenamiento residual.
    rng.shuffle(profiles)
    return profiles


# =============================================================================
# FUNCIONES AUXILIARES (Helpers / Utils)
# =============================================================================
def _size_band_from_lfr(degree_propensity: float, rng: random.Random) -> str:
    """Sesga la categoría de size_band según la jerarquía de grado del nodo en la red."""
    if degree_propensity >= 10: 
        weights = [0.10, 0.25, 0.40, 0.25] # Nodos con grado altos suelen ser medianas o grandes empresas.
    elif degree_propensity >= 4:
        weights = [0.25, 0.40, 0.25, 0.10] # Nodos con grado medio suelen ser pymes o medianas.
    else:
        weights = [0.55, 0.30, 0.12, 0.03] # Nodos con bajo grado suelen ser microempresas o pymes.
    return rng.choices(SIZE_BANDS, weights=weights, k=1)[0]


def _node_role_from_lfr(degree_propensity: float, mixing_mu: float, rng: random.Random) -> str:
    """Asigna el rol operativo (SUPPLIER, BUYER, HYBRID) sesgado por la importancia del nodo."""
    if degree_propensity >= 8: 
        weights = [0.10, 0.10, 0.80] # Nodos con alto grado tienden a ser hibridos.
    elif mixing_mu >= 0.5: 
        weights = [0.20, 0.40, 0.40] # Nodos con mu alto tienden a ser compradores o híbridos.
    else:
        weights = [0.25, 0.25, 0.50] # Nodos con mu bajo tienden a ser proveedores o híbridos.
        
    return rng.choices(NODE_ROLES, weights=weights, k=1)[0]


def _industry_from_lfr(preferred_industries: tuple[str, ...], rng: random.Random) -> str:
    """Asigna la industria haciendo que las preferidas del clúster sean 4 veces más probables."""
    weights = [4.0 if code in preferred_industries else 1.0 for code in INDUSTRY_CODES]
    return rng.choices(INDUSTRY_CODES, weights=weights, k=1)[0]


def _baseline_revenue(size_band: str, rng: random.Random) -> float:
    """Asigna ingresos anuales (baseline_revenue) coherentes con el tamaño de la empresa."""
    ranges = {
            "micro": (30_000, 600_000),
            "pyme": (600_000, 4_000_000),
            "mid": (4_000_000, 30_000_000),
            "enterprise": (30_000_000, 200_000_000),
    }
    low, high = ranges[size_band]
    return round(rng.uniform(low, high), 2)


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


def _get_most_populated_province(municipalities: list[MunicipalityPoint]) -> str:
    """Calcula la provincia con mayor población AGREGADA."""
    pop_by_province = {}
    for mun in municipalities:
        pop_by_province[mun.province] = pop_by_province.get(mun.province, 0) + mun.population
    
    # Devuelve el nombre de la provincia con la suma total más alta
    return max(pop_by_province.items(), key=lambda x: x[1])[0]


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


def _safe_float(val: str | None, default: float = 0.0) -> float:
    """Convierte un valor a float de forma segura, con manejo de comas y valores faltantes."""
    if not val:
        return default
    try:
        return float(str(val).strip().replace(",", "."))
    except ValueError:
        return default


def _safe_int(val: str | None, default: int = 50_000) -> int:
    """Convierte un valor a int de forma segura, con manejo de comas, puntos y valores faltantes."""
    if not val:
        return default
    try:
        cleaned_val = str(val).strip().replace(".", "").replace(",", ".")
        return int(float(cleaned_val))
    except ValueError:
        return default