# Phase 2 Validation - 2026-04-07

## Objective

Bring the `SIS/new-ticket` FormCreator flow into the extracted `hub-operacional-web`
project without reintroducing legacy modules outside the MVP.

## Scope added in Phase 2

Backend routers enabled in the new project:

- `app/routers/lookups.py`
- `app/routers/domain_formcreator.py`

Backend wiring updated:

- `app/main.py`

No backend contract changes were made. The new project now exposes:

- `/api/v1/{context}/lookups/*`
- `/api/v1/{context}/domain/formcreator/*`

Frontend changes:

- smoke coverage expanded in `web/e2e/hub-mvp.spec.ts` to validate:
  - `SIS/new-ticket` loads service catalog
  - selecting a service loads the real form schema

## Validation performed

### Backend syntax

Command:

```powershell
python -m compileall app
```

Workdir:

`C:\Users\jonathan-moletta\code\hub-operacional-web\backend`

Result:

- passed

### Frontend unit tests

Command:

```powershell
npm exec vitest run src/__tests__/contracts src/lib/mvp-navigation.test.ts src/modules/tickets/components/agent-entry/dtic-agent-flow.test.ts
```

Workdir:

`C:\Users\jonathan-moletta\code\hub-operacional-web\web`

Result:

- `17` tests passed

### Frontend build

Command:

```powershell
npm run build
```

Workdir:

`C:\Users\jonathan-moletta\code\hub-operacional-web\web`

Result:

- passed

### Runtime

Command:

```powershell
docker compose up -d --build
```

Workdir:

`C:\Users\jonathan-moletta\code\hub-operacional-web`

Results:

- `hub-backend`: healthy
- `hub-frontend`: healthy
- `hub-proxy`: healthy
- health endpoint through proxy: `http://localhost:18080/health`

### Smoke

Command:

```powershell
$env:SMOKE_USERNAME='jonathan-moletta'
$env:SMOKE_PASSWORD='JNMolett@#2025!!!'
$env:SMOKE_BASE_URL='http://localhost:18080'
npm exec playwright test e2e/hub-mvp.spec.ts
```

Result:

- passed

Validated path:

1. login through gateway
2. DTIC selector and core navigation
3. SIS selector and core navigation
4. `SIS/new-ticket`
5. catalog API load
6. first service selection
7. real form schema load

## What is now proven in the extracted app

The clean project at:

`C:\Users\jonathan-moletta\code\hub-operacional-web`

now supports the MVP operational core with:

- DTIC:
  - login
  - selector
  - dashboard
  - user tickets
  - agent-first entry
- SIS:
  - login
  - selector
  - dashboard
  - user tickets
  - FormCreator service catalog
  - real schema loading in `new-ticket`

## Deliberately not validated in this phase

- SIS form submission
- SIS attachment upload through FormCreator
- DTIC agent execution beyond the current agent-first entry screen
- non-MVP legacy modules

## Remaining risks

1. `SIS/new-ticket` read path is validated, but submit/mutation is still pending in the extracted repo.
2. The extracted project still carries inherited support code that is unused in the MVP and should be trimmed later.
3. Local runtime still depends on non-versioned env files for real GLPI/database access.

## Acceptance

Phase 2 is accepted as complete for the read-only FormCreator extraction:

- backend routes are present in the clean repo
- frontend build still passes
- runtime stack is healthy
- `SIS/new-ticket` is working against real APIs in the new extracted project
