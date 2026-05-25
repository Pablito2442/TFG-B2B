from __future__ import annotations

import logging
from dataclasses import replace

from fastapi import APIRouter, HTTPException

from backend.core.config import load_settings
from backend.etl.runners.run_all import run_all
from backend.api.models.pipeline import PipelineRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pipeline"])


@router.post("/api/pipeline/run")
def trigger_pipeline(request: PipelineRequest):
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
        return {"status": "success", "message": "Pipeline ejecutado correctamente"}
    except Exception as e:
        logger.error("Pipeline error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))