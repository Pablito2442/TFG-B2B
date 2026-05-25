from __future__ import annotations

import datetime
import logging

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth.db.database import User, get_db
from backend.api.dependencies import get_current_user, SECRET_KEY, ALGORITHM, EXPIRE_HOURS
from backend.api.models.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token(user: User) -> str:
    payload = {
        "sub":        user.email,
        "company_id": user.company_id,
        "role":       user.role,
        "full_name":  user.full_name,
        "exp":        datetime.datetime.utcnow() + datetime.timedelta(hours=EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email, User.is_active == 1).first()
    if not user or not bcrypt.checkpw(request.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    return TokenResponse(access_token=_make_token(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register", status_code=201)
def register(request: RegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db), ):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden crear usuarios")
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=409, detail="El correo ya está registrado")

    user = User(
        email=request.email,
        hashed_password=bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode(),
        company_id=request.company_id,
        full_name=request.full_name,
        role=request.role or "company_user",
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Nuevo usuario registrado: %s (company_id=%s)", user.email, user.company_id)
    return {"id": user.id, "email": user.email, "company_id": user.company_id}