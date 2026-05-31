from __future__ import annotations

from typing import Any

import pandas as pd


class RiskMixin:
    """Analítica avanzada de riesgo operacional y financiero de la red de proveedores."""

    def get_supplier_risk_concentration(self, top_n: int = 10) -> dict[str, Any]:
        """
        Concentración de riesgo: qué % del total de enlaces SUPPLIES acaparan los top-N proveedores.
        Un concentration_pct alto indica dependencia peligrosa de pocos actores.
        """
        q_total = "MATCH ()-[:SUPPLIES]->() RETURN count(*) AS total"
        q_top   = """
            MATCH (c:Company)-[:SUPPLIES]->()
            WITH c, count(*) AS degree
            ORDER BY degree DESC LIMIT $top_n
            RETURN c.legal_name AS name, degree
        """
        with self._driver.session(database=self.neo4j_database) as s:
            total_row   = s.run(q_total).single()
            total       = int(total_row["total"]) if total_row else 0
            top_records = s.run(q_top, top_n=top_n).data()

        top_degree_sum = sum(int(r["degree"]) for r in top_records)
        top_suppliers  = [
            {
                "name":      r["name"],
                "degree":    int(r["degree"]),
                "share_pct": round(int(r["degree"]) / total * 100, 2) if total else 0,
            }
            for r in top_records
        ]
        return {
            "total_supplies_edges": total,
            "top_n":                top_n,
            "concentration_pct":    round(top_degree_sum / total * 100, 2) if total else 0,
            "top_suppliers":        top_suppliers,
        }

    def get_discrepancy_rate_by_supplier(self, min_invoices: int = 5) -> pd.DataFrame:
        """
        Tasa de facturas con discrepancia por proveedor (top-20 más problemáticos).
        Solo incluye proveedores con al menos min_invoices facturas emitidas.
        """
        query = """
            MATCH (sup:Company)-[:ISSUES]->(doc:Document {doc_type: 'INVOICE'})
            WITH sup, count(doc) AS total,
                 count(CASE WHEN doc.discrepancy_flag = true THEN 1 END) AS flagged
            WHERE total >= $min_invoices
            RETURN sup.legal_name AS supplier, total, flagged,
                   round(toFloat(flagged) / total * 100, 2) AS discrepancy_rate_pct
            ORDER BY discrepancy_rate_pct DESC
            LIMIT 20
        """
        with self._driver.session(database=self.neo4j_database) as s:
            records = s.run(query, min_invoices=min_invoices).data()
        return pd.DataFrame(records)

    def get_lead_time_compliance(self) -> pd.DataFrame:
        """
        Retraso medio vs. baseline por categoría de producto.
        avg_delay_days > 0 significa que los envíos llegan tarde de media.
        late_pct es el porcentaje de entregas que superaron el plazo base del producto.
        """
        query = """
            MATCH (doc:Document)-[:CONTAINS]->(p:Product)
            WHERE doc.lead_time_days IS NOT NULL AND p.lead_time_baseline_days IS NOT NULL
            WITH p.category AS category,
                 avg(toFloat(doc.lead_time_days) - toFloat(p.lead_time_baseline_days)) AS avg_delay,
                 count(doc) AS sample,
                 count(CASE WHEN toFloat(doc.lead_time_days) > toFloat(p.lead_time_baseline_days) THEN 1 END) AS late_count
            RETURN category,
                   round(avg_delay, 2)                          AS avg_delay_days,
                   sample,
                   late_count,
                   round(toFloat(late_count) / sample * 100, 1) AS late_pct
            ORDER BY avg_delay_days DESC
            LIMIT 15
        """
        with self._driver.session(database=self.neo4j_database) as s:
            records = s.run(query).data()
        return pd.DataFrame(records)

    def get_payment_terms_exposure(self) -> pd.DataFrame:
        """
        Exposición financiera total (suma de importes de facturas) por proveedor — top-15.
        Indica qué proveedores concentran mayor volumen de deuda pendiente de pago.
        """
        query = """
            MATCH (sup:Company)-[:ISSUES]->(doc:Document {doc_type: 'INVOICE'})
            WHERE doc.payment_terms_days IS NOT NULL AND doc.gross_amount IS NOT NULL
            WITH sup.legal_name AS supplier,
                 sum(toFloat(doc.gross_amount))        AS total_exposure,
                 avg(toFloat(doc.payment_terms_days))  AS avg_payment_days,
                 count(doc)                            AS invoice_count
            ORDER BY total_exposure DESC LIMIT 15
            RETURN supplier,
                   round(total_exposure, 2)     AS total_exposure_eur,
                   round(avg_payment_days, 1)   AS avg_payment_days,
                   invoice_count
        """
        with self._driver.session(database=self.neo4j_database) as s:
            records = s.run(query).data()
        return pd.DataFrame(records)