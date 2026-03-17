from __future__ import annotations

from datetime import datetime

import pytest

from app.core.datetime_contract import APP_TIMEZONE
from app.services.analytics_service import AnalyticsScope, get_distribution_category, get_distribution_entity


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeDb:
    def __init__(self, rows):
        self.rows = rows
        self.query_text = ""
        self.params = {}

    async def execute(self, query, params):
        self.query_text = str(query)
        self.params = dict(params)
        return _FakeResult(self.rows)


def _scope() -> AnalyticsScope:
    return AnalyticsScope(
        context="sis",
        date_from=datetime(2026, 3, 1, tzinfo=APP_TIMEZONE),
        date_to=datetime(2026, 3, 30, tzinfo=APP_TIMEZONE),
        department="manutencao",
        group_ids=[22],
    )


@pytest.mark.asyncio
async def test_distribution_entity_sql_scope_and_order():
    db = _FakeDb(rows=[("Entidade A", 7), ("Entidade B", 4)])

    data = await get_distribution_entity(db, _scope(), limit=10)

    assert data == [
        {"name": "Entidade A", "value": 7},
        {"name": "Entidade B", "value": 4},
    ]
    assert "t.status IN (1, 2, 3, 4)" in db.query_text
    assert "ORDER BY value DESC, name ASC" in db.query_text
    assert db.params["lim"] == 10
    assert db.params["group_id_0"] == 22


@pytest.mark.asyncio
async def test_distribution_category_defaults_missing_name():
    db = _FakeDb(rows=[(None, 3)])

    data = await get_distribution_category(db, _scope(), limit=10)

    assert data == [{"name": "Sem categoria", "value": 3}]
    assert "t.status IN (1, 2, 3, 4)" in db.query_text
    assert "ORDER BY value DESC, name ASC" in db.query_text
