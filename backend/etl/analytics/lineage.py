from __future__ import annotations

import pandas as pd

_QUERY = """
    MATCH (invoice:Document {doc_type: 'INVOICE', discrepancy_flag: true})
    MATCH lineage_path = (invoice)-[:FULFILLS*1..5]->(order:Document {doc_type: 'ORDER'})
    MATCH (supplier:Company)-[:ISSUES]->(order)-[:SENT_TO]->(buyer:Company)
    MATCH (order)-[c:CONTAINS]->(product:Product)
    RETURN
        invoice.document_id                     AS factura_id,
        invoice.gross_amount                    AS riesgo_economico,
        order.document_id                       AS pedido_original,
        supplier.legal_name                     AS proveedor,
        buyer.legal_name                        AS afectado,
        collect(DISTINCT product.product_id)    AS id_productos_implicados,
        length(lineage_path)                    AS saltos_topologicos
    ORDER BY invoice.gross_amount DESC
    LIMIT $limit
"""


class LineageMixin:
    """Trazabilidad documental: rastrea facturas con discrepancia hasta su pedido origen."""

    def trace_discrepancy_lineage(self, limit: int = 50) -> pd.DataFrame:
        """
        Recorre la cadena FULFILLS hacia atrás (hasta 5 saltos) desde facturas
        con discrepancy_flag=true hasta el pedido original. Ordenado por riesgo económico.
        """
        with self._driver.session(database=self.neo4j_database) as s:
            records = [r.data() for r in s.run(_QUERY, limit=limit)]
        return pd.DataFrame(records)