from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.etl.analytics.analyzer import B2BGraphAnalyzer
from backend.auth.db.database import User
from backend.api.dependencies import get_analyzer_instance, get_current_user, neo4j_to_dict
from backend.api.models.company import CompanyProfileUpdate, DocumentStatusUpdate

from backend.core.config import load_settings 

logger = logging.getLogger(__name__)

router = APIRouter(tags=["company"])

settings = load_settings()


@router.get("/api/company/me")
def get_my_company(
    current_user: User = Depends(get_current_user),
    analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance),
):
    with analyzer._driver.session(database=settings.neo4j_database) as session:
        rec = session.run(
            "MATCH (c:Company {company_id: $cid}) RETURN c",
            cid=current_user.company_id,
        ).single()
    if not rec:
        raise HTTPException(status_code=404, detail="Empresa no encontrada en Neo4j")
    return neo4j_to_dict(rec["c"])


@router.patch("/api/company/me")
def update_my_company(
    body: CompanyProfileUpdate,
    current_user: User = Depends(get_current_user),
    analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos a actualizar")
    set_clause = ", ".join(f"c.{k} = ${k}" for k in updates)
    query = f"MATCH (c:Company {{company_id: $cid}}) SET {set_clause} RETURN c"
    with analyzer._driver.session(database=analyzer._database) as session:
        rec = session.run(query, cid=current_user.company_id, **updates).single()
    if not rec:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return neo4j_to_dict(rec["c"])


@router.get("/api/company/documents")
def get_my_documents(
    current_user: User = Depends(get_current_user),
    analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance),
):
    with analyzer._driver.session(database=settings.neo4j_database) as session:
        records = session.run(
            """
            MATCH (c:Company {company_id: $cid})-[:ISSUES]->(d:Document)
            RETURN d.document_id         AS document_id,
                   d.doc_type            AS doc_type,
                   d.status              AS status,
                   d.issue_date          AS issue_date,
                   d.due_date            AS due_date,
                   d.gross_amount        AS gross_amount,
                   d.total_amount        AS total_amount,
                   d.currency            AS currency,
                   d.discrepancy_flag    AS discrepancy_flag,
                   d.payment_terms_days  AS payment_terms_days,
                   d.contract_type       AS contract_type
            ORDER BY d.issue_date DESC
            LIMIT 200
            """,
            cid=current_user.company_id,
        ).data()

    return [
        {
            k: (
                v.iso_format() if hasattr(v, "iso_format")
                else v.isoformat() if hasattr(v, "isoformat")
                else v
            )
            for k, v in rec.items()
        }
        for rec in records
    ]


@router.patch("/api/documents/{doc_id}/status")
def update_document_status(
    doc_id: str,
    body: DocumentStatusUpdate,
    current_user: User = Depends(get_current_user),
    analyzer: B2BGraphAnalyzer = Depends(get_analyzer_instance),
):
    with analyzer._driver.session(database=analyzer._database) as session:
        rec = session.run(
            """
            MATCH (c:Company {company_id: $cid})-[:ISSUES]->(d:Document {document_id: $doc_id})
            SET d.status = $status
            RETURN d.document_id AS document_id, d.status AS status
            """,
            cid=current_user.company_id,
            doc_id=doc_id,
            status=body.status,
        ).single()
    if not rec:
        raise HTTPException(status_code=403, detail="Documento no encontrado o sin permiso de acceso")
    return {"document_id": rec["document_id"], "status": rec["status"]}