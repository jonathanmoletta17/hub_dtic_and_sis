from __future__ import annotations

import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from fastapi.testclient import TestClient

from app.main import app
from app.core.glpi_client import GLPIClientError
from app.core.cache import identity_cache
from app.routers import admin


class _DummyHttp:
    async def aclose(self):
        return None


class _DummyGLPIClient:
    def __init__(
        self,
        datasets: dict[str, list[dict]],
        user_groups: dict[int, list[dict]] | None = None,
        add_result: object | None = None,
        add_error: Exception | None = None,
    ):
        self.datasets = datasets
        self.user_groups = user_groups or {}
        self._http = _DummyHttp()
        self.assigned: list[tuple[int, int]] = []
        self.revoked: list[tuple[int, int]] = []
        self.add_result = add_result
        self.add_error = add_error
        self.get_all_items_calls: dict[str, int] = {}

    async def get_all_items(self, itemtype: str, range_start: int = 0, range_end: int = 49, **_params):
        self.get_all_items_calls[itemtype] = self.get_all_items_calls.get(itemtype, 0) + 1
        data = self.datasets.get(itemtype, [])
        return data[range_start : range_end + 1]

    async def get_sub_items(self, itemtype: str, item_id: int, sub_itemtype: str, **_params):
        if itemtype == "User" and sub_itemtype == "Group_User":
            return self.user_groups.get(item_id, [])
        return []

    async def add_user_to_group(self, user_id: int, group_id: int):
        if self.add_error is not None:
            raise self.add_error
        self.assigned.append((user_id, group_id))
        self.user_groups.setdefault(user_id, []).append({"groups_id": group_id})
        if self.add_result is not None:
            return self.add_result
        return {"id": 999}

    async def remove_user_from_group(self, user_id: int, group_id: int):
        current = self.user_groups.get(user_id, [])
        if any(item.get("groups_id") == group_id for item in current):
            self.user_groups[user_id] = [item for item in current if item.get("groups_id") != group_id]
            self.revoked.append((user_id, group_id))
            return True
        return False


@pytest.fixture
def client_factory():
    created_clients: list[_DummyGLPIClient] = []

    def _build(
        datasets: dict[str, list[dict]],
        user_groups: dict[int, list[dict]] | None = None,
        add_result: object | None = None,
        add_error: Exception | None = None,
    ) -> TestClient:
        dummy_client = _DummyGLPIClient(
            datasets=datasets,
            user_groups=user_groups,
            add_result=add_result,
            add_error=add_error,
        )
        created_clients.append(dummy_client)

        async def override_admin_deps(context: str, target_context: str | None = None):
            return dummy_client, 1

        app.dependency_overrides[admin._require_gestor_cross_context] = override_admin_deps
        return TestClient(app)

    yield _build, created_clients

    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_admin_runtime_caches():
    admin.admin_users_cache.clear()
    admin.module_catalog_cache.clear()
    admin.admin_reference_cache.clear()
    identity_cache.clear()
    yield
    admin.admin_users_cache.clear()
    admin.module_catalog_cache.clear()
    admin.admin_reference_cache.clear()
    identity_cache.clear()


def test_module_catalog_returns_only_hub_app_groups(client_factory):
    build_client, _created = client_factory
    datasets = {
        "Group": [
            {"id": 109, "name": "Hub-App-busca"},
            {"id": 112, "name": "Hub-App-dtic-metrics"},
            {"id": 400, "name": "CC-CONSERVACAO"},
        ]
    }
    client = build_client(datasets)
    response = client.get("/api/v1/dtic/admin/module-catalog")
    client.close()

    assert response.status_code == 200
    payload = response.json()
    assert [item["group_id"] for item in payload] == [112, 109]
    assert [item["tag"] for item in payload] == ["dtic-metrics", "busca"]
    assert payload[0]["label"] == "Métricas DTIC"


def test_assign_group_validates_against_dynamic_catalog(client_factory):
    build_client, created_clients = client_factory
    datasets = {
        "Group": [
            {"id": 109, "name": "Hub-App-busca"},
        ]
    }
    client = build_client(datasets, user_groups={10: []})

    denied = client.post("/api/v1/dtic/admin/users/10/groups", json={"group_id": 113})
    allowed = client.post("/api/v1/dtic/admin/users/10/groups", json={"group_id": 109})
    client.close()

    assert denied.status_code == 400
    assert "não permitido" in denied.json()["detail"]
    assert allowed.status_code == 200
    assert allowed.json()["success"] is True
    assert created_clients[0].assigned == [(10, 109)]


def test_assign_group_extracts_binding_id_when_glpi_returns_list_payload(client_factory):
    build_client, _created = client_factory
    datasets = {
        "Group": [
            {"id": 112, "name": "Hub-App-dtic-metrics"},
        ]
    }
    client = build_client(datasets, user_groups={10: []}, add_result=[{"id": "321"}])
    response = client.post("/api/v1/dtic/admin/users/10/groups", json={"group_id": 112})
    client.close()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["binding_id"] == 321
    assert payload["already_exists"] is False


def test_assign_group_treats_duplicate_glpi_error_as_already_exists(client_factory):
    build_client, created_clients = client_factory
    datasets = {
        "Group": [
            {"id": 112, "name": "Hub-App-dtic-metrics"},
        ]
    }
    duplicate_error = GLPIClientError(
        message="GLPI API error (400): duplicate entry",
        status_code=400,
        detail=["ERROR_GLPI_ADD", "already exists"],
    )
    client = build_client(datasets, user_groups={10: []}, add_error=duplicate_error)
    response = client.post("/api/v1/dtic/admin/users/10/groups", json={"group_id": 112})
    client.close()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["binding_id"] is None
    assert payload["already_exists"] is True
    assert created_clients[0].assigned == []


def test_list_users_deduplicates_by_id_and_merges_access(client_factory):
    build_client, _created = client_factory
    datasets = {
        "User": [
            {"id": 7, "name": "jonathan-moletta", "realname": "Moletta", "firstname": "Jonathan"},
            {"id": 7, "name": "jonathan-moletta", "realname": "Moletta", "firstname": "Jonathan"},
        ],
        "Group_User": [
            {"users_id": 7, "groups_id": 109},
            {"users_id": 7, "groups_id": 110},
        ],
        "Profile_User": [
            {"users_id": 7, "profiles_id": 9},
            {"users_id": 7, "profiles_id": 20},
        ],
        "Group": [
            {"id": 109, "name": "Hub-App-busca"},
            {"id": 110, "name": "Hub-App-permissoes"},
        ],
        "Profile": [
            {"id": 9, "name": "Self-Service"},
            {"id": 20, "name": "Gestão e Administração"},
        ],
    }
    client = build_client(datasets)
    response = client.get("/api/v1/dtic/admin/users")
    client.close()

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    user = payload[0]
    assert user["id"] == 7
    assert user["app_access"] == ["busca", "permissoes"]
    assert user["roles"] == ["solicitante", "gestor"]


def test_list_users_uses_cache_and_assign_invalidates_cache(client_factory):
    build_client, created_clients = client_factory
    datasets = {
        "User": [
            {"id": 10, "name": "glpi", "realname": "GLPI", "firstname": "User"},
        ],
        "Group_User": [
            {"users_id": 10, "groups_id": 112},
        ],
        "Profile_User": [
            {"users_id": 10, "profiles_id": 20},
        ],
        "Group": [
            {"id": 109, "name": "Hub-App-busca"},
            {"id": 112, "name": "Hub-App-dtic-metrics"},
        ],
        "Profile": [
            {"id": 20, "name": "Gestão e Administração"},
        ],
    }
    client = build_client(datasets, user_groups={10: [{"groups_id": 112}]})

    first = client.get("/api/v1/dtic/admin/users")
    dummy = created_clients[0]
    after_first = dummy.get_all_items_calls.get("User", 0)
    second = client.get("/api/v1/dtic/admin/users")
    after_second = dummy.get_all_items_calls.get("User", 0)
    assign = client.post("/api/v1/dtic/admin/users/10/groups", json={"group_id": 109})
    third = client.get("/api/v1/dtic/admin/users")
    after_third = dummy.get_all_items_calls.get("User", 0)
    client.close()

    assert first.status_code == 200
    assert second.status_code == 200
    assert assign.status_code == 200
    assert third.status_code == 200

    # Primeira listagem popula cache, segunda usa cache, terceira recarrega apos invalidacao do assign.
    assert after_first >= 1
    assert after_second == after_first
    assert after_third > after_second


def test_list_users_uses_cache_and_revoke_invalidates_cache(client_factory):
    build_client, created_clients = client_factory
    datasets = {
        "User": [
            {"id": 10, "name": "glpi", "realname": "GLPI", "firstname": "User"},
        ],
        "Group_User": [
            {"users_id": 10, "groups_id": 112},
        ],
        "Profile_User": [
            {"users_id": 10, "profiles_id": 20},
        ],
        "Group": [
            {"id": 112, "name": "Hub-App-dtic-metrics"},
        ],
        "Profile": [
            {"id": 20, "name": "Gestão e Administração"},
        ],
    }
    client = build_client(datasets, user_groups={10: [{"groups_id": 112}]})

    first = client.get("/api/v1/dtic/admin/users")
    dummy = created_clients[0]
    after_first = dummy.get_all_items_calls.get("User", 0)
    second = client.get("/api/v1/dtic/admin/users")
    after_second = dummy.get_all_items_calls.get("User", 0)
    revoke = client.delete("/api/v1/dtic/admin/users/10/groups/112")
    third = client.get("/api/v1/dtic/admin/users")
    after_third = dummy.get_all_items_calls.get("User", 0)
    client.close()

    assert first.status_code == 200
    assert second.status_code == 200
    assert revoke.status_code == 200
    assert third.status_code == 200

    # Primeira listagem popula cache, segunda usa cache, terceira recarrega apos invalidacao do revoke.
    assert after_first >= 1
    assert after_second == after_first
    assert after_third > after_second


@pytest.mark.asyncio
async def test_list_users_handles_40_parallel_requests_with_single_cache_fill():
    datasets = {
        "User": [
            {"id": 10, "name": "glpi", "realname": "GLPI", "firstname": "User"},
        ],
        "Group_User": [
            {"users_id": 10, "groups_id": 112},
        ],
        "Profile_User": [
            {"users_id": 10, "profiles_id": 20},
        ],
        "Group": [
            {"id": 112, "name": "Hub-App-dtic-metrics"},
        ],
        "Profile": [
            {"id": 20, "name": "Gestão e Administração"},
        ],
    }
    dummy_client = _DummyGLPIClient(datasets=datasets)

    async def override_admin_deps(context: str, target_context: str | None = None):
        return dummy_client, 1

    app.dependency_overrides[admin._require_gestor_cross_context] = override_admin_deps

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        responses = await asyncio.gather(*[client.get("/api/v1/dtic/admin/users") for _ in range(40)])

    app.dependency_overrides.clear()

    assert all(response.status_code == 200 for response in responses)
    # Em cada execução real há duas paginas (1 item + pagina vazia), então cache fill único = 2 chamadas.
    assert dummy_client.get_all_items_calls.get("User") == 2
