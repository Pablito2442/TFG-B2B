from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
import pandas as pd

from neo4j import Driver, GraphDatabase


@dataclass(frozen=True)
class GraphMacroStats:
    """Estructura inmutable para las métricas macroscópicas de la red."""
    node_counts: dict[str, int]
    relationship_counts: dict[str, int]
    top_suppliers: list[dict[str, Any]]
    top_buyers: list[dict[str, Any]]
    doc_type_counts: dict[str, int]


class B2BGraphAnalyzer:
    """
    Motor analítico central. Orquesta la ejecución de métricas globales, 
    consultas transversales (Pathfinding) y algoritmos de Graph Data Science (GDS).
    """

    MACRO_QUERIES = {
        "nodes": "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS total ORDER BY label",
        "edges": "MATCH ()-[r]->() RETURN type(r) AS relationship, count(r) AS total ORDER BY relationship",
        "temporal": """
            MATCH (d:Document)-[:Issue_on]->(tb:TimeBucket) 
            RETURN tb.year AS year, tb.month AS month, count(d) AS documents 
            ORDER BY year, month
        """,
        "top_suppliers": """
            MATCH (supplier:Company)-[r:SUPPLIES]->(buyer:Company)
            RETURN supplier.company_id AS company_id, supplier.legal_name AS legal_name,
                   count(r) AS supplies_out, avg(r.agreed_volume_baseline) AS avg_agreed_volume
            ORDER BY supplies_out DESC, avg_agreed_volume DESC LIMIT 5
        """,
        "top_buyers": """
            MATCH (supplier:Company)-[r:SUPPLIES]->(buyer:Company)
            RETURN buyer.company_id AS company_id, buyer.legal_name AS legal_name,
                   count(r) AS supplies_in, avg(r.agreed_volume_baseline) AS avg_agreed_volume
            ORDER BY supplies_in DESC, avg_agreed_volume DESC LIMIT 5
        """,
        "doc_types": "MATCH (d:Document) RETURN d.doc_type AS doc_type, count(d) AS total ORDER BY total DESC"
    }

    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str, neo4j_database: str) -> None:
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

    # =========================================================================
    # MÓDULO 1: ESTADÍSTICAS MACROSCÓPICAS
    # =========================================================================
    def get_macro_statistics(self) -> GraphMacroStats:
        """Extrae el resumen de salud de la base de datos (nodos, aristas, top conectividad)."""
        with self._driver.session(database=self.neo4j_database) as session:
            nodes_data = session.run(self.MACRO_QUERIES["nodes"]).data()
            edges_data = session.run(self.MACRO_QUERIES["edges"]).data()
            suppliers_data = session.run(self.MACRO_QUERIES["top_suppliers"]).data()
            buyers_data = session.run(self.MACRO_QUERIES["top_buyers"]).data()
            doc_types_data = session.run(self.MACRO_QUERIES["doc_types"]).data()

        node_counts = {str(row["label"]): int(row["total"]) for row in nodes_data if row.get("label")}
        edge_counts = {str(row["relationship"]): int(row["total"]) for row in edges_data if row.get("relationship")}
        doc_type_counts = {str(row["doc_type"]): int(row["total"]) for row in doc_types_data if row.get("doc_type")}

        return GraphMacroStats(
            node_counts=node_counts,
            relationship_counts=edge_counts,
            top_suppliers=suppliers_data,
            top_buyers=buyers_data,
            doc_type_counts=doc_type_counts
        )
    
    def get_network_geography(self) -> list[dict[str, Any]]:
        """Extrae la distribución geográfica (ciudades, coordenadas y peso) para el mapa."""
        query = """
            MATCH (c:Company)
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            RETURN 
                c.city AS name, 
                [c.longitude, c.latitude] AS coordinates, 
                count(c) AS weight
            ORDER BY weight DESC
        """
        with self._driver.session(database=self.neo4j_database) as session:
            result = session.run(query)
            # Devolvemos una lista de diccionarios, que FastAPI convertirá fácilmente a JSON
            return [record.data() for record in result]

    # =========================================================================
    # MÓDULO 2: SERIES TEMPORALES
    # =========================================================================
    def get_temporal_distribution(self) -> pd.DataFrame:
        """Extrae la serie temporal para gráficos de evolución."""
        with self._driver.session(database=self.neo4j_database) as session:
            result = session.run(self.MACRO_QUERIES["temporal"])
            records = [record.data() for record in result]
        return pd.DataFrame(records)

    # =========================================================================
    # MÓDULO 3: TRAZABILIDAD Y DATA LINEAGE
    # =========================================================================
    def trace_discrepancy_lineage(self, limit: int = 50) -> pd.DataFrame:
        """Rastrea el ciclo de vida documental hacia atrás (Factura -> Albarán -> Pedido)."""
        query = """
            MATCH (invoice:Document {doc_type: 'INVOICE', discrepancy_flag: true})
            MATCH lineage_path = (invoice)-[:FULFILLS*1..5]->(order:Document {doc_type: 'ORDER'})
            MATCH (supplier:Company)-[:ISSUES]->(order)-[:SENT_TO]->(buyer:Company)
            MATCH (order)-[c:CONTAINS]->(product:Product)
            RETURN 
                invoice.document_id AS factura_id,
                invoice.gross_amount AS riesgo_economico,
                order.document_id AS pedido_original,
                supplier.legal_name AS proveedor,
                buyer.legal_name AS afectado,
                collect(DISTINCT product.product_id) AS id_productos_implicados,
                length(lineage_path) AS saltos_topologicos
            ORDER BY invoice.gross_amount DESC
            LIMIT $limit
        """
        with self._driver.session(database=self.neo4j_database) as session:
            result = session.run(query, limit=limit)
            records = [record.data() for record in result]
            
        return pd.DataFrame(records)

    # =========================================================================
    # MÓDULO 4: GRAPH DATA SCIENCE (GDS)
    # =========================================================================
    def compute_betweenness_centrality(self) -> pd.DataFrame:
        """Calcula Centralidad de Intermediación (Cuellos de Botella)."""
        project_query = "CALL gds.graph.project('b2b_logistics', 'Company', 'SUPPLIES') YIELD graphName;"
        
        compute_query = """
            CALL gds.betweenness.stream('b2b_logistics')
            YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS company, score
            RETURN company.company_id AS company_id, 
                   company.legal_name AS legal_name, 
                   company.node_role AS role,
                   score AS betweenness_score
            ORDER BY score DESC
            LIMIT 10;
        """
        drop_query = "CALL gds.graph.drop('b2b_logistics', false) YIELD graphName;"
        
        with self._driver.session(database=self.neo4j_database) as session:
            try: session.run(drop_query)
            except Exception: pass
                
            session.run(project_query)
            result = session.run(compute_query)
            records = [record.data() for record in result]
            session.run(drop_query)
            
        return pd.DataFrame(records)
        
    def detect_communities_louvain(self) -> pd.DataFrame:
        """Detecta ecosistemas logísticos (Clústeres) mediante algoritmo de Louvain."""
        project_query = """
            CALL gds.graph.project(
                'b2b_louvain',
                'Company',
                { SUPPLIES: { orientation: 'UNDIRECTED', properties: 'agreed_volume_baseline' } }
            ) YIELD graphName;
        """
        
        compute_query = """
            CALL gds.louvain.stream('b2b_louvain', { relationshipWeightProperty: 'agreed_volume_baseline' })
            YIELD nodeId, communityId
            WITH gds.util.asNode(nodeId) AS company, communityId
            RETURN communityId, 
                   count(company) AS total_empresas,
                   collect(company.legal_name)[0..3] AS ejemplos_empresas
            ORDER BY total_empresas DESC
            LIMIT 10;
        """
        drop_query = "CALL gds.graph.drop('b2b_louvain', false) YIELD graphName;"

        with self._driver.session(database=self.neo4j_database) as session:
            try: session.run(drop_query)
            except Exception: pass

            session.run(project_query)
            result = session.run(compute_query)
            records = [record.data() for record in result]
            session.run(drop_query)

        return pd.DataFrame(records)

    # =========================================================================
    # MÓDULO 5: ANALÍTICA AVANZADA DE RIESGO
    # =========================================================================
    def get_supplier_risk_concentration(self, top_n: int = 10) -> dict[str, Any]:
        """Calcula qué % del total de enlaces SUPPLIES acaparan los top-N proveedores."""
        query_total = "MATCH ()-[:SUPPLIES]->() RETURN count(*) AS total"
        query_top = """
            MATCH (c:Company)-[:SUPPLIES]->()
            WITH c, count(*) AS degree
            ORDER BY degree DESC LIMIT $top_n
            RETURN c.legal_name AS name, degree
        """
        with self._driver.session(database=self.neo4j_database) as session:
            total_row = session.run(query_total).single()
            total = int(total_row["total"]) if total_row else 0
            top_records = session.run(query_top, top_n=top_n).data()

        top_degree_sum = sum(int(r["degree"]) for r in top_records)
        top_suppliers = [
            {
                "name": r["name"],
                "degree": int(r["degree"]),
                "share_pct": round(int(r["degree"]) / total * 100, 2) if total else 0,
            }
            for r in top_records
        ]
        return {
            "total_supplies_edges": total,
            "top_n": top_n,
            "concentration_pct": round(top_degree_sum / total * 100, 2) if total else 0,
            "top_suppliers": top_suppliers,
        }

    def get_discrepancy_rate_by_supplier(self, min_invoices: int = 5) -> pd.DataFrame:
        """Tasa de facturas con discrepancia por proveedor (top-20 más problemáticos)."""
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
        with self._driver.session(database=self.neo4j_database) as session:
            records = session.run(query, min_invoices=min_invoices).data()
        return pd.DataFrame(records)

    def get_lead_time_compliance(self) -> pd.DataFrame:
        """Retraso medio vs. baseline por categoría de producto."""
        query = """
            MATCH (doc:Document)-[:CONTAINS]->(p:Product)
            WHERE doc.lead_time_days IS NOT NULL AND p.lead_time_baseline_days IS NOT NULL
            WITH p.category AS category,
                 avg(toFloat(doc.lead_time_days) - toFloat(p.lead_time_baseline_days)) AS avg_delay,
                 count(doc) AS sample,
                 count(CASE WHEN toFloat(doc.lead_time_days) > toFloat(p.lead_time_baseline_days) THEN 1 END) AS late_count
            RETURN category,
                   round(avg_delay, 2) AS avg_delay_days,
                   sample,
                   late_count,
                   round(toFloat(late_count) / sample * 100, 1) AS late_pct
            ORDER BY avg_delay_days DESC
            LIMIT 15
        """
        with self._driver.session(database=self.neo4j_database) as session:
            records = session.run(query).data()
        return pd.DataFrame(records)

    def get_payment_terms_exposure(self) -> pd.DataFrame:
        """Exposición financiera total (suma de importes) por proveedor top-15."""
        query = """
            MATCH (sup:Company)-[:ISSUES]->(doc:Document {doc_type: 'INVOICE'})
            WHERE doc.payment_terms_days IS NOT NULL AND doc.gross_amount IS NOT NULL
            WITH sup.legal_name AS supplier,
                 sum(toFloat(doc.gross_amount)) AS total_exposure,
                 avg(toFloat(doc.payment_terms_days)) AS avg_payment_days,
                 count(doc) AS invoice_count
            ORDER BY total_exposure DESC
            LIMIT 15
            RETURN supplier,
                   round(total_exposure, 2) AS total_exposure_eur,
                   round(avg_payment_days, 1) AS avg_payment_days,
                   invoice_count
        """
        with self._driver.session(database=self.neo4j_database) as session:
            records = session.run(query).data()
        return pd.DataFrame(records)