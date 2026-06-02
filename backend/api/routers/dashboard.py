from __future__ import annotations

from fastapi import APIRouter

from backend.api.dependencies import read_json

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/macro")
def get_macro_dashboard():
    return {
        "macro_stats":     read_json("macro_statistics.json", default={}),
        "temporal_series": read_json("temporal_series.json",  default=[]),
    }