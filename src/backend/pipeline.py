from __future__ import annotations

import argparse
from dataclasses import replace
import json
from datetime import datetime, UTC
from pathlib import Path

from src.backend.config import Settings, load_settings
from src.backend.database import loader
from src.backend.database.loader import Neo4jBulkLoader
from src.backend.generation.companies_synthesizer import get_companies_parser, synthesize_companies_csv
from src.backend.generation.csv_templates import create_csv_templates, get_available_targets
from src.backend.generation.documents_synthesizer import get_documents_parser, synthesize_documents_csv
from src.backend.generation.supplies_synthesizer import get_supplies_parser, synthesize_rel_supplies_csv


def _write_step_artifact(settings: Settings, step: str, payload: dict) -> Path:
    """
    Guarda un archivo JSON con el resumen de la ejecución de cada paso del pipeline, incluyendo parámetros de entrada, 
    resultados y mensajes relevantes, para mantener trazabilidad y facilitar el debugging.
    """
    settings.data_processed_dir.mkdir(parents=True, exist_ok=True)
    target = settings.data_processed_dir / f"{step}_last_run.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def run_generate(settings: Settings, csv_target: str, rows: int, 
                 avg_degree_rel_supplies: int, avg_degree_documents: int,
                 gamma: float, beta: float, mu: float, 
                 min_comm: int, max_comm: int) -> Path:
    """
    Fase 1: Generación de datos sintéticos.
    Orquesta la creación de los CSVs. Tiene una dependencia en cascada estricta:
    1. companies.csv (Depende de municipios_españa.csv)
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
    cities_csv_path = settings.data_raw_dir / "municipios_espana.csv"
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
        "timestamp_utc": datetime.now(UTC).isoformat(),
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


def run_load(settings: Settings, batch_size_loader: int) -> Path:
    """
    Fase 2: Carga en Base de Datos (Grafo).
    (Actualmente un placeholder preparado para inyectar datos en Neo4j).
    """
    with Neo4jBulkLoader(
        neo4j_uri=settings.neo4j_uri,
        neo4j_user=settings.neo4j_user,
        neo4j_password=settings.neo4j_password,
        neo4j_database=settings.neo4j_database,
        batch_size=batch_size_loader,
    ) as loader:
        loader.verify_connection()
        loader.create_constraints_and_indexes()
        load_stats = loader.load_from_directory(settings.data_synthetic_dir)
        
    payload = {
        "step": "load",
        "status": "ok",
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "batch_size": batch_size_loader,
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
        "timestamp_utc": datetime.now(UTC).isoformat(),
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
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "executed_steps": ["generate", "load", "analyze"],
        "artifacts": [str(path) for path in artifacts],
    }
    artifacts.append(_write_step_artifact(settings, "all", summary))
    return artifacts


class CleanHelpFormatter(argparse.HelpFormatter):
    """Formateador personalizado para ensanchar columnas y ocultar los METAVAR en mayúsculas."""
    def __init__(self, prog):
        super().__init__(prog, max_help_position=45, width=100)
        
    def _format_action_invocation(self, action):
        # Si es un argumento posicional, lo dejamos igual
        if not action.option_strings:
            return super()._format_action_invocation(action)
        # Si es una opción (--rows, --seed), devolvemos solo la bandera y ocultamos la variable en mayúsculas
        return ', '.join(action.option_strings)


def build_parser() -> argparse.ArgumentParser:
    """CLI con subparsers, heredando configuraciones de los submódulos."""
    # Formateador para ensanchar las columnas y evitar saltos de línea feos
    # custom_formatter = lambda prog: argparse.HelpFormatter(prog, max_help_position=45, width=100)

    parser = argparse.ArgumentParser(description="Pipeline TFG-B2B", formatter_class=CleanHelpFormatter)
    subparsers = parser.add_subparsers(
        dest="command", 
        required=True, 
        title="Comandos disponibles",
        help="Ejecuta uno de los comandos para ver su ayuda específica (ej. all -h)",
        metavar="{generate, load, analyze, all}"
    )

    # --- SUBCOMANDO PARA GENERATE ---
    parser_generate = subparsers.add_parser(
        "generate",
        help="Generación de datos sintéticos",
        formatter_class=CleanHelpFormatter,
        parents=[
            get_companies_parser(),
            get_supplies_parser(),
            get_documents_parser(),
        ]
    )
    parser_generate._optionals.title = "Opciones generales disponibles"
    parser_generate.add_argument(
        "--csv", 
        default="all", 
        help="Generación de CSV específico (Valores: all, companies, documents, products, rel_contains, rel_fulfills, rel_issues, rel_sent_to, rel_supplies)", 
        metavar="TARGET"
    )
    parser_generate.add_argument("--seed", type=int, default=None, help="Semilla global para generación", metavar="SEED")

    # --- SUBCOMANDO PARA LOAD ---
    parser_load = subparsers.add_parser(
        "load", 
        help="Carga de datos en BD",
        formatter_class=CleanHelpFormatter
    )
    parser_load._optionals.title = "Opciones generales disponibles"
    parser_load.add_argument("--batch_size_loader", type=int, default=10, help="Filas por lote para Neo4j", metavar="N")

    # --- SUBCOMANDO PARA ANALYZE ---
    parser_analyze = subparsers.add_parser(
        "analyze", 
        help="Análisis de topología",
        formatter_class=CleanHelpFormatter
    )

    # --- SUBCOMANDO PARA ALL ---
    parser_all = subparsers.add_parser(
        "all", 
        help="Ejecución del pipeline completo End-to-End",
        formatter_class=CleanHelpFormatter,
        parents=[
            get_companies_parser(),
            get_supplies_parser(),
            get_documents_parser(),
        ]
    )
    parser_all._optionals.title = "Opciones generales disponibles"
    parser_all.add_argument("--seed", type=int, default=None, help="Semilla global", metavar="SEED")
    parser_all.add_argument("--batch_size_loader", type=int, default=10, help="Filas por lote para Neo4j", metavar="N")

    return parser


def main() -> None:
    """Punto de entrada principal."""
    # Construcción del parser y lectura de argumentos
    parser = build_parser()
    args = parser.parse_args()

    # Carga de configuración global y sobreescritura con argumentos de línea de comandos si no se proporcionan
    settings = load_settings()
    
    seed_arg = getattr(args, 'seed', None)
    if seed_arg is not None:
        settings = replace(settings, seed=args.seed)

    # Aseguramos que los directorios de datos existen
    settings.ensure_data_directories()
    
    if args.command == "generate":
        # Usamos getattr() como medida de seguridad por si ejecutas un comando 
        # que no tenga instanciado alguno de estos parámetros en su namespace.
        artifact = run_generate(
            settings, 
            csv_target=args.csv, 
            rows=getattr(args, 'rows'), 
            avg_degree_rel_supplies=getattr(args, 'avg_degree_supplies'), 
            avg_degree_documents=getattr(args, 'avg_degree_documents'),
            gamma=getattr(args, 'gamma'),
            beta=getattr(args, 'beta'),
            mu=getattr(args, 'mu'),
            min_comm=getattr(args, 'min_community'),
            max_comm=getattr(args, 'max_community'),
        )
        print(f"[OK] generate -> {artifact}")
        
    elif args.command == "load":
        artifact = run_load(settings, getattr(args, 'batch_size_loader'))
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
