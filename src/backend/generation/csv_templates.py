from __future__ import annotations

import csv
from pathlib import Path

CSV_SCHEMAS: dict[str, list[str]] = {
	"companies.csv": [
		"company_id",
		"legal_name",
		"tax_id",
		"country",
		"region",
		"city",
		"industry_code",
		"size_band",
		"created_at",
		"is_active",
	],
	"products.csv": [
		"product_id",
		"sku",
		"name",
		"category",
		"unit",
		"criticality",
		"is_substitutable",
	],
	"documents.csv": [
		"document_id",
		"doc_type",
		"issue_date",
		"due_date",
		"status",
		"currency",
		"gross_amount",
		"tax_amount",
		"net_amount",
		"payment_terms_days",
		"created_at",
	],
	"rel_supplies.csv": [
		"supplier_company_id",
		"buyer_company_id",
		"since_date",
		"lead_time_days",
		"reliability_score",
		"contract_type",
	],
	"rel_issues.csv": [
		"issuer_company_id",
		"document_id",
	],
	"rel_sent_to.csv": [
		"document_id",
		"receiver_company_id",
	],
	"rel_contains.csv": [
		"document_id",
		"product_id",
		"line_id",
		"quantity",
		"unit_price",
		"discount_pct",
		"line_amount",
	],
	"rel_fulfills.csv": [
		"from_document_id",
		"to_document_id",
		"fulfillment_ratio",
		"fulfilled_amount",
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
