from __future__ import annotations
from datetime import datetime, UTC
from pathlib import Path
import logging

from src.backend.config import Settings
from src.backend.utils import write_step_artifact
from src.backend.generation.csv_templates import create_csv_templates
from src.backend.generation.companies_synthesizer import synthesize_companies_csv
from src.backend.generation.documents_synthesizer import synthesize_documents_csv
from src.backend.generation.products_synthesizer import synthesize_products_csv
from src.backend.generation.rel_contains_synthesizer import synthesize_rel_contains_csv
from src.backend.generation.supplies_synthesizer import synthesize_rel_supplies_csv

def run_generate(settings: Settings, csv_target: str, rows: int, 
                 avg_degree_rel_supplies: int, avg_degree_documents: int, avg_degree_products: int,
                 gamma: float, beta: float, mu: float, 
                 min_comm: int, max_comm: int) -> Path:
    """
    Fase 1: Generación de datos sintéticos, con enfoque en la creación de CSVs con dependencias en cascada.
    """
    logging.info(f"[FASE 1] Generación Sintética iniciada. Target: '{csv_target}'")
    logging.info(f"         LFR Params: Seed={settings.seed}, \u03B3={gamma}, \u03B2={beta}, \u03BC={mu}")
    logging.info(f"         Dimensión: {rows} Empresas | Comunidades: [{min_comm}, {max_comm}]")
    logging.info(f"         Topología (Out-Degree Avg): Sup={avg_degree_rel_supplies}, Prod={avg_degree_products}, Doc={avg_degree_documents}")
    
    # Creación de los CSVs para el target indicado (puede ser "all" o un CSV específico)
    created_csvs = create_csv_templates(settings.data_synthetic_dir, csv_target)
    orden_estricto = {
        "companies.csv": 1,
        "rel_supplies.csv": 2,
        "products.csv": 3,
        "documents.csv": 4,
        "rel_contains.csv": 5,
    }
    # Reordenacion de la lista para cumplir las dependencias en cascada.
    created_csvs.sort(key=lambda path: orden_estricto.get(path.name, 99))
    
    # Parametrización de filas generadas para cada CSV
    companies_rows = 0
    products_rows = 0
    rel_supplies_rows = 0
    documents_rows = 0
    rel_contains_rows = 0
    cities_csv_path = settings.data_raw_dir / "municipios_espana.csv"
    companies_csv_path = settings.data_synthetic_dir / "companies.csv"
    rel_supplies_csv_path = settings.data_synthetic_dir / "rel_supplies.csv"
    products_csv_path = settings.data_synthetic_dir / "products.csv"
    documents_csv_path = settings.data_synthetic_dir / "documents.csv"

    # Iteración sobre los archivos que el usuario ha solicitado generar
    for csv_path in created_csvs:
        if csv_path.name == "companies.csv":
            synthesize_companies_csv(
                output_file=csv_path,
                cities_csv=cities_csv_path,
                rows=rows,
                seed=settings.seed,
                gamma=gamma,
                beta=beta,
                mu=mu,
                min_comm=min_comm,
                max_comm=max_comm
            )
            companies_rows = rows
        if csv_path.name == "rel_supplies.csv":
            result_path = synthesize_rel_supplies_csv(
                output_file=csv_path,
                companies_csv=companies_csv_path,
                avg_out_degree=avg_degree_rel_supplies,
                mu=mu,
                seed=settings.seed,
            )
            with result_path.open("r", encoding="utf-8", newline="") as csv_file:
                rel_supplies_rows = max(sum(1 for _ in csv_file) - 1, 0)
        if csv_path.name == "products.csv":
            result_path = synthesize_products_csv(
                output_file=csv_path,
                companies_csv=companies_csv_path,
                rel_supplies_csv=rel_supplies_csv_path,
                avg_degree_products=avg_degree_products,
                seed=settings.seed,
            )
            with result_path.open("r", encoding="utf-8", newline="") as csv_file:
                products_rows = max(sum(1 for _ in csv_file) - 1, 0)
        if csv_path.name == "documents.csv":
            result_path = synthesize_documents_csv(
                output_file=csv_path,
                companies_csv=companies_csv_path,
                rel_supplies_csv=rel_supplies_csv_path,
                seed=settings.seed,
                avg_out_degree=avg_degree_documents,
            )
            with result_path.open("r", encoding="utf-8", newline="") as csv_file:
                documents_rows = max(sum(1 for _ in csv_file) - 1, 0)
        if csv_path.name == "rel_contains.csv":
            result_path = synthesize_rel_contains_csv(
                output_file=csv_path,
                documents_csv=documents_csv_path,
                products_csv=products_csv_path,
                seed=settings.seed,
            )
            with result_path.open("r", encoding="utf-8", newline="") as csv_file:
                rel_contains_rows = max(sum(1 for _ in csv_file) - 1, 0)
                
    # Preparación del payload con las métricas de la ejecución para guardarlo como artefacto
    payload = {
        "step": "generate",
        "status": "ok",
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "seed": settings.seed,
        "rows": rows,
        "avg_degree_rel_supplies": avg_degree_rel_supplies,
        "avg_degree_documents": avg_degree_documents,
        "avg_degree_products": avg_degree_products,
        "csv_target": csv_target,
        "companies_rows_generated": companies_rows,
        "products_rows_generated": products_rows,
        "rel_supplies_rows_generated": rel_supplies_rows,
        "documents_rows_generated": documents_rows,
        "rel_contains_rows_generated": rel_contains_rows,
        "generated_csv_files": [str(path) for path in created_csvs],
        "message": "CSV's generado/s. companies.csv, products.csv, rel_supplies.csv, documents.csv y rel_contains.csv incluyen datos sintéticos cuando aplica.",
    }
    return write_step_artifact(settings.data_processed_dir, "generate", payload)