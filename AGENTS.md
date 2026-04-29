# AGENTS.md - hub-operacional-web

If `BOOTSTRAP.md` exists, read it first.

## Repo alvo

Este repositorio e o produto canonico do hub operacional para `DTIC` e `SIS`.

Raiz canonica nesta maquina:

- `/home/jonathan/projects/work/hub-operacional-web`

Regras de caminho:

- Use a raiz WSL acima como fonte de codigo.
- Nao trate `C:\Users\jonathan-moletta\code\hub-operacional-web` ou `/mnt/c/Users/jonathan-moletta/code/hub-operacional-web` como raiz canonica.
- Referencias Windows em markdowns antigos sao legado/historico de host, salvo rotulo explicito em sentido contrario.

Stack:

- backend FastAPI/Python em `backend/`
- frontend Next.js 16 / React 19 em `web/`
- Docker Compose e Nginx
- proxy local em `http://localhost:18080`
- backend direto em `http://127.0.0.1:18081`
- frontend direto em `http://127.0.0.1:18082`

Escopo funcional protegido:

- login
- selector
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket` agent-first com chat inline integrado ao Hermes externo
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`

## Regras de operacao

- Use evidencia de arquivo, comando, health ou teste.
- Nao trate `cli-control-3ui` como destino de patch a partir deste repo.
- Nao invente MCPs, hooks, settings locais de Claude/Cursor/CLI ou skills se o repo nao provar essa necessidade.
- Prefira editar docs e scripts locais antes de criar novas camadas de persistencia.
- Nao versione segredos, tokens ou credenciais. `.env` e `.env.runtime.local` sao locais, ignorados e nunca devem entrar no repo.
- O auth padrao do Hub e `user_password_session`.
- `user_token` nao e dependencia runtime normal; aparece apenas em smokes destrutivos opt-in marcados `@mutation`, protegidos por `ALLOW_GLPI_MUTATION_SMOKE=true`.
- O health esperado usa `service_session_status=disabled` por desenho.

## Zonas protegidas

Nao altere sem plano explicito e regressao:

- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/context-registry.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/store/useAuthStore.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/api/httpClient.ts`
- `/home/jonathan/projects/work/hub-operacional-web/backend/app/services/auth_service.py`
- `/home/jonathan/projects/work/hub-operacional-web/backend/app/core/contexts.yaml`

## Validacao padrao

Documentacao apenas:

- `git diff --check`
- `git status --ignored --short`

Runtime:

- `docker compose ps`
- `curl --max-time 10 -sS http://localhost:18080/health`
- confirmar `auth_mode=user_password_session` e `service_session_status=disabled`

Backend, se alterar `backend/`:

- `cd backend && .venv/bin/python -m compileall app tests && .venv/bin/pytest -q -s tests`

Frontend, se alterar `web/`:

- `cd web && npm ci && npm run lint && npm exec vitest run && npm run build`

Smokes:

- Padrao read-only: `cd web && npm run smoke:hub`
- Destrutivo: `cd web && ALLOW_GLPI_MUTATION_SMOKE=true npm run smoke:hub:mutation`

## Fronteira com outros sistemas

- Hermes e externo a este repo.
- Antigravity e externo a este repo.
- GLPI/SIS sao externos a este repo.
- Knowledge base/RAG e externa a este repo.
- Control plane e externo a este repo.

Este repositorio deve expor contexto de projeto, bootstrap e validacao propria. Ele nao deve espelhar estado nativo desses outros runtimes.
