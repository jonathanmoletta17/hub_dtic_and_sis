# CLI Control Plane - Mapeamento Local

## Objetivo

Definir como `/home/jonathan/projects/work/hub-operacional-web` deve ser representado para CLIs e para o control plane, sem copiar estado nativo de outros runtimes para dentro deste repo.

Este workspace roda em WSL/ext4. Caminhos `C:\Users\...` ou `/mnt/c/...` em materiais antigos sao historico de host Windows e nao devem ser tratados como raiz de codigo-fonte.

## Evidencia usada

Projeto alvo:

- `README.md`
- `ARCHITECTURE_RULES.md`
- `docs/canonical-scope.md`
- `docker-compose.yml`
- `backend/pyproject.toml`
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/routers/health.py`
- `web/package.json`
- `web/playwright.config.ts`
- `web/vitest.config.ts`
- `web/src/lib/config/runtime.ts`
- `web/src/lib/api/agent-chat-service.ts`
- `web/src/modules/tickets/components/agent-chat/DticAgentChatEntry.tsx`

Fronteira auxiliar:

- `AGENTS.md`
- `BOOTSTRAP.md`
- `CLAUDE.md`
- `GEMINI.md`
- `HERMES.md`
- `docs/auth-session-governance-2026-04-25.md`

Referencia historica de host Windows:

- o control plane `cli-control-3ui` e externo a este repo
- referencias antigas a caminhos Windows do control plane servem apenas como historico/modelo, nao como alvo de patch deste workspace

Essa fronteira reforca uma regra importante: o repo dono do dominio versiona seu contexto e seus contratos, mas nao espelha estado nativo do control plane ou da knowledge base.

## Disponibilidade operacional

Stack do projeto:

- backend FastAPI/Python em `backend/`
- frontend Next.js 16 / React 19 em `web/`
- Docker Compose e Nginx
- proxy local em `http://localhost:18080`
- backend direto em `http://127.0.0.1:18081`
- frontend direto em `http://127.0.0.1:18082`

Dependencias externas:

- Hermes/Antigravity externo ao repo
- GLPI/SIS externos ao repo
- knowledge base/RAG externa ao repo
- control plane externo ao repo

## Representacao recomendada por modulo

### Context

Versionar em escopo de projeto:

- `BOOTSTRAP.md`
- `AGENTS.md`
- `GEMINI.md`
- `CLAUDE.md`
- `HERMES.md`
- `.claude.json`

Complementos obrigatorios:

- `README.md`
- `ARCHITECTURE_RULES.md`
- `docs/canonical-scope.md`
- `docs/auth-session-governance-2026-04-25.md`

### Run

Arquivos e comandos reais:

- `docker-compose.yml`
- `backend/Dockerfile`
- `web/Dockerfile`
- `web/package.json`
- `web/playwright.config.ts`
- `scripts/doctor-runtime.ps1`
- `scripts/validate-runtime.ps1`

### Diagnostics

Fontes reais:

- `GET http://localhost:18080/health`
- `docker compose ps`
- `scripts/doctor-runtime.ps1`
- `scripts/validate-runtime.ps1`
- `docs/archive/phase-reports/` como historico de validacao, nao como fonte de raiz atual

Health esperado:

- `auth_mode=user_password_session`
- `service_session_status=disabled`
- `service_user_token_required=false` por contexto

### Config

Superficie real do projeto:

- `.env.example`
- `.env`
- `.env.runtime.local`
- `backend/pyproject.toml`
- `backend/app/config.py`
- `web/src/lib/config/runtime.ts`

`.env` e `.env.runtime.local` sao locais, ignorados e nunca devem ser versionados. Segredos, tokens e credenciais ficam fora dos markdowns e scripts versionados.

### Security / Sandbox

Superficie local comprovada:

- portas e binds definidos em `docker-compose.yml`
- `security_opt: no-new-privileges:true` no compose
- auth padrao `user_password_session`
- `user_token` fora do runtime normal

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

- o repo usa Hermes/Antigravity como runtime externo no produto
- nao existe skill local versionada do proprio repo

Decisao:

- versionar apenas contexto de projeto via markdowns e `.claude.json`
- nao criar catalogos paralelos de skills sem necessidade real

### Sessions

Status atual:

- nao existe estado de sessao local do control plane versionado aqui
- sessoes GLPI interativas sao do usuario real e usam `session_token`
- `user_token` de conta tecnica nao participa de login, diagnostico, health padrao ou telas

Decisao:

- manter sessoes e memorias nos runtimes nativos de usuario
- criar eventual service account somente com desenho proprio, auditoria explicita e opt-in separado

## Escopo e precedencia

### O que fica no repo

- contexto de projeto
- bootstrap
- scripts de doctor e validacao
- documentacao operacional
- contratos do produto
- `.claude.json` como descritor de projeto, nao como settings nativo de Claude

### O que fica fora do repo

- `~/.codex/config.toml`
- `~/.gemini/settings.json`
- `~/.claude/settings.json`
- `~/.hermes/config.yaml`
- settings locais de Cursor/Claude/CLI
- auth, sessions, memories e tokens nativos dos CLIs
- MCPs e hooks que sejam de usuario/global
- runtime Hermes/Antigravity
- GLPI/SIS
- knowledge base/RAG
- control plane

## Decisoes explicitas

Nao criar por padrao neste repo:

- `.codex/config.toml`
- `.gemini/settings.json`
- `gemini-extension.json`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.cursor/`
- `.mcp.json`

Motivo:

- nao ha evidencia de que este produto precise possuir overrides persistentes de CLI em escopo de projeto
- criar esses arquivos agora aumentaria risco de espelhar estado do control plane sem ownership claro

## Acoes operacionais recomendadas

Docs/config de governanca:

```bash
git diff --check
git status --ignored --short
```

Runtime read-only:

```bash
docker compose ps
curl --max-time 10 -sS http://localhost:18080/health
```

Backend, quando alterar `backend/`:

```bash
cd backend
.venv/bin/python -m compileall app tests
.venv/bin/pytest -q -s tests
```

Frontend, quando alterar `web/`:

```bash
cd web
npm ci
npm run lint
npm exec vitest run
npm run build
```

Smoke principal read-only:

```bash
cd web
npm run smoke:hub
```

Smoke destrutivo opt-in:

```bash
cd web
ALLOW_GLPI_MUTATION_SMOKE=true npm run smoke:hub:mutation
```

Os smokes `@mutation` criam e limpam dados reais no GLPI. Eles exigem `SMOKE_USERNAME`, `SMOKE_PASSWORD`, URLs/App-Tokens GLPI e `*_GLPI_USER_TOKEN` no runtime local e ficam fora da validacao padrao.

Scripts PowerShell de apoio, quando o host tiver PowerShell disponivel:

```bash
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/doctor-runtime.ps1)"
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/validate-runtime.ps1)"
```

## Integracao com o control plane

Se `cli-control-3ui` apontar para este repo por `cwd`, ele deve tratar este projeto como:

- um repo com contexto local forte e explicito
- um produto com runtime principal em Docker Compose
- um consumidor de Hermes/Antigravity, nao um owner do runtime
- um consumidor de GLPI/SIS, nao owner desses sistemas
- um repo sem MCP local proprio e sem project-level settings de CLI por default
- um repo cujo health normal espera `service_session_status=disabled`

Isso mantem a fronteira clara entre:

- configuracao do projeto alvo
- configuracao do control plane
- configuracao nativa de cada CLI
- runtime externo de agentes e sistemas corporativos
