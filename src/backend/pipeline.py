from __future__ import annotations

import argparse
from dataclasses import replace
import json
from datetime import datetime, UTC
from pathlib import Path

from src.backend.config import Settings, load_settings
from src.backend.generation.csv_templates import create_csv_templates, get_available_targets


def _now_iso() -> str:
	return datetime.now(UTC).isoformat()


def _write_step_artifact(settings: Settings, step: str, payload: dict) -> Path:
	settings.data_processed_dir.mkdir(parents=True, exist_ok=True)
	target = settings.data_processed_dir / f"{step}_last_run.json"
	target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
	return target


def run_generate(settings: Settings, csv_target: str) -> Path:
	created_csvs = create_csv_templates(settings.data_synthetic_dir, csv_target)
	payload = {
		"step": "generate",
		"status": "ok",
		"timestamp_utc": _now_iso(),
		"seed": settings.seed,
		"csv_target": csv_target,
		"generated_csv_files": [str(path) for path in created_csvs],
		"message": "Plantillas CSV generadas en data/synthetic.",
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
		artifact = run_generate(settings, args.csv)
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

