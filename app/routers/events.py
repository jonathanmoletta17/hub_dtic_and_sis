import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.auth_guard import verify_session
from app.core.database import get_db
from app.services.events_service import fetch_latest_log_id, fetch_recent_glpi_log_events

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/{context}/events",
    tags=["Domain: Events (SSE)"],
    dependencies=[Depends(verify_session)],
)

POLL_INTERVAL_SECONDS = 3
RECONNECT_DELAY_MS = 3000


async def _get_latest_log_id_for_context(context: str) -> int:
    async for db in get_db(context):
        return await fetch_latest_log_id(db)
    return 0


async def _get_recent_events_for_context(context: str, *, last_id: int) -> list[dict]:
    async for db in get_db(context):
        return await fetch_recent_glpi_log_events(db, context=context, last_id=last_id)
    return []


@router.get("/stream")
async def sse_stream(request: Request, context: str):
    """
    [SSE / EventSource]
    Streaming assíncrono para eventos em tempo real do GLPI.
    Faz polling periódico no banco buscando novos logs.
    """

    async def event_generator():
        last_id = 0

        try:
            last_id = await _get_latest_log_id_for_context(context)
        except Exception as exc:
            logger.error("Erro no fetch inicial de MAX(id) no SSE events: %s", exc, exc_info=True)

        try:
            yield f"retry: {RECONNECT_DELAY_MS}\n\n"

            while True:
                if await request.is_disconnected():
                    break

                try:
                    events = await _get_recent_events_for_context(context, last_id=last_id)
                    for event_data in events:
                        yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                        last_id = int(event_data["id"])
                except Exception as exc:
                    logger.error("Erro no processamento central do SSE events: %s", exc, exc_info=True)

                yield ": keep-alive\n\n"
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.debug("SSE events stream cancelado pelo cliente: context=%s", context)
            return

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
