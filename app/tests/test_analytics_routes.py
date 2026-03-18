from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.core.auth_guard import verify_session
from app.core.authorization import get_authorization_identity
from app.core.database import get_db
from app.main import app
from app.routers import analytics


class _DummySession:
    async def execute(self, *args, **kwargs):
        raise AssertionError("Nao deveria executar SQL neste teste de router.")


@pytest.fixture
def client():
    async def override_verify_session():
        return {"validated": True, "session_token": "test-token", "source": "test"}

    async def override_get_authorization_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"dtic-metrics"},
        }

    async def override_get_db(context: str = "dtic"):
        yield _DummySession()

    app.dependency_overrides[verify_session] = override_verify_session
    app.dependency_overrides[get_authorization_identity] = override_get_authorization_identity
    app.dependency_overrides[get_db] = override_get_db

    test_client = TestClient(app)
    yield test_client
    test_client.close()

    app.dependency_overrides.clear()


def _summary_payload() -> dict:
    return {
        "novos": 1,
        "em_atendimento": 2,
        "pendentes": 3,
        "resolvidos_periodo": 4,
        "backlog_aberto": 5,
        "total_periodo": 6,
    }


async def _sis_identity(context: str):
    return {
        "context": context,
        "session_token": "test-token",
        "user_id": 30,
        "hub_roles": ["tecnico-manutencao"],
        "active_hub_role": "tecnico-manutencao",
        "app_access": {"sis-dashboard"},
    }


def test_openapi_declares_analytics_response_models(client: TestClient):
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]

    assert paths["/api/v1/{context}/analytics/summary"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalyticsSummaryResponse")
    assert paths["/api/v1/{context}/analytics/trends"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalyticsTrendsResponse")
    assert paths["/api/v1/{context}/analytics/ranking"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalyticsRankingResponse")
    assert paths["/api/v1/{context}/analytics/recent-activity"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalyticsRecentActivityResponse")
    assert paths["/api/v1/{context}/analytics/distribution/entity"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalyticsDistributionResponse")
    assert paths["/api/v1/{context}/analytics/distribution/category"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/AnalyticsDistributionResponse")


def test_summary_defaults_to_last_30_days(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    captured_scope = {}

    async def fake_get_summary(_db, scope):
        captured_scope["scope"] = scope
        return _summary_payload()

    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_get_summary)

    response = client.get("/api/v1/dtic/analytics/summary", headers={"Session-Token": "test-token"})
    assert response.status_code == 200

    payload = response.json()
    date_from = date.fromisoformat(payload["filters"]["date_from"])
    date_to = date.fromisoformat(payload["filters"]["date_to"])

    assert (date_to - date_from).days == 29
    assert payload["filters"]["department"] is None
    assert payload["filters"]["group_ids"] == []
    assert captured_scope["scope"].department is None
    assert captured_scope["scope"].group_ids == []


def test_ranking_accepts_unbounded_and_explicit_limit(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    captured = {}

    async def fake_get_ranking(_db, _scope, limit):
        captured["limit"] = limit
        return [{"technician_id": 7, "technician_name": "Tecnico", "resolved_count": 9}]

    monkeypatch.setattr(analytics.analytics_service, "get_ranking", fake_get_ranking)

    default_response = client.get("/api/v1/dtic/analytics/ranking", headers={"Session-Token": "test-token"})
    assert default_response.status_code == 200
    assert captured["limit"] is None

    explicit_limit_response = client.get(
        "/api/v1/dtic/analytics/ranking?limit=80",
        headers={"Session-Token": "test-token"},
    )
    assert explicit_limit_response.status_code == 200
    assert captured["limit"] == 80


def test_permission_denies_invalid_role(client: TestClient):
    async def identity_without_role(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 15,
            "hub_roles": ["solicitante"],
            "active_hub_role": "solicitante",
            "app_access": {"dtic-metrics"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_role
    response = client.get("/api/v1/dtic/analytics/summary", headers={"Session-Token": "test-token"})

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_permission_denies_missing_app_access(client: TestClient):
    async def identity_without_app(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 15,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_app
    response = client.get("/api/v1/dtic/analytics/summary", headers={"Session-Token": "test-token"})

    assert response.status_code == 403
    assert "modulo" in response.json()["detail"].lower()


def test_permission_denies_dtic_kpi_without_metrics(client: TestClient):
    async def identity_kpi_only(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 21,
            "hub_roles": ["gestor"],
            "active_hub_role": "gestor",
            "app_access": {"dtic-kpi"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_kpi_only
    response = client.get("/api/v1/dtic/analytics/summary", headers={"Session-Token": "test-token"})

    assert response.status_code == 403
    assert "dtic-metrics" in response.json()["detail"]


def test_permission_allows_dtic_with_metrics(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    async def identity_metrics_only(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 22,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"dtic-metrics"},
        }

    async def fake_get_summary(_db, _scope):
        return _summary_payload()

    app.dependency_overrides[get_authorization_identity] = identity_metrics_only
    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_get_summary)
    response_metrics = client.get("/api/v1/dtic/analytics/summary", headers={"Session-Token": "test-token"})
    assert response_metrics.status_code == 200


def test_sis_department_filter_is_supported(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    async def sis_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 30,
            "hub_roles": ["tecnico-manutencao"],
            "active_hub_role": "tecnico-manutencao",
            "app_access": {"sis-dashboard"},
        }

    captured_scope = {}

    async def fake_get_summary(_db, scope):
        captured_scope["scope"] = scope
        return _summary_payload()

    app.dependency_overrides[get_authorization_identity] = sis_identity
    monkeypatch.setattr(analytics.analytics_service, "get_summary", fake_get_summary)

    response = client.get(
        "/api/v1/sis/analytics/summary?department=manutencao",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == 200
    assert response.json()["filters"]["department"] == "manutencao"
    assert response.json()["filters"]["group_ids"] == [22]
    assert captured_scope["scope"].group_ids == [22]


def test_distribution_entity_default_limit_and_scope(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    captured = {}

    async def fake_get_distribution_entity(_db, _scope, limit):
        captured["limit"] = limit
        return [
            {"name": "Entidade B", "value": 10},
            {"name": "Entidade A", "value": 10},
        ]

    monkeypatch.setattr(analytics.analytics_service, "get_distribution_entity", fake_get_distribution_entity)
    app.dependency_overrides[get_authorization_identity] = _sis_identity

    response = client.get(
        "/api/v1/sis/analytics/distribution/entity?department=conservacao",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["limit"] == 10
    assert captured["limit"] == 10
    assert payload["filters"]["group_ids"] == [21]
    assert len(payload["data"]) == 2


def test_distribution_category_limit_validation(client: TestClient):
    app.dependency_overrides[get_authorization_identity] = _sis_identity

    response = client.get(
        "/api/v1/sis/analytics/distribution/category?limit=80",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == 422


def test_distribution_category_uses_explicit_group_ids_over_department(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
):
    captured_scope = {}

    async def fake_get_distribution_category(_db, scope, _limit):
        captured_scope["scope"] = scope
        return [{"name": "Categoria X", "value": 5}]

    monkeypatch.setattr(analytics.analytics_service, "get_distribution_category", fake_get_distribution_category)
    app.dependency_overrides[get_authorization_identity] = _sis_identity

    response = client.get(
        "/api/v1/sis/analytics/distribution/category?department=manutencao&group_ids=21",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filters"]["group_ids"] == [21]
    assert payload["filters"]["department"] == "manutencao"
    assert captured_scope["scope"].group_ids == [21]


def test_distribution_entity_denies_missing_app_access(client: TestClient):
    async def identity_without_app(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 15,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_app
    response = client.get(
        "/api/v1/sis/analytics/distribution/entity?department=manutencao",
        headers={"Session-Token": "test-token"},
    )
    assert response.status_code == 403
