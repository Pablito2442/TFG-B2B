from __future__ import annotations

import csv
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

# =============================================================================
# CABECERA (Configuracion y catalogo)
# =============================================================================
DOC_TYPE_RANK = {
    "ORDER": 0,
    "DESADV": 1,
    "INVOICE": 2,
}

DOC_TYPE_LINE_STATUS = {
    "ORDER": "OPEN",
    "DESADV": "SHIPPED",
    "INVOICE": "BILLED",
}


@dataclass(frozen=True)
class ProductRecord:
    product_id: str
    supplier_company_id: str
    base_price: float
    lead_time_baseline_days: int
    criticality: str
    unit: str


@dataclass(frozen=True)
class DocumentRecord:
    document_id: str
    doc_type: str
    issue_date: date
    gross_amount: float
    supplier_company_id: str
    reference_id: str


@dataclass(frozen=True)
class LineBlueprint:
    product_id: str
    lot_number: str
    unit_price: float
    discount_pct: float
    expected_delivery_date: date
    weight: float


# =============================================================================
# INTERFAZ PUBLICA (CLI)
# =============================================================================


# =============================================================================
# FUNCION PRINCIPAL (MAIN)
# =============================================================================
def synthesize_rel_contains_csv(output_file: Path, documents_csv: Path, products_csv: Path, seed: int) -> Path:
    """Genera rel_contains.csv a partir de documents.csv y products.csv."""
    rng = random.Random(seed)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    documents = _load_documents(documents_csv)
    products_by_supplier = _load_products_by_supplier(products_csv)

    fieldnames = [
        "document_id",
        "product_id",
        "line_id",
        "lot_number",
        "quantity",
        "unit_price",
        "discount_pct",
        "line_amount",
        "line_status",
        "expected_delivery_date",
    ]

    with output_file.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for root_document, chain_documents in _group_documents_by_traceability(documents):
            catalog = products_by_supplier.get(root_document.supplier_company_id, [])
            if not catalog:
                raise ValueError(
                    f"No hay productos para el proveedor {root_document.supplier_company_id} requerido por {root_document.document_id}."
                )

            blueprints = _build_line_blueprints(root_document, catalog, rng)
            weights = [blueprint.weight for blueprint in blueprints]

            for document in chain_documents:
                line_amounts = _allocate_amounts(document.gross_amount, weights)
                for line_index, (blueprint, line_amount) in enumerate(zip(blueprints, line_amounts), start=1):
                    net_unit_price = blueprint.unit_price * (1.0 - blueprint.discount_pct)
                    quantity = round(max(line_amount / max(net_unit_price, 0.01), 0.001), 4)
                    writer.writerow(
                        {
                            "document_id": document.document_id,
                            "product_id": blueprint.product_id,
                            "line_id": f"{document.document_id}-L{line_index:03d}",
                            "lot_number": blueprint.lot_number,
                            "quantity": quantity,
                            "unit_price": round(blueprint.unit_price, 4),
                            "discount_pct": round(blueprint.discount_pct, 4),
                            "line_amount": round(line_amount, 2),
                            "line_status": DOC_TYPE_LINE_STATUS.get(document.doc_type, "OPEN"),
                            "expected_delivery_date": blueprint.expected_delivery_date.isoformat(),
                        }
                    )

    return output_file

# =============================================================================
# FUNCIONES AUXILIARES (Helpers / Utils)
# =============================================================================
def _load_documents(documents_csv: Path) -> list[DocumentRecord]:
    """Carga documentos desde un CSV, validando y limpiando los datos."""
    if not documents_csv.exists():
        raise FileNotFoundError(f"No existe documents.csv: {documents_csv}")

    documents: list[DocumentRecord] = []
    with documents_csv.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            document_id = (row.get("document_id") or "").strip()
            if not document_id:
                continue
            documents.append(
                DocumentRecord(
                    document_id=document_id,
                    doc_type=(row.get("doc_type") or "ORDER").strip().upper(),
                    issue_date=_safe_date(row.get("issue_date"), date(2026, 1, 1)),
                    gross_amount=max(_safe_float(row.get("gross_amount"), 0.0), 0.0),
                    supplier_company_id=(row.get("supplier_company_id") or "").strip(),
                    reference_id=(row.get("reference_id") or "").strip(),
                )
            )

    return documents


def _load_products_by_supplier(products_csv: Path) -> dict[str, list[ProductRecord]]:
    """Carga productos desde un CSV, organizándolos por proveedor y validando los datos."""
    if not products_csv.exists():
        raise FileNotFoundError(f"No existe products.csv: {products_csv}")

    products_by_supplier: dict[str, list[ProductRecord]] = {}
    with products_csv.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            product_id = (row.get("product_id") or "").strip()
            supplier_company_id = (row.get("supplier_company_id") or "").strip()
            if not product_id or not supplier_company_id:
                continue
            products_by_supplier.setdefault(supplier_company_id, []).append(
                ProductRecord(
                    product_id=product_id,
                    supplier_company_id=supplier_company_id,
                    base_price=max(_safe_float(row.get("base_price"), 1.0), 0.01),
                    lead_time_baseline_days=max(_safe_int(row.get("lead_time_baseline_days"), 1), 0),
                    criticality=(row.get("criticality") or "MEDIUM").strip().upper(),
                    unit=(row.get("unit") or "unit").strip(),
                )
            )

    return products_by_supplier


def _group_documents_by_traceability(documents: list[DocumentRecord]) -> list[tuple[DocumentRecord, list[DocumentRecord]]]:
    """Agrupa documentos en cadenas de trazabilidad, ordenando por tipo y fecha."""
    groups: dict[str, list[DocumentRecord]] = {}
    ordered_roots: list[str] = []

    for document in documents:
        root_id = document.document_id if not document.reference_id else document.reference_id
        if root_id not in groups:
            groups[root_id] = []
            ordered_roots.append(root_id)
        groups[root_id].append(document)

    result: list[tuple[DocumentRecord, list[DocumentRecord]]] = []
    for root_id in ordered_roots:
        chain_documents = sorted(groups[root_id], key=lambda doc: (DOC_TYPE_RANK.get(doc.doc_type, 99), doc.issue_date, doc.document_id))
        root_document = next((doc for doc in chain_documents if doc.doc_type == "ORDER"), chain_documents[0])
        result.append((root_document, chain_documents))

    return result


def _build_line_blueprints(root_document: DocumentRecord, catalog: list[ProductRecord], rng: random.Random) -> list[LineBlueprint]:
    """Construye blueprints de líneas para un documento raíz, seleccionando productos y asignando precios y fechas."""
    num_lines = _determine_line_count(root_document.gross_amount, len(catalog), rng)
    selected_products = _weighted_sample_without_replacement(catalog, num_lines, rng)
    weights = [max(product.base_price * rng.uniform(0.7, 1.3), 0.01) for product in selected_products]
    weights_total = sum(weights) or float(len(weights))
    normalized_weights = [weight / weights_total for weight in weights]

    blueprints: list[LineBlueprint] = []
    for line_index, (product, weight) in enumerate(zip(selected_products, normalized_weights), start=1):
        base_multiplier = rng.uniform(0.92, 1.12)
        if product.criticality == "HIGH":
            base_multiplier *= 1.10
        elif product.criticality == "LOW":
            base_multiplier *= 0.95

        unit_price = max(round(product.base_price * base_multiplier, 4), 0.01)
        discount_pct = round(rng.uniform(0.0, 0.18), 4)
        expected_delivery_date = root_document.issue_date + timedelta(days=max(product.lead_time_baseline_days, 0))

        blueprints.append(
            LineBlueprint(
                product_id=product.product_id,
                lot_number=f"LOT-{root_document.document_id[-6:]}-{line_index:02d}",
                unit_price=unit_price,
                discount_pct=discount_pct,
                expected_delivery_date=expected_delivery_date,
                weight=weight,
            )
        )

    return blueprints


def _determine_line_count(gross_amount: float, catalog_size: int, rng: random.Random) -> int:
    """Determina el número de líneas para un documento dado su monto bruto y el tamaño del catálogo del proveedor."""
    if catalog_size <= 1:
        return 1

    if gross_amount < 500:
        base = 1
    elif gross_amount < 2_500:
        base = 2
    elif gross_amount < 10_000:
        base = 3
    elif gross_amount < 50_000:
        base = 4
    else:
        base = 5

    base += rng.choice([-1, 0, 0, 1])
    return max(1, min(base, min(catalog_size, 8)))


def _weighted_sample_without_replacement(records: list[ProductRecord], sample_size: int, rng: random.Random) -> list[ProductRecord]:
    """Realiza un muestreo ponderado sin reemplazo de registros, basado en el precio base."""
    available = records[:]
    selected: list[ProductRecord] = []
    while available and len(selected) < sample_size:
        weights = [max(record.base_price, 0.01) for record in available]
        picked = rng.choices(available, weights=weights, k=1)[0]
        selected.append(picked)
        available.remove(picked)
    return selected


def _allocate_amounts(total_amount: float, weights: list[float]) -> list[float]:
    """Asigna montos a líneas basado en pesos, asegurando que la suma sea igual al monto total."""
    if not weights:
        return []
    if len(weights) == 1:
        return [round(max(total_amount, 0.0), 2)]

    weights_total = sum(weights) or float(len(weights))
    normalized = [weight / weights_total for weight in weights]
    rounded = [round(max(total_amount * share, 0.01), 2) for share in normalized]
    diff = round(total_amount - sum(rounded), 2)
    rounded[-1] = round(max(0.01, rounded[-1] + diff), 2)
    return rounded


def _safe_date(value: str | None, default: date) -> date:
    """Convierte una cadena a fecha, manejando formatos ISO y valores vacíos."""
    if value is None or value.strip() == "":
        return default
    try:
        return datetime.fromisoformat(value.strip().replace("Z", "+00:00")).date()
    except ValueError:
        return default


def _safe_int(value: str | None, default: int) -> int:
    """Convierte un valor a int de forma segura, con manejo de comas, puntos y valores faltantes."""
    if value is None or value.strip() == "":
        return default
    try:
        return int(float(value))
    except ValueError:
        return default


def _safe_float(value: str | None, default: float) -> float:
    """Convierte un valor a float de forma segura, con manejo de comas y valores faltantes."""
    if value is None or value.strip() == "":
        return default
    try:
        return float(str(value).strip().replace(",", "."))
    except ValueError:
        return default