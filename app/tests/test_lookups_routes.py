from __future__ import annotations

from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient

from app.core.auth_guard import verify_session
from app.core.cache import identity_cache
from app.core.database import get_db
from app.main import app


class _DummyResult:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class _QueryAssertingSession:
    async def execute(self, sql, params=None):
        query = str(sql)
        if "FROM glpi_manufacturers" in query:
            assert "COALESCE(NULLIF(TRIM(name), ''), CONCAT('Sem nome (#', id, ')')) AS name" in query
            return _DummyResult(
                [
                    {"id": 1, "name": "Sem nome (#1)"},
                    {"id": 2, "name": "Dell"},
                ]
            )
        if "FROM glpi_computermodels" in query:
            assert "COALESCE(NULLIF(TRIM(name), ''), CONCAT('Sem nome (#', id, ')')) AS name" in query
            return _DummyResult(
                [
                    {"id": 10, "name": "Sem nome (#10)"},
                    {"id": 11, "name": "Latitude 5440"},
                ]
            )
        raise AssertionError(f"SQL nao esperado neste teste: {query}")


@contextmanager
def _build_client(session: _QueryAssertingSession):
    async def override_verify_session():
        return {"validated": True, "session_token": "test-token", "source": "test"}

    async def override_get_db(context: str = "dtic"):
        yield session

    app.dependency_overrides[verify_session] = override_verify_session
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_lookup_cache():
    identity_cache.clear()
    yield
    identity_cache.clear()


def test_lookup_manufacturers_sanitizes_null_or_empty_names():
    session = _QueryAssertingSession()
    with _build_client(session) as client:
        response = client.get("/api/v1/dtic/lookups/manufacturers", headers={"Session-Token": "test-token"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["manufacturers"][0]["name"] == "Sem nome (#1)"
    assert payload["manufacturers"][1]["name"] == "Dell"


def test_lookup_models_uses_named_option_sanitization():
    session = _QueryAssertingSession()
    with _build_client(session) as client:
        response = client.get(
            "/api/v1/dtic/lookups/models",
            headers={"Session-Token": "test-token"},
            params={"itemtype": "Computer"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["itemtype"] == "Computer"
    assert payload["models"][0]["name"] == "Sem nome (#10)"
