from __future__ import annotations

import argparse
import csv
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
import logging         

# --- CONFIGURACIÓN DE NEGOCIO PARA ESTABLECER RELACIONES ---
CONTRACT_TYPES = ["FRAME", "SPOT", "ANNUAL", "MULTIYEAR"]
PAYMENT_TERMS = [15, 30, 45, 60, 90]
PAYMENT_TERMS_WEIGHTS = [0.05, 0.45, 0.25, 0.20, 0.05]
SIMULATION_TODAY = date(2026, 1, 1)  # Reemplaza con date.today()


# @dataclass para almacenar de forma inmutable la información esencial de las empresas.
@dataclass(frozen=True)
class CompanyRecord:
    company_id: str             
    node_role: str              
    region: str
    industry_code: str
    size_band: str
    baseline_revenue: float     
    created_at: date


def _safe_float(val: str | None, default: float = 1.0) -> float:
    """Convierte un valor a float de forma segura, con manejo de comas y valores faltantes."""
    if not val:
        return default
    try:
        return float(str(val).strip().replace(",", "."))
    except ValueError:
        return default


def _parse_created_at(raw_date: str | None) -> date:
    """Parsea la fecha de creación de la empresa desde el CSV."""
    if raw_date and raw_date.strip():
        value = raw_date.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            pass
            
    # Fallback de seguridad con 5 años de antigüedad
    return SIMULATION_TODAY - timedelta(days=365 * 5)


def load_companies(companies_csv: Path) -> list[CompanyRecord]:
    """Carga del listado de empresas generadas previamente en companies.csv."""
    if not companies_csv.exists():
        raise FileNotFoundError(f"No existe el fichero de companies: {companies_csv}")

    # Apertura del CSV original de empresas
    companies: list[CompanyRecord] = []
    with companies_csv.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        # Extraemos solo los campos del .csv
        for row in reader:
            company_id = (row.get("company_id") or "").strip()
            node_role = (row.get("node_role") or "").strip().upper()
            company_created_at = _parse_created_at(row.get("created_at"))
            
            if not company_id:
                continue
            if node_role not in {"SUPPLIER", "BUYER", "HYBRID"}:
                node_role = "HYBRID"
            
            # Creacion del objeto inmutable
            companies.append(
                CompanyRecord(
                    company_id=company_id,
                    node_role=node_role,
                    region=(row.get("region") or "").strip() or "UNKNOWN",
                    industry_code=(row.get("industry_code") or "").strip() or "UNKNOWN",
                    size_band=(row.get("size_band") or "").strip() or "micro",
                    baseline_revenue=max(_safe_float(row.get("baseline_revenue"), 1.0), 1.0),
                    created_at=company_created_at,
                )
            )

    if not companies:
        raise ValueError("companies.csv no contiene registros válidos")

    return companies


def _random_since_date(rng: random.Random, start_date: date) -> str:
    """Generación de fecha inicio de relación comercial lógica."""
    if start_date >= SIMULATION_TODAY:
        return SIMULATION_TODAY.isoformat()
        
    offset = rng.randint(0, (SIMULATION_TODAY - start_date).days)
    return (SIMULATION_TODAY - timedelta(days=offset)).isoformat()


def synthesize_rel_supplies_csv(output_file: Path, companies_csv: Path, avg_out_degree: int, mu: float, seed: int) -> Path:
    """Orquesta la generación de relaciones comerciales respetando la topología LFR y las escribe en un CSV."""
    if avg_out_degree <= 0: raise ValueError("avg_out_degree debe ser > 0")
    if not (0.0 <= mu <= 1.0): raise ValueError("El parámetro de mezcla 'mu' debe estar entre 0.0 y 1.0")

    rng = random.Random(seed)
    companies = load_companies(companies_csv)
    
    # Generación matemática de la topología del grafo
    edges = _generate_topology_edges(companies, avg_out_degree, mu, rng)
    
    # Generación de los atributos de negocio y escritura a disco
    _write_supplies_to_csv(output_file, edges, companies, rng)

    return output_file


def _build_community_structures(companies: list[CompanyRecord]) -> tuple[dict, list, list, list]:
    """Agrupa las empresas en comunidades latentes y devuelve las estructuras necesarias."""
    community_buckets: dict[tuple[str, str], dict[str, list[CompanyRecord]]] = {}
    total_list_suppliers: list[CompanyRecord] = []
    total_list_buyers: list[CompanyRecord] = []
    
    for company in companies:
        role_is_supplier = company.node_role in {"SUPPLIER", "HYBRID"}
        role_is_buyer = company.node_role in {"BUYER", "HYBRID"}

        if role_is_supplier:
            total_list_suppliers.append(company)
        if role_is_buyer:
            total_list_buyers.append(company)

        # OR: cada empresa se añade a 3 comunidades independientes.
        keys = [
            ("region", company.region),
            ("industry", company.industry_code),
            # ("size", company.size_band),
        ]
        for key in keys:
            bucket = community_buckets.setdefault(key, {"suppliers": [], "buyers": []})
            if role_is_supplier:
                bucket["suppliers"].append(company)
            if role_is_buyer:
                bucket["buyers"].append(company)

    if not total_list_suppliers or not total_list_buyers:
        raise ValueError("No hay suficientes empresas con roles válidos para generar relaciones.")

    # Filtrado de comunidades válidas (con al menos un proveedor y un comprador)
    def _is_valid_bucket(bucket: dict[str, list[CompanyRecord]]) -> bool:
        supplier_ids = {c.company_id for c in bucket["suppliers"]}
        buyer_ids = {c.company_id for c in bucket["buyers"]}
        
        if not supplier_ids or not buyer_ids:
            return False
            
        # Si hay un único proveedor y un único comprador y SON EL MISMO, es inválido (bucle). En caso contrario, es válido.
        if len(supplier_ids) == 1 and len(buyer_ids) == 1 and supplier_ids == buyer_ids:
            return False
            
        return True

    community_keys = [
        key for key, bucket in community_buckets.items()
        if _is_valid_bucket(bucket)
    ]
    if not community_keys:
        raise ValueError("No hay comunidades válidas para generar relaciones SUPPLIES")

    return community_buckets, total_list_suppliers, total_list_buyers, community_keys


def _generate_topology_edges(companies: list[CompanyRecord], avg_out_degree: int, mu: float, rng: random.Random) -> set[tuple[str, str]]:
    """Calcula las conexiones del grafo usando Scale-Free adaptado a comunidades LFR."""
    
    # Preparación de estructuras
    community_buckets, suppliers, buyers, community_keys = _build_community_structures(companies)
    
    max_possible_edges = len(suppliers) * len(buyers)
    
    if max_possible_edges == 0:
        raise ValueError("No hay suficientes proveedores o compradores para generar aristas (necesitas mínimo 1 de cada rol)")
    
    target_edges = max(len(companies), len(suppliers) * avg_out_degree)
    
    if target_edges > max_possible_edges:
        target_edges = max_possible_edges
        saturation_ratio = (len(suppliers) * avg_out_degree) / max_possible_edges
        logging.warning(f"[Graph Saturation] El grado medio solicitado es inalcanzable ({saturation_ratio*100:.1f}%). Limitando target_edges a {target_edges} (máximo posible).")
    
    edges: set[tuple[str, str]] = set()
    
    # Precalculamos los pesos de Preferential Attachment de todas las comunidades y roles
    pool_weights: dict[tuple[tuple[str, str], str], list[float]] = {}
    for key, bucket in community_buckets.items():
        pool_weights[(key, "suppliers")] = [max(1.0, math.sqrt(c.baseline_revenue)) for c in bucket["suppliers"]]
        pool_weights[(key, "buyers")] = [max(1.0, math.sqrt(c.baseline_revenue)) for c in bucket["buyers"]]

    # Precalculamos el peso total de cada comunidad para la ruleta de selección de comunidad
    comm_supplier_weights = [sum(pool_weights[(key, "suppliers")]) for key in community_keys]
    comm_buyer_weights = [sum(pool_weights[(key, "buyers")]) for key in community_keys]

    # Funciones Auxiliares súper rápidas
    def _pick_candidate(key: tuple[str, str], role: str) -> CompanyRecord:
        """Selecciona un candidato en O(1) leyendo el pre-cálculo."""
        pool = community_buckets[key][role]
        weights = pool_weights[(key, role)]
        return rng.choices(pool, weights=weights, k=1)[0]

    def _pick_community(role: str) -> tuple[str, str]:
        """Selecciona una comunidad en base al peso pre-calculado total de la misma."""
        w = comm_supplier_weights if role == "suppliers" else comm_buyer_weights
        return rng.choices(community_keys, weights=w, k=1)[0]

    # Generación de Aristas con Mezcla de Intra/Inter-Comunidad
    max_attempts = min(target_edges * 20, 1_000_000)  # Evitar loops infinitos extremos en redes saturadas
    attempts = 0
    
    while len(edges) < target_edges and attempts < max_attempts:
        attempts += 1
        
        # Mezcla LFR (Intra-comunidad vs Inter-comunidad)
        if rng.random() > mu:
            # Escogemos la comunidad basándonos en el peso de compradores como heurística
            community_key = _pick_community("buyers") 
            supplier = _pick_candidate(community_key, "suppliers")
            buyer = _pick_candidate(community_key, "buyers")
        else:
            supplier_community = _pick_community("suppliers")
            buyer_community = _pick_community("buyers")
            if buyer_community == supplier_community and len(community_keys) > 1:
                alternative = [key for key in community_keys if key != supplier_community]
                buyer_community = rng.choice(alternative)
            supplier = _pick_candidate(supplier_community, "suppliers")
            buyer = _pick_candidate(buyer_community, "buyers")

        if supplier.company_id == buyer.company_id:
            continue
        
        edge = (supplier.company_id, buyer.company_id)
        if edge in edges:
            continue
        
        edges.add(edge)
        
    if len(edges) < target_edges:
        achievement_ratio = (len(edges) / target_edges * 100) if target_edges > 0 else 0
        logging.warning(f"[Graph Saturation] Solo se alcanzaron {len(edges)}/{target_edges} aristas ({achievement_ratio:.1f}%). Máximo posible: {max_possible_edges}.")

    return edges
            
            
def _write_supplies_to_csv(output_file: Path, edges: set[tuple[str, str]], companies: list[CompanyRecord], rng: random.Random) -> None:
    """Enriquece las aristas con atributos comerciales basados en lógica de negocio real."""
    companies_dict = {c.company_id: c for c in companies}
    
    output_file.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "supplier_company_id", "buyer_company_id", "since_date",
        "lead_time_days", "reliability_score", "agreed_volume_baseline",
        "is_exclusive_supplier", "payment_terms_agreed", "contract_type",
    ]

    with output_file.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for supplier_id, buyer_id in sorted(edges):
            supplier_obj = companies_dict[supplier_id]
            buyer_obj = companies_dict[buyer_id]
            
            # Logica de generación de atributos basada en características de las empresas y su relación temporal
            earliest_possible_date = max(supplier_obj.created_at, buyer_obj.created_at)
        
            contract_type = rng.choice(CONTRACT_TYPES)
            
            min_revenue_in_edge = min(supplier_obj.baseline_revenue, buyer_obj.baseline_revenue)
            max_logical_volume = min_revenue_in_edge * 0.15 
            agreed_volume = round(rng.uniform(0.01, 1.0) * max_logical_volume, 2)
            
            if supplier_obj.industry_code in {"J62", "M71"}:
                lead_time = 0 # Servicios digitales/consultoría
            elif supplier_obj.region == buyer_obj.region:
                lead_time = rng.randint(1, 4)  # Misma Provincia
            else:
                lead_time = rng.randint(3, 10) # Tránsito Nacional
                
            if supplier_obj.size_band in {"enterprise", "mid"}:
                reliability = round(rng.uniform(0.94, 0.999), 4) 
            else:
                reliability = round(rng.uniform(0.80, 0.96), 4)
                
            is_exclusive = False
            if contract_type in {"FRAME", "MULTIYEAR"} and rng.random() > 0.85:
                # Un proveedor no puede ser exclusivo de un comprador si el comprador factura 100 veces más.
                if supplier_obj.baseline_revenue >= (buyer_obj.baseline_revenue * 0.10):
                    is_exclusive = True

            writer.writerow({
                "supplier_company_id": supplier_id,                                              
                "buyer_company_id": buyer_id,                                                    
                "since_date": _random_since_date(rng, earliest_possible_date),                  
                "lead_time_days": lead_time,                                           
                "reliability_score": reliability,                                                                                                   
                "agreed_volume_baseline": max(agreed_volume, 500.0),               
                "is_exclusive_supplier": is_exclusive,          
                "payment_terms_agreed": rng.choices(PAYMENT_TERMS, weights=PAYMENT_TERMS_WEIGHTS, k=1)[0],  
                "contract_type": contract_type,                                              
            })


def get_supplies_parser() -> argparse.ArgumentParser:
    """Contiene solo los argumentos exclusivos de este módulo."""
    parser = argparse.ArgumentParser(add_help=False)
    # Creamos un grupo visual
    group = parser.add_argument_group("Opciones de rel_supplies.csv")
    group.add_argument("--avg-degree-supplies", type=int, default=7, help="Grado medio de salida por proveedor", metavar="N")
    return parser
