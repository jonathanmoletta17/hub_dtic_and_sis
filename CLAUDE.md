# CLAUDE.md - hub-operacional-web

**Constituicao objetiva:** este repositorio e a plataforma operacional `DTIC END SIS` baseada em `.env` local, stack web e infraestrutura Docker. A fonte canonica nesta maquina fica em `/home/jonathan/projects/work/hub-operacional-web`; referencias `C:\Users\...` nos markdowns sao historico de host e nao devem ser tratadas como raiz de codigo-fonte neste workspace.

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

- Backend FastAPI em `backend/`.
- Frontend Next.js/React em `web/`.
- Orquestracao local por `docker-compose.yml` e suporte de `infra/`.
- Configuracao local por `.env` e `.env.runtime.local`.
- Hermes/Antigravity, knowledge base e control plane sao externos; este repo expone contratos e integracoes, nao replica esses runtimes.

## Regras

- Nao versione `.claude/settings.json`, `.claude/settings.local.json` ou `.mcp.json` neste repo sem necessidade comprovada.
- Use markdowns locais para contexto de projeto.
- Trate MCP, auth e sessions do Claude como superficie de usuario, nao de projeto, salvo pedido explicito.
- Nao abra patch no repo `cli-control-3ui` por inercia.
- Nao trate `logs/`, `output/`, `storybook-static/` ou caches de teste/build como fonte normativa.

## Validacao recomendada

- Doctor e validacao consolidada via `scripts/doctor-runtime.ps1` e `scripts/validate-runtime.ps1`.
- Frontend: `npm run lint`, `npm exec vitest run` e `npm run build` em `web/`.
- Backend: `python -m compileall app` em `backend/`.
- Runtime integrado: `docker compose up -d --build`, `docker compose ps` e health check do nginx publicado.
