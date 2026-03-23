"""
Router: Knowledge Base
Read via SQL (CQRS) and write via GLPI REST API.
"""

import logging
import re
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth_guard import verify_session
from app.core.database import get_db
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.schemas.knowledge_schemas import (
    KBArticleCreate,
    KBArticleResponse,
    KBArticleUpdate,
    KBCategoriesResponse,
    KBListResponse,
)
from app.services.knowledge_service import (
    count_document_relations,
    get_kb_article,
    get_kb_article_attachments,
    get_kb_attachment,
    get_kb_attachment_relation_ids,
    get_kb_categories,
    get_kb_document_metadata,
    search_kb_articles,
)

logger = logging.getLogger(__name__)

read_router = APIRouter(prefix="/api/v1/{context}", tags=["Knowledge Base"])
write_router = APIRouter(
    prefix="/api/v1/{context}",
    tags=["Knowledge Base"],
    dependencies=[Depends(verify_session)],
)
router = APIRouter()

MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
MAX_ATTACHMENTS_PER_REQUEST = 10
_ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".ppt",
    ".pptx",
}
_ALLOWED_ATTACHMENT_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}


def _validate_kb_context(context: str) -> str:
    """KB is available only for DTIC."""
    if context.lower() != "dtic":
        raise HTTPException(
            status_code=404,
            detail="Base de Conhecimento disponivel apenas para o contexto DTIC.",
        )
    return context.lower()


def _get_glpi_client(session_token: str) -> GLPIClient:
    """Create GLPIClient with logged user session token."""
    instance = settings.get_glpi_instance("dtic")
    return GLPIClient.from_session_token(instance, session_token)


def _extract_created_item_id(payload: object) -> Optional[int]:
    if isinstance(payload, dict):
        direct_id = payload.get("id")
        if isinstance(direct_id, int):
            return direct_id
        if isinstance(direct_id, str) and direct_id.isdigit():
            return int(direct_id)

        for key in ("0", 0):
            nested = payload.get(key) if isinstance(payload, dict) else None
            if isinstance(nested, dict):
                nested_id = nested.get("id")
                if isinstance(nested_id, int):
                    return nested_id
                if isinstance(nested_id, str) and nested_id.isdigit():
                    return int(nested_id)

    return None


def _extract_glpi_upload_errors(payload: object) -> list[str]:
    """Extrai erros de upload retornados pelo GLPI em upload_result."""
    if not isinstance(payload, dict):
        return []

    upload_result = payload.get("upload_result")
    if not isinstance(upload_result, dict):
        return []

    entries = upload_result.get("filename")
    if not isinstance(entries, list):
        return []

    errors: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        error = entry.get("error")
        if isinstance(error, str) and error.strip():
            errors.append(error.strip())
    return errors


def _sanitize_attachment_filename(filename: str) -> str:
    base = Path(filename).name.strip()
    if not base:
        base = "anexo"
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base)
    return base[:255]


def _assert_attachment_constraints(filename: str, content_type: str, size: int) -> None:
    suffix = Path(filename).suffix.lower()
    mime = (content_type or "application/octet-stream").lower()

    if size <= 0:
        raise HTTPException(status_code=400, detail=f"Arquivo '{filename}' vazio.")

    if size > MAX_ATTACHMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo '{filename}' excede o limite de {MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if suffix not in _ALLOWED_ATTACHMENT_EXTENSIONS and mime not in _ALLOWED_ATTACHMENT_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de arquivo nao permitido para '{filename}'.",
        )


def _attachment_url(context: str, article_id: int, document_id: int) -> str:
    return f"/api/v1/{context}/knowledge/articles/{article_id}/attachments/{document_id}/download"


def _with_attachment_urls(context: str, article_id: int, attachments: list[dict]) -> list[dict]:
    output: list[dict] = []
    for item in attachments:
        normalized = dict(item)
        normalized["url"] = _attachment_url(context, article_id, int(item["id"]))
        output.append(normalized)
    return output


def _build_content_disposition(filename: str, disposition: str) -> str:
    safe_filename = filename.replace('"', "")
    return f"{disposition}; filename=\"{safe_filename}\"; filename*=UTF-8''{quote(safe_filename)}"


def _resolve_response_mime_type(metadata: Optional[dict], response) -> str:
    response_mime = (response.headers.get("content-type") or "").split(";", 1)[0].strip()
    metadata_mime = (metadata or {}).get("mime_type") or ""

    if metadata_mime and metadata_mime != "application/octet-stream":
        return metadata_mime
    if response_mime:
        return response_mime
    if metadata_mime:
        return metadata_mime
    return "application/octet-stream"


@read_router.get("/knowledge/categories", response_model=KBCategoriesResponse)
async def list_categories(
    context: str,
    db: AsyncSession = Depends(get_db),
    is_faq: Optional[bool] = Query(None, description="Filtrar contagem por FAQs"),
):
    """Lista categorias da KB com contagem de artigos."""
    _validate_kb_context(context)
    categories = await get_kb_categories(db, is_faq=is_faq)
    return {"categories": categories}


@read_router.get("/knowledge/articles", response_model=KBListResponse)
async def list_articles(
    context: str,
    db: AsyncSession = Depends(get_db),
    q: Optional[str] = Query(None, description="Texto de busca"),
    category_id: Optional[int] = Query(None, description="Filtrar por categoria"),
    is_faq: Optional[bool] = Query(None, description="Apenas FAQs"),
    limit: int = Query(50, ge=1, le=200, description="Maximo de resultados"),
):
    """Lista/busca artigos da Base de Conhecimento."""
    _validate_kb_context(context)
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
async def get_article(
    context: str,
    article_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retorna artigo completo com conteudo HTML sanitizado e anexos."""
    resolved_context = _validate_kb_context(context)

    glpi_base_url = ""
    try:
        instance = settings.get_glpi_instance("dtic")
        glpi_base_url = instance.url.replace("/apirest.php", "")
    except Exception:
        pass

    article = await get_kb_article(db, article_id, glpi_base_url)
    if not article:
        raise HTTPException(status_code=404, detail="Artigo nao encontrado.")
    article["attachments"] = _with_attachment_urls(
        resolved_context,
        article_id,
        article.get("attachments", []),
    )
    return {"article": article}


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
            detail=f"Erro ao criar artigo: {e.detail or str(e)}",
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
            detail=f"Erro ao atualizar artigo: {e.detail or str(e)}",
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
        logger.info("Artigo KB %d excluido: %s", article_id, result)
        return {"success": True, "data": result, "message": "Artigo excluido com sucesso."}
    except GLPIClientError as e:
        logger.error("Erro ao excluir artigo KB %d: %s", article_id, e)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao excluir artigo: {e.detail or str(e)}",
        )
    finally:
        await client._http.aclose()


@write_router.post("/knowledge/articles/{article_id}/attachments")
async def upload_article_attachments(
    context: str,
    article_id: int,
    files: list[UploadFile] = File(..., description="Arquivos para anexar ao artigo"),
    session_token: str = Header(..., alias="Session-Token"),
):
    """Faz upload multipart de anexos e vincula ao artigo da KB."""
    resolved_context = _validate_kb_context(context)

    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")
    if len(files) > MAX_ATTACHMENTS_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Maximo de {MAX_ATTACHMENTS_PER_REQUEST} arquivos por envio.",
        )

    client = _get_glpi_client(session_token)

    try:
        for file in files:
            safe_name = _sanitize_attachment_filename(file.filename or "anexo")
            content = await file.read()
            _assert_attachment_constraints(safe_name, file.content_type or "", len(content))

            uploaded = await client.upload_document(
                display_name=safe_name,
                filename=safe_name,
                content=content,
                mime_type=file.content_type or "application/octet-stream",
            )
            upload_errors = _extract_glpi_upload_errors(uploaded)
            document_id = _extract_created_item_id(uploaded)

            if upload_errors:
                if document_id:
                    try:
                        await client.delete_item("Document", document_id, force_purge=True)
                    except Exception as cleanup_error:
                        logger.warning(
                            "Falha ao remover documento invalido %s apos erro de upload no artigo KB %s: %s",
                            document_id,
                            article_id,
                            cleanup_error,
                        )
                raise HTTPException(
                    status_code=415,
                    detail=f"Erro ao enviar '{safe_name}': {'; '.join(upload_errors)}",
                )

            if not document_id:
                raise HTTPException(
                    status_code=502,
                    detail=f"Upload concluido sem ID de documento para '{safe_name}'.",
                )

            try:
                await client.link_document_to_item(
                    itemtype="KnowbaseItem",
                    item_id=article_id,
                    document_id=document_id,
                )
            except Exception:
                # Evita deixar documento orfao quando o vinculo falha.
                try:
                    await client.delete_item("Document", document_id, force_purge=True)
                except Exception as cleanup_error:
                    logger.warning(
                        "Falha ao remover documento orfao %s apos erro de vinculo no artigo KB %s: %s",
                        document_id,
                        article_id,
                        cleanup_error,
                    )
                raise

        async for db in get_db("dtic"):
            attachments = await get_kb_article_attachments(db, article_id)
            return {
                "success": True,
                "attachments": _with_attachment_urls(resolved_context, article_id, attachments),
                "message": "Anexos enviados com sucesso.",
            }

        raise HTTPException(status_code=500, detail="Falha ao atualizar lista de anexos.")
    except HTTPException:
        raise
    except GLPIClientError as e:
        logger.error("Erro no upload de anexos para artigo KB %d: %s", article_id, e)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao enviar anexos: {e.detail or str(e)}",
        )
    except Exception as e:
        logger.error(
            "Erro inesperado no upload de anexos do artigo KB %d: %s",
            article_id,
            e,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao enviar anexos.")
    finally:
        for file in files:
            await file.close()
        await client._http.aclose()


@write_router.get("/knowledge/articles/{article_id}/attachments/{document_id}/download")
async def download_article_attachment(
    context: str,
    article_id: int,
    document_id: int,
    disposition: str = Query("attachment", pattern="^(attachment|inline)$"),
    session_token: str = Header(..., alias="Session-Token"),
):
    """Faz proxy autenticado para download/visualizacao de anexo da KB."""
    _validate_kb_context(context)

    attachment = None
    async for db in get_db("dtic"):
        attachment = await get_kb_attachment(db, article_id, document_id)
        break

    if not attachment:
        raise HTTPException(status_code=404, detail="Anexo nao encontrado para este artigo.")

    client = _get_glpi_client(session_token)
    try:
        response = await client.download_document(document_id)
    except GLPIClientError as e:
        logger.error(
            "Erro no download do anexo %d (artigo KB %d): %s",
            document_id,
            article_id,
            e,
        )
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao baixar anexo: {e.detail or str(e)}",
        )
    finally:
        await client._http.aclose()

    filename = attachment.get("filename") or f"anexo-{document_id}"
    mime_type = attachment.get("mime_type") or "application/octet-stream"
    headers = {
        "Content-Disposition": _build_content_disposition(filename, disposition),
        "Cache-Control": "no-store",
    }
    return Response(content=response.content, media_type=mime_type, headers=headers)


@write_router.get("/knowledge/documents/{document_id}/content")
async def download_embedded_document(
    context: str,
    document_id: int,
    disposition: str = Query("inline", pattern="^(attachment|inline)$"),
    session_token: str = Header(..., alias="Session-Token"),
):
    """Faz proxy autenticado para documentos embutidos no HTML da KB."""
    _validate_kb_context(context)

    document_metadata = None
    async for db in get_db("dtic"):
        document_metadata = await get_kb_document_metadata(db, document_id)
        break

    if not document_metadata:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")

    client = _get_glpi_client(session_token)
    try:
        response = await client.download_document(document_id)
    except GLPIClientError as e:
        logger.error("Erro ao baixar documento embutido %d: %s", document_id, e)
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao baixar documento: {e.detail or str(e)}",
        )
    finally:
        await client._http.aclose()

    filename = document_metadata.get("filename") or f"documento-{document_id}"
    mime_type = _resolve_response_mime_type(document_metadata, response)
    headers = {
        "Content-Disposition": _build_content_disposition(filename, disposition),
        "Cache-Control": "no-store",
    }
    return Response(content=response.content, media_type=mime_type, headers=headers)


@write_router.delete("/knowledge/articles/{article_id}/attachments/{document_id}")
async def delete_article_attachment(
    context: str,
    article_id: int,
    document_id: int,
    session_token: str = Header(..., alias="Session-Token"),
):
    """Remove um anexo de um artigo da KB e limpa documento sem vinculos."""
    resolved_context = _validate_kb_context(context)
    client = _get_glpi_client(session_token)

    try:
        attachment = None
        relation_ids: list[int] = []
        async for db in get_db("dtic"):
            attachment = await get_kb_attachment(db, article_id, document_id)
            relation_ids = await get_kb_attachment_relation_ids(db, article_id, document_id)
            break

        if not attachment or not relation_ids:
            raise HTTPException(status_code=404, detail="Anexo nao encontrado para este artigo.")

        for relation_id in relation_ids:
            await client.delete_item("Document_Item", relation_id, force_purge=True)

        remaining_links = 0
        async for db in get_db("dtic"):
            remaining_links = await count_document_relations(db, document_id)
            break

        if remaining_links == 0:
            try:
                await client.delete_item("Document", document_id, force_purge=True)
            except GLPIClientError as purge_error:
                logger.warning(
                    "Falha ao remover documento %s sem vinculos apos exclusao do anexo no artigo KB %s: %s",
                    document_id,
                    article_id,
                    purge_error,
                )

        async for db in get_db("dtic"):
            attachments = await get_kb_article_attachments(db, article_id)
            return {
                "success": True,
                "attachments": _with_attachment_urls(resolved_context, article_id, attachments),
                "message": "Anexo removido com sucesso.",
            }

        raise HTTPException(status_code=500, detail="Falha ao atualizar lista de anexos.")
    except HTTPException:
        raise
    except GLPIClientError as e:
        logger.error(
            "Erro ao remover anexo %d do artigo KB %d: %s",
            document_id,
            article_id,
            e,
        )
        raise HTTPException(
            status_code=e.status_code or 500,
            detail=f"Erro ao remover anexo: {e.detail or str(e)}",
        )
    except Exception as e:
        logger.error(
            "Erro inesperado ao remover anexo %d do artigo KB %d: %s",
            document_id,
            article_id,
            e,
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao remover anexo.")
    finally:
        await client._http.aclose()


router.include_router(read_router)
router.include_router(write_router)
