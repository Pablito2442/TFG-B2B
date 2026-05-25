from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from backend.etl.analytics.analyzer import B2BGraphAnalyzer
from backend.api.dependencies import get_analyzer_instance, read_json
from backend.api.models.pipeline import LocationResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])


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


@router.get("/api/dashboard/macro")
def get_macro_dashboard():
    return {
        "macro_stats":    read_json("macro_statistics.json", default={}),
        "temporal_series": read_json("temporal_series.json", default=[]),
    }


@router.get("/api/dashboard/lineage")
def get_data_lineage():
    return read_json("data_lineage.json", default=[])


@router.get("/api/dashboard/gds")
def get_gds_analytics():
    return {
        "bottlenecks": read_json("bottlenecks.json", default=[]),
        "communities":  read_json("communities.json", default=[]),
    }


@router.get("/api/dashboard/risk")
def get_risk_concentration():
    return read_json("risk_concentration.json", default={})


@router.get("/api/dashboard/discrepancy-suppliers")
def get_discrepancy_by_supplier():
    return read_json("discrepancy_by_supplier.json", default=[])


@router.get("/api/dashboard/lead-time")
def get_lead_time_compliance():
    return read_json("lead_time_compliance.json", default=[])


@router.get("/api/dashboard/payment")
def get_payment_exposure():
    return read_json("payment_exposure.json", default=[])