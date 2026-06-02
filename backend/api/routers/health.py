from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from backend.etl.analytics.analyzer import B2BGraphAnalyzer
from backend.api.dependencies import get_analyzer_instance
from backend.api.models.pipeline import LocationResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/")
def root():
    return {"status": "Online", "database": "Neo4j Backend Ready"}


@router.get("/api/health")
def api_health_check(analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance)):
    try:
        analyzer.verify_connection()
        return {"status": "ok", "message": "Conexión estable con Neo4j"}
    except Exception as e:
        logger.error("Fallo en Health Check: %s", e)
        raise HTTPException(status_code=503, detail="Neo4j offline o inaccesible.")


@router.get("/api/network/locations", response_model=List[LocationResponse])
def get_network_locations(analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance)):
    try:
        data = analyzer.get_network_geography()
        if not data:
            raise HTTPException(status_code=404, detail="No hay datos geográficos disponibles.")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en consulta geográfica: %s", e)
        raise HTTPException(status_code=500, detail="Error al obtener coordenadas de Neo4j.")
