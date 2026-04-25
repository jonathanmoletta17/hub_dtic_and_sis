from __future__ import annotations

import httpx
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core import auth_guard


def make_request(path: str = "/api/v1/sis/auth/me") -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": path,
            "headers": [],
            "query_string": b"",
            "server": ("testserver", 80),
            "scheme": "http",
            "client": ("127.0.0.1", 12345),
        }
    )


async def test_verify_session_blocks_when_glpi_is_unavailable_without_cache(monkeypatch) -> None:
    class UnavailableClient:
        class Http:
            async def aclose(self) -> None:
                return None

        _http = Http()

        async def get_full_session(self) -> dict:
            raise httpx.ConnectError("glpi offline")

    auth_guard._token_cache.clear()
    auth_guard.identity_cache.clear()
    monkeypatch.setattr(
        auth_guard.GLPIClient,
        "from_session_token",
        lambda instance, token: UnavailableClient(),
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_guard.verify_session(make_request(), session_token="user-session-token")

    assert exc_info.value.status_code == 503
    assert "indispon" in exc_info.value.detail
