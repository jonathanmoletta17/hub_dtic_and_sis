from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_LOG_COLUMNS_CACHE: dict[str, frozenset[str]] = {}
_DEFAULT_POLL_LIMIT = 20


def _normalize_context(context: str) -> str:
    return (context or "dtic").split("-", 1)[0].strip().lower() or "dtic"


async def get_glpi_log_columns(db: AsyncSession, context: str) -> frozenset[str]:
    cache_key = _normalize_context(context)
    cached = _LOG_COLUMNS_CACHE.get(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'glpi_logs'
            """
        )
    )
    columns = frozenset(str(row[0]).lower() for row in result.fetchall())
    _LOG_COLUMNS_CACHE[cache_key] = columns
    return columns


def build_glpi_logs_query(columns: frozenset[str]) -> str:
    def string_expr(column: str, fallback: str = "''") -> str:
        if column in columns:
            return f"COALESCE({column}, '')"
        return fallback

    def int_expr(column: str, fallback: str = "0") -> str:
        if column in columns:
            return f"COALESCE({column}, 0)"
        return fallback

    message_expr = string_expr("message_log")
    if "message_log" not in columns:
        message_expr = string_expr("user_name")

    if "content" in columns:
        content_expr = string_expr("content")
    else:
        content_parts = [
            f"NULLIF(TRIM({string_expr(column)}), '')"
            for column in ("itemtype_link", "old_value", "new_value")
            if column in columns
        ]
        content_expr = (
            f"TRIM(CONCAT_WS(' ', {', '.join(content_parts)}))"
            if content_parts
            else "''"
        )

    return f"""
        SELECT
            id,
            itemtype,
            items_id,
            date_mod,
            {string_expr('itemtype_link')} AS itemtype_link,
            {int_expr('linked_action')} AS linked_action,
            {string_expr('user_name')} AS user_name,
            {int_expr('id_search_option')} AS id_search_option,
            {string_expr('old_value')} AS old_value,
            {string_expr('new_value')} AS new_value,
            {message_expr} AS message_log,
            {content_expr} AS content
        FROM glpi_logs
        WHERE id > :last_id
        ORDER BY id ASC
        LIMIT :limit
    """


def serialize_glpi_log_row(row_mapping: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(row_mapping["id"]),
        "itemtype": str(row_mapping.get("itemtype") or ""),
        "items_id": int(row_mapping.get("items_id") or 0),
        "date_mod": str(row_mapping.get("date_mod") or ""),
        "itemtype_link": str(row_mapping.get("itemtype_link") or ""),
        "linked_action": int(row_mapping.get("linked_action") or 0),
        "user_name": str(row_mapping.get("user_name") or ""),
        "id_search_option": int(row_mapping.get("id_search_option") or 0),
        "old_value": str(row_mapping.get("old_value") or ""),
        "new_value": str(row_mapping.get("new_value") or ""),
        "message_log": str(row_mapping.get("message_log") or ""),
        "content": str(row_mapping.get("content") or ""),
    }


async def fetch_latest_log_id(db: AsyncSession) -> int:
    result = await db.execute(text("SELECT COALESCE(MAX(id), 0) FROM glpi_logs"))
    scalar = result.scalar()
    return int(scalar or 0)


async def fetch_recent_glpi_log_events(
    db: AsyncSession,
    *,
    context: str,
    last_id: int,
    limit: int = _DEFAULT_POLL_LIMIT,
) -> list[dict[str, Any]]:
    columns = await get_glpi_log_columns(db, context)
    query = text(build_glpi_logs_query(columns))
    result = await db.execute(query, {"last_id": last_id, "limit": limit})
    return [serialize_glpi_log_row(dict(row._mapping)) for row in result.fetchall()]


def clear_glpi_log_columns_cache() -> None:
    _LOG_COLUMNS_CACHE.clear()
