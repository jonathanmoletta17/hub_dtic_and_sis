import httpx
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.config import settings
from app.core import auth_guard


class _DummyHTTPClient:
    async def aclose(self) -> None:
        return None


class _FailingClient:
    def __init__(self, exc: Exception):
        self._exc = exc
        self._http = _DummyHTTPClient()

    async def get_full_session(self) -> dict:
        raise self._exc


class _WorkingClient:
    def __init__(self):
        self._http = _DummyHTTPClient()

    async def get_full_session(self) -> dict:
        return {"session": {"glpiID": 42}}


def _make_request(path: str, headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": b"",
            "headers": headers or [],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
        }
    )


@pytest.mark.asyncio
async def test_verify_session_fails_closed_when_glpi_is_unavailable(monkeypatch):
    auth_guard._token_cache.clear()
    monkeypatch.setattr(settings, "auth_fail_open_on_glpi_unavailable", False)
    monkeypatch.setattr(
        auth_guard.GLPIClient,
        "from_session_token",
        lambda instance, token: _FailingClient(httpx.ConnectError("offline")),
    )

    request = _make_request("/api/v1/dtic/db/stats")

    with pytest.raises(HTTPException) as exc:
        await auth_guard.verify_session(request, session_token="test-token")

    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_verify_session_accepts_frontend_session_cookie_name(monkeypatch):
    auth_guard._token_cache.clear()
    monkeypatch.setattr(settings, "auth_fail_open_on_glpi_unavailable", False)
    monkeypatch.setattr(
        auth_guard.GLPIClient,
        "from_session_token",
        lambda instance, token: _WorkingClient(),
    )

    request = _make_request(
        "/api/v1/dtic/db/stats",
        headers=[(b"cookie", b"sessionToken=cookie-token")],
    )

    result = await auth_guard.verify_session(request, x_session_token=None, session_token=None)

    assert result["session_token"] == "cookie-token"
    assert result["source"] == "glpi"
