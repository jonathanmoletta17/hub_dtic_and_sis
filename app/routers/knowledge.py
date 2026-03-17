"""
Router: Knowledge Base
Base de Conhecimento do GLPI — leitura via SQL (CQRS) + escrita via API REST.

Endpoints (Leitura — SQL direto):
  GET /api/v1/{context}/knowledge/articles         — lista/busca artigos
  GET /api/v1/{context}/knowledge/articles/{id}     — artigo completo
  GET /api/v1/{context}/knowledge/categories        — categorias com contagem

Endpoints (Escrita — GLPI REST API, requer Session-Token):
  POST   /api/v1/{context}/knowledge/articles       — criar artigo
  PUT    /api/v1/{context}/knowledge/articles/{id}   — editar artigo
  DELETE /api/v1/{context}/knowledge/articles/{id}   — excluir artigo
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.schemas.knowledge_schemas import (
    KBArticleCreate, 
    KBArticleUpdate,
    KBListResponse,
    KBArticleResponse,
    KBCategoriesResponse
)
from app.services.knowledge_service import (
    get_kb_categories,
    search_kb_articles,
    get_kb_article,
)

logger = logging.getLogger(__name__)

from app.core.auth_guard import verify_session

# Leitura pública (sem auth) — consumido pelo frontend sem Session-Token
read_router = APIRouter(prefix="/api/v1/{context}", tags=["Knowledge Base"])
# Escrita protegida (com auth) — requer Session-Token validado
write_router = APIRouter(prefix="/api/v1/{context}", tags=["Knowledge Base"], dependencies=[Depends(verify_session)])

# Alias para manter compatibilidade com main.py (que faz app.include_router(router))
# Ambos os routers serão combinados via o objeto `router`
router = APIRouter()


def _validate_kb_context(context: str) -> str:
    """KB disponível apenas para DTIC."""
    if context.lower() != "dtic":
        raise HTTPException(
            status_code=404,
            detail="Base de Conhecimento disponível apenas para o contexto DTIC."
        )
    return context.lower()


def _get_glpi_client(session_token: str) -> GLPIClient:
    """Cria GLPIClient com o Session-Token do usuário logado."""
    instance = settings.get_glpi_instance("dtic")
    return GLPIClient.from_session_token(instance, session_token)


# ═══════════════════════════════════════════════════════════════
# LEITURA (SQL direto — CQRS)
# ═══════════════════════════════════════════════════════════════

@read_router.get("/knowledge/categories", response_model=KBCategoriesResponse)
async def list_categories(
    context: str,
    is_faq: Optional[bool] = Query(None, description="Filtrar contagem por FAQs"),
):
    """Lista categorias da KB com contagem de artigos."""
    _validate_kb_context(context)

    async for db in get_db("dtic"):
        categories = await get_kb_categories(db, is_faq=is_faq)
        return {"categories": categories}


@read_router.get("/knowledge/articles", response_model=KBListResponse)
async def list_articles(
    context: str,
    q: Optional[str] = Query(None, description="Texto de busca"),
    category_id: Optional[int] = Query(None, description="Filtrar por categoria"),
    is_faq: Optional[bool] = Query(None, description="Apenas FAQs"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de resultados"),
):
    """Lista/busca artigos da Base de Conhecimento."""
    _validate_kb_context(context)

    async for db in get_db("dtic"):
        result = await search_kb_articles(
            db=db,
            query=q,
            category_id=category_id,
            is_faq=is_faq,
            limit=limit,
        )
        return {
            "total": result.get("total", 0),
            "categories": result.get("categories", []),
            "articles": result.get("articles", []),
        }


@read_router.get("/knowledge/articles/{article_id}", response_model=KBArticleResponse)
async def get_article(context: str, article_id: int):
    """Retorna artigo completo com conteúdo HTML sanitizado."""
    _validate_kb_context(context)

    glpi_base_url = ""
    try:
        instance = settings.get_glpi_instance("dtic")
        glpi_base_url = instance.url.replace("/apirest.php", "")
    except Exception:
        pass

    async for db in get_db("dtic"):
        article = await get_kb_article(db, article_id, glpi_base_url)
        if not article:
            raise HTTPException(status_code=404, detail="Artigo não encontrado.")
        return {"article": article}


# ═══════════════════════════════════════════════════════════════
# ESCRITA (API REST GLPI — requer Session-Token do técnico)
# ═══════════════════════════════════════════════════════════════

@write_router.post("/knowledge/articles", status_code=201)
async def create_article(
    context: str,
    body: KBArticleCreate,
    session_token: str = Header(..., alias="Session-Token"),
):
    """Cria um artigo na Base de Conhecimento via API REST do GLPI."""
    _validate_kb_context(context)
    client = _get_glpi_client(session_token)

    try:
        payload = body.model_dump(exclude_none=True)
        result = await client.create_item("KnowbaseItem", payload)
        logger.info("Artigo KB criado: %s", result)
        return {"success": True, "data": result, "message": "Artigo criado com sucesso."}
    except GLPIClientError as e:
        logger.error("Erro ao criar artigo KB: %s", e)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao criar artigo: {e.detail or str(e)}"
        )
    finally:
        await client._http.aclose()


@write_router.put("/knowledge/articles/{article_id}")
async def update_article(
    context: str,
    article_id: int,
    body: KBArticleUpdate,
    session_token: str = Header(..., alias="Session-Token"),
):
    """Atualiza um artigo existente na Base de Conhecimento."""
    _validate_kb_context(context)
    client = _get_glpi_client(session_token)

    try:
        payload = body.model_dump(exclude_none=True)
        if not payload:
            raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
        result = await client.update_item("KnowbaseItem", article_id, payload)
        logger.info("Artigo KB %d atualizado: %s", article_id, result)
        return {"success": True, "data": result, "message": "Artigo atualizado com sucesso."}
    except GLPIClientError as e:
        logger.error("Erro ao atualizar artigo KB %d: %s", article_id, e)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao atualizar artigo: {e.detail or str(e)}"
        )
    finally:
        await client._http.aclose()


@write_router.delete("/knowledge/articles/{article_id}")
async def delete_article(
    context: str,
    article_id: int,
    session_token: str = Header(..., alias="Session-Token"),
):
    """Exclui um artigo da Base de Conhecimento."""
    _validate_kb_context(context)
    client = _get_glpi_client(session_token)

    try:
        result = await client.delete_item("KnowbaseItem", article_id, force_purge=True)
        logger.info("Artigo KB %d excluído: %s", article_id, result)
        return {"success": True, "data": result, "message": "Artigo excluído com sucesso."}
    except GLPIClientError as e:
        logger.error("Erro ao excluir artigo KB %d: %s", article_id, e)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao excluir artigo: {e.detail or str(e)}"
        )
    finally:
        await client._http.aclose()


# ─── Montar ambos os sub-routers no router principal ───
router.include_router(read_router)
router.include_router(write_router)
