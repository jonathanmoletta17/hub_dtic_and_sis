from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.authorization import get_authorization_identity
from app.core.auth_guard import verify_session
from app.main import app
from app.routers.events import _event_stream


def stub_runtime_shutdown(monkeypatch) -> tuple[AsyncMock, AsyncMock]:
    close_databases = AsyncMock()
    monkeypatch.setattr("app.main.close_all_db_connections", close_databases)
    return AsyncMock(), close_databases


def test_ticket_followup_uses_authenticated_user_identity(monkeypatch) -> None:
    stub_runtime_shutdown(monkeypatch)
    add_followup = AsyncMock(return_value={"success": True, "message": "ok", "ticket_id": 42})
    monkeypatch.setattr("app.routers.ticket_workflow.service.add_followup", add_followup)

    app.dependency_overrides[verify_session] = lambda: {
        "session_token": "user-session-token",
        "validated": True,
    }
    app.dependency_overrides[get_authorization_identity] = lambda: {
        "context": "sis",
        "session_token": "user-session-token",
        "user_id": 777,
        "hub_roles": ["tecnico"],
        "active_hub_role": "tecnico",
        "app_access": set(),
    }

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/sis/tickets/42/followups",
                json={"content": "feito", "user_id": 999, "is_private": False},
                headers={"X-Active-Hub-Role": "tecnico"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    add_followup.assert_awaited_once()
    _, kwargs = add_followup.await_args
    assert kwargs["session_token"] == "user-session-token"
    assert kwargs["actor_user_id"] == 777


def test_formcreator_categories_require_authenticated_session(monkeypatch) -> None:
    stub_runtime_shutdown(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/sis/domain/formcreator/categories")

    assert response.status_code == 401


def test_event_stream_requires_authenticated_session(monkeypatch) -> None:
    stub_runtime_shutdown(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/api/v1/sis/events/stream")

    assert response.status_code == 401


def test_event_stream_route_is_registered() -> None:
    assert any(route.path == "/api/v1/{context}/events/stream" for route in app.routes)


def test_event_stream_initial_frame_is_context_scoped() -> None:
    class DisconnectedRequest:
        async def is_disconnected(self) -> bool:
            return True

    async def collect_first_frame() -> str:
        stream = _event_stream("sis-manutencao", DisconnectedRequest())
        return await anext(stream)

    first_chunk = asyncio.run(collect_first_frame())

    assert "event: ready" in first_chunk
    assert '"context":"sis"' in first_chunk
