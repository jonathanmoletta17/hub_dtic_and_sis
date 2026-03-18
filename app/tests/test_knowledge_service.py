from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.services import knowledge_service
from app.services.knowledge_service import (
    _sanitize_html,
    get_kb_article_attachments,
)


class _DummyResult:
    def __init__(self, *, rows=None, scalar_value=None):
        self._rows = rows or []
        self._scalar_value = scalar_value

    def scalar(self):
        return self._scalar_value

    def fetchall(self):
        return self._rows


class _DummySession:
    def __init__(self, *, has_filesize: bool):
        self.has_filesize = has_filesize
        self.queries: list[str] = []

    async def execute(self, sql, params=None):
        query = str(sql)
        self.queries.append(query)

        if "information_schema.columns" in query:
            return _DummyResult(scalar_value=1 if self.has_filesize else None)

        if "FROM glpi_documents_items" in query:
            return _DummyResult(
                rows=[
                    SimpleNamespace(
                        _mapping={
                            "id": 77,
                            "filename": "manual.pdf",
                            "mime_type": "application/pdf",
                            "size": 2048 if self.has_filesize else None,
                            "date_upload": None,
                        }
                    )
                ]
            )

        raise AssertionError(f"SQL nao esperado no teste: {query}")


def test_sanitize_html_removes_active_content_vectors():
    raw_html = """
        <p onclick="alert(1)">Ol\u00e1</p>
        <script>alert('xss')</script>
        <a href="javascript:alert(2)">Clique</a>
        <img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" onerror="alert(3)">
    """

    safe_html = _sanitize_html(raw_html, "https://glpi.example")

    assert "onclick" not in safe_html
    assert "<script" not in safe_html
    assert "javascript:" not in safe_html
    assert "data:text/html" not in safe_html
    assert "Ol\u00e1" in safe_html


def test_sanitize_html_rewrites_relative_media_and_hardens_links():
    raw_html = '<p><img src="/files/image.png" alt="demo"><a href="https://example.com/doc" target="_blank">Doc</a></p>'

    safe_html = _sanitize_html(raw_html, "https://glpi.example")

    assert 'src="https://glpi.example/files/image.png"' in safe_html
    assert 'href="https://example.com/doc"' in safe_html
    assert 'rel="noopener noreferrer"' in safe_html


def test_sanitize_html_decodes_entity_encoded_office_markup():
    raw_html = (
        '&#60;div class="OutlineElement WordSection1"&#62;'
        '&#60;p class="Paragraph"&#62;Senha padronizada&#60;/p&#62;'
        '&#60;table class="Table"&#62;&#60;tr&#62;&#60;td&#62;Acesso&#60;/td&#62;&#60;/tr&#62;&#60;/table&#62;'
        '&#60;/div&#62;'
    )

    safe_html = _sanitize_html(raw_html)

    assert "&lt;div" not in safe_html
    assert "OutlineElement" not in safe_html
    assert "<div>" in safe_html
    assert "<p>Senha padronizada</p>" in safe_html
    assert "<table><tr><td>Acesso</td></tr></table>" in safe_html


@pytest.mark.asyncio
async def test_get_kb_article_attachments_uses_filesize_column_when_available():
    knowledge_service._DOCUMENT_FILESIZE_AVAILABLE = None
    db = _DummySession(has_filesize=True)

    attachments = await get_kb_article_attachments(db, article_id=10)

    assert attachments[0]["size"] == 2048
    assert any("COALESCE(d.filesize, 0) AS size" in query for query in db.queries)


@pytest.mark.asyncio
async def test_get_kb_article_attachments_falls_back_when_filesize_column_missing():
    knowledge_service._DOCUMENT_FILESIZE_AVAILABLE = None
    db = _DummySession(has_filesize=False)

    attachments = await get_kb_article_attachments(db, article_id=10)

    assert attachments[0]["size"] is None
    assert any("NULL AS size" in query for query in db.queries)
