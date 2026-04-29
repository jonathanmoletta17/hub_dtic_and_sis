# BOOTSTRAP.md - hub-operacional-web

## Objetivo

Este repositorio e o produto canonico do nucleo operacional de tickets para `DTIC` e `SIS`.

Raiz canonica nesta maquina:

- `/home/jonathan/projects/work/hub-operacional-web`

Nao use `C:\Users\jonathan-moletta\code\hub-operacional-web` nem `/mnt/c/Users/jonathan-moletta/code/hub-operacional-web` como raiz de codigo-fonte. Caminhos Windows em documentos antigos sao legado/historico de host, nao a fonte atual.

Ele nao e:

- o repo de referencia `cli-control-3ui`
- o runtime Hermes/Antigravity
- a knowledge base/RAG
- GLPI ou SIS
- o control plane

Ele integra com esses componentes, mas o ownership do produto aqui e o hub operacional.

## Leia primeiro

1. `README.md`
2. `ARCHITECTURE_RULES.md`
3. `docs/canonical-scope.md`
4. `docs/CLI_CONTROL_PLANE.md`
5. `AGENTS.md`, `HERMES.md`, `GEMINI.md` ou `CLAUDE.md` conforme o runtime em uso
6. `docs/README.md` para a hierarquia documental
7. `docs/auth-session-governance-2026-04-25.md` para auth/session

## Stack real

- backend FastAPI/Python em `backend/`
- frontend Next.js 16 / React 19 em `web/`
- orquestracao local por `docker-compose.yml`
- proxy nginx publicado em `http://localhost:18080`
- backend direto em `http://127.0.0.1:18081`
- frontend direto em `http://127.0.0.1:18082`
- Hermes externo: URL publica padrao `http://localhost:8501`, API conversacional padrao `http://localhost:8502`

## Configuracao real

- `.env.example`
- `.env`
- `.env.runtime.local`
- `backend/pyproject.toml`
- `web/package.json`
- `web/src/lib/config/runtime.ts`

`.env` e `.env.runtime.local` sao locais, ignorados e nunca devem ser versionados. Nao coloque segredos, tokens ou credenciais em markdowns, scripts versionados ou exemplos.

## Auth e health

- O auth padrao do Hub e `user_password_session`.
- O login usa usuario/senha reais do GLPI e mantem `session_token` do usuario.
- `user_token` de conta tecnica nao e requisito runtime normal.
- `/health` nao abre sessao tecnica e deve reportar `service_session_status=disabled`.
- `DTIC_GLPI_USER_TOKEN` e `SIS_GLPI_USER_TOKEN` so pertencem a smokes destrutivos opt-in `@mutation`, quando usados para cleanup/purge dos dados criados pelo proprio teste.

## Limites obrigatorios

- Nao editar `cli-control-3ui` por inercia a partir deste repo.
- Nao criar storage paralelo de control plane dentro deste repo.
- Nao mover configuracao nativa de Hermes/Antigravity, GLPI/SIS, Claude, Cursor ou MCP para dentro deste repo sem necessidade comprovada.
- Nao criar settings locais de CLI, Claude, Cursor, MCP ou hooks sem necessidade comprovada no proprio repo.
- Respeitar as zonas protegidas listadas em `ARCHITECTURE_RULES.md`.

Essa linha segue a mesma fronteira usada na knowledge base: o repo dono do dominio versiona seu contexto e seus contratos, mas nao espelha estado nativo do control plane nem persistencia de outro runtime.

## Bootstrap rapido

Subir a stack principal a partir da raiz WSL:

```bash
cd /home/jonathan/projects/work/hub-operacional-web
docker compose up -d --build
docker compose ps
curl --max-time 10 -sS http://localhost:18080/health
```

No health esperado, confirme:

- `auth_mode`: `user_password_session`
- `service_session_status`: `disabled`

Validar frontend:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
npm run lint
npm exec vitest run
npm run build
```

Sanidade do backend:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/backend
.venv/bin/python -m compileall app tests
.venv/bin/pytest -q -s tests
```

Smoke principal read-only:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
npm run smoke:hub
```

Smokes destrutivos opt-in:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
ALLOW_GLPI_MUTATION_SMOKE=true npm run smoke:hub:mutation
```

Use os smokes `@mutation` somente quando puder criar e limpar dados reais no GLPI. Eles exigem `SMOKE_USERNAME`, `SMOKE_PASSWORD`, URLs/App-Tokens GLPI e `*_GLPI_USER_TOKEN` no runtime local.

## Scripts locais de apoio

Os scripts PowerShell em `scripts/` continuam como apoio operacional quando o host tiver PowerShell disponivel. Resolva o caminho a partir da raiz WSL canonica; nao hardcode caminhos Windows legados.

Doctor rapido:

```bash
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/doctor-runtime.ps1)"
```

Validacao consolidada:

```bash
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/validate-runtime.ps1)"
```

## Notas operacionais

- O fluxo `DTIC/new-ticket` usa Hermes externo via `NEXT_PUBLIC_DTIC_AGENT_API_URL`; `NEXT_PUBLIC_DTIC_AGENT_URL` permanece como URL publica legado/diagnostica do Hermes, nao como segundo caminho de UI.
- O fluxo `SIS/new-ticket` depende do backend GLPI/FormCreator real.
- GLPI/SIS, Hermes/Antigravity, knowledge base/RAG e control plane sao externos ao repo.
- Se o objetivo for operar este repo via control plane, trate os markdowns de contexto deste repositorio como superficie de projeto e os settings de CLI como superficie de usuario, salvo pedido explicito em sentido contrario.
