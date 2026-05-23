import json
from pathlib import Path
from typing import Any
import pandas as pd
from datetime import date, datetime

# =============================================================================
# FUNCIONES DE EXPORTACIÓN Y ESCRITURA (ARTEFACTOS Y JSON)
# =============================================================================
def write_step_artifact(processed_dir: Path, step: str, payload: dict) -> Path:
    """Guarda el log de ejecución del pipeline."""
    processed_dir.mkdir(parents=True, exist_ok=True)
    target = processed_dir / f"{step}_last_run.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def export_dict_to_json(data: dict[str, Any], export_dir: Path, filename: str) -> Path:
    """Exporta un diccionario a JSON."""
    export_dir.mkdir(parents=True, exist_ok=True)
    target = export_dir / filename
    with target.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return target


def export_df_to_json(df: pd.DataFrame, export_dir: Path, filename: str) -> Path:
    """Exporta un DataFrame de Pandas a un JSON tabular."""
    export_dir.mkdir(parents=True, exist_ok=True)
    target = export_dir / filename
    df.to_json(target, orient="records", indent=2, force_ascii=False)
    return target


# =============================================================================
#  FUNCIONES DE CONVERSIÓN SEGURA (GENERADORES SINTÉTICOS)
# =============================================================================
def safe_float(value: str | None, default: float = 0.0) -> float:
    """Convierte un valor a float de forma segura, con manejo de comas y valores faltantes."""
    if not value or not str(value).strip():
        return default
    try:
        # Reemplazamos coma por punto para notación europea
        return float(str(value).strip().replace(",", "."))
    except ValueError:
        return default
    

def safe_int(value: str | None, default: int = 0) -> int:
    """Convierte un valor a int de forma segura, manejando decimales o nulos."""
    if not value or not str(value).strip():
        return default
    try:
        # Pasamos por float primero por si el string es "5000.0" o "5000,0"
        cleaned_val = str(value).strip().replace(".", "").replace(",", ".")
        return int(float(cleaned_val))
    except ValueError:
        return default
    

def safe_date(value: str | None, default: date) -> date:
    """Convierte una cadena a fecha ISO, manejando sufijos de zona horaria o nulos."""
    if not value or not str(value).strip():
        return default
    try:
        # Reemplazamos la 'Z' de UTC por formato de offset explícito
        clean_val = str(value).strip().replace("Z", "+00:00")
        return datetime.fromisoformat(clean_val).date()
    except ValueError:
        return default
    

def pick(row: dict[str, str], *keys: str) -> str | None:
    """Extrae el primer valor no nulo de un diccionario dado un conjunto de claves posibles."""
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None