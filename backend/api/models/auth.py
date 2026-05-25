from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    company_id: str
    full_name: Optional[str] = None
    role: str

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    email: str
    password: str
    company_id: str
    full_name: Optional[str] = None
    role: Optional[str] = "company_user"