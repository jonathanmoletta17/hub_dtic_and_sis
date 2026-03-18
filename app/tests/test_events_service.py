from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.services.events_service import (
    build_glpi_logs_query,
    clear_glpi_log_columns_cache,
    fetch_recent_glpi_log_events,
)


class _DummyResult:
    def __init__(self, *, rows=None):
        self._rows = rows or []

    def fetchall(self):
        return self._rows


class _DummySession:
    def __init__(self, columns: list[str], rows: list[dict[str, object]]):
        self._columns = columns
        self._rows = rows
        self.queries: list[str] = []

    async def execute(self, sql, params=None):
        query = str(sql)
        self.queries.append(query)

        if "information_schema.columns" in query:
            return _DummyResult(rows=[(column,) for column in self._columns])

        if "FROM glpi_logs" in query:
            return _DummyResult(
                rows=[SimpleNamespace(_mapping=row) for row in self._rows]
            )

        raise AssertionError(f"SQL nao esperado no teste: {query}")


def test_build_glpi_logs_query_falls_back_to_real_glpi_columns():
    query = build_glpi_logs_query(
        frozenset(
            {
                "id",
                "itemtype",
                "items_id",
                "date_mod",
                "itemtype_link",
                "linked_action",
                "user_name",
                "id_search_option",
                "old_value",
                "new_value",
            }
        )
    )

    assert "COALESCE(user_name, '') AS message_log" in query
    assert "AS content" in query
    assert "COALESCE(message_log, '') AS message_log" not in query


@pytest.mark.asyncio
async def test_fetch_recent_glpi_log_events_serializes_schema_without_message_log():
    clear_glpi_log_columns_cache()
    db = _DummySession(
        columns=[
            "id",
            "itemtype",
            "items_id",
            "date_mod",
            "itemtype_link",
            "linked_action",
            "user_name",
            "id_search_option",
            "old_value",
            "new_value",
        ],
        rows=[
            {
                "id": 321,
                "itemtype": "Ticket",
                "items_id": 45,
                "date_mod": "2026-03-18 06:27:16",
                "itemtype_link": "",
                "linked_action": 0,
                "user_name": "Jonathan",
                "id_search_option": 12,
                "old_value": "4",
                "new_value": "2",
                "message_log": "Jonathan",
                "content": "4 2",
            }
        ],
    )

    events = await fetch_recent_glpi_log_events(db, context="dtic", last_id=320)

    assert events == [
        {
            "id": 321,
            "itemtype": "Ticket",
            "items_id": 45,
            "date_mod": "2026-03-18 06:27:16",
            "itemtype_link": "",
            "linked_action": 0,
            "user_name": "Jonathan",
            "id_search_option": 12,
            "old_value": "4",
            "new_value": "2",
            "message_log": "Jonathan",
            "content": "4 2",
        }
    ]
    assert any("COALESCE(user_name, '') AS message_log" in query for query in db.queries)
