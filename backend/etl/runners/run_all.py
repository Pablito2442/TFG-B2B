from __future__ import annotations

import logging
from datetime import datetime, UTC
from pathlib import Path

from backend.core.config import Settings
from backend.core.utils import write_step_artifact
from backend.etl.runners.run_generate import run_generate
from backend.etl.runners.run_load import run_load
from backend.etl.runners.run_analyze import run_analyze
from backend.etl.runners.run_seed import run_seed


def run_all(
    settings: Settings,
    rows: int,
    avg_degree_products: int,
    avg_degree_rel_supplies: int,
    avg_degree_documents: int,
    gamma: float,
    beta: float,
    mu: float,
    min_comm: int,
    max_comm: int,
    batch_size_loader: int,
    clear_db: bool = False,
    skip_seed: bool = False,
) -> list[Path]:
    """
    Ejecuta el pipeline completo de principio a fin (End-to-End).
    Asegura que las fases se ejecuten en el orden lógico estricto.
    """
    logging.info(f"--- INICIO ORQUESTACIÓN END-TO-END (Seed: {settings.seed}) ---")

    steps_run = ["generate", "load", "analyze"]

    artifacts = [
        run_generate(
            settings, csv_target="all",
            rows=rows, avg_degree_products=avg_degree_products,
            avg_degree_rel_supplies=avg_degree_rel_supplies,
            avg_degree_documents=avg_degree_documents,
            gamma=gamma, beta=beta, mu=mu,
            min_comm=min_comm, max_comm=max_comm,
        ),
        run_load(settings, batch_size_loader=batch_size_loader, clear_db=clear_db),
        run_analyze(settings),
    ]

    if not skip_seed:
        artifacts.append(run_seed(settings))
        steps_run.append("seed")

    summary = {
        "step": "all",
        "status": "ok",
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "executed_steps": steps_run,
        "artifacts": [str(p) for p in artifacts],
    }
    artifacts.append(write_step_artifact(settings.data_processed_dir, "all", summary))
    return artifacts