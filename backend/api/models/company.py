from pydantic import BaseModel, field_validator
from typing import Optional


class CompanyProfileUpdate(BaseModel):
    legal_name: Optional[str] = None
    city:       Optional[str] = None
    region:     Optional[str] = None
    is_active:  Optional[bool] = None


_VALID_STATUSES = {
    "OPEN", "ACCEPTED", "PARTIALLY_CONFIRMED",
    "SHIPPED", "DELIVERED", "PARTIALLY_DELIVERED",
    "ISSUED", "SENT", "PAID", "OVERDUE",
}


class DocumentStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in _VALID_STATUSES:
            raise ValueError(f"Estado '{v}' no válido. Opciones: {sorted(_VALID_STATUSES)}")
        return v