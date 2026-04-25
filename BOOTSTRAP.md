# BOOTSTRAP.md - hub-operacional-web

## Objetivo

Este repositorio e o produto canonico do nucleo operacional de tickets para `DTIC` e `SIS`.

Ele nao e:

- o repo de referencia `cli-control-3ui`
- o runtime Hermes
- a knowledge base/RAG

Ele integra com esses componentes, mas o ownership do produto aqui e o hub operacional.

## Leia primeiro

1. `C:\Users\jonathan-moletta\code\hub-operacional-web\README.md`
2. `C:\Users\jonathan-moletta\code\hub-operacional-web\ARCHITECTURE_RULES.md`
3. `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\canonical-scope.md`
4. `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\CLI_CONTROL_PLANE.md`
5. `AGENTS.md`, `HERMES.md`, `GEMINI.md` ou `CLAUDE.md` conforme o runtime em uso

## Stack real

- backend FastAPI em `C:\Users\jonathan-moletta\code\hub-operacional-web\backend`
- frontend Next.js 16 / React 19 em `C:\Users\jonathan-moletta\code\hub-operacional-web\web`
- orquestracao local por `C:\Users\jonathan-moletta\code\hub-operacional-web\docker-compose.yml`
- proxy nginx publicado em `http://localhost:18080`
- backend interno em `http://127.0.0.1:18081`
- frontend interno em `http://127.0.0.1:18082`
- Hermes externo esperado em `http://localhost:8501`

## Configuracao real

- `C:\Users\jonathan-moletta\code\hub-operacional-web\.env.example`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\.env`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\.env.runtime.local`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\pyproject.toml`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\runtime.ts`

## Limites obrigatorios

- Nao editar `cli-control-3ui` por inercia a partir deste repo.
- Nao criar storage paralelo de control plane dentro deste repo.
- Nao versionar segredos, tokens ou credenciais em docs, scripts ou exemplos.
- Nao criar settings locais de CLI, MCP ou hooks sem necessidade comprovada no proprio repo.
- Respeitar as zonas protegidas listadas em `ARCHITECTURE_RULES.md`.

Essa linha segue a mesma fronteira usada na knowledge base: o repo dono do dominio versiona seu contexto e seus contratos, mas nao espelha estado nativo do control plane nem persistencia de outro runtime.

## Bootstrap rapido

Subir a stack principal:

```powershell
docker compose up -d --build
docker compose ps
Invoke-RestMethod http://localhost:18080/health
```

Validar frontend:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npm run lint
npm exec vitest run
npm run build
```

Sanidade do backend:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\backend
python -m compileall app
```

Smoke principal:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npm exec playwright test e2e/hub-mvp.spec.ts
```

## Scripts locais de apoio

Doctor rapido:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1
```

Validacao consolidada:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1
```

Com smoke Playwright:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -RunPlaywright
```

## Notas operacionais

- O backend hoje nao possui suite `pytest` versionada neste repo. O baseline real de validacao e compose, health, `compileall`, `vitest`, `build` e Playwright.
- O fluxo `DTIC/new-ticket` depende do Hermes externo via `NEXT_PUBLIC_DTIC_AGENT_URL`.
- O fluxo `SIS/new-ticket` depende do backend GLPI/FormCreator real.
- Se o objetivo for operar este repo via control plane, trate os markdowns de contexto deste repositorio como superficie de projeto e os settings de CLI como superficie de usuario, salvo pedido explicito em sentido contrario.
