from __future__ import annotations

import datetime
from pathlib import Path

from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Session

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "users.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    company_id      = Column(String, nullable=False)
    full_name       = Column(String, nullable=True)
    role            = Column(String, default="company_user")  # 'company_user' | 'admin'
    is_active       = Column(Integer, default=1)
    created_at      = Column(DateTime, default=datetime.datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()
