from __future__ import annotations

from fastapi import APIRouter

from backend.api.dependencies import read_json

router = APIRouter()


@router.get("/risk")
def get_risk_concentration():
    return read_json("risk_concentration.json", default={})

@router.get("/commercial-impact")
def get_commercial_impact():
    return read_json("commercial_impact.json", default=[])