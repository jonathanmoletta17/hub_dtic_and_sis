from datetime import datetime, timezone

from app.core.datetime_contract import APP_TIMEZONE, ensure_aware_datetime, serialize_datetime
from app.services.charger_service import _elapsed_minutes_since


def test_ensure_tz_normalizes_naive_datetime_to_local_timezone():
    naive = datetime(2026, 3, 15, 9, 30)

    normalized = ensure_aware_datetime(naive)

    assert normalized is not None
    assert normalized.tzinfo == APP_TIMEZONE
    assert normalized.isoformat().endswith("-03:00")


def test_elapsed_minutes_since_accepts_mixed_naive_and_aware_datetimes():
    start = datetime(2026, 3, 15, 10, 0)
    end = datetime(2026, 3, 15, 15, 15, tzinfo=timezone.utc).astimezone(APP_TIMEZONE)

    elapsed = _elapsed_minutes_since(start, end)

    assert elapsed == 135


def test_serialize_dt_emits_offset_for_naive_database_values():
    serialized = serialize_datetime(datetime(2026, 3, 15, 14, 45))

    assert serialized == "2026-03-15T14:45:00-03:00"
