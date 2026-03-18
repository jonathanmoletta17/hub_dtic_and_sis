from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.auth_guard import verify_session
from app.main import app
from app.routers import knowledge
from app.routers.knowledge import (
    _assert_attachment_constraints,
    _extract_created_item_id,
    _extract_glpi_upload_errors,
    _sanitize_attachment_filename,
)

MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024


def test_sanitize_attachment_filename_normalizes_path_and_symbols() -> None:
    result = _sanitize_attachment_filename("../../meu*arquivo?.pdf")
    assert result == "meu_arquivo_.pdf"


def test_extract_created_item_id_supports_common_glpi_payload_shapes() -> None:
    assert _extract_created_item_id({"id": 11}) == 11
    assert _extract_created_item_id({"id": "12"}) == 12
    assert _extract_created_item_id({"0": {"id": 13}}) == 13
    assert _extract_created_item_id({}) is None


def test_assert_attachment_constraints_accepts_valid_pdf() -> None:
    _assert_attachment_constraints("manual.pdf", "application/pdf", 1024)


def test_extract_glpi_upload_errors_returns_error_messages() -> None:
    errors = _extract_glpi_upload_errors(
        {
            "upload_result": {
                "filename": [
                    {"error": ""},
                    {"error": "Tipo de arquivo nao permitido"},
                ]
            }
        }
    )
    assert errors == ["Tipo de arquivo nao permitido"]


def test_assert_attachment_constraints_rejects_oversized_file() -> None:
    with pytest.raises(HTTPException) as exc:
        _assert_attachment_constraints("manual.pdf", "application/pdf", MAX_ATTACHMENT_SIZE_BYTES + 1)
    assert exc.value.status_code == 413


def test_assert_attachment_constraints_rejects_invalid_type() -> None:
    with pytest.raises(HTTPException) as exc:
        _assert_attachment_constraints("readme.md", "text/markdown", 1024)
    assert exc.value.status_code == 415


def test_download_embedded_document_proxies_glpi_binary(monkeypatch: pytest.MonkeyPatch) -> None:
    class _DummyClient:
        def __init__(self) -> None:
            self.downloaded_document_id: int | None = None
            self.closed = False
            self._http = SimpleNamespace(aclose=self._aclose)

        async def _aclose(self) -> None:
            self.closed = True

        async def download_document(self, document_id: int):
            self.downloaded_document_id = document_id
            return SimpleNamespace(
                content=b"image-bytes",
                headers={"content-type": "image/png"},
            )

    dummy_client = _DummyClient()

    async def override_verify_session():
        return {"validated": True, "session_token": "test-token", "source": "test"}

    async def fake_get_db(_context: str = "dtic"):
        yield object()

    async def fake_get_kb_document_metadata(_db, document_id: int):
        return {
            "id": document_id,
            "filename": "manual.png",
            "mime_type": "image/png",
            "size": 128,
            "date_upload": None,
        }

    monkeypatch.setattr(knowledge, "get_db", fake_get_db)
    monkeypatch.setattr(knowledge, "get_kb_document_metadata", fake_get_kb_document_metadata)
    monkeypatch.setattr(knowledge, "_get_glpi_client", lambda _session_token: dummy_client)
    app.dependency_overrides[verify_session] = override_verify_session

    try:
        client = TestClient(app)
        response = client.get(
            "/api/v1/dtic/knowledge/documents/951/content?disposition=inline",
            headers={"Session-Token": "test-token"},
        )
        client.close()
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.content == b"image-bytes"
    assert response.headers["content-type"].startswith("image/png")
    assert "inline" in response.headers["content-disposition"]
    assert "manual.png" in response.headers["content-disposition"]
    assert dummy_client.downloaded_document_id == 951
    assert dummy_client.closed is True
