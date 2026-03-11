"""
Router: CRUD Universal
Endpoints genéricos para qualquer ItemType do GLPI.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from app.core.session_manager import session_manager
from app.core.rate_limit import limiter
from app.config import settings
from app.core.auth_guard import verify_session

router = APIRouter(prefix="/api/v1/{context}", tags=["Items"], dependencies=[Depends(verify_session)])


class ItemInput(BaseModel):
    """Payload para criar/atualizar item."""
    input: dict[str, Any]


@router.get("/{itemtype}", operation_id="listItems")
@limiter.limit("120/minute")
async def get_all_items(
    request: Request,
    context: str,
    itemtype: str,
    range_start: int = Query(0, alias="range_start", ge=0),
    range_end: int = Query(49, alias="range_end", ge=0),
    expand_dropdowns: bool = Query(False),
    only_id: bool = Query(False),
    sort: int | None = Query(None),
    order: str = Query("ASC"),
):
    """Lista itens de qualquer ItemType com paginação."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    params: dict[str, Any] = {}
    if expand_dropdowns:
        params["expand_dropdowns"] = "true"
    if only_id:
        params["only_id"] = "true"
    if sort is not None:
        params["sort"] = sort
    if order != "ASC":
        params["order"] = order

    try:
        result = await client.get_all_items(
            itemtype,
            range_start=range_start,
            range_end=range_end,
            **params,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")


@router.get("/{itemtype}/{item_id}", operation_id="getItem")
@limiter.limit("200/minute")
async def get_item(
    request: Request,
    context: str,
    itemtype: str,
    item_id: int,
    expand_dropdowns: bool = Query(False),
    with_logs: bool = Query(False),
):
    """Busca um item por ID."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    params: dict[str, Any] = {}
    if expand_dropdowns:
        params["expand_dropdowns"] = "true"
    if with_logs:
        params["with_logs"] = "true"

    try:
        result = await client.get_item(itemtype, item_id, **params)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")


@router.get("/{itemtype}/{item_id}/{sub_itemtype}", operation_id="getSubItems")
@limiter.limit("200/minute")
async def get_sub_items(
    request: Request,
    context: str,
    itemtype: str,
    item_id: int,
    sub_itemtype: str,
):
    """Busca sub-itens de um item (ex: Ticket/1/ITILFollowup)."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = await client.get_sub_items(itemtype, item_id, sub_itemtype)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")


@router.post("/{itemtype}", operation_id="createItem")
@limiter.limit("60/minute")
async def create_item(
    request: Request,
    context: str,
    itemtype: str,
    body: ItemInput,
):
    """Cria um item."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = await client.create_item(itemtype, body.input)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")


@router.put("/{itemtype}/{item_id}", operation_id="updateItem")
@limiter.limit("60/minute")
async def update_item(
    request: Request,
    context: str,
    itemtype: str,
    item_id: int,
    body: ItemInput,
):
    """Atualiza um item."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = await client.update_item(itemtype, item_id, body.input)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")


@router.delete("/{itemtype}/{item_id}", operation_id="deleteItem")
@limiter.limit("30/minute")
async def delete_item(
    request: Request,
    context: str,
    itemtype: str,
    item_id: int,
    force_purge: bool = Query(False),
):
    """Remove um item."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = await client.delete_item(itemtype, item_id, force_purge=force_purge)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")
