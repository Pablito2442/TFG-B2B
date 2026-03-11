from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

# @dataclass para almacenar de forma inmutable la información esencial de las empresas.
@dataclass(frozen=True)
class CompanyRecord:
    company_id: str             
    node_role: str              
    baseline_revenue: float     
    created_at: date          

# --- CONFIGURACIÓN DE NEGOCIO PARA CONTRATOS ---
CONTRACT_TYPES = ["FRAME", "SPOT", "ANNUAL", "MULTIYEAR"]
PAYMENT_TERMS = [15, 30, 45, 60, 90]
PAYMENT_TERMS_WEIGHTS = [0.05, 0.45, 0.25, 0.20, 0.05]


def load_companies(companies_csv: Path) -> list[CompanyRecord]:
    """
    Carga del listado de empresas generadas previamente en companies.csv.
    Parsea fechas, normaliza roles y maneja posibles errores en los datos fuente.
    """
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
            raw_date = row.get("created_at")
            if not company_id:
                continue
            if node_role not in {"SUPPLIER", "BUYER", "HYBRID"}:
                node_role = "HYBRID"
            if raw_date and raw_date.strip():
                try:
                    company_created_at = date.fromisoformat(raw_date.strip())
                except ValueError:
                    company_created_at = date.today() - timedelta(days=365 * 5)
            else:
                company_created_at = date.today() - timedelta(days=365 * 5)
            # Creacion del objeto inmutable
            companies.append(
                CompanyRecord(
                    company_id=company_id,
                    node_role=node_role,
                    baseline_revenue=max(float(row.get("baseline_revenue")), 1.0),
                    created_at=company_created_at,
                )
            )

    if not companies:
        raise ValueError("companies.csv no contiene registros válidos")

    return companies


def _random_since_date(rng: random.Random, start_date: date) -> str:
    """
    Generación de fecha inicio de relación comercial lógica.
    Garantiza que la relación comienza siempre en una fecha posterior 
    a la creación de las empresas involucradas (start_date) y antes de hoy.
    """
    today = date.today()
    if start_date >= today:
        return today.isoformat()
        
    offset = rng.randint(0, (today - start_date).days)
    return (today - timedelta(days=offset)).isoformat()


def synthesize_rel_supplies_csv(output_file: Path, companies_csv: Path, avg_out_degree: int, seed: int,) -> Path:
    """
    Generador de fecha de inicio de relación comercial lógica.
    Garantiza que la relación comienza en una fecha posterior 
    a la creación de las empresas involucradas (start_date) y antes de hoy.
    """
    if avg_out_degree <= 0:
        raise ValueError("avg_out_degree debe ser > 0")

    rng = random.Random(seed)
    companies = load_companies(companies_csv)
    companies_dict = {c.company_id: c for c in companies}   # Diccionario para acceso rápido a datos de empresas por ID

    # Listas de proveedores y compradores, filtrando por rol.
    suppliers = [company for company in companies if company.node_role in {"SUPPLIER", "HYBRID"}] 
    buyers = [company for company in companies if company.node_role in {"BUYER", "HYBRID"}]

    if not suppliers:
        raise ValueError("No hay empresas con rol SUPPLIER/HYBRID en companies.csv")
    if not buyers:
        raise ValueError("No hay empresas con rol BUYER/HYBRID en companies.csv")
    
    # Calculamos el número de relaciones a generar, basado en el número de empresas y el grado medio deseado.
    target_edges = max(len(companies), len(suppliers) * avg_out_degree)

    # Inicializamos estructuras para seguimiento de grados de salida/entrada y las aristas generadas.
    out_degree: dict[str, int] = {company.company_id: 0 for company in suppliers}
    in_degree: dict[str, int] = {company.company_id: 0 for company in buyers}
    edges: set[tuple[str, str]] = set()
    
    # Calculo de pesos base para cada empresa, que se actualizan solo cuando esa empresa participa en una nueva relación.
    supplier_base_weights = {
        c.company_id: 1.0 + (c.baseline_revenue / 100_000_000.0) 
        for c in suppliers
    }
    buyer_base_weights = {
        c.company_id: 1.0 + (c.baseline_revenue / 100_000_000.0) 
        for c in buyers
    }
    
    # Lista de pesos actualizados para cada empresa,
    supplier_weights = [supplier_base_weights[c.company_id] for c in suppliers]
    buyer_weights = [buyer_base_weights[c.company_id] for c in buyers]

    # Diccionario con índices para acceso rápido a los pesos de cada empresa
    supplier_idx = {c.company_id: i for i, c in enumerate(suppliers)}
    buyer_idx = {c.company_id: i for i, c in enumerate(buyers)}

    # Max_attempts para evitar loops infinitos en caso de que no se puedan generar más relaciones válidas.
    max_attempts = target_edges * 20
    attempts = 0
    while len(edges) < target_edges and attempts < max_attempts:
        attempts += 1

        # Selección de proveedor y comprador usando pesos
        supplier = rng.choices(suppliers, weights=supplier_weights, k=1)[0]
        buyer = rng.choices(buyers, weights=buyer_weights, k=1)[0]

        # Validaciones para asegurar relaciones lógicas         
        if supplier.company_id == buyer.company_id:
            continue
        
        # Creacion de tupla de arista para ver si ya existe
        edge = (supplier.company_id, buyer.company_id)
        if edge in edges:
            continue
        
        # Actualizacion de estructuras de seguimiento
        edges.add(edge)
        out_degree[supplier.company_id] += 1
        in_degree[buyer.company_id] += 1
        
        # Obtención de índices para actualización de pesos finales
        s_idx = supplier_idx[supplier.company_id]
        supplier_weights[s_idx] += supplier_base_weights[supplier.company_id]
        
        b_idx = buyer_idx[buyer.company_id]
        buyer_weights[b_idx] += buyer_base_weights[buyer.company_id]

    # Definición de las columnas que tendrá nuestro CSV de salida
    output_file.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "supplier_company_id", "buyer_company_id", "since_date",
        "lead_time_days", "reliability_score", "agreed_volume_baseline",
        "is_exclusive_supplier", "payment_terms_agreed", "contract_type",
    ]

    # Creación y escritura del CSV
    with output_file.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        # Iteración por cada relación generada
        for supplier_id, buyer_id in sorted(edges):
            
            supplier_obj = companies_dict[supplier_id]
            buyer_obj = companies_dict[buyer_id]
        
            earliest_possible_date = max(supplier_obj.created_at, buyer_obj.created_at)
            
            reliability = round(rng.uniform(0.82, 0.995), 4)
            writer.writerow(
                {
                    "supplier_company_id": supplier_id,                                                         
                    "buyer_company_id": buyer_id,                                                               
                    "since_date": _random_since_date(rng, earliest_possible_date),                              
                    "lead_time_days": rng.randint(2, 45),                                                       
                    "reliability_score": reliability,                                                           
                    "agreed_volume_baseline": round(rng.uniform(1_000, 250_000), 2),                            
                    "is_exclusive_supplier": rng.choices([True, False], weights=[0.12, 0.88], k=1)[0],          
                    "payment_terms_agreed": rng.choices(PAYMENT_TERMS, weights=PAYMENT_TERMS_WEIGHTS, k=1)[0],  
                    "contract_type": rng.choice(CONTRACT_TYPES),                                                
                }
            )

    return output_file


def get_supplies_parser() -> argparse.ArgumentParser:
    """Contiene solo los argumentos exclusivos de este módulo."""
    parser = argparse.ArgumentParser(add_help=False)
    # Creamos un grupo visual
    group = parser.add_argument_group("Opciones de rel_supplies.csv")
    group.add_argument("--avg-degree-supplies", type=int, default=3, help="Grado medio de salida por proveedor",)
    return parser


def build_parser() -> argparse.ArgumentParser:
    """
    Se usa solo cuando ejecutas este script de forma independiente.
    Junta los argumentos exclusivos heredados con los globales.
    """
    parser = argparse.ArgumentParser(
        description="Generador sintético para rel_supplies.csv",
        parents=[get_supplies_parser()] # Hereda --avg-out-degree
    )
    # Estos se quedan aquí para no colisionar con el pipeline principal
    parser.add_argument("--seed", type=int, default=42, help="Semilla reproducible")
    parser.add_argument("--output", type=str, default="data/synthetic/rel_supplies.csv", help="Ruta de salida de rel_supplies.csv",)
    parser.add_argument("--companies", type=str, default="data/synthetic/companies.csv", help="Ruta del CSV companies.csv",)
    return parser


def main() -> None:
    """Punto de entrada del programa."""
    # Lectura de argumentos desde la línea de comandos
    args = build_parser().parse_args()
    
    # Llamada a la función principal para generación del CSV de rel_supplies
    result = synthesize_rel_supplies_csv(
        output_file=Path(args.output),
        companies_csv=Path(args.companies),
        avg_out_degree=args.avg_out_degree,
        seed=args.seed,
    )
    print(f"[OK] rel_supplies sintetizado -> {result}")


if __name__ == "__main__":
    main()
