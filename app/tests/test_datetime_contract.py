from datetime import datetime

from app.core.datetime_contract import ensure_aware_datetime, serialize_datetime


def test_ensure_aware_datetime_assumes_app_timezone_for_naive_values():
    value = datetime(2026, 3, 15, 10, 30, 0)

    normalized = ensure_aware_datetime(value)

    assert normalized is not None
    assert normalized.isoformat().endswith("-03:00")


def test_serialize_datetime_emits_iso8601_with_offset():
    value = datetime(2026, 3, 15, 10, 30, 0)

    serialized = serialize_datetime(value)

    assert serialized == "2026-03-15T10:30:00-03:00"
