import pytest
from fastapi import HTTPException

from app.core.glpi_client import GLPIClient, GLPIClientError
from app.schemas.auth_schemas import LoginRequest
from app.services import auth_service
from app.config import settings


@pytest.mark.asyncio
async def test_perform_login_rejects_service_fallback_by_default(monkeypatch):
    async def fake_init_session_basic(self, username: str, password: str) -> str:
        raise GLPIClientError("denied", status_code=401)

    fallback_called = False

    async def fake_fallback_login(context: str, username: str):
        nonlocal fallback_called
        fallback_called = True
        return {"unexpected": True}

    monkeypatch.setattr(settings, "allow_insecure_service_fallback_login", False)
    monkeypatch.setattr(GLPIClient, "init_session_basic", fake_init_session_basic)
    monkeypatch.setattr(auth_service, "fallback_login", fake_fallback_login)

    with pytest.raises(HTTPException) as exc:
        await auth_service.perform_login("dtic", LoginRequest(username="alice", password="wrong"))

    assert exc.value.status_code == 401
    assert not fallback_called


@pytest.mark.asyncio
async def test_perform_login_allows_service_fallback_only_when_explicitly_enabled(monkeypatch):
    async def fake_init_session_basic(self, username: str, password: str) -> str:
        raise GLPIClientError("denied", status_code=403)

    expected = object()

    async def fake_fallback_login(context: str, username: str):
        return expected

    monkeypatch.setattr(settings, "allow_insecure_service_fallback_login", True)
    monkeypatch.setattr(GLPIClient, "init_session_basic", fake_init_session_basic)
    monkeypatch.setattr(auth_service, "fallback_login", fake_fallback_login)

    result = await auth_service.perform_login("dtic", LoginRequest(username="alice", password="wrong"))

    assert result is expected
