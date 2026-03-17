from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.config import BASE_DIR, settings
from app.core.datetime_contract import ensure_aware_datetime, now_utc, serialize_datetime

logger = logging.getLogger(__name__)

LEGACY_SETTINGS_FILE = BASE_DIR / "data" / "charger_settings.json"
DEFAULT_GLOBAL_SCHEDULE = {
    "business_start": "08:00",
    "business_end": "18:00",
    "work_on_weekends": False,
}

def _read_legacy_schedule() -> dict[str, object]:
    if not LEGACY_SETTINGS_FILE.exists():
        return DEFAULT_GLOBAL_SCHEDULE.copy()

    try:
        content = LEGACY_SETTINGS_FILE.read_text(encoding="utf-8").strip()
        if not content:
            return DEFAULT_GLOBAL_SCHEDULE.copy()

        data = json.loads(content)
        return {
            "business_start": str(data.get("business_start") or DEFAULT_GLOBAL_SCHEDULE["business_start"]),
            "business_end": str(data.get("business_end") or DEFAULT_GLOBAL_SCHEDULE["business_end"]),
            "work_on_weekends": bool(data.get("work_on_weekends", DEFAULT_GLOBAL_SCHEDULE["work_on_weekends"])),
        }
    except Exception as exc:
        logger.warning("Falha ao ler charger_settings.json legado: %s", exc)
        return DEFAULT_GLOBAL_SCHEDULE.copy()


def _parse_updated_at(value: object) -> datetime:
    parsed = ensure_aware_datetime(value if isinstance(value, (datetime, str)) else None)
    return parsed or now_utc()


async def initialize_local_state(engine: AsyncEngine) -> None:
    settings.local_state_db_path.parent.mkdir(parents=True, exist_ok=True)

    create_table_sql = text(
        """
        CREATE TABLE IF NOT EXISTS charger_global_settings (
            scope TEXT PRIMARY KEY,
            business_start TEXT NOT NULL,
            business_end TEXT NOT NULL,
            work_on_weekends INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        )
        """
    )
    select_sql = text(
        """
        SELECT scope
        FROM charger_global_settings
        WHERE scope = 'global'
        LIMIT 1
        """
    )
    upsert_sql = text(
        """
        INSERT INTO charger_global_settings (
            scope,
            business_start,
            business_end,
            work_on_weekends,
            updated_at
        ) VALUES (
            'global',
            :business_start,
            :business_end,
            :work_on_weekends,
            :updated_at
        )
        ON CONFLICT(scope) DO UPDATE SET
            business_start = excluded.business_start,
            business_end = excluded.business_end,
            work_on_weekends = excluded.work_on_weekends,
            updated_at = excluded.updated_at
        """
    )

    seed = _read_legacy_schedule()

    async with engine.begin() as conn:
        await conn.execute(create_table_sql)
        existing = (await conn.execute(select_sql)).first()
        if existing is None:
            await conn.execute(
                upsert_sql,
                {
                    "business_start": seed["business_start"],
                    "business_end": seed["business_end"],
                    "work_on_weekends": 1 if seed["work_on_weekends"] else 0,
                    "updated_at": serialize_datetime(now_utc()),
                },
            )


async def read_global_schedule(session: AsyncSession) -> dict[str, object]:
    row = (
        await session.execute(
            text(
                """
                SELECT business_start, business_end, work_on_weekends, updated_at
                FROM charger_global_settings
                WHERE scope = 'global'
                LIMIT 1
                """
            )
        )
    ).mappings().first()

    if row is None:
        return {
            **DEFAULT_GLOBAL_SCHEDULE,
            "updated_at": now_utc(),
        }

    return {
        "business_start": row["business_start"],
        "business_end": row["business_end"],
        "work_on_weekends": bool(row["work_on_weekends"]),
        "updated_at": _parse_updated_at(row["updated_at"]),
    }


async def write_global_schedule(
    session: AsyncSession,
    *,
    business_start: str,
    business_end: str,
    work_on_weekends: bool,
) -> dict[str, object]:
    updated_at = now_utc()
    await session.execute(
        text(
            """
            INSERT INTO charger_global_settings (
                scope,
                business_start,
                business_end,
                work_on_weekends,
                updated_at
            ) VALUES (
                'global',
                :business_start,
                :business_end,
                :work_on_weekends,
                :updated_at
            )
            ON CONFLICT(scope) DO UPDATE SET
                business_start = excluded.business_start,
                business_end = excluded.business_end,
                work_on_weekends = excluded.work_on_weekends,
                updated_at = excluded.updated_at
            """
        ),
        {
            "business_start": business_start,
            "business_end": business_end,
            "work_on_weekends": 1 if work_on_weekends else 0,
            "updated_at": serialize_datetime(updated_at),
        },
    )
    await session.commit()
    return {
        "business_start": business_start,
        "business_end": business_end,
        "work_on_weekends": work_on_weekends,
        "updated_at": updated_at,
    }
