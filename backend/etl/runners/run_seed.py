from __future__ import annotations

import logging
from datetime import datetime, UTC
from pathlib import Path

from backend.core.config import Settings
from backend.core.utils import write_step_artifact
from backend.auth.db.seed_users import seed

logger = logging.getLogger(__name__)


def run_seed(settings: Settings) -> Path:
    """Seed demo users from existing Neo4j Company nodes into SQLite."""
    logger.info("--- INICIO SEED DE USUARIOS DEMO ---")

    stats = seed(settings)

    summary = {
        "step": "seed",
        "status": "ok",
        "timestamp_utc": datetime.now(UTC).isoformat(),
        **stats,
    }
    artifact = write_step_artifact(settings.data_processed_dir, "seed", summary)
    logger.info(f"--- FIN SEED -> {artifact} ---")
    return artifact