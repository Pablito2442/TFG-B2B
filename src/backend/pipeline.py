from __future__ import annotations

import argparse
from dataclasses import replace
import json
from datetime import datetime, UTC
from pathlib import Path

from src.backend.config import Settings, load_settings
from src.backend.generation.companies_synthesizer import synthesize_companies_csv
from src.backend.generation.csv_templates import create_csv_templates, get_available_targets
from src.backend.generation.documents_synthesizer import synthesize_documents_csv
from src.backend.generation.supplies_synthesizer import synthesize_rel_supplies_csv


def _now_iso() -> str:
    """Devuelve el timestamp actual en formato ISO y zona horaria UTC."""
    return datetime.now(UTC).isoformat()


def _write_step_artifact(settings: Settings, step: str, payload: dict) -> Path:
    """
    Guarda un archivo JSON con el resumen de la ejecución de cada paso del pipeline, incluyendo parámetros de entrada, 
    resultados y mensajes relevantes, para mantener trazabilidad y facilitar el debugging.
    """
    settings.data_processed_dir.mkdir(parents=True, exist_ok=True)
    target = settings.data_processed_dir / f"{step}_last_run.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def run_generate(settings: Settings, csv_target: str, rows: int, avg_degree_rel_supplies: int, avg_degree_documents: int) -> Path:
    """
    Fase 1: Generación de datos sintéticos.
    Orquesta la creación de los CSVs. Tiene una dependencia en cascada estricta:
    1. companies.csv (Depende de worldcities.csv)
    2. rel_supplies.csv (Depende de companies.csv)
    3. documents.csv (Depende de companies.csv y rel_supplies.csv)
    """
    # Creación de los CSVs para el target indicado (puede ser "all" o un CSV específico)
    created_csvs = create_csv_templates(settings.data_synthetic_dir, csv_target)
    orden_estricto = {
        "companies.csv": 1,
        "rel_supplies.csv": 2,
        "documents.csv": 3
    }
    # Reordenacion de la lista para cumplir las dependencias en cascada.
    created_csvs.sort(key=lambda path: orden_estricto.get(path.name, 99))
    
    # Parametrización de filas generadas para cada CSV
    companies_rows = 0
    rel_supplies_rows = 0
    documents_rows = 0
    cities_csv_path = settings.data_raw_dir / "worldcities.csv"
    companies_csv_path = settings.data_synthetic_dir / "companies.csv"
    rel_supplies_csv_path = settings.data_synthetic_dir / "rel_supplies.csv"

    # Iteración sobre los archivos que el usuario ha solicitado generar
    for csv_path in created_csvs:
        if csv_path.name == "companies.csv":
            synthesize_companies_csv(
                output_file=csv_path,
                cities_csv=cities_csv_path,
                rows=rows,
                seed=settings.seed,
            )
            companies_rows = rows
        if csv_path.name == "rel_supplies.csv":
            result_path = synthesize_rel_supplies_csv(
                output_file=csv_path,
                companies_csv=companies_csv_path,
                avg_out_degree=avg_degree_rel_supplies,
                seed=settings.seed,
            )
            with result_path.open("r", encoding="utf-8", newline="") as csv_file:
                rel_supplies_rows = max(sum(1 for _ in csv_file) - 1, 0)
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
                
    # Preparación del payload con las métricas de la ejecución para guardarlo como artefacto
    payload = {
        "step": "generate",
        "status": "ok",
        "timestamp_utc": _now_iso(),
        "seed": settings.seed,
        "rows": rows,
        "avg_degree_rel_supplies": avg_degree_rel_supplies,
        "avg_degree_documents": avg_degree_documents,
        "csv_target": csv_target,
        "companies_rows_generated": companies_rows,
        "rel_supplies_rows_generated": rel_supplies_rows,
        "documents_rows_generated": documents_rows,
        "generated_csv_files": [str(path) for path in created_csvs],
        "message": "CSV's generado/s. companies.csv, rel_supplies.csv y documents.csv incluyen datos sintéticos cuando aplica.",
    }
    return _write_step_artifact(settings, "generate", payload)


def run_load(settings: Settings) -> Path:
    """
    Fase 2: Carga en Base de Datos (Grafo).
    (Actualmente un placeholder preparado para inyectar datos en Neo4j).
    """
    payload = {
        "step": "load",
        "status": "ok",
        "timestamp_utc": _now_iso(),
        "batch_size": settings.batch_size,
        "neo4j_uri": settings.neo4j_uri,
        "neo4j_database": settings.neo4j_database,
        "message": "Fase de carga inicializada (placeholder).",
    }
    return _write_step_artifact(settings, "load", payload)


def run_analyze(settings: Settings) -> Path:
    """
    Fase 3: Análisis de la topología de red.
    (Placeholder para futuros algoritmos de PageRank, Centralidad, etc.)
    """
    payload = {
        "step": "analyze",
        "status": "ok",
        "timestamp_utc": _now_iso(),
        "message": "Fase analítica inicializada (placeholder).",
    }
    return _write_step_artifact(settings, "analyze", payload)


def run_all(settings: Settings) -> list[Path]:
    """
    Ejecuta el pipeline completo de principio a fin (End-to-End).
    Asegura que las fases se ejecuten en el orden lógico estricto.
    """
    # Ejecución secuencial. Hardcodeamos rows=1000 y avg_out_degree=3 por defecto para el run general
    artifacts = [run_generate(settings, "all"), run_load(settings), run_analyze(settings)]
    summary = {
        "step": "all",
        "status": "ok",
        "timestamp_utc": _now_iso(),
        "executed_steps": ["generate", "load", "analyze"],
        "artifacts": [str(path) for path in artifacts],
    }
    artifacts.append(_write_step_artifact(settings, "all", summary))
    return artifacts


def build_parser() -> argparse.ArgumentParser:
    """
    Define la interfaz de línea de comandos (CLI). Se solicitan comandos de alto nivel (generate, load, analyze, all) 
    y parámetros de control como seed, batch_size, csv_target, rows y avg_out_degree, pero no directorios específicos.
    """
    
    parser = argparse.ArgumentParser(description="Pipeline TFG-B2B")
    
    # Argumento obligatorio para ejecución
    parser.add_argument("command", choices=["generate", "load", "analyze", "all"], help="Comando de pipeline a ejecutar",)
    
    # Argumentos opcionales para control de generación y carga
    parser.add_argument("--seed", type=int, default=None, help="Semilla para generación sintética")
    parser.add_argument("--batch-size", type=int, default=None, help="Tamaño de lote para cargas")
    parser.add_argument("--csv", default="all", help=("CSV a generar cuando command=generate. "
                                                      "Valores: all, " + ", ".join(get_available_targets())))
    parser.add_argument("--rows", type=int, default=1000, help="Número de filas sintéticas para companies.csv cuando aplique")
    parser.add_argument("--avg-degree-rel-supplies", type=int, default=3, help="Grado medio de salida para generar rel_supplies.csv cuando aplique",)
    parser.add_argument("--avg-degree-documents", type=int, default=3, help="Grado medio de salida para generar documents.csv cuando aplique",)
    return parser


def main() -> None:
    """Punto de entrada principal."""
    # Construcción del parser y lectura de argumentos
    parser = build_parser()
    args = parser.parse_args()

    # Carga de configuración global y sobreescritura con argumentos de línea de comandos si no se proporcionan
    settings = load_settings()
    if args.seed is not None:
        settings = replace(settings, seed=args.seed)
    if args.batch_size is not None:
        settings = replace(settings, batch_size=args.batch_size)

    # Aseguramos que los directorios de datos existen
    settings.ensure_data_directories()

    # Ejecución de scrips espcificos segun el comando indicado
    if args.command == "generate":
        artifact = run_generate(settings, args.csv, args.rows, args.avg_degree_rel_supplies, args.avg_degree_documents)
        print(f"[OK] generate -> {artifact}")
    elif args.command == "load":
        artifact = run_load(settings)
        print(f"[OK] load -> {artifact}")
    elif args.command == "analyze":
        artifact = run_analyze(settings)
        print(f"[OK] analyze -> {artifact}")
    else:
        artifacts = run_all(settings)
        print("[OK] all")
        for artifact in artifacts:
            print(f"  - {artifact}")


if __name__ == "__main__":
    main()

