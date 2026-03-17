# Configuration Matrix

## Goal

Define a single source of truth for environment configuration across backend, frontend and local edge proxy.

## Runtime domains

| Domain | Runtime | Source of truth | Variables |
| --- | --- | --- | --- |
| Backend app | FastAPI / Docker | `/.env`, [app/config.py](/home/jonathan-moletta/projects/tensor-aurora/app/config.py) | `DTIC_GLPI_*`, `SIS_GLPI_*`, `DB_*`, `APP_PORT`, `APP_TIMEZONE`, `CORS_ORIGINS`, `LOCAL_STATE_DB_PATH`, auth flags |
| Frontend server-side | Next.js server / Docker | `/web/.env`, `/web/.env.example`, [runtime.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/config/runtime.ts) | `INTERNAL_API_URL` |
| Frontend browser-side | Browser | same-origin contract | no public API origin env; browser always uses `/api/v1/*` |
| Edge proxy | Nginx | [docker-compose.yml](/home/jonathan-moletta/projects/tensor-aurora/docker-compose.yml), [tensor-aurora.conf](/home/jonathan-moletta/projects/tensor-aurora/infra/nginx/conf.d/tensor-aurora.conf) | `hub.local`, `api.hub.local`, alias redirects |
| Local smoke validation | Windows wrapper / Playwright | [run_hub_smoke_windows.ps1](/home/jonathan-moletta/projects/tensor-aurora/scripts/run_hub_smoke_windows.ps1) | `SMOKE_USERNAME`, `SMOKE_PASSWORD`, optional `SMOKE_BASE_URL` |

## Canonical environments

| Environment | Web origin | API origin | Frontend server internal API | Notes |
| --- | --- | --- | --- | --- |
| Local host | `http://hub.local:8080` | `http://api.hub.local:8080` | `http://localhost:8080` or `http://glpi-backend:8080` in Docker | browser stays same-origin |
| Docker compose | `http://hub.local:8080` | `http://api.hub.local:8080` | `http://glpi-backend:8080` | edge proxy is mandatory |
| Legacy aliases | `http://carregadores.local:8080` | `http://api.carregadores.local:8080` | not used internally | redirect-only compatibility |

## Rules

1. Browser code must never depend on absolute API URLs.
2. Server-side frontend code may use only `INTERNAL_API_URL`.
3. Backend timezone-sensitive logic must use `APP_TIMEZONE`.
4. New environment variables must be added to:
   - `/.env.example` when consumed by backend or docker
   - `/web/.env.example` when consumed by frontend server-side
   - this matrix when they affect deployment/runtime topology

## Minimal local set

Backend:

```env
DTIC_GLPI_URL=...
DTIC_GLPI_APP_TOKEN=...
DTIC_GLPI_USER_TOKEN=...
SIS_GLPI_URL=...
SIS_GLPI_APP_TOKEN=...
SIS_GLPI_USER_TOKEN=...
DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASS=...
DB_HOST_DTIC=...
DB_PORT_DTIC=3306
DB_NAME_DTIC=...
DB_USER_DTIC=...
DB_PASS_DTIC=...
APP_TIMEZONE=America/Sao_Paulo
```

Frontend:

```env
INTERNAL_API_URL=http://localhost:8080
```
