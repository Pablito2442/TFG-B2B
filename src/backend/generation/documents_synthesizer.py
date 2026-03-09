from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC
from pathlib import Path

# Constantes globales con las opciones para generar datos aleatorios
EDI_STANDARDS = ["EDIFACT", "ANSI_X12", "UBL_2_1", "PEPPOL_BIS"]
VERSION_RANGE = (1, 4)

INDUSTRY_TAX_RATES: dict[str, list[float]] = {
    "C10": [0.04, 0.10],
    "C20": [0.21],
    "C25": [0.21],
    "C28": [0.21],
    "G46": [0.21],
    "H52": [0.10, 0.21],
    "J62": [0.21],
    "M70": [0.21],
}

COUNTRY_CURRENCY: dict[str, str] = {
    "GB": "GBP",
    "US": "USD",
}


@dataclass(frozen=True)
class CompanyProfile:
    """Estructura inmutable que representa los datos financieros y demográficos de las empresa."""
    company_id: str
    country: str
    industry_code: str
    baseline_revenue: float


@dataclass(frozen=True)
class CompanyPair:
    """Estructura de datos inmutable para almacenar la relación entre un proveedor y un comprador."""
    supplier_company_id: str
    buyer_company_id: str
    payment_terms_days: int
    since_date: datetime


def _safe_int(value: str | None, default: int) -> int:
    """Conversión a entero de forma segura. Si falla o está vacío, devuelve un valor por defecto."""
    if value is None or value.strip() == "":
        return default
    try:
        return int(float(value))
    except ValueError:
        return default


def _safe_float(value: str | None, default: float) -> float:
    """Conversión a float de forma segura. Si falla o está vacío, devuelve un valor por defecto."""
    if value is None or value.strip() == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _safe_date_to_datetime(value: str | None, default: datetime) -> datetime:
    """Conversión a datetime de forma segura. Si falla o está vacío, devuelve un valor por defecto."""
    if value is None or value.strip() == "":
        return default
    try:
        parsed = datetime.fromisoformat(value.strip())
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)
    except ValueError:
        return default


def _load_company_profiles(companies_csv: Path) -> dict[str, CompanyProfile]:
    """Carga de perfiles de empresa desde el archivo companies.csv."""
    if not companies_csv.exists():
        raise FileNotFoundError(f"No existe companies.csv: {companies_csv}")

    profiles: dict[str, CompanyProfile] = {}
    with companies_csv.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            company_id = (row.get("company_id") or "").strip()
            if not company_id:
                continue
            profiles[company_id] = CompanyProfile(
                company_id=company_id,
                country=(row.get("country") or "ES").strip().upper(),
                industry_code=(row.get("industry_code") or "G46").strip().upper(),
                baseline_revenue=max(_safe_float(row.get("baseline_revenue"), 100_000.0), 1_000.0),
            )

    if not profiles:
        raise ValueError("companies.csv no contiene perfiles válidos")

    return profiles


def _load_pairs_from_supplies(rel_supplies_csv: Path) -> list[CompanyPair]:
    """Carga de datos de relaciones comerciales desde el archivo rel_supplies.csv."""
    if not rel_supplies_csv.exists():
        return []

    pairs: list[CompanyPair] = []
    fallback_since = datetime.now(UTC) - timedelta(days=365)
    with rel_supplies_csv.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            supplier = (row.get("supplier_company_id") or "").strip()
            buyer = (row.get("buyer_company_id") or "").strip()
            if not supplier or not buyer or supplier == buyer:
                continue
            pairs.append(
                CompanyPair(
                    supplier_company_id=supplier,
                    buyer_company_id=buyer,
                    payment_terms_days=_safe_int(row.get("payment_terms_agreed"), 30),
                    since_date=_safe_date_to_datetime(row.get("since_date"), fallback_since),
                )
            )

    return pairs


def _random_issue_datetime(rng: random.Random, relation_start: datetime) -> datetime:
    """Genera una fecha de emisión entre inicio de relación comercial y hoy."""
    now = datetime.now(UTC)
    start = relation_start.astimezone(UTC)
    if start >= now:
        return now
    window_minutes = int((now - start).total_seconds() // 60)
    offset_minutes = rng.randint(0, max(window_minutes, 1))
    return start + timedelta(minutes=offset_minutes)


def _base_amount_from_revenue(supplier_revenue: float, buyer_revenue: float,
                              rng: random.Random,) -> float:
    """Genera un importe base para el pedido basado en la facturación anual de las empresas involucradas."""
    min_revenue = max(min(supplier_revenue, buyer_revenue), 10_000.0)
    lower = max(min_revenue * 0.0002, 300.0)
    upper = max(min_revenue * 0.02, lower + 250.0)
    return round(rng.uniform(lower, upper), 2)


def _currency_for_pair(supplier_country: str, buyer_country: str) -> str:
    if supplier_country == buyer_country:
        return COUNTRY_CURRENCY.get(supplier_country, "EUR")
    if supplier_country in COUNTRY_CURRENCY:
        return COUNTRY_CURRENCY[supplier_country]
    if buyer_country in COUNTRY_CURRENCY:
        return COUNTRY_CURRENCY[buyer_country]
    return "EUR"


def _tax_rate_for_industry(industry_code: str, rng: random.Random) -> float:
    """Genera una tasa de impuesto para una industria específica."""
    rates = INDUSTRY_TAX_RATES.get(industry_code, [0.21])
    return rng.choice(rates)


def _generate_triplet_records(base_seq: int, rng: random.Random, pair: CompanyPair,
                              supplier_profile: CompanyProfile, buyer_profile: CompanyProfile,
                              ) -> list[dict[str, str | int | float | bool]]:
    """Generación de secuencia lógica de 3 documentos: Pedido -> Albarán -> Factura."""
    # Fechas de emisión con lógica temporal con intervalos realistas entre documentos
    order_issue = _random_issue_datetime(rng, pair.since_date)
    delivery_issue = order_issue + timedelta(days=rng.randint(1, 10))
    invoice_issue = delivery_issue + timedelta(days=rng.randint(0, 7))

    # Importe base del pedido calculado a partir de la facturación anual de las empresas, con variabilidad aleatoria.
    base_amount = _base_amount_from_revenue(
        supplier_revenue=supplier_profile.baseline_revenue,
        buyer_revenue=buyer_profile.baseline_revenue,
        rng=rng,
    )
    order_gross = base_amount
    fulfillment_ratio = rng.uniform(0.96, 1.00)
    delivery_gross = round(order_gross * fulfillment_ratio, 2)
    invoice_gross = delivery_gross
    
    # Tasa de impuesto determinada por la industria del proveedor.
    tax_rate = _tax_rate_for_industry(supplier_profile.industry_code, rng)
    order_tax = round(order_gross * tax_rate, 2)
    delivery_tax = round(delivery_gross * tax_rate, 2)
    invoice_tax = round(invoice_gross * tax_rate, 2)

    # Importe total calculado como base + impuestos.
    order_total = round(order_gross + order_tax, 2)
    delivery_total = round(delivery_gross + delivery_tax, 2)
    invoice_total = round(invoice_gross + invoice_tax, 2)

    # Moneda determinada por los países del proveedor y comprador.
    currency = _currency_for_pair(supplier_profile.country, buyer_profile.country)
    version = rng.randint(VERSION_RANGE[0], VERSION_RANGE[1])

    return [
        {
            "document_id": f"DOC-{base_seq:09d}",                                           # ID de documento para el pedido
            "doc_type": "ORDER",                                                            # Tipo de documento: Pedido
            "edi_standard": rng.choice(EDI_STANDARDS),                                      # Estándar EDI utilizado
            "version_number": version,                                                      # Número de versión del estándar EDI
            "issue_date": order_issue.date().isoformat(),                                   # Fecha de emisión del pedido
            "due_date": "",                                                                 # Los pedidos no tienen fecha de vencimiento definida
            "status": rng.choice(["OPEN", "ACCEPTED", "PARTIALLY_CONFIRMED"]),              # Estado del pedido
            "discrepancy_flag": rng.choices([True, False], weights=[0.03, 0.97], k=1)[0],   # Indicador de discrepancia con baja probabilidad
            "currency": currency,                                                           # Moneda de pago del pedido
            "gross_amount": order_gross,                                                    # Importe bruto del pedido
            "tax_amount": order_tax,                                                        # Cantidad de impuestos del pedido
            "net_amount": order_total,                                                      # Importe neto del pedido
            "payment_terms_days": pair.payment_terms_days,                                  # Plazo de pago en días
            "created_at": order_issue.isoformat(),                                          # Fecha de creación del pedido
        },
        {
            "document_id": f"DOC-{base_seq + 1:09d}",                                       # ID de documento para el albarán, secuencial al pedido        
            "doc_type": "DELIVERY_NOTE",                                                    # Tipo de documento: Albarán
            "edi_standard": rng.choice(EDI_STANDARDS),                                      # Estándar EDI utilizado para el albarán
            "version_number": version,                                                      # Número de versión del estándar EDI
            "issue_date": delivery_issue.date().isoformat(),                                # Fecha de emisión del albarán, después del pedido
            "due_date": "",                                                                 # Los albaranes no tienen fecha de vencimiento definida
            "status": rng.choice(["SHIPPED", "DELIVERED", "PARTIALLY_DELIVERED"]),          # Estado del albarán
            "discrepancy_flag": rng.choices([True, False], weights=[0.04, 0.96], k=1)[0],   # Indicador de discrepancia con baja probabilidad
            "currency": currency,                                                           # Moneda de pago del albarán, misma que el pedido
            "gross_amount": delivery_gross,                                                 # Importe bruto del albarán, basado en el pedido con variabilidad
            "tax_amount": delivery_tax,                                                     # Cantidad de impuestos del albarán, calculada con la misma tasa que el pedido
            "net_amount": delivery_total,                                                   # Importe neto del albarán
            "payment_terms_days": pair.payment_terms_days,                                  # Plazo de pago en días, mismo que el pedido
            "created_at": delivery_issue.isoformat(),                                       # Fecha de creación del albarán, después del pedido
        },
        {
            "document_id": f"DOC-{base_seq + 2:09d}",                                       # ID de documento para la factura, secuencial al albarán               
            "doc_type": "INVOICE",                                                          # Tipo de documento: Factura
            "edi_standard": rng.choice(EDI_STANDARDS),                                      # Estándar EDI utilizado para la factura
            "version_number": version,                                                      # Número de versión del estándar EDI
            "issue_date": invoice_issue.date().isoformat(),                                 # Fecha de emisión de la factura, después del albarán
            "due_date": (invoice_issue + timedelta(days=pair.payment_terms_days)).date().isoformat(), # Fecha de vencimiento de la factura, calculada a partir de la fecha de emisión y los términos de pago
            "status": rng.choice(["ISSUED", "SENT", "PAID", "OVERDUE"]),                    # Estado de la factura
            "discrepancy_flag": rng.choices([True, False], weights=[0.06, 0.94], k=1)[0],   # Indicador de discrepancia con baja probabilidad
            "currency": currency,                                                           # Moneda de pago de la factura, misma que el pedido y albarán
            "gross_amount": invoice_gross,                                                  # Importe bruto de la factura, basado en el pedido con variabilidad
            "tax_amount": invoice_tax,                                                      # Cantidad de impuestos de la factura, calculada con la misma tasa que el pedido
            "net_amount": invoice_total,                                                    # Importe neto de la factura, basado en el pedido con variabilidad
            "payment_terms_days": pair.payment_terms_days,                                  # Plazo de pago en días, mismo que el pedido y albarán
            "created_at": invoice_issue.isoformat(),                                        # Fecha de creación de la factura, después del albarán
        },
    ]


def synthesize_documents_csv(output_file: Path, companies_csv: Path, rel_supplies_csv: Path,
                             seed: int, avg_out_degree: int,) -> Path:
    """Función principal para sintetizar el archivo documents.csv a partir de los datos de companies.csv y rel_supplies.csv."""
    if avg_out_degree <= 0:
        raise ValueError("avg_out_degree debe ser > 0")

    rng = random.Random(seed)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Carga de perfiles de empresa y relaciones comerciales.
    company_profiles = _load_company_profiles(companies_csv)
    pairs = _load_pairs_from_supplies(rel_supplies_csv)
    if not pairs:
        raise ValueError("No hay relaciones en rel_supplies.csv para sintetizar documents.csv")

    # Definición de los campos del CSV de salida.
    fieldnames = [
        "document_id", "doc_type", "edi_standard", "version_number", "issue_date",
        "due_date", "status", "discrepancy_flag", "currency", "gross_amount",
        "tax_amount", "net_amount", "payment_terms_days", "created_at",
    ]

    # Generación de registros para cada triplete de documentos (Pedido, Albarán, Factura) basado en las relaciones comerciales.
    records: list[dict[str, str | int | float | bool]] = []
    triplets_to_generate = max(len(pairs) * avg_out_degree, 1)  # Numero de tripletes a generar. 

    # Para cada triplete, se selecciona un par supplier-buyer, se obtienen sus perfiles y se generan los registros.
    for triplet_index in range(triplets_to_generate):
        pair = pairs[triplet_index % len(pairs)]
        supplier_profile = company_profiles.get(pair.supplier_company_id)
        buyer_profile = company_profiles.get(pair.buyer_company_id)
        if supplier_profile is None or buyer_profile is None:
            continue

        # Calculo de base_seq para asegurar que cada triplete tenga IDs de documento únicos y secuenciales.    
        base_seq = triplet_index * 3 + 1
        triplet_records = _generate_triplet_records(
            base_seq=base_seq,
            rng=rng,
            pair=pair,
            supplier_profile=supplier_profile,
            buyer_profile=buyer_profile,
        )
        records.extend(triplet_records)

    # Escritura de los registros generados en el archivo CSV de salida.
    with output_file.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            writer.writerow(record)

    return output_file


def build_parser() -> argparse.ArgumentParser:
    """Configuracion de la línea de comandos para poder pasarle parámetros al ejecutar el script."""
    parser = argparse.ArgumentParser(description="Generador sintético para documents.csv")
    parser.add_argument("--seed", type=int, default=42, help="Semilla reproducible")
    parser.add_argument("--companies", type=str, default="data/synthetic/companies.csv", help="Ruta del CSV companies.csv")
    parser.add_argument("--supplies", type=str, default="data/synthetic/rel_supplies.csv", help="Ruta del CSV rel_supplies.csv")
    parser.add_argument("--avg-out-degree", type=int, default=3, help="Numero de tripletes por cada par supplier-buyer")
    parser.add_argument("--output", type=str, default="data/synthetic/documents.csv", help="Ruta de salida de documents.csv")
    return parser


def main() -> None:
    """Punto de entrada del programa."""
    # Lectura de argumentos desde la línea de comandos
    args = build_parser().parse_args()
    
    # Llamada a la función principal con los parámetros proporcionados
    result = synthesize_documents_csv(
        output_file=Path(args.output),
        companies_csv=Path(args.companies),
        rel_supplies_csv=Path(args.supplies),
        seed=args.seed,
        avg_out_degree=args.avg_out_degree,
    )
    print(f"[OK] documents sintetizado -> {result}")


if __name__ == "__main__":
    main()
