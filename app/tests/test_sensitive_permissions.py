from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.auth_guard import verify_session
from app.core.authorization import get_authorization_identity
from app.core.database import get_db, get_local_db
from app.main import app
from app.routers import chargers, ticket_workflow


class _DummySession:
    async def execute(self, *args, **kwargs):
        raise AssertionError("Nao deveria executar SQL neste teste.")


class _DummyGLPIClient:
    pass


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
            "app_access": {"carregadores"},
        }

    async def override_get_db(context: str = "sis"):
        yield _DummySession()

    async def override_get_local_db():
        yield object()

    async def override_get_user_glpi_session(context: str = "sis"):
        return _DummyGLPIClient()

    app.dependency_overrides[verify_session] = override_verify_session
    app.dependency_overrides[get_authorization_identity] = override_get_authorization_identity
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_local_db] = override_get_local_db
    app.dependency_overrides[chargers.get_user_glpi_session] = override_get_user_glpi_session

    test_client = TestClient(app)
    yield test_client
    test_client.close()

    app.dependency_overrides.clear()


def test_ticket_followup_denies_solicitante_role(client: TestClient):
    async def unauthorized_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 10,
            "hub_roles": ["solicitante"],
            "active_hub_role": "solicitante",
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = unauthorized_identity

    response = client.post(
        "/api/v1/dtic/tickets/42/followups",
        headers={"Session-Token": "test-token"},
        json={"content": "Atualizacao", "user_id": 20, "is_private": False},
    )

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_ticket_followup_allows_admin_hub_inherited_as_gestor(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def admin_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 1,
            "hub_roles": ["admin-hub"],
            "active_hub_role": "admin-hub",
            "app_access": {"busca"},
        }

    async def fake_add_followup(context: str, ticket_id: int, body):
        return {"success": True, "message": "ok", "ticket_id": ticket_id}

    app.dependency_overrides[get_authorization_identity] = admin_identity
    monkeypatch.setattr(ticket_workflow.service, "add_followup", fake_add_followup)

    response = client.post(
        "/api/v1/dtic/tickets/99/followups",
        headers={"Session-Token": "test-token"},
        json={"content": "Novo acompanhamento", "user_id": 20, "is_private": False},
    )

    assert response.status_code == 200
    assert response.json()["ticket_id"] == 99


def test_charger_update_schedule_denies_without_carregadores_access(client: TestClient):
    async def no_app_access_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = no_app_access_identity

    response = client.put(
        "/api/v1/sis/chargers/10/schedule",
        headers={"Session-Token": "test-token"},
        json={"business_start": "08:00", "business_end": "18:00", "work_on_weekends": False},
    )

    assert response.status_code == 403
    assert "carregadores" in response.json()["detail"]


def test_charger_update_schedule_denies_non_technical_role(client: TestClient):
    async def non_technical_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["solicitante"],
            "active_hub_role": "solicitante",
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[get_authorization_identity] = non_technical_identity

    response = client.put(
        "/api/v1/sis/chargers/10/schedule",
        headers={"Session-Token": "test-token"},
        json={"business_start": "08:00", "business_end": "18:00", "work_on_weekends": False},
    )

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_charger_update_schedule_denies_when_active_role_is_solicitante_even_with_technical_membership(
    client: TestClient,
):
    async def mixed_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["solicitante", "tecnico-manutencao"],
            "active_hub_role": "solicitante",
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[get_authorization_identity] = mixed_identity

    response = client.put(
        "/api/v1/sis/chargers/10/schedule",
        headers={"Session-Token": "test-token"},
        json={"business_start": "08:00", "business_end": "18:00", "work_on_weekends": False},
    )

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_ticket_followup_denies_when_active_role_header_is_missing_even_with_technical_membership(client: TestClient):
    async def identity_without_active_role(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico", "gestor"],
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_active_role

    response = client.post(
        "/api/v1/dtic/tickets/42/followups",
        headers={"Session-Token": "test-token"},
        json={"content": "Atualizacao", "user_id": 20, "is_private": False},
    )

    assert response.status_code == 403
    assert "papel ativo obrigatorio" in response.json()["detail"]


def test_solution_approval_denies_technical_role(client: TestClient):
    async def technical_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 20,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = technical_identity

    response = client.post(
        "/api/v1/dtic/tickets/42/solution-approval/approve",
        headers={"Session-Token": "test-token"},
        json={"comment": "ok"},
    )

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_solution_approval_allows_active_requester_role(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def requester_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 10,
            "hub_roles": ["solicitante"],
            "active_hub_role": "solicitante",
            "app_access": {"busca"},
        }

    async def fake_approve_solution(context: str, ticket_id: int, actor_user_id: int, comment: str | None = None):
        return {"success": True, "message": "ok", "ticket_id": ticket_id}

    app.dependency_overrides[get_authorization_identity] = requester_identity
    monkeypatch.setattr(ticket_workflow.service, "approve_solution", fake_approve_solution)

    response = client.post(
        "/api/v1/dtic/tickets/42/solution-approval/approve",
        headers={"Session-Token": "test-token"},
        json={"comment": "ok"},
    )

    assert response.status_code == 200
    assert response.json()["ticket_id"] == 42


def test_charger_schedule_update_denies_when_active_role_header_is_missing(client: TestClient):
    async def identity_without_active_role(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_active_role

    response = client.put(
        "/api/v1/sis/chargers/10/schedule",
        headers={"Session-Token": "test-token"},
        json={"business_start": "08:00", "business_end": "18:00", "work_on_weekends": False},
    )

    assert response.status_code == 403
    assert "papel ativo obrigatorio" in response.json()["detail"]


def test_charger_kanban_read_denies_when_active_role_header_is_missing(client: TestClient):
    async def identity_without_active_role(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_active_role

    response = client.get(
        "/api/v1/sis/metrics/chargers/kanban",
        headers={"Session-Token": "test-token"},
    )

    assert response.status_code == 403
    assert "papel ativo obrigatorio" in response.json()["detail"]


def test_charger_ranking_read_denies_when_active_role_header_is_missing(client: TestClient):
    async def identity_without_active_role(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[get_authorization_identity] = identity_without_active_role

    response = client.get(
        "/api/v1/sis/metrics/chargers",
        headers={"Session-Token": "test-token"},
    )

    assert response.status_code == 403
    assert "papel ativo obrigatorio" in response.json()["detail"]


def test_charger_kanban_read_denies_solicitante_even_with_carregadores_app_access(client: TestClient):
    async def non_technical_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["solicitante"],
            "active_hub_role": "solicitante",
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[get_authorization_identity] = non_technical_identity

    response = client.get(
        "/api/v1/sis/metrics/chargers/kanban",
        headers={"Session-Token": "test-token"},
    )

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_charger_update_schedule_allows_technical_with_carregadores_access(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def technical_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["solicitante", "tecnico-conservacao"],
            "active_hub_role": "tecnico-conservacao",
            "app_access": {"carregadores"},
        }

    called = {"value": False}

    async def fake_update_charger_schedule_glpi(glpi_client, charger_id: int, payload, db=None):
        called["value"] = True
        return {"id": charger_id}

    app.dependency_overrides[get_authorization_identity] = technical_identity
    monkeypatch.setattr(chargers, "update_charger_schedule_glpi", fake_update_charger_schedule_glpi)

    response = client.put(
        "/api/v1/sis/chargers/10/schedule",
        headers={"Session-Token": "test-token"},
        json={"business_start": "08:00", "business_end": "18:00", "work_on_weekends": False},
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert called["value"] is True
