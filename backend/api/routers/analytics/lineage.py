from __future__ import annotations

from fastapi import APIRouter

from backend.api.dependencies import read_json

router = APIRouter(prefix="/lineage")



@router.get("/backward")
def get_backward_lineage():
    return read_json("backward_traceability.json", default=[])


@router.get("/exact-paths")
def get_lineage_exact_paths():
    return read_json("lineage_exact_paths.json", default=[])


@router.get("/forward")
def get_forward_traceability():
    return read_json("forward_traceability.json", default=[])