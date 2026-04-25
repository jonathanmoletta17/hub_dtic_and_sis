# CLI Control Plane - Mapeamento Local

## Objetivo

Definir como `C:\Users\jonathan-moletta\code\hub-operacional-web` deve ser representado para CLIs e para o control plane, sem copiar estado nativo de outros runtimes para dentro deste repo.

## Evidencia usada

Projeto alvo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\README.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\ARCHITECTURE_RULES.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\canonical-scope.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docker-compose.yml`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\pyproject.toml`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\main.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\config.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\playwright.config.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\vitest.config.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\runtime.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`

Modelo de referencia:

- `C:\Users\jonathan-moletta\code\cli-control-3ui\packages\contracts\src\capability-catalog.ts`
- `C:\Users\jonathan-moletta\code\cli-control-3ui\apps\control-web\src\features\capability\services\capabilityService.ts`
- `C:\Users\jonathan-moletta\code\cli-control-3ui\apps\control-web\src\features\capability\hooks\useCapabilityWorkbench.ts`
- `C:\Users\jonathan-moletta\code\cli-control-3ui\apps\control-web\src\features\capability\pages\CapabilityPage.tsx`
- `C:\Users\jonathan-moletta\code\cli-control-3ui\scripts\tooling\validate-clis-runtime.mjs`
- `C:\Users\jonathan-moletta\code\cli-control-3ui\scripts\tooling\validate-command-center-runtime.mjs`
- `C:\Users\jonathan-moletta\code\cli-control-3ui\docs\DOCKER_NETWORK.md`

Fronteira arquitetural auxiliar:

- `C:\Users\jonathan-moletta\code\storageEinconsistenciasIDES\claudecode\docs\knowledge-base-gate-c-fronteiras-arquitetura.md`

Essa referencia adicional reforca uma regra importante: o repo dono do dominio deve versionar seu contexto e seus contratos, mas nao espelhar estado nativo do control plane ou da knowledge base.

## Disponibilidade de CLIs observada neste host

Comandos encontrados por `where.exe` em 2026-04-08:

- `codex`
- `gemini`
- `claude`

Observacao:

- `hermes` nao apareceu no PATH como CLI.
- mesmo assim, o repo usa Hermes como runtime externo via `http://localhost:8501`.

## Representacao recomendada por modulo

### Context

Versionar em escopo de projeto:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\AGENTS.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\GEMINI.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\CLAUDE.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\HERMES.md`

Complementos obrigatorios:

- `README.md`
- `ARCHITECTURE_RULES.md`
- `docs/canonical-scope.md`

### Run

Arquivos e comandos reais:

- `docker-compose.yml`
- `backend\Dockerfile`
- `web\Dockerfile`
- `web\package.json`
- `web\playwright.config.ts`
- `scripts\doctor-runtime.ps1`
- `scripts\validate-runtime.ps1`

### Diagnostics

Fontes reais:

- `GET http://localhost:18080/health`
- `docker compose ps`
- docs `phase*.md`
- `scripts\doctor-runtime.ps1`

### Config

Superficie real do projeto:

- `.env.example`
- `.env`
- `.env.runtime.local`
- `backend\pyproject.toml`
- `backend\app\config.py`
- `web\src\lib\config\runtime.ts`

### Security / Sandbox

Superficie local comprovada:

- portas e binds definidos em `docker-compose.yml`
- `security_opt: no-new-privileges:true` no compose
- segredos mantidos em env files, nao em markdowns

### MCP

Status atual:

- nenhum servidor MCP local proprio deste repo foi encontrado
- nenhuma necessidade comprovada de versionar `.mcp.json` aqui

Decisao:

- manter MCP em escopo de usuario/control plane ate existir necessidade real de projeto

### Hooks

Status atual:

- nenhum hook local versionado
- nenhuma necessidade comprovada de hooks por projeto

### Agents / Skills

Status atual:

- o repo usa Hermes como runtime externo no produto
- nao existe skill local versionada do proprio repo

Decisao:

- versionar apenas contexto de projeto via markdowns
- nao criar catalogos paralelos de skills sem necessidade real

### Sessions

Status atual:

- nao existe estado de sessao local do control plane versionado aqui

Decisao:

- manter sessoes e memorias nos runtimes nativos de usuario

## Escopo e precedencia

### O que fica no repo

- contexto de projeto
- bootstrap
- scripts de doctor e validacao
- documentacao operacional
- contratos do produto

### O que fica fora do repo

- `~/.codex/config.toml`
- `~/.gemini/settings.json`
- `~/.claude/settings.json`
- `~/.hermes/config.yaml`
- auth, sessions, memories e tokens nativos dos CLIs
- MCPs e hooks que sejam de usuario/global

## Decisoes explicitas

Nao criar por padrao neste repo:

- `.codex/config.toml`
- `.gemini/settings.json`
- `gemini-extension.json`
- `.claude/settings.json`
- `.mcp.json`

Motivo:

- nao ha evidencia de que este produto precise possuir overrides persistentes de CLI em escopo de projeto
- criar esses arquivos agora aumentaria risco de espelhar estado do control plane sem ownership claro

## Acoes operacionais recomendadas

Doctor rapido:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1
```

Validacao consolidada:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1
```

Smoke principal:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npm exec playwright test e2e/hub-mvp.spec.ts
```

Validacao consolidada com suite E2E completa:

```powershell
$env:SMOKE_USERNAME="<usuario>"
$env:SMOKE_PASSWORD="<senha>"
$env:SMOKE_BASE_URL="http://localhost:18080"
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright
```

## Integracao com o control plane

Se `cli-control-3ui` apontar para este repo por `cwd`, ele deve tratar este projeto como:

- um repo com contexto local forte e explicito
- um produto com runtime principal em Docker Compose
- um consumidor de Hermes, nao um owner do runtime Hermes
- um repo sem MCP local proprio e sem project-level settings de CLI por default

Isso mantem a fronteira clara entre:

- configuracao do projeto alvo
- configuracao do control plane
- configuracao nativa de cada CLI
