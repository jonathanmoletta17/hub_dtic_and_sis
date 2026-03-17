from __future__ import annotations

from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

from app.core.auth_guard import verify_session
from app.core.authorization import get_authorization_identity
from app.core.database import get_db
from app.main import app
from app.routers import analytics


class _DummySession:
    async def execute(self, *args, **kwargs):
        raise AssertionError("Nao deveria executar SQL neste teste de aceite.")


@pytest.fixture
def client():
    async def override_verify_session():
        return {"validated": True, "session_token": "test-token", "source": "test"}

    async def override_get_authorization_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico-manutencao"],
            "active_hub_role": "tecnico-manutencao",
            "app_access": {"sis-dashboard"},
        }

    async def override_get_db(context: str = "sis"):
        yield _DummySession()

    app.dependency_overrides[verify_session] = override_verify_session
    app.dependency_overrides[get_authorization_identity] = override_get_authorization_identity
    app.dependency_overrides[get_db] = override_get_db

    test_client = TestClient(app)
    yield test_client
    test_client.close()
    app.dependency_overrides.clear()


def _patch_all_analytics(monkeypatch: pytest.MonkeyPatch):
    async def fake_summary(_db, _scope):
        return {
            "novos": 1,
            "em_atendimento": 2,
            "pendentes": 3,
            "resolvidos_periodo": 4,
            "backlog_aberto": 5,
            "total_periodo": 6,
        }

    async def fake_trends(_db, _scope):
        return [
            {
                "date": "2026-03-16",
                "novos": 1,
                "em_atendimento": 2,
                "pendentes": 3,
                "resolvidos": 4,
                "total_criados": 6,
            }
        ]

    async def fake_ranking(_db, _scope, _limit):
        return [{"technician_id": 7, "technician_name": "Tecnico", "resolved_count": 9}]

    async def fake_recent(_db, _scope, _limit):
        return [
            {
                "ticket_id": 99,
                "title": "Ticket",
                "status_id": 2,
                "status": "Em Atendimento",
                "category": "Rede",
                "requester": "Alice",
                "technician": "Bob",
                "action": "ticket_em_atendimento",
                "occurred_at": "2026-03-16T10:30:00-03:00",
            }
        ]

    async def fake_distribution(_db, _scope, _limit):
        return [{"name": "Grupo A", "value": 10}]

    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_summary)
    monkeypatch.setattr(analytics.analytics_service, "get_trends", fake_trends)
    monkeypatch.setattr(analytics.analytics_service, "get_ranking", fake_ranking)
    monkeypatch.setattr(analytics.analytics_service, "get_recent_activity", fake_recent)
    monkeypatch.setattr(analytics.analytics_service, "get_distribution_entity", fake_distribution)
    monkeypatch.setattr(analytics.analytics_service, "get_distribution_category", fake_distribution)


@pytest.mark.parametrize("context", ["sis", "sis-manutencao", "sis-memoria"])
@pytest.mark.parametrize(
    "endpoint",
    [
        "/summary",
        "/trends",
        "/ranking",
        "/recent-activity",
        "/distribution/entity",
        "/distribution/category",
    ],
)
@pytest.mark.parametrize("department", [None, "manutencao"])
def test_acceptance_endpoints_return_200_with_and_without_department(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    context: str,
    endpoint: str,
    department: str | None,
):
    _patch_all_analytics(monkeypatch)
    params = {}
    if department:
        params["department"] = department
    query = f"?{urlencode(params)}" if params else ""
    response = client.get(
        f"/api/v1/{context}/analytics{endpoint}{query}",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == 200


@pytest.mark.parametrize("context", ["sis", "sis-manutencao", "sis-memoria"])
def test_acceptance_department_maps_to_expected_group_ids(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    context: str,
):
    captured = {}

    async def fake_summary(_db, scope):
        captured["scope"] = scope
        return {
            "novos": 0,
            "em_atendimento": 0,
            "pendentes": 0,
            "resolvidos_periodo": 0,
            "backlog_aberto": 0,
            "total_periodo": 0,
        }

    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_summary)

    resp_manut = client.get(
        f"/api/v1/{context}/analytics/summary?department=manutencao",
        headers={"Session-Token": "test-token"},
    )
    assert resp_manut.status_code == 200
    assert resp_manut.json()["filters"]["group_ids"] == [22]
    assert captured["scope"].group_ids == [22]

    resp_cons = client.get(
        f"/api/v1/{context}/analytics/summary?department=conservacao",
        headers={"Session-Token": "test-token"},
    )
    assert resp_cons.status_code == 200
    assert resp_cons.json()["filters"]["group_ids"] == [21]
    assert captured["scope"].group_ids == [21]

    resp_global = client.get(
        f"/api/v1/{context}/analytics/summary",
        headers={"Session-Token": "test-token"},
    )
    assert resp_global.status_code == 200
    assert resp_global.json()["filters"]["group_ids"] == []
    assert captured["scope"].group_ids == []


def test_acceptance_group_ids_precedence_over_department(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
):
    captured = {}

    async def fake_summary(_db, scope):
        captured["scope"] = scope
        return {
            "novos": 0,
            "em_atendimento": 0,
            "pendentes": 0,
            "resolvidos_periodo": 0,
            "backlog_aberto": 0,
            "total_periodo": 0,
        }

    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_summary)
    response = client.get(
        "/api/v1/sis/analytics/summary?department=manutencao&group_ids=21",
        headers={"Session-Token": "test-token"},
    )

    assert response.status_code == 200
    assert response.json()["filters"]["group_ids"] == [21]
    assert captured["scope"].group_ids == [21]


@pytest.mark.parametrize("context", ["sis", "sis-manutencao", "sis-memoria"])
@pytest.mark.parametrize(
    "active_role,app_access,expected_status",
    [
        ("tecnico-manutencao", {"sis-dashboard"}, 200),
        ("gestor", {"sis-dashboard"}, 200),
        ("solicitante", {"sis-dashboard"}, 403),
        ("tecnico-conservacao", {"carregadores"}, 403),
    ],
)
def test_acceptance_permission_gate_matrix(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
    context: str,
    active_role: str,
    app_access: set[str],
    expected_status: int,
):
    async def fake_summary(_db, _scope):
        return {
            "novos": 0,
            "em_atendimento": 0,
            "pendentes": 0,
            "resolvidos_periodo": 0,
            "backlog_aberto": 0,
            "total_periodo": 0,
        }

    async def dynamic_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 55,
            "hub_roles": [active_role],
            "active_hub_role": active_role,
            "app_access": app_access,
        }

    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_summary)
    app.dependency_overrides[get_authorization_identity] = dynamic_identity

    response = client.get(
        f"/api/v1/{context}/analytics/summary",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == expected_status
