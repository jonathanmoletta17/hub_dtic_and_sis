from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.main import app


def stub_runtime_shutdown(monkeypatch) -> tuple[AsyncMock, AsyncMock]:
    close_databases = AsyncMock()
    monkeypatch.setattr("app.main.close_all_db_connections", close_databases)
    return AsyncMock(), close_databases


def test_root_endpoint_exposes_backend_contract(monkeypatch) -> None:
    stub_runtime_shutdown(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Hub Operacional Backend",
        "version": "0.1.0",
        "health": "/health",
        "contexts": ["dtic", "sis"],
        "routes": {
            "auth": "/api/v1/{context}/auth",
            "lookups": "/api/v1/{context}/lookups/{type}",
            "formcreator": "/api/v1/{context}/domain/formcreator",
            "stats": "/api/v1/{context}/db/stats",
            "tickets": "/api/v1/{context}/db/tickets",
            "ticket_detail": "/api/v1/{context}/tickets/{ticket_id}/detail",
        },
    }


def test_health_endpoint_reports_configured_user_session_mode(monkeypatch) -> None:
    stub_runtime_shutdown(monkeypatch)

    monkeypatch.setattr(
        "app.routers.health.registry.list_parents",
        lambda: [SimpleNamespace(id="dtic"), SimpleNamespace(id="sis")],
    )

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["api_status"] == "healthy"
    assert payload["auth_mode"] == "user_password_session"
    assert payload["service_session_status"] == "disabled"
    assert payload["instances"]["dtic"]["status"] == "configured"
    assert payload["instances"]["dtic"]["service_user_token_required"] is False
    assert payload["instances"]["sis"]["status"] == "configured"
    assert payload["active_sessions"] == []
    assert payload["active_service_sessions"] == []


def test_health_endpoint_reports_degraded_when_context_api_config_is_missing(monkeypatch) -> None:
    stub_runtime_shutdown(monkeypatch)

    monkeypatch.setattr(
        "app.routers.health.registry.list_parents",
        lambda: [SimpleNamespace(id="dtic"), SimpleNamespace(id="sis")],
    )
    monkeypatch.setattr(
        "app.routers.health._context_health",
        lambda context: {
            "context": context,
            "status": "misconfigured" if context == "sis" else "configured",
            "auth_mode": "user_password_session",
            "api_url_configured": True,
            "app_token_configured": context != "sis",
            "service_user_token_required": False,
        },
    )

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded"
    assert payload["api_status"] == "degraded"
    assert payload["service_session_status"] == "disabled"
    assert payload["instances"]["sis"]["status"] == "misconfigured"
    assert payload["instances"]["sis"]["app_token_configured"] is False


def test_lifespan_shuts_down_sessions_and_db_connections(monkeypatch) -> None:
    _, close_databases = stub_runtime_shutdown(monkeypatch)

    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200

    close_databases.assert_awaited_once()
