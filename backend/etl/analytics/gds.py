from __future__ import annotations

from typing import Any
import pandas as pd

# ══════════════════════════════════════════════════════════════════════════════
# CYPHER QUERIES
# ══════════════════════════════════════════════════════════════════════════════

# ─── 0. Auxiliar ─────────────────────────────────────────────────────────────
# Conteo previo de nodos Company para calcular el denominador de la normalización
# de betweenness: max_possible = (n-1)(n-2) para grafos dirigidos.

_Q_COMPANY_COUNT = "MATCH (c:Company) RETURN count(c) AS n"

# ─── 1. Betweenness Centrality ───────────────────────────────────────────────
# Proyección dirigida sin pesos — el score mide cuántos caminos mínimos pasan
# por cada nodo, independientemente del volumen comercial.
# WHERE score > 0 elimina nodos sin ningún rol de intermediación.

_GRAPH_BETWEENNESS = "b2b_betweenness"

_Q_BETWEENNESS_PROJECT = (
    f"CALL gds.graph.project('{_GRAPH_BETWEENNESS}', 'Company', 'SUPPLIES') YIELD graphName"
)

_Q_BETWEENNESS_COMPUTE = f"""
    CALL gds.betweenness.stream('{_GRAPH_BETWEENNESS}')
    YIELD nodeId, score
    WHERE score > 0
    WITH gds.util.asNode(nodeId) AS company, score
    RETURN company.company_id  AS company_id,
           company.legal_name  AS legal_name,
           company.node_role   AS role,
           score               AS betweenness_score
    ORDER BY score DESC LIMIT 10
"""

# ─── 2. PageRank ──────────────────────────────────────────────────────────────
# Proyección dirigida ponderada por agreed_volume_baseline.
# defaultValue: 1.0 previene fallos de proyección si alguna arista SUPPLIES
# carece del atributo (fallback a peso neutro).

_GRAPH_PAGERANK = "b2b_pagerank"

_Q_PAGERANK_PROJECT = f"""
    CALL gds.graph.project(
        '{_GRAPH_PAGERANK}', 'Company',
        {{ SUPPLIES: {{ properties: {{ agreed_volume_baseline: {{ defaultValue: 1.0 }} }} }} }}
    ) YIELD graphName
"""

_Q_PAGERANK_COMPUTE = f"""
    CALL gds.pageRank.stream('{_GRAPH_PAGERANK}', {{ relationshipWeightProperty: 'agreed_volume_baseline' }})
    YIELD nodeId, score
    WITH gds.util.asNode(nodeId) AS company, score
    RETURN company.company_id  AS company_id,
           company.legal_name  AS legal_name,
           company.node_role   AS role,
           score               AS pagerank_score
    ORDER BY score DESC LIMIT 10
"""

# ─── 3. Louvain Community Detection ──────────────────────────────────────────
# Proyección no dirigida ponderada: la simetría es necesaria para Louvain.
# defaultValue: 1.0 igual que en PageRank para aristas sin peso.
# Devuelve los 5 clústeres más grandes con 2 empresas de ejemplo cada uno.

_GRAPH_LOUVAIN = "b2b_louvain"

_Q_LOUVAIN_PROJECT = f"""
    CALL gds.graph.project(
        '{_GRAPH_LOUVAIN}', 'Company',
        {{ SUPPLIES: {{ orientation: 'UNDIRECTED', properties: {{ agreed_volume_baseline: {{ defaultValue: 1.0 }} }} }} }}
    ) YIELD graphName
"""

_Q_LOUVAIN_COMPUTE = f"""
    CALL gds.louvain.stream('{_GRAPH_LOUVAIN}', {{ relationshipWeightProperty: 'agreed_volume_baseline' }})
    YIELD nodeId, communityId
    WITH gds.util.asNode(nodeId) AS company, communityId
    RETURN communityId,
           count(company)                    AS total_empresas,
           collect(company.legal_name)[0..2] AS ejemplos_empresas
    ORDER BY total_empresas DESC LIMIT 5
"""

# ─── 4. Weakly Connected Components ──────────────────────────────────────────
# Proyección no dirigida sin pesos — WCC solo necesita saber si existe un
# camino entre dos nodos, no su dirección ni volumen.
# LIMIT 500 en Cypher evita transferir miles de filas para redes muy fragmentadas;
# el código Python toma solo los 10 mayores para visualización.

_GRAPH_WCC = "b2b_wcc"

_Q_WCC_PROJECT = f"""
    CALL gds.graph.project(
        '{_GRAPH_WCC}', 'Company',
        {{ SUPPLIES: {{ orientation: 'UNDIRECTED' }} }}
    ) YIELD graphName
"""

_Q_WCC_COMPUTE = f"""
    CALL gds.wcc.stream('{_GRAPH_WCC}')
    YIELD nodeId, componentId
    RETURN componentId, count(nodeId) AS size
    ORDER BY size DESC
    LIMIT 500
"""

# ══════════════════════════════════════════════════════════════════════════════
# MIXIN
# ══════════════════════════════════════════════════════════════════════════════

class GDSMixin:
    """
    Algoritmos de Graph Data Science (GDS).
    Requiere el plugin GDS de Neo4j — ya incluido en el contenedor Docker.
    Cada método crea una proyección temporal, ejecuta el algoritmo y la elimina.
    """

    def _run_gds(self, graph_name: str, project_q: str, compute_q: str) -> list[dict[str, Any]]:
        """Proyecta, ejecuta y elimina un grafo GDS temporal. Devuelve las filas como dicts.
        El drop se ejecuta en un finally para evitar proyecciones huérfanas si compute_q falla.
        """
        drop_q = f"CALL gds.graph.drop('{graph_name}', false) YIELD graphName"
        with self._driver.session(database=self.neo4j_database) as s:
            try:
                s.run(drop_q)
            except Exception:
                pass
            s.run(project_q)
            try:
                records = [r.data() for r in s.run(compute_q)]
            finally:
                s.run(drop_q)
        return records

    # ── Centralidad ──────────────────────────────────────────────────────────

    def compute_betweenness_centrality(self) -> pd.DataFrame:
        """
        Centralidad de intermediación: empresas que actúan como cuellos de botella.
        Devuelve el top-10 con score > 0 más normalized_pct = score / ((n-1)(n-2)) × 100,
        que representa el % de caminos mínimos dirigidos que pasan por esa empresa.
        """
        with self._driver.session(database=self.neo4j_database) as s:
            n = s.run(_Q_COMPANY_COUNT).single()["n"]
        max_possible = (n - 1) * (n - 2) if n > 2 else 1

        df = pd.DataFrame(self._run_gds(_GRAPH_BETWEENNESS, _Q_BETWEENNESS_PROJECT, _Q_BETWEENNESS_COMPUTE))
        if not df.empty:
            df["normalized_pct"] = (df["betweenness_score"] / max_possible * 100).round(2)
        return df

    def compute_pagerank(self) -> pd.DataFrame:
        """
        PageRank: 'titanes sistémicos' — proveedores con alta influencia estructural.
        Usa agreed_volume_baseline como peso para ponderar relaciones de alto volumen.
        Devuelve el top-10 por pagerank_score.
        """
        return pd.DataFrame(self._run_gds(_GRAPH_PAGERANK, _Q_PAGERANK_PROJECT, _Q_PAGERANK_COMPUTE))

    # ── Comunidades ──────────────────────────────────────────────────────────

    def detect_communities_louvain(self) -> pd.DataFrame:
        """
        Detección de comunidades (ecosistemas logísticos) con el algoritmo de Louvain.
        Usa agreed_volume_baseline como peso de las aristas SUPPLIES.
        Devuelve los 5 clústeres más grandes con 2 empresas de ejemplo.
        """
        return pd.DataFrame(self._run_gds(_GRAPH_LOUVAIN, _Q_LOUVAIN_PROJECT, _Q_LOUVAIN_COMPUTE))

    # ── Conectividad ─────────────────────────────────────────────────────────

    def detect_weakly_connected_components(self) -> dict:
        """
        WCC: salud estructural de la red — ¿se fragmentaría en una crisis global?
        Devuelve: cohesion_pct, total_components, isolated_nodes y los 10 mayores clusters.
        """
        rows = self._run_gds(_GRAPH_WCC, _Q_WCC_PROJECT, _Q_WCC_COMPUTE)

        if not rows:
            return {}

        total_nodes    = sum(r["size"] for r in rows)
        main_size      = rows[0]["size"]
        isolated_nodes = sum(1 for r in rows if r["size"] == 1)

        return {
            "total_components":    len(rows),
            "main_component_size": main_size,
            "main_component_pct":  round(main_size / total_nodes * 100, 1) if total_nodes else 0.0,
            "isolated_nodes":      isolated_nodes,
            "components": [
                {"component_id": r["componentId"], "size": r["size"]}
                for r in rows[:10]
            ],
        }