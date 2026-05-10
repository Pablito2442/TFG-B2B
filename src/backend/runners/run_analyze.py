from __future__ import annotations
from dataclasses import asdict
from datetime import datetime, UTC
import logging
from pathlib import Path

from src.backend.config import Settings
from src.backend.utils import write_step_artifact, export_dict_to_json, export_df_to_json
from src.backend.analytics.analyzer import B2BGraphAnalyzer

def run_analyze(settings: Settings) -> Path:
    """
    Fase 3: Análisis de la topología de red y exportación de resultados a JSON.
    """
    
    export_dir = settings.data_export_dir
    export_dir.mkdir(parents=True, exist_ok=True)
    
    logging.info(f"")
    logging.info(f"[FASE 3] Analítica Avanzada (GDS) y Exportación iniciada.")
    logging.info(f"         Directorio destino: '{export_dir.name}/'")
    
    with B2BGraphAnalyzer(
        neo4j_uri=settings.neo4j_uri,
        neo4j_user=settings.neo4j_user,
        neo4j_password=settings.neo4j_password,
        neo4j_database=settings.neo4j_database
    ) as analyzer:
        analyzer.verify_connection()

        # Exportación de métricas y resultados analíticos a JSON
        macro_path = export_dict_to_json(
            asdict(analyzer.get_macro_statistics()), export_dir, "macro_statistics.json"
        )
        # temporal_path = export_df_to_json(
        #     analyzer.get_temporal_distribution(), export_dir, "temporal_series.json"
        # )
        lineage_path = export_df_to_json(
            analyzer.trace_discrepancy_lineage(limit=50), export_dir, "data_lineage.json"
        )
        
        # Descomentar cuando GDS esté implementado
        # bottlenecks_path = export_df_to_json(analyzer.compute_betweenness_centrality(), export_dir, "bottlenecks.json")
        # communities_path = export_df_to_json(analyzer.detect_communities_louvain(), export_dir, "communities.json")

    payload = {
        "step": "analyze",
        "status": "ok",
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "exported_files": [
            str(macro_path.name),
            # str(temporal_path.name),
            str(lineage_path.name),
            # str(bottlenecks_path.name),
            # str(communities_path.name)
        ],
        "message": f"Fase analítica completada. Archivos exportados a la carpeta de distribución ({export_dir.name}/).",
    }
    return write_step_artifact(settings.data_processed_dir, "analyze", payload)