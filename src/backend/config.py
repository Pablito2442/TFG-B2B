from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
	project_root: Path
	data_raw_dir: Path
	data_synthetic_dir: Path
	data_processed_dir: Path
	data_export_dir: Path
	neo4j_uri: str
	neo4j_user: str
	neo4j_password: str
	neo4j_database: str
	seed: int

	def ensure_data_directories(self) -> None:
		self.data_raw_dir.mkdir(parents=True, exist_ok=True)
		self.data_synthetic_dir.mkdir(parents=True, exist_ok=True)
		self.data_processed_dir.mkdir(parents=True, exist_ok=True)
		self.data_export_dir.mkdir(parents=True, exist_ok=True)


def _as_int(value: str | None, default: int) -> int:
	if value is None or value.strip() == "":
		return default
	return int(value)


def load_settings() -> Settings:
	backend_dir = Path(__file__).resolve().parent
	project_root = backend_dir.parent.parent

	data_root = project_root / "data"
	data_raw_dir = data_root / "raw"
	data_synthetic_dir = data_root / "synthetic"
	data_processed_dir = data_root / "processed"
	data_export_dir = data_root / "export"

	return Settings(
		project_root=project_root,
		data_raw_dir=data_raw_dir,
		data_synthetic_dir=data_synthetic_dir,
		data_processed_dir=data_processed_dir,
		data_export_dir=data_export_dir,
		neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
		neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
		neo4j_password=os.getenv("NEO4J_PASSWORD", "AdminUser1234"),
		neo4j_database=os.getenv("NEO4J_DATABASE", "neo4j"),
		seed=_as_int(os.getenv("TFG_SEED"), 42),
	)

