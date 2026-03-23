from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.config import settings
from app.core.datetime_contract import ensure_aware_datetime, now_utc, serialize_datetime


CREATE_TABLES: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS charger_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'maintenance')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS charger_time_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        charger_id INTEGER NOT NULL,
        business_start TEXT NOT NULL,
        business_end TEXT NOT NULL,
        idle_threshold_minutes INTEGER NOT NULL DEFAULT 60,
        effective_from TEXT NOT NULL,
        effective_to TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (charger_id) REFERENCES charger_registry(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS charger_inactivation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        charger_id INTEGER NOT NULL,
        reason_code TEXT NOT NULL,
        reason_text TEXT,
        inactivated_at TEXT NOT NULL,
        expected_return_at TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (charger_id) REFERENCES charger_registry(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS charger_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        charger_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('planned', 'active', 'completed', 'canceled')),
        planned_start_at TEXT NOT NULL,
        planned_end_at TEXT NOT NULL,
        actual_start_at TEXT,
        actual_end_at TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (charger_id) REFERENCES charger_registry(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS charger_audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_user_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL,
        request_id TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS charger_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        ticket_id INTEGER,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sent INTEGER NOT NULL DEFAULT 0
    )
    """,
)

CREATE_INDEXES: tuple[str, ...] = (
    "CREATE INDEX IF NOT EXISTS idx_charger_registry_status ON charger_registry(status)",
    "CREATE INDEX IF NOT EXISTS idx_charger_time_rules_charger ON charger_time_rules(charger_id, effective_from)",
    "CREATE INDEX IF NOT EXISTS idx_charger_assignments_charger ON charger_assignments(charger_id, planned_start_at, planned_end_at, status)",
    "CREATE INDEX IF NOT EXISTS idx_charger_assignments_ticket ON charger_assignments(ticket_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_charger_audit_entity ON charger_audit_trail(entity_type, entity_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_charger_notifications_ticket ON charger_notifications(ticket_id, sent, created_at)",
)


def _now_iso() -> str:
    return serialize_datetime(now_utc()) or now_utc().isoformat()


def _to_json(data: dict[str, Any] | None) -> str | None:
    if data is None:
        return None
    return json.dumps(data, ensure_ascii=True, separators=(",", ":"), default=_json_default)


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return serialize_datetime(value) or value.isoformat()
    normalized = ensure_aware_datetime(value if isinstance(value, str) else None)
    if normalized is not None:
        return normalized.isoformat()
    return str(value)


def _to_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return ensure_aware_datetime(value)
    if isinstance(value, str):
        return ensure_aware_datetime(value)
    return None


def _deserialize_json(value: Any) -> dict[str, Any] | None:
    if not value:
        return None
    if isinstance(value, dict):
        return value
    try:
        return json.loads(str(value))
    except json.JSONDecodeError:
        return None


async def initialize_charger_management_state(engine: AsyncEngine) -> None:
    settings.local_state_db_path.parent.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys = ON"))
        for ddl in CREATE_TABLES:
            await conn.execute(text(ddl))
        for ddl in CREATE_INDEXES:
            await conn.execute(text(ddl))


async def insert_audit_event(
    session: AsyncSession,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_user_id: str,
    actor_role: str,
    request_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    details: dict[str, Any] | None = None,
) -> int:
    result = await session.execute(
        text(
            """
            INSERT INTO charger_audit_trail (
                entity_type,
                entity_id,
                action,
                actor_user_id,
                actor_role,
                before_json,
                after_json,
                details_json,
                created_at,
                request_id
            ) VALUES (
                :entity_type,
                :entity_id,
                :action,
                :actor_user_id,
                :actor_role,
                :before_json,
                :after_json,
                :details_json,
                :created_at,
                :request_id
            )
            """
        ),
        {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "actor_user_id": actor_user_id,
            "actor_role": actor_role,
            "before_json": _to_json(before),
            "after_json": _to_json(after),
            "details_json": _to_json(details),
            "created_at": _now_iso(),
            "request_id": request_id or "-",
        },
    )
    return int(result.lastrowid or 0)


async def enqueue_notification(
    session: AsyncSession,
    *,
    event_type: str,
    payload: dict[str, Any],
    ticket_id: int | None = None,
) -> int:
    result = await session.execute(
        text(
            """
            INSERT INTO charger_notifications (
                event_type,
                ticket_id,
                payload_json,
                created_at,
                sent
            ) VALUES (
                :event_type,
                :ticket_id,
                :payload_json,
                :created_at,
                0
            )
            """
        ),
        {
            "event_type": event_type,
            "ticket_id": ticket_id,
            "payload_json": _to_json(payload) or "{}",
            "created_at": _now_iso(),
        },
    )
    return int(result.lastrowid or 0)


async def list_notifications(
    session: AsyncSession,
    *,
    only_pending: bool = False,
    limit: int = 100,
) -> list[dict[str, Any]]:
    where = "WHERE sent = 0" if only_pending else ""
    rows = (
        await session.execute(
            text(
                f"""
                SELECT id, event_type, ticket_id, payload_json, created_at, sent
                FROM charger_notifications
                {where}
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": max(1, min(limit, 500))},
        )
    ).mappings().all()

    return [
        {
            "id": int(row["id"]),
            "event_type": str(row["event_type"]),
            "ticket_id": int(row["ticket_id"]) if row["ticket_id"] is not None else None,
            "payload": _deserialize_json(row["payload_json"]) or {},
            "created_at": _to_datetime(row["created_at"]) or now_utc(),
            "sent": bool(row["sent"]),
        }
        for row in rows
    ]


async def list_audit_events(
    session: AsyncSession,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    predicates: list[str] = []
    params: dict[str, Any] = {"limit": max(1, min(limit, 1000))}
    if entity_type:
        predicates.append("entity_type = :entity_type")
        params["entity_type"] = entity_type
    if entity_id:
        predicates.append("entity_id = :entity_id")
        params["entity_id"] = entity_id

    where_clause = f"WHERE {' AND '.join(predicates)}" if predicates else ""
    rows = (
        await session.execute(
            text(
                f"""
                SELECT
                    id,
                    entity_type,
                    entity_id,
                    action,
                    actor_user_id,
                    actor_role,
                    before_json,
                    after_json,
                    details_json,
                    created_at,
                    request_id
                FROM charger_audit_trail
                {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
    ).mappings().all()

    return [
        {
            "id": int(row["id"]),
            "entity_type": str(row["entity_type"]),
            "entity_id": str(row["entity_id"]),
            "action": str(row["action"]),
            "actor_user_id": str(row["actor_user_id"]),
            "actor_role": str(row["actor_role"]),
            "before": _deserialize_json(row["before_json"]),
            "after": _deserialize_json(row["after_json"]),
            "details": _deserialize_json(row["details_json"]),
            "created_at": _to_datetime(row["created_at"]) or now_utc(),
            "request_id": str(row["request_id"] or "-"),
        }
        for row in rows
    ]
