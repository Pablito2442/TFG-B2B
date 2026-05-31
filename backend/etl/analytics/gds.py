from __future__ import annotations

import pandas as pd


class GDSMixin:
    """
    Algoritmos de Graph Data Science (GDS).
    Requiere el plugin GDS de Neo4j — ya incluido en el contenedor Docker.
    Cada método crea una proyección temporal, ejecuta el algoritmo y la elimina.
    """

    def compute_betweenness_centrality(self) -> pd.DataFrame:
        """
        Centralidad de intermediación: empresas que actúan como cuellos de botella.
        Una puntuación alta significa que muchos caminos mínimos de la red pasan por esa empresa.
        Devuelve el top-10 por betweenness_score.
        """
        graph_name  = "b2b_logistics"
        project_q   = f"CALL gds.graph.project('{graph_name}', 'Company', 'SUPPLIES') YIELD graphName"
        compute_q   = f"""
            CALL gds.betweenness.stream('{graph_name}')
            YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS company, score
            RETURN company.company_id  AS company_id,
                   company.legal_name  AS legal_name,
                   company.node_role   AS role,
                   score               AS betweenness_score
            ORDER BY score DESC LIMIT 10
        """
        drop_q = f"CALL gds.graph.drop('{graph_name}', false) YIELD graphName"

        with self._driver.session(database=self.neo4j_database) as s:
            try: s.run(drop_q)
            except Exception: pass
            s.run(project_q)
            records = [r.data() for r in s.run(compute_q)]
            s.run(drop_q)

        return pd.DataFrame(records)

    def detect_communities_louvain(self) -> pd.DataFrame:
        """
        Detección de comunidades (ecosistemas logísticos) con el algoritmo de Louvain.
        Usa agreed_volume_baseline como peso de las aristas SUPPLIES.
        Devuelve los 10 clústeres más grandes con empresas de ejemplo.
        """
        graph_name = "b2b_louvain"
        project_q  = f"""
            CALL gds.graph.project(
                '{graph_name}', 'Company',
                {{ SUPPLIES: {{ orientation: 'UNDIRECTED', properties: 'agreed_volume_baseline' }} }}
            ) YIELD graphName
        """
        compute_q  = f"""
            CALL gds.louvain.stream('{graph_name}', {{ relationshipWeightProperty: 'agreed_volume_baseline' }})
            YIELD nodeId, communityId
            WITH gds.util.asNode(nodeId) AS company, communityId
            RETURN communityId,
                   count(company)                       AS total_empresas,
                   collect(company.legal_name)[0..3]    AS ejemplos_empresas
            ORDER BY total_empresas DESC LIMIT 10
        """
        drop_q = f"CALL gds.graph.drop('{graph_name}', false) YIELD graphName"

        with self._driver.session(database=self.neo4j_database) as s:
            try: s.run(drop_q)
            except Exception: pass
            s.run(project_q)
            records = [r.data() for r in s.run(compute_q)]
            s.run(drop_q)

        return pd.DataFrame(records)