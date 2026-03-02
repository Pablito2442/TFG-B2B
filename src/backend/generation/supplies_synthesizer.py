from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


@dataclass(frozen=True)
class CompanyRecord:
	company_id: str
	node_role: str
	baseline_revenue: float


CONTRACT_TYPES = ["FRAME", "SPOT", "ANNUAL", "MULTIYEAR"]
PAYMENT_TERMS = [15, 30, 45, 60, 90]
PAYMENT_TERMS_WEIGHTS = [0.05, 0.45, 0.25, 0.20, 0.05]


def _to_float(value: str | None, default: float = 0.0) -> float:
	if value is None or value.strip() == "":
		return default
	try:
		return float(value)
	except ValueError:
		return default


def load_companies(companies_csv: Path) -> list[CompanyRecord]:
	if not companies_csv.exists():
		raise FileNotFoundError(f"No existe el fichero de companies: {companies_csv}")

	companies: list[CompanyRecord] = []
	with companies_csv.open("r", encoding="utf-8", newline="") as csv_file:
		reader = csv.DictReader(csv_file)
		for row in reader:
			company_id = (row.get("company_id") or "").strip()
			node_role = (row.get("node_role") or "").strip().upper()
			if not company_id:
				continue
			if node_role not in {"SUPPLIER", "BUYER", "HYBRID"}:
				node_role = "HYBRID"
			companies.append(
				CompanyRecord(
					company_id=company_id,
					node_role=node_role,
					baseline_revenue=max(_to_float(row.get("baseline_revenue"), 1.0), 1.0),
				)
			)

	if not companies:
		raise ValueError("companies.csv no contiene registros válidos")

	return companies


def _weighted_choice_index(rng: random.Random, weights: list[float]) -> int:
	return rng.choices(range(len(weights)), weights=weights, k=1)[0]


def _random_since_date(rng: random.Random) -> str:
	today = date.today()
	start = today - timedelta(days=365 * 5)
	offset = rng.randint(0, (today - start).days)
	return (start + timedelta(days=offset)).isoformat()


def synthesize_rel_supplies_csv(
	output_file: Path,
	companies_csv: Path,
	avg_out_degree: int,
	seed: int,
) -> Path:
	if avg_out_degree <= 0:
		raise ValueError("avg_out_degree debe ser > 0")

	rng = random.Random(seed)
	companies = load_companies(companies_csv)

	suppliers = [company for company in companies if company.node_role in {"SUPPLIER", "HYBRID"}]
	buyers = [company for company in companies if company.node_role in {"BUYER", "HYBRID"}]

	if not suppliers:
		raise ValueError("No hay empresas con rol SUPPLIER/HYBRID en companies.csv")
	if not buyers:
		raise ValueError("No hay empresas con rol BUYER/HYBRID en companies.csv")

	target_edges = max(len(companies), len(suppliers) * avg_out_degree)

	out_degree: dict[str, int] = {company.company_id: 0 for company in suppliers}
	in_degree: dict[str, int] = {company.company_id: 0 for company in buyers}
	edges: set[tuple[str, str]] = set()

	max_attempts = target_edges * 20
	attempts = 0
	while len(edges) < target_edges and attempts < max_attempts:
		attempts += 1

		supplier_weights = [
			(out_degree[company.company_id] + 1) * (1.0 + company.baseline_revenue / 100_000_000.0)
			for company in suppliers
		]
		buyer_weights = [
			(in_degree[company.company_id] + 1) * (1.0 + company.baseline_revenue / 100_000_000.0)
			for company in buyers
		]

		supplier = suppliers[_weighted_choice_index(rng, supplier_weights)]
		buyer = buyers[_weighted_choice_index(rng, buyer_weights)]

		if supplier.company_id == buyer.company_id:
			continue

		edge = (supplier.company_id, buyer.company_id)
		if edge in edges:
			continue

		edges.add(edge)
		out_degree[supplier.company_id] += 1
		in_degree[buyer.company_id] += 1

	output_file.parent.mkdir(parents=True, exist_ok=True)
	fieldnames = [
		"supplier_company_id",
		"buyer_company_id",
		"since_date",
		"lead_time_days",
		"reliability_score",
		"agreed_volume_baseline",
		"is_exclusive_supplier",
		"payment_terms_agreed",
		"contract_type",
	]

	with output_file.open("w", encoding="utf-8", newline="") as csv_file:
		writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
		writer.writeheader()

		for supplier_id, buyer_id in sorted(edges):
			reliability = round(rng.uniform(0.82, 0.995), 4)
			writer.writerow(
				{
					"supplier_company_id": supplier_id,
					"buyer_company_id": buyer_id,
					"since_date": _random_since_date(rng),
					"lead_time_days": rng.randint(2, 45),
					"reliability_score": reliability,
					"agreed_volume_baseline": round(rng.uniform(1_000, 250_000), 2),
					"is_exclusive_supplier": rng.choices([True, False], weights=[0.12, 0.88], k=1)[0],
					"payment_terms_agreed": rng.choices(PAYMENT_TERMS, weights=PAYMENT_TERMS_WEIGHTS, k=1)[0],
					"contract_type": rng.choice(CONTRACT_TYPES),
				}
			)

	return output_file


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Generador sintético para rel_supplies.csv")
	parser.add_argument("--companies", type=str, default="data/synthetic/companies.csv", help="Ruta del CSV companies.csv",)
	parser.add_argument("--output", type=str, default="data/synthetic/rel_supplies.csv", help="Ruta de salida de rel_supplies.csv",)
	parser.add_argument("--avg-out-degree", type=int, default=3, help="Grado medio de salida por proveedor",)
	parser.add_argument("--seed", type=int, default=42, help="Semilla reproducible")
	return parser


def main() -> None:
	args = build_parser().parse_args()
	result = synthesize_rel_supplies_csv(
		output_file=Path(args.output),
		companies_csv=Path(args.companies),
		avg_out_degree=args.avg_out_degree,
		seed=args.seed,
	)
	print(f"[OK] rel_supplies sintetizado -> {result}")


if __name__ == "__main__":
	main()
