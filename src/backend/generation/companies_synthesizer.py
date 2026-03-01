from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC
from pathlib import Path


@dataclass(frozen=True)
class CityPoint:
	country: str
	region: str
	city: str
	lat: float
	lon: float


CITY_POINTS: list[CityPoint] = [
	CityPoint("ES", "Madrid", "Madrid", 40.4168, -3.7038),
	CityPoint("ES", "Catalonia", "Barcelona", 41.3874, 2.1686),
	CityPoint("ES", "Valencian Community", "Valencia", 39.4699, -0.3763),
	CityPoint("PT", "Lisboa", "Lisbon", 38.7223, -9.1393),
	CityPoint("PT", "Porto", "Porto", 41.1579, -8.6291),
	CityPoint("FR", "Île-de-France", "Paris", 48.8566, 2.3522),
	CityPoint("DE", "Bavaria", "Munich", 48.1351, 11.5820),
	CityPoint("IT", "Lombardy", "Milan", 45.4642, 9.1900),
	CityPoint("NL", "North Holland", "Amsterdam", 52.3676, 4.9041),
]

INDUSTRY_CODES = ["C10", "C20", "C25", "C28", "G46", "H52", "J62", "M70"]
SIZE_BANDS = ["micro", "pyme", "mid", "enterprise"]
NODE_ROLES = ["SUPPLIER", "BUYER", "HYBRID"]
ROLE_WEIGHTS = [0.25, 0.25, 0.50]
SIZE_WEIGHTS = [0.40, 0.35, 0.20, 0.05]

NAME_PREFIX = ["Iber", "Euro", "Nova", "Vertex", "Global", "Atlas", "Prime", "Delta"]
NAME_CORE = ["Supply", "Logistics", "Trade", "Components", "Systems", "Industries", "Foods", "Pharma"]
NAME_SUFFIX = ["SL", "SA", "GmbH", "BV", "SAS", "SRL", "Lda"]


def _tax_id(country: str, rng: random.Random) -> str:
	if country == "ES":
		return f"ES{rng.randint(10_000_000, 99_999_999)}{rng.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"
	return f"{country}{rng.randint(100_000_000, 999_999_999)}"


def _company_name(rng: random.Random) -> str:
	return f"{rng.choice(NAME_PREFIX)} {rng.choice(NAME_CORE)} {rng.choice(NAME_SUFFIX)}"


def _baseline_revenue(size_band: str, rng: random.Random) -> float:
	ranges = {
		"micro": (50_000, 450_000),
		"pyme": (450_000, 8_000_000),
		"mid": (8_000_000, 80_000_000),
		"enterprise": (80_000_000, 600_000_000),
	}
	low, high = ranges[size_band]
	return round(rng.uniform(low, high), 2)


def _created_at(rng: random.Random) -> str:
	start = datetime.now(UTC) - timedelta(days=365 * 8)
	offset_days = rng.randint(0, 365 * 8)
	date_value = start + timedelta(days=offset_days)
	return date_value.isoformat()


def synthesize_companies_csv(output_file: Path, rows: int, seed: int) -> Path:
	if rows <= 0:
		raise ValueError("rows debe ser > 0")

	rng = random.Random(seed)
	output_file.parent.mkdir(parents=True, exist_ok=True)

	fieldnames = [
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
	]

	with output_file.open("w", encoding="utf-8", newline="") as csv_file:
		writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
		writer.writeheader()

		for index in range(1, rows + 1):
			city_point = rng.choice(CITY_POINTS)
			size_band = rng.choices(SIZE_BANDS, weights=SIZE_WEIGHTS, k=1)[0]
			record = {
				"company_id": f"COMP-{index:07d}",
				"legal_name": _company_name(rng),
				"tax_id": _tax_id(city_point.country, rng),
				"edi_endpoint": f"as2://edi.comp-{index:07d}.b2b.local/inbox",
				"node_role": rng.choices(NODE_ROLES, weights=ROLE_WEIGHTS, k=1)[0],
				"country": city_point.country,
				"region": city_point.region,
				"city": city_point.city,
				"latitude": round(city_point.lat + rng.uniform(-0.15, 0.15), 6),
				"longitude": round(city_point.lon + rng.uniform(-0.15, 0.15), 6),
				"industry_code": rng.choice(INDUSTRY_CODES),
				"size_band": size_band,
				"baseline_revenue": _baseline_revenue(size_band, rng),
				"created_at": _created_at(rng),
				"is_active": rng.choices([True, False], weights=[0.95, 0.05], k=1)[0],
			}
			writer.writerow(record)

	return output_file


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Generador sintético para companies.csv")
	parser.add_argument("--rows", type=int, default=1000, help="Número de empresas a sintetizar")
	parser.add_argument("--seed", type=int, default=42, help="Semilla reproducible")
	parser.add_argument(
		"--output",
		type=str,
		default="data/synthetic/companies.csv",
		help="Ruta de salida del CSV de companies",
	)
	return parser


def main() -> None:
	args = build_parser().parse_args()
	target = Path(args.output)
	result = synthesize_companies_csv(target, rows=args.rows, seed=args.seed)
	print(f"[OK] companies synthesized -> {result}")


if __name__ == "__main__":
	main()
