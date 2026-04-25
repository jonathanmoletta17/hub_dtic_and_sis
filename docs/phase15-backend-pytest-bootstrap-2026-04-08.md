# Phase 15 - Backend Pytest Bootstrap - 2026-04-08

## Objective

Close the last validation gap in `hub-operacional-web` by versioning a real backend `pytest` suite and making the consolidated validation script execute it.

## Scope delivered

New backend test suite:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\tests\conftest.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\tests\test_config.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\tests\test_app_runtime.py`

Supporting updates:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\pyproject.toml`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\README.md`

Dependency alignment:

- `httpx` minimum version raised to `0.27.1` to avoid the local conflict observed with the installed `mcp` package

## What the suite covers

### Config

- trims and normalizes `CORS_ORIGINS`
- normalizes GLPI URLs
- returns the correct DB DSN per context
- raises a clear error for invalid contexts

### App runtime

- root endpoint contract
- `/health` healthy path
- `/health` degraded path
- lifespan shutdown calling session and DB cleanup hooks

## Test design notes

The backend imports a `Settings()` singleton at module import time, so the suite now injects a deterministic test environment in `tests/conftest.py` before importing app modules.

The HTTP tests intentionally stub shutdown hooks because their target is the FastAPI contract, not the local SQLAlchemy/GLPI runtime.

## Validation performed

Backend only:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\backend
python -m pytest tests -q
```

Result:

- `9` tests passed

Consolidated repo validation:

```powershell
$env:SMOKE_USERNAME='***'
$env:SMOKE_PASSWORD='***'
$env:SMOKE_BASE_URL='http://localhost:18080'
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild
```

Result:

- `web lint`: passed
- `web vitest`: passed
- `web build`: passed
- `backend compileall`: passed
- `backend pytest`: passed with `9` tests
- `doctor runtime`: passed with only the expected optional warning for missing `hermes` CLI in `PATH`

## Remaining note

The backend suite still emits third-party deprecation warnings from `slowapi` on Python `3.14`. That is an upstream dependency issue, not a gap in the local backend test coverage.
