from __future__ import annotations

from fastapi import APIRouter

from .risk        import router as risk_router
from .discrepancy import router as discrepancy_router
from .lead_time   import router as lead_time_router
from .payment     import router as payment_router
from .lineage     import router as lineage_router
from .gds         import router as gds_router

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

router.include_router(risk_router)
router.include_router(discrepancy_router)
router.include_router(lead_time_router)
router.include_router(payment_router)
router.include_router(lineage_router)
router.include_router(gds_router)