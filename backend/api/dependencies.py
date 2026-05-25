from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.core.config import load_settings
from backend.etl.analytics.analyzer import B2BGraphAnalyzer
from backend.auth.db.database import User, get_db

logger = logging.getLogger(__name__)

# ── JWT constants (shared with routers/auth.py) ────────────────
SECRET_KEY   = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM    = "HS256"
EXPIRE_HOURS = 24

# ── Pre-computed export directory (absolute path) ──────────────
EXPORT_DIR = Path(__file__).resolve().parents[2] / "data" / "export"

_bearer = HTTPBearer()


# ── FastAPI dependencies ───────────────────────────────────────

def get_analyzer_instance():
    """Yields a connected B2BGraphAnalyzer and closes it after the request."""
    settings = load_settings()
    analyzer = B2BGraphAnalyzer(
        neo4j_uri=settings.neo4j_uri,
        neo4j_user=settings.neo4j_user,
        neo4j_password=settings.neo4j_password,
        neo4j_database=settings.neo4j_database,
    )
    try:
        yield analyzer
    finally:
        analyzer.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Decodes the Bearer JWT and returns the active User from SQLite."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado — vuelve a iniciar sesión")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(User).filter(User.email == payload["sub"], User.is_active == 1).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o desactivado")
    return user


# ── Shared helpers ─────────────────────────────────────────────

def read_json(filename: str, default: Any = None) -> Any:
    """Reads a pre-computed JSON export file; returns default if missing."""
    path = EXPORT_DIR / filename
    if not path.exists():
        return default if default is not None else {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def neo4j_to_dict(node: Any) -> dict:
    """Converts a Neo4j node to a plain JSON-serialisable dict."""
    result = {}
    for k, v in dict(node).items():
        if hasattr(v, "iso_format"):
            result[k] = v.iso_format()
        elif hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result