"""
Router: Ticket Search
Busca de tickets diretamente no banco MySQL GLPI (read-only).

Endpoints:
  GET /api/v1/{context}/tickets/search  — busca por texto, ID, filtros
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.search_service import search_tickets

router = APIRouter(prefix="/api/v1/{context}", tags=["Search"])

VALID_CONTEXTS = {"dtic", "sis"}


def _validate_context(context: str) -> str:
    ctx = context.lower()
    if ctx not in VALID_CONTEXTS:
        raise HTTPException(status_code=404, detail=f"Contexto '{context}' inválido. Use 'dtic' ou 'sis'.")
    return ctx


@router.get("/tickets/search")
async def search(
    context: str,
    q: str = Query(..., min_length=1, description="Texto de busca (ID, título, conteúdo)"),
    department: Optional[str] = Query(None, description="Departamento SIS: manutencao ou conservacao"),
    status: Optional[str] = Query(None, description="Status separados por vírgula: 1,2,3"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de resultados"),
):
    """
    Busca tickets no banco MySQL GLPI.

    - **Busca por ID**: quando `q` é numérico, busca exata por ticket ID.
    - **Busca textual**: LIKE em título, conteúdo e ID.
    - **department**: filtra por grupo técnico (manutencao=22, conservacao=21).
    - **status**: filtra por status (1=Novo, 2=Em Atendimento, etc.).
    """
    ctx = _validate_context(context)

    # Parsear status
    status_filter = None
    if status:
        try:
            status_filter = [int(s.strip()) for s in status.split(",")]
        except ValueError:
            raise HTTPException(status_code=400, detail="Status deve ser lista de inteiros separados por vírgula.")

    # Obter sessão do banco correto
    async for db in get_db(ctx):
        result = await search_tickets(
            db=db,
            query=q,
            department=department,
            status_filter=status_filter,
            limit=limit,
        )

        return {
            **result,
            "context": ctx,
            "department": department,
        }
