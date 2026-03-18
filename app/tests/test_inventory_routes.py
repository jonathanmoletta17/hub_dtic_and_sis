from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.auth_guard import verify_session
from app.core.authorization import get_authorization_identity
from app.core.database import get_db
from app.main import app
from app.routers import inventory


class _DummySession:
    async def execute(self, *args, **kwargs):
        raise AssertionError("Nao deveria executar SQL real neste teste.")


class _DummyGlpiClient:
    pass


@pytest.fixture
def client():
    async def override_verify_session():
        return {"validated": True, "session_token": "test-token", "source": "test"}

    async def override_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"inventario"},
        }

    async def override_get_db(context: str = "dtic"):
        yield _DummySession()

    app.dependency_overrides[verify_session] = override_verify_session
    app.dependency_overrides[get_authorization_identity] = override_identity
    app.dependency_overrides[get_db] = override_get_db

    test_client = TestClient(app)
    yield test_client
    test_client.close()
    app.dependency_overrides.clear()


def test_inventory_assets_denies_non_dtic_context(client: TestClient):
    response = client.get("/api/v1/sis/inventory/assets", headers={"Session-Token": "test-token"})

    assert response.status_code == 403
    assert "DTIC" in response.json()["detail"]


def test_inventory_assets_denies_without_inventario_app_access(client: TestClient):
    async def no_inventory_access(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"busca"},
        }

    app.dependency_overrides[get_authorization_identity] = no_inventory_access

    response = client.get("/api/v1/dtic/inventory/assets", headers={"Session-Token": "test-token"})

    assert response.status_code == 403
    assert "inventario" in response.json()["detail"]


def test_inventory_assets_denies_solicitante_role(client: TestClient):
    async def requester_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 11,
            "hub_roles": ["solicitante"],
            "active_hub_role": "solicitante",
            "app_access": {"inventario"},
        }

    app.dependency_overrides[get_authorization_identity] = requester_identity

    response = client.get("/api/v1/dtic/inventory/assets", headers={"Session-Token": "test-token"})

    assert response.status_code == 403
    assert "papel de autorizacao" in response.json()["detail"]


def test_inventory_assets_allows_tecnico_and_returns_service_payload(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def fake_list_assets(*args, **kwargs):
        return {
            "context": "dtic",
            "total": 1,
            "limit": 50,
            "offset": 0,
            "sort": "name",
            "order": "asc",
            "data": [
                {
                    "itemtype": "Computer",
                    "id": 1,
                    "name": "Notebook 01",
                    "serial": "ABC123",
                    "asset_tag": "PAT-001",
                    "state_id": 1,
                    "state_name": "Ativo",
                    "location_id": 1,
                    "location_name": "CAFF",
                    "responsible_user_id": None,
                    "responsible_user_name": None,
                    "responsible_group_id": 17,
                    "responsible_group_name": "DTIC",
                    "tech_user_id": None,
                    "tech_user_name": None,
                    "tech_group_id": None,
                    "tech_group_name": None,
                    "manufacturer_id": 1,
                    "manufacturer_name": "Dell",
                    "model_id": 1,
                    "model_name": "Latitude",
                    "is_dynamic": False,
                    "date_mod": "2026-03-17T10:00:00-03:00",
                    "last_inventory_update": "2026-03-17T10:00:00-03:00",
                    "inventory_stale": False,
                    "links": {"glpi": "https://example/glpi/front/computer.form.php?id=1"},
                }
            ],
        }

    monkeypatch.setattr(inventory.service, "list_assets", fake_list_assets)

    response = client.get("/api/v1/dtic/inventory/assets", headers={"Session-Token": "test-token"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["context"] == "dtic"
    assert payload["data"][0]["itemtype"] == "Computer"
    assert payload["data"][0]["links"]["glpi"].endswith("id=1")


def test_inventory_create_calls_service_with_whitelisted_payload(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    captured: dict[str, object] = {}

    def fake_get_user_client(session_token: str):
        captured["session_token"] = session_token
        return _DummyGlpiClient()

    async def fake_create_asset(client_obj, *, context: str, itemtype: str, payload: dict):
        captured["client"] = client_obj
        captured["context"] = context
        captured["itemtype"] = itemtype
        captured["payload"] = payload
        return {
            "context": context,
            "itemtype": itemtype,
            "id": 101,
            "success": True,
            "message": "Ativo criado com sucesso.",
            "result": {"id": 101},
        }

    monkeypatch.setattr(inventory, "_get_user_client", fake_get_user_client)
    monkeypatch.setattr(inventory.service, "create_asset", fake_create_asset)

    response = client.post(
        "/api/v1/dtic/inventory/assets/Computer",
        headers={"Session-Token": "test-token"},
        json={"input": {"name": "Novo notebook", "serial": "SER-001", "computermodels_id": 5}},
    )

    assert response.status_code == 200
    assert captured["session_token"] == "test-token"
    assert captured["context"] == "dtic"
    assert captured["itemtype"] == "Computer"
    assert captured["payload"] == {"name": "Novo notebook", "serial": "SER-001", "computermodels_id": 5}


def test_inventory_export_returns_csv_payload(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def fake_export_assets_csv(*args, **kwargs):
        return "itemtype,id,name\nComputer,1,Notebook 01\n"

    monkeypatch.setattr(inventory.service, "export_assets_csv", fake_export_assets_csv)

    response = client.get("/api/v1/dtic/inventory/assets/export", headers={"Session-Token": "test-token"})

    assert response.status_code == 200
    assert response.text.startswith("itemtype,id,name")
    assert "text/csv" in response.headers["content-type"]
