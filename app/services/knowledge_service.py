"""
Service: Knowledge Base
Consultas SQL diretas na base GLPI para artigos da KB (read-only, CQRS).
"""

import logging
import re
from typing import Optional
from html import escape
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetime_contract import serialize_datetime

logger = logging.getLogger(__name__)


_DROP_CONTENT_TAGS = re.compile(
    r"<(?:script|style|iframe|object|embed|svg|math)[^>]*>.*?</(?:script|style|iframe|object|embed|svg|math)\s*>",
    flags=re.IGNORECASE | re.DOTALL,
)
_VOID_TAGS = {"br", "hr", "img"}
_ALLOWED_TAGS: dict[str, set[str]] = {
    "a": {"href", "title", "target"},
    "b": set(),
    "blockquote": set(),
    "br": set(),
    "code": set(),
    "div": set(),
    "em": set(),
    "h1": set(),
    "h2": set(),
    "h3": set(),
    "h4": set(),
    "h5": set(),
    "h6": set(),
    "hr": set(),
    "i": set(),
    "img": {"src", "alt", "title", "width", "height"},
    "li": set(),
    "ol": {"start"},
    "p": set(),
    "pre": set(),
    "span": set(),
    "strong": set(),
    "table": set(),
    "tbody": set(),
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan", "scope"},
    "thead": set(),
    "tr": set(),
    "u": set(),
    "ul": set(),
}


def _sanitize_url(value: str, glpi_base_url: str = "", *, for_image: bool = False) -> Optional[str]:
    """Permite apenas URLs e caminhos seguros para renderização."""
    candidate = value.strip()
    if not candidate:
        return None

    lowered = candidate.lower()
    if lowered.startswith(("javascript:", "vbscript:", "data:")):
        return None
    if candidate.startswith("//"):
        return None

    if glpi_base_url and for_image and not urlparse(candidate).scheme and not candidate.startswith("#"):
        candidate = urljoin(f"{glpi_base_url.rstrip('/')}/", candidate)
    elif glpi_base_url and candidate.startswith("/"):
        candidate = urljoin(f"{glpi_base_url.rstrip('/')}/", candidate)

    parsed = urlparse(candidate)
    allowed_schemes = {"http", "https"} if for_image else {"http", "https", "mailto", "tel"}
    if parsed.scheme and parsed.scheme.lower() not in allowed_schemes:
        return None

    return candidate


class _SafeHTMLParser(HTMLParser):
    """Reconstrói apenas uma whitelist controlada de HTML seguro."""

    def __init__(self, glpi_base_url: str = ""):
        super().__init__(convert_charrefs=True)
        self._glpi_base_url = glpi_base_url
        self._chunks: list[str] = []
        self._open_tags: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        self._append_tag(tag, attrs, self_closing=tag.lower() in _VOID_TAGS)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        self._append_tag(tag, attrs, self_closing=True)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag not in _ALLOWED_TAGS or tag in _VOID_TAGS or tag not in self._open_tags:
            return

        while self._open_tags:
            open_tag = self._open_tags.pop()
            self._chunks.append(f"</{open_tag}>")
            if open_tag == tag:
                break

    def handle_data(self, data: str) -> None:
        if data:
            self._chunks.append(escape(data))

    def handle_comment(self, data: str) -> None:
        return

    def _append_tag(
        self,
        tag: str,
        attrs: list[tuple[str, Optional[str]]],
        *,
        self_closing: bool,
    ) -> None:
        tag = tag.lower()
        if tag not in _ALLOWED_TAGS:
            return

        safe_attrs = self._sanitize_attrs(tag, attrs)
        attrs_html = "".join(f' {name}="{escape(value, quote=True)}"' for name, value in safe_attrs)
        closing = " /" if self_closing or tag in _VOID_TAGS else ""
        self._chunks.append(f"<{tag}{attrs_html}{closing}>")

        if not self_closing and tag not in _VOID_TAGS:
            self._open_tags.append(tag)

    def _sanitize_attrs(
        self,
        tag: str,
        attrs: list[tuple[str, Optional[str]]],
    ) -> list[tuple[str, str]]:
        allowed_attrs = _ALLOWED_TAGS[tag]
        safe_attrs: list[tuple[str, str]] = []

        for name, value in attrs:
            if value is None:
                continue

            attr_name = name.lower()
            if attr_name not in allowed_attrs:
                continue

            attr_value = value.strip()
            if not attr_value:
                continue

            if attr_name in {"colspan", "rowspan", "width", "height", "start"}:
                if attr_value.isdigit():
                    safe_attrs.append((attr_name, attr_value))
                continue

            if tag == "th" and attr_name == "scope":
                if attr_value in {"col", "row", "colgroup", "rowgroup"}:
                    safe_attrs.append((attr_name, attr_value))
                continue

            if tag == "a" and attr_name == "href":
                safe_href = _sanitize_url(attr_value, self._glpi_base_url)
                if safe_href:
                    safe_attrs.append(("href", safe_href))
                continue

            if tag == "a" and attr_name == "target":
                if attr_value in {"_blank", "_self"}:
                    safe_attrs.append((attr_name, attr_value))
                continue

            if tag == "img" and attr_name == "src":
                safe_src = _sanitize_url(attr_value, self._glpi_base_url, for_image=True)
                if safe_src:
                    safe_attrs.append(("src", safe_src))
                continue

            safe_attrs.append((attr_name, attr_value))

        if tag == "a" and any(name == "href" for name, _ in safe_attrs):
            target = next((value for name, value in safe_attrs if name == "target"), "")
            rel = "noopener noreferrer" if target == "_blank" else "noopener"
            safe_attrs.append(("rel", rel))

        return safe_attrs

    def get_html(self) -> str:
        while self._open_tags:
            self._chunks.append(f"</{self._open_tags.pop()}>")
        return "".join(self._chunks)


def _sanitize_html(html: str, glpi_base_url: str = "") -> str:
    """
    Sanitiza o HTML do GLPI para exibição segura no frontend.
    """
    if not html:
        return ""

    html = _DROP_CONTENT_TAGS.sub("", html)
    parser = _SafeHTMLParser(glpi_base_url)
    parser.feed(html)
    parser.close()
    return parser.get_html()


async def get_kb_categories(db: AsyncSession, is_faq: bool = None) -> list[dict]:
    """Busca categorias da KB com contagem de artigos visíveis."""
    try:
        faq_filter = ""
        if is_faq is not None:
            faq_filter = f"AND k_art.is_faq = {1 if is_faq else 0}"

        sql = text(f"""
            SELECT 
                kc.id,
                kc.name,
                COALESCE(kc.completename, kc.name) AS completename,
                COALESCE(kc.level, 0) AS level,
                (
                    SELECT COUNT(DISTINCT k_rel.knowbaseitems_id) 
                    FROM glpi_knowbaseitems_knowbaseitemcategories k_rel
                    JOIN glpi_knowbaseitems k_art ON k_art.id = k_rel.knowbaseitems_id
                    WHERE k_rel.knowbaseitemcategories_id = kc.id 
                    AND (k_art.begin_date IS NULL OR YEAR(k_art.begin_date) = 0 OR k_art.begin_date <= NOW())
                    AND (k_art.end_date IS NULL OR YEAR(k_art.end_date) = 0 OR k_art.end_date >= NOW())
                    {faq_filter}
                ) AS article_count
            FROM glpi_knowbaseitemcategories kc
            ORDER BY kc.name
        """)
        result = await db.execute(sql)
        rows = [dict(row._mapping) for row in result.fetchall()]
        # Filtrar categorias vazias
        return [r for r in rows if r.get("article_count", 0) > 0]
    except Exception as e:
        logger.error(f"Erro ao buscar categorias KB: {e}")
        # Fallback: retornar vazio
        return []


async def search_kb_articles(
    db: AsyncSession,
    query: Optional[str] = None,
    category_id: Optional[int] = None,
    is_faq: Optional[bool] = None,
    limit: int = 50,
) -> dict:
    """
    Busca artigos da KB com filtros opcionais.
    """
    try:
        conditions = ["1=1"]
        params: dict = {"lim": limit}

        # Filtro de visibilidade temporal
        conditions.append("(k.begin_date IS NULL OR YEAR(k.begin_date) = 0 OR k.begin_date <= NOW())")
        conditions.append("(k.end_date IS NULL OR YEAR(k.end_date) = 0 OR k.end_date >= NOW())")

        # Busca textual — tokeniza por espaço, AND entre termos
        if query:
            terms = query.strip().split()
            for i, term in enumerate(terms):
                conditions.append(f"(k.name LIKE :q{i} OR k.answer LIKE :q{i})")
                params[f"q{i}"] = f"%{term}%"

        # Filtro por categoria
        if category_id:
            conditions.append("k_rel.knowbaseitemcategories_id = :cat_id")
            params["cat_id"] = category_id

        # Filtro FAQ
        if is_faq is not None:
            conditions.append("k.is_faq = :faq")
            params["faq"] = 1 if is_faq else 0

        where = " AND ".join(conditions)

        sql = text(f"""
            SELECT 
                k.id,
                k.name,
                kc.name AS category,
                kc.id AS category_id,
                u.realname AS author,
                k.date_creation,
                k.date_mod,
                k.is_faq,
                COALESCE(k.view, 0) AS view_count
            FROM glpi_knowbaseitems k
            LEFT JOIN glpi_knowbaseitems_knowbaseitemcategories k_rel
                ON k.id = k_rel.knowbaseitems_id
            LEFT JOIN glpi_knowbaseitemcategories kc 
                ON k_rel.knowbaseitemcategories_id = kc.id
            LEFT JOIN glpi_users u 
                ON k.users_id = u.id
            WHERE {where}
            GROUP BY k.id
            ORDER BY k.date_mod DESC
            LIMIT :lim
        """)

        result = await db.execute(sql, params)
        rows = result.fetchall()

        articles = []
        for row in rows:
            r: dict = dict(row._mapping)
            r["is_faq"] = bool(r.get("is_faq", 0))
            if r.get("date_creation"):
                r["date_creation"] = serialize_datetime(r["date_creation"])
            if r.get("date_mod"):
                r["date_mod"] = serialize_datetime(r["date_mod"])
            articles.append(r)

        # Total count
        count_sql = text(f"""
            SELECT COUNT(DISTINCT k.id) AS total
            FROM glpi_knowbaseitems k
            LEFT JOIN glpi_knowbaseitems_knowbaseitemcategories k_rel
                ON k.id = k_rel.knowbaseitems_id
            WHERE {where}
        """)
        count_params = {k: v for k, v in params.items() if k != "lim"}
        count_result = await db.execute(count_sql, count_params)
        total = count_result.scalar() or 0

        return {"total": total, "articles": articles}

    except Exception as e:
        logger.error(f"Erro ao buscar artigos KB: {e}", exc_info=True)
        return {"total": 0, "articles": []}


async def get_kb_article(
    db: AsyncSession,
    article_id: int,
    glpi_base_url: str = "",
) -> Optional[dict]:
    """Busca um artigo completo por ID, com HTML sanitizado."""
    try:
        sql = text("""
            SELECT 
                k.id,
                k.name,
                k.answer,
                kc.name AS category,
                kc.id AS category_id,
                u.realname AS author,
                k.date_creation,
                k.date_mod,
                k.is_faq,
                COALESCE(k.view, 0) AS view_count
            FROM glpi_knowbaseitems k
            LEFT JOIN glpi_knowbaseitems_knowbaseitemcategories k_rel
                ON k.id = k_rel.knowbaseitems_id
            LEFT JOIN glpi_knowbaseitemcategories kc 
                ON k_rel.knowbaseitemcategories_id = kc.id
            LEFT JOIN glpi_users u 
                ON k.users_id = u.id
            WHERE k.id = :aid
            LIMIT 1
        """)
        result = await db.execute(sql, {"aid": article_id})
        row = result.fetchone()

        if not row:
            return None

        article: dict = dict(row._mapping)
        article["is_faq"] = bool(article.get("is_faq", 0))
        if article.get("date_creation"):
            article["date_creation"] = serialize_datetime(article["date_creation"])
        if article.get("date_mod"):
            article["date_mod"] = serialize_datetime(article["date_mod"])
        article["answer"] = _sanitize_html(article.get("answer", ""), glpi_base_url)
        return article

    except Exception as e:
        logger.error(f"Erro ao buscar artigo KB {article_id}: {e}", exc_info=True)
        return None
