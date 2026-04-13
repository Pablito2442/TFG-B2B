from __future__ import annotations

import csv
from pathlib import Path

CSV_SCHEMAS: dict[str, list[str]] = {
	"companies.csv": [
        "company_id",
        "legal_name",
        "tax_id",
        "edi_endpoint",
        "node_role",
        "country",
        "region",
        "city",
        "latitude",
        "longitude",
        "industry_code",
        "size_band",
        "baseline_revenue",
        "created_at",
        "is_active",
    ],
 
	"products.csv": [
		"product_id",
		"sku",
        "hs_code",
		"name",
		"category",
		"unit",
        "base_price",
        "lead_time_baseline_days",
		"criticality",
		"is_substitutable",
	],
 
	"documents.csv": [
		"document_id",
		"doc_type",
        "edi_standard",
        "version_number",
		"issue_date",
		"due_date",
		"status",
        "discrepancy_flag",
		"currency",
		"gross_amount",
		"tax_amount",
		"total_amount",
		"payment_terms_days",
  		"contract_type",
		"created_at",
  		"supplier_company_id",
    	"buyer_company_id",
     	"lead_time_days",
      	"delay_days",
       	"reference_id",
	],
 
	"rel_supplies.csv": [
		"supplier_company_id",
		"buyer_company_id",
		"since_date",
		"lead_time_days",
		"reliability_score",
        "agreed_volume_baseline",
        "is_exclusive_supplier",
        "payment_terms_agreed",
		"contract_type",
	],
 
	"rel_issues.csv": [
		"issuer_company_id",
		"document_id",
        "transmission_timestamp",
        "transmission_channel",
        "digital_signature_valid",
	],
 
	"rel_sent_to.csv": [
		"document_id",
		"receiver_company_id",
        "reception_timestamp",
        "acknowledgement_status",
        "routing_endpoint",
	],
 
	"rel_contains.csv": [
		"document_id",
		"product_id",
		"line_id",
        "lot_number",
		"quantity",
		"unit_price",
		"discount_pct",
		"line_amount",
        "line_status",
        "expected_delivery_date"
	],
 
	"rel_fulfills.csv": [
		"from_document_id",
		"to_document_id",
		"fulfillment_ratio",
		"fulfilled_amount",
        "reconciliation_status",
        "latency_days",
	],
}


def _normalize_csv_name(name: str) -> str:
	value = name.strip().lower()
	if value.endswith(".csv"):
		value = value[:-4]
	return value


def get_available_targets() -> list[str]:
	stems = [filename[:-4] for filename in CSV_SCHEMAS]
	return sorted(stems)


def resolve_csv_targets(csv_target: str) -> list[str]:
	value = _normalize_csv_name(csv_target)
	if value == "all":
		return sorted(CSV_SCHEMAS.keys())

	filename = f"{value}.csv"
	if filename not in CSV_SCHEMAS:
		available = ", ".join(["all", *get_available_targets()])
		raise ValueError(f"CSV objetivo inválido: '{csv_target}'. Valores válidos: {available}")

	return [filename]


def create_csv_templates(output_dir: Path, csv_target: str) -> list[Path]:
	output_dir.mkdir(parents=True, exist_ok=True)
	targets = resolve_csv_targets(csv_target)
	created_files: list[Path] = []

	for filename in targets:
		target_path = output_dir / filename
		with target_path.open("w", encoding="utf-8", newline="") as csv_file:
			writer = csv.writer(csv_file)
			writer.writerow(CSV_SCHEMAS[filename])
		created_files.append(target_path)

	return created_files
