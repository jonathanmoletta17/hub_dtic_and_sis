from app.services.knowledge_service import _sanitize_html


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
