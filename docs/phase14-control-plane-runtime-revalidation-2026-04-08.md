# Phase 14 - Control Plane and Runtime Revalidation - 2026-04-08

## Objective

Consolidate the local control-plane surface of `hub-operacional-web` and revalidate the real runtime after the login/selector copy adjustments.

This phase closes three gaps:

1. project-local CLI/control-plane context needed to live in the target repo instead of only in workspace-global files
2. the smoke helper still depended on the old UI copy
3. the runtime validation script only supported the basic smoke and the doctor probe still produced false negatives for HTML endpoints

## Scope delivered

Project-local operational context created in the target repo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\AGENTS.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\GEMINI.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\CLAUDE.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\HERMES.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\CLI_CONTROL_PLANE.md`

Runtime tooling created or improved:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1`

Frontend E2E stabilization:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\helpers\hub.ts`

README index updated:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\README.md`

## Decisions recorded

The target repo now explicitly versions project context and validation tooling, but still does not mirror user/global CLI state.

Deliberately not created:

- `.codex/config.toml`
- `.gemini/settings.json`
- `gemini-extension.json`
- `.claude/settings.json`
- `.mcp.json`

Reason:

- there is still no evidence that this product needs persistent CLI overrides at project scope
- keeping native CLI auth, memory, sessions and MCP state outside the repo preserves ownership boundaries

## Technical changes

### 1. E2E helper made copy-tolerant

The shared smoke helper no longer hardcodes only the legacy labels. It now accepts both forms for:

- username placeholder: `nome.sobrenome` and `nome-sobrenome`
- login CTA: `Entrar no Gateway` and `Entrar no Hub`
- workspace labels: legacy `DTIC/SIS CONTEXT` and current `AMBIENTE DTIC/SIS`

That removed the regression introduced by the copy update in the login and selector pages.

### 2. Doctor probe hardened

`doctor-runtime.ps1` no longer relies on `Invoke-WebRequest` for HTML endpoints where this host was producing spurious `NullReferenceException` behavior.

The script now:

- loads `System.Net.Http`
- probes `http://localhost:18080/` and `http://localhost:8501/` through `HttpClient`
- keeps the real `health` check on `http://localhost:18080/health`

Result:

- `proxy.root` now reports correctly
- `hermes.url` now reports correctly when the external Streamlit runtime is reachable

### 3. Consolidated validation script extended

`validate-runtime.ps1` now supports:

```powershell
-RunFullPlaywright
```

When enabled, it executes:

```powershell
npx playwright test e2e --workers=1
```

The suite is intentionally serialized because the mutation smokes create and clean real GLPI records.

## Validation performed

### Doctor

Command:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1
```

Result:

- status `WARN`
- only remaining warning: `hermes` CLI not found in `PATH`
- runtime URLs validated:
  - `http://localhost:18080/health`
  - `http://localhost:18080/`
  - `http://localhost:8501/`

### Consolidated validation

Command:

```powershell
$env:SMOKE_USERNAME='***'
$env:SMOKE_PASSWORD='***'
$env:SMOKE_BASE_URL='http://localhost:18080'
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright
```

Result:

- `web lint`: passed
- `web vitest`: `24` files and `94` tests passed
- `web build`: passed
- `backend compileall`: passed
- `backend pytest`: skipped because no pytest suite exists in this repo
- `doctor runtime`: passed for all runtime endpoints, with only the optional missing `hermes` CLI warning
- Playwright E2E: `5` specs passed

### Playwright suite covered

- `hub-dtic-agent-handoff.spec.ts`
- `hub-dtic-agent-submit-clean.spec.ts`
- `hub-mvp.spec.ts`
- `hub-sis-followup-attachment-clean.spec.ts`
- `hub-sis-submit-clean.spec.ts`

## What is now proven again in the target repo

The extracted canonical app at:

`C:\Users\jonathan-moletta\code\hub-operacional-web`

is locally validated on 2026-04-08 for:

- login through the current hub copy
- selector navigation with the current environment naming
- DTIC handoff into Hermes
- DTIC real agent-first creation with cleanup
- SIS real FormCreator submission with cleanup
- SIS real followup and attachment flow with cleanup
- consolidated lint, unit tests, build and runtime health

## Remaining notes

1. `hermes` as a CLI is still not installed in `PATH`, but the external Hermes runtime is reachable at `http://localhost:8501`.
2. The backend still has no versioned pytest suite in this repo.
3. Real runtime validation still depends on local non-versioned environment files for GLPI/database access, which is expected for this extracted app.
