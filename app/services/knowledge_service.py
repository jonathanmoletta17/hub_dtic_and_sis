"""
Service: Knowledge Base
Consultas SQL diretas na base GLPI para artigos da KB (read-only, CQRS).
"""

import logging
import re
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


def _sanitize_html(html: str, glpi_base_url: str = "") -> str:
    """
    Sanitiza o HTML do GLPI para exibição segura no frontend.
    """
    if not html:
        return ""

    # Remover tags script
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remover event handlers inline
    html = re.sub(r'\bon\w+\s*=\s*"[^"]*"', '', html, flags=re.IGNORECASE)
    html = re.sub(r"\bon\w+\s*=\s*'[^']*'", '', html, flags=re.IGNORECASE)

    # Reescrever URLs relativas de imagens do GLPI
    if glpi_base_url:
        base = glpi_base_url.rstrip("/")
        html = re.sub(
            r'src\s*=\s*"(/[^"]+)"',
            f'src="{base}\\1"',
            html,
        )

    return html


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
            r = dict(row._mapping)
            r["is_faq"] = bool(r.get("is_faq", 0))
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

        article = dict(row._mapping)
        article["is_faq"] = bool(article.get("is_faq", 0))
        article["answer"] = _sanitize_html(article.get("answer", ""), glpi_base_url)
        return article

    except Exception as e:
        logger.error(f"Erro ao buscar artigo KB {article_id}: {e}", exc_info=True)
        return None
