# CLAUDE.md - hub-operacional-web

**Constituicao objetiva:** este repositorio e a plataforma operacional `DTIC` e `SIS` baseada em `.env` local, stack web e infraestrutura Docker. A fonte canonica nesta maquina fica em `/home/jonathan/projects/work/hub-operacional-web`; referencias `C:\Users\...` nos markdowns sao historico de host e nao devem ser tratadas como raiz de codigo-fonte neste workspace.

Leia `BOOTSTRAP.md` primeiro.

## Papel deste repo

Este repo versiona o contexto do produto `hub-operacional-web`, nao o estado nativo do Claude, do Cursor ou do runtime Hermes.

## Contexto minimo

- `README.md`
- `ARCHITECTURE_RULES.md`
- `docs/canonical-scope.md`
- `docs/CLI_CONTROL_PLANE.md`
- `AGENTS.md`
- `BOOTSTRAP.md`

## Constituicao operacional do projeto

- Backend FastAPI/Python em `backend/`.
- Frontend Next.js 16 / React 19 em `web/`.
- Orquestracao local por `docker-compose.yml` e suporte de `infra/`.
- Configuracao local por `.env` e `.env.runtime.local`.
- Proxy local em `http://localhost:18080`.
- Backend direto em `http://127.0.0.1:18081`.
- Frontend direto em `http://127.0.0.1:18082`.
- Hermes/Antigravity, GLPI/SIS, knowledge base e control plane sao externos; este repo expoe contratos e integracoes, nao replica esses runtimes.

## Regras

- Nao versione `.claude/settings.json`, `.claude/settings.local.json`, `.cursor/`, `.mcp.json` ou settings locais equivalentes sem necessidade comprovada.
- Use markdowns locais para contexto de projeto.
- Trate MCP, auth e sessions do Claude como superficie de usuario, nao de projeto, salvo pedido explicito.
- Nao abra patch no repo `cli-control-3ui` por inercia.
- Nao trate `logs/`, `output/`, `storybook-static/` ou caches de teste/build como fonte normativa.
- Nao versione segredos. `.env` e `.env.runtime.local` sao locais e ignorados.
- O auth padrao e `user_password_session`; `user_token` nao e dependencia runtime normal.
- Smokes destrutivos ficam isolados por `@mutation` e exigem `ALLOW_GLPI_MUTATION_SMOKE=true`.
- O health esperado reporta `service_session_status=disabled`.

## Validacao recomendada

- Docs/config de governanca: `git diff --check` e `git status --ignored --short`.
- Runtime: `docker compose ps` e `curl --max-time 10 -sS http://localhost:18080/health`.
- Frontend: `npm run lint`, `npm exec vitest run` e `npm run build` em `web/`.
- Backend: `.venv/bin/python -m compileall app tests` e `.venv/bin/pytest -q -s tests` em `backend/`.
- Smoke read-only: `npm run smoke:hub` em `web/`.
