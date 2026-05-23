import json
import logging
from pathlib import Path
from dataclasses import replace
from typing import List

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Importamos tu lógica nativa del backend
from backend.core.config import load_settings
from backend.etl.analytics.analyzer import B2BGraphAnalyzer
from backend.etl.runners.run_all import run_all
from backend.api.models import PipelineRequest, LocationResponse

# Configuración de Logging para trazabilidad
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TFG B2B Graph Intelligence API",
    description="Motor analítico de red logística impulsado por Neo4j",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# GESTIÓN GLOBAL DE EXCEPCIONES (Seguridad ante errores 500)
# ==========================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error no controlado en {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": "Error interno del servidor", "detail": str(exc)}
    )

# ==========================================================
# DEPENDENCIAS (Inyección de B2BGraphAnalyzer)
# ==========================================================
def get_analyzer_instance():
    """Función de utilidad para instanciar el analizador con la config actual."""
    settings = load_settings()
    
    # Asegúrate de que SOLO aparezca una vez cada argumento
    analyzer = B2BGraphAnalyzer(
        neo4j_uri=settings.neo4j_uri,
        neo4j_user=settings.neo4j_user,
        neo4j_password=settings.neo4j_password,
        neo4j_database=settings.neo4j_database
    )
    
    try:
        yield analyzer 
    finally:
        analyzer.close()

# ==========================================================
# RUTAS DE LECTURA (GET) - Real-time & JSON fallback
# ==========================================================
EXPORT_DIR = Path("data/export")

def _read_json(filename: str, default=None):
    path = EXPORT_DIR / filename
    if not path.exists():
        if default is not None:
            return default
        return {} if "macro" in filename or "risk" in filename else []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/")
def health_check():
    return {"status": "Online", "database": "Neo4j Backend Ready"}

@app.get("/api/network/locations", response_model=List[LocationResponse])
def get_network_locations(analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance)):
    """Consulta la base de datos en tiempo real para el mapa."""
    try:
        data = analyzer.get_network_geography()
        if not data:
            # Si no hay nodos, devolvemos un 404 informativo
            raise HTTPException(status_code=404, detail="No hay datos geográficos disponibles en la base de datos.")
        return data
    except Exception as e:
        logger.error(f"Error en consulta geográfica: {e}")
        raise HTTPException(status_code=500, detail="Error al conectar con Neo4j para obtener coordenadas.")

@app.get("/api/dashboard/macro")
def get_macro_dashboard():
    return {
        "macro_stats": _read_json("macro_statistics.json"),
        "temporal_series": _read_json("temporal_series.json")
    }

@app.get("/api/dashboard/lineage")
def get_data_lineage():
    return _read_json("data_lineage.json")

@app.get("/api/dashboard/gds")
def get_gds_analytics():
    return {
        "bottlenecks": _read_json("bottlenecks.json"),
        "communities": _read_json("communities.json")
    }

@app.get("/api/dashboard/risk")
def get_risk_concentration():
    return _read_json("risk_concentration.json", default={})

@app.get("/api/dashboard/discrepancy-suppliers")
def get_discrepancy_by_supplier():
    return _read_json("discrepancy_by_supplier.json", default=[])

@app.get("/api/dashboard/lead-time")
def get_lead_time_compliance():
    return _read_json("lead_time_compliance.json", default=[])

@app.get("/api/dashboard/payment")
def get_payment_exposure():
    return _read_json("payment_exposure.json", default=[])

# ==========================================================
# RUTAS DE EJECUCIÓN (POST) - Orquestador ETL
# ==========================================================
@app.post("/api/pipeline/run")
def trigger_pipeline(request: PipelineRequest):
    try:
        settings = load_settings()
        final_seed = None if request.use_random_seed else request.seed_value
        settings = replace(settings, seed=final_seed)

        run_all(
            settings=settings,
            rows=request.rows,
            avg_degree_products=request.avg_degree_products,
            avg_degree_rel_supplies=request.avg_degree_supplies,
            avg_degree_documents=request.avg_degree_documents,
            gamma=request.gamma,
            beta=request.beta,
            mu=request.mu,
            min_comm=request.min_comm,
            max_comm=request.max_comm,
            batch_size_loader=request.batch_size,
            clear_db=request.clear_db
        )
        return {"status": "success", "message": "Pipeline ejecutado correctamente"}
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/health")
def api_health_check(analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance)):
    """
    Endpoint de monitoreo (Health Check).
    Verifica que la API esté viva y que la conexión a Neo4j sea exitosa.
    """
    try:
        # Usamos el método nativo que tienes en tu clase B2BGraphAnalyzer
        analyzer.verify_connection()
        
        return {"status": "ok", "message": "Conexión estable con Neo4j"}
        
    except Exception as e:
        logger.error(f"Fallo en el Health Check de Neo4j: {str(e)}")
        
        # Lanzamos el HTTP 503 para que el frontend ponga la etiqueta en rojo
        raise HTTPException(
            status_code=503, 
            detail="La API está funcionando, pero Neo4j se encuentra offline o inaccesible."
        )