from __future__ import annotations

from typing import Any

from neo4j import Driver, GraphDatabase

from backend.etl.analytics.macro   import MacroMixin,   GraphMacroStats
from backend.etl.analytics.lineage import LineageMixin
from backend.etl.analytics.gds     import GDSMixin
from backend.etl.analytics.risk    import RiskMixin


class B2BGraphAnalyzer(MacroMixin, LineageMixin, GDSMixin, RiskMixin):
    """
    Motor analítico central.

    Los métodos están organizados en cuatro módulos especializados:
      • macro.py    — estadísticas globales, geografía, series temporales
      • lineage.py  — trazabilidad documental (discrepancias)
      • gds.py      — Graph Data Science: centralidad, comunidades
      • risk.py     — riesgo operacional: concentración, discrepancias, lead time, exposición
    """

    def __init__(
        self,
        neo4j_uri:      str,
        neo4j_user:     str,
        neo4j_password: str,
        neo4j_database: str,
    ) -> None:
        self.neo4j_database = neo4j_database
        self._driver: Driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    def close(self) -> None:
        self._driver.close()

    def __enter__(self) -> "B2BGraphAnalyzer":
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.close()

    def verify_connection(self) -> None:
        self._driver.verify_connectivity()