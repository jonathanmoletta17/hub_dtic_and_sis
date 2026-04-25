from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.auth_guard import verify_session
from app.core.context_registry import registry


router = APIRouter(prefix="/api/v1/{context}/events", tags=["Events"])

HEARTBEAT_INTERVAL_SECONDS = 25


def _sse_frame(event: str, data: dict[str, object]) -> str:
    payload = json.dumps(data, separators=(",", ":"))
    return f"event: {event}\ndata: {payload}\n\n"


async def _event_stream(context: str, request: Request) -> AsyncIterator[str]:
    root_context = registry.get_base_context(context)
    yield _sse_frame(
        "ready",
        {
            "context": root_context,
            "domains": [],
            "source": "backend-stream",
        },
    )

    while not await request.is_disconnected():
        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
        yield _sse_frame(
            "heartbeat",
            {
                "context": root_context,
                "domains": [],
                "source": "backend-stream",
            },
        )


@router.get("/stream", operation_id="streamContextEvents")
async def stream_context_events(
    request: Request,
    context: str,
    auth_data: dict = Depends(verify_session),
) -> StreamingResponse:
    _ = auth_data
    return StreamingResponse(
        _event_stream(context, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
