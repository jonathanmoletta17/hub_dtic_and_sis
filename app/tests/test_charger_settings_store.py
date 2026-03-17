from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.services.charger_settings_store import (
    DEFAULT_GLOBAL_SCHEDULE,
    initialize_local_state,
    read_global_schedule,
    write_global_schedule,
)


@pytest.mark.asyncio
async def test_initialize_and_update_global_schedule(tmp_path: Path):
    db_path = tmp_path / "local_state.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    await initialize_local_state(engine)

    async with session_maker() as session:
        initial = await read_global_schedule(session)
        assert initial["business_start"] == DEFAULT_GLOBAL_SCHEDULE["business_start"]
        assert initial["business_end"] == DEFAULT_GLOBAL_SCHEDULE["business_end"]
        assert initial["work_on_weekends"] is DEFAULT_GLOBAL_SCHEDULE["work_on_weekends"]

        updated = await write_global_schedule(
            session,
            business_start="07:30",
            business_end="19:00",
            work_on_weekends=True,
        )
        assert updated["business_start"] == "07:30"
        assert updated["business_end"] == "19:00"
        assert updated["work_on_weekends"] is True

    async with session_maker() as session:
        persisted = await read_global_schedule(session)
        assert persisted["business_start"] == "07:30"
        assert persisted["business_end"] == "19:00"
        assert persisted["work_on_weekends"] is True

    await engine.dispose()


@pytest.mark.asyncio
async def test_initialize_seeds_from_legacy_json(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "local_state.db"
    legacy_file = tmp_path / "charger_settings.json"
    legacy_file.write_text(
        '{"business_start":"09:00","business_end":"17:30","work_on_weekends":true}',
        encoding="utf-8",
    )

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    monkeypatch.setattr(
        "app.services.charger_settings_store.LEGACY_SETTINGS_FILE",
        legacy_file,
    )

    await initialize_local_state(engine)

    async with session_maker() as session:
        seeded = await read_global_schedule(session)
        assert seeded["business_start"] == "09:00"
        assert seeded["business_end"] == "17:30"
        assert seeded["work_on_weekends"] is True

    await engine.dispose()
