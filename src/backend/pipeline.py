from __future__ import annotations

import argparse
from dataclasses import replace
import json
from datetime import datetime, UTC
from pathlib import Path

from src.backend.config import Settings, load_settings
from src.backend.generation.companies_synthesizer import synthesize_companies_csv
from src.backend.generation.csv_templates import create_csv_templates, get_available_targets
from src.backend.generation.supplies_synthesizer import synthesize_rel_supplies_csv


def _now_iso() -> str:
	return datetime.now(UTC).isoformat()


def _write_step_artifact(settings: Settings, step: str, payload: dict) -> Path:
	settings.data_processed_dir.mkdir(parents=True, exist_ok=True)
	target = settings.data_processed_dir / f"{step}_last_run.json"
	target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
	return target

def run_generate(settings: Settings, csv_target: str, rows: int, avg_out_degree: int) -> Path:
	created_csvs = create_csv_templates(settings.data_synthetic_dir, csv_target)
	companies_rows = 0
	rel_supplies_rows = 0
	cities_csv_path = settings.data_raw_dir / "worldcities.csv"
	companies_csv_path = settings.data_synthetic_dir / "companies.csv"

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
				avg_out_degree=avg_out_degree,
				seed=settings.seed,
			)
			with result_path.open("r", encoding="utf-8", newline="") as csv_file:
				rel_supplies_rows = max(sum(1 for _ in csv_file) - 1, 0)

	payload = {
		"step": "generate",
		"status": "ok",
		"timestamp_utc": _now_iso(),
		"seed": settings.seed,
		"rows": rows,
		"avg_out_degree": avg_out_degree,
		"csv_target": csv_target,
		"companies_rows_generated": companies_rows,
		"rel_supplies_rows_generated": rel_supplies_rows,
		"generated_csv_files": [str(path) for path in created_csvs],
		"message": "CSV generados. companies.csv y rel_supplies.csv incluyen datos sintéticos cuando aplica.",
	}
	return _write_step_artifact(settings, "generate", payload)


def run_load(settings: Settings) -> Path:
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
	payload = {
		"step": "analyze",
		"status": "ok",
		"timestamp_utc": _now_iso(),
		"message": "Fase analítica inicializada (placeholder).",
	}
	return _write_step_artifact(settings, "analyze", payload)


def run_all(settings: Settings) -> list[Path]:
	artifacts = [run_generate(settings, "all", 1000, 3), run_load(settings), run_analyze(settings)]
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
	parser = argparse.ArgumentParser(description="Pipeline TFG-B2B")
	parser.add_argument(
		"command",
		choices=["generate", "load", "analyze", "all"],
		help="Comando de pipeline a ejecutar",
	)
	parser.add_argument("--seed", type=int, default=None, help="Semilla para generación sintética")
	parser.add_argument("--batch-size", type=int, default=None, help="Tamaño de lote para cargas")
	parser.add_argument(
		"--csv",
		default="all",
		help=(
			"CSV a generar cuando command=generate. "
			"Valores: all, " + ", ".join(get_available_targets())
		),
	)
	parser.add_argument(
		"--rows",
		type=int,
		default=1000,
		help="Número de filas sintéticas para companies.csv cuando aplique",
	)
	parser.add_argument(
		"--avg-out-degree",
		type=int,
		default=3,
		help="Grado medio de salida para generar rel_supplies.csv cuando aplique",
	)
	return parser


def main() -> None:
	parser = build_parser()
	args = parser.parse_args()

	settings = load_settings()
	if args.seed is not None:
		settings = replace(settings, seed=args.seed)
	if args.batch_size is not None:
		settings = replace(settings, batch_size=args.batch_size)

	settings.ensure_data_directories()

	if args.command == "generate":
		artifact = run_generate(settings, args.csv, args.rows, args.avg_out_degree)
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

