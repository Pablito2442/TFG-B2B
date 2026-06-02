from __future__ import annotations

import logging
import threading
from dataclasses import replace
from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException

from backend.core.config import load_settings
from backend.etl.runners.run_all import run_all
from backend.api.models.pipeline import PipelineRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pipeline"])

# ── In-memory pipeline state ──────────────────────────────────────────────────
# Single-pipeline model: only one run at a time.
# _lock guards both reads and writes to _state so the status endpoint is safe.

_lock = threading.Lock()

_state: dict = {
    "status":      "idle",   # idle | running | success | error
    "started_at":  None,
    "finished_at": None,
    "message":     "",
}


def _set_state(**kwargs: object) -> None:
    with _lock:
        _state.update(kwargs)


def _run_pipeline_task(request: PipelineRequest) -> None:
    _set_state(status="running", started_at=datetime.now(UTC).isoformat(),
               finished_at=None, message="")
    try:
        settings = load_settings()
        final_seed = None if request.use_random_seed else request.seed_value
        settings = replace(settings, seed=final_seed)
        run_all(
            settings=settings,
            rows=request.rows,
            avg_degree_products=request.avg_degree_products,
            avg_degree_rel_supplies=request.avg_degree_supplies,
            avg_degree_documents=request.avg_degree_documents,
            gamma=request.gamma,
            beta=request.beta,
            mu=request.mu,
            min_comm=request.min_comm,
            max_comm=request.max_comm,
            batch_size_loader=request.batch_size,
            clear_db=request.clear_db,
        )
        _set_state(status="success", finished_at=datetime.now(UTC).isoformat(),
                   message="Pipeline completado.")
        logger.info("Pipeline completado con éxito.")
    except Exception as exc:
        _set_state(status="error", finished_at=datetime.now(UTC).isoformat(),
                   message=str(exc))
        logger.error("Pipeline error: %s", exc, exc_info=True)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/pipeline/run", status_code=202)
def trigger_pipeline(request: PipelineRequest):
    """
    Starts the pipeline in a dedicated daemon thread and returns 202 immediately.
    The thread is independent of FastAPI's thread pool so the server stays responsive.
    Poll GET /api/pipeline/status to track progress.
    """
    with _lock:
        if _state["status"] == "running":
            raise HTTPException(status_code=409, detail="El pipeline ya está en ejecución.")

    thread = threading.Thread(target=_run_pipeline_task, args=(request,), daemon=True)
    thread.start()
    return {"status": "started", "message": "Pipeline iniciado en segundo plano."}


@router.get("/api/pipeline/status")
def get_pipeline_status():
    with _lock:
        return dict(_state)