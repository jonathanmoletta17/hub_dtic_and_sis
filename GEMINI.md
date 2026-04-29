# GEMINI.md - hub-operacional-web

Leia `BOOTSTRAP.md` primeiro.

## Papel deste repo

Este repo versiona o contexto do produto `hub-operacional-web`, nao o estado nativo do Gemini CLI.

Raiz canonica:

- `/home/jonathan/projects/work/hub-operacional-web`

Nao trate caminhos Windows legados como raiz de codigo-fonte neste workspace.

## O que usar como contexto

- `README.md`
- `ARCHITECTURE_RULES.md`
- `docs/canonical-scope.md`
- `docs/CLI_CONTROL_PLANE.md`
- `docs/auth-session-governance-2026-04-25.md`

## Regras

- Nao crie `.gemini/settings.json`, `gemini-extension.json`, `.gemini/commands`, `.gemini/skills`, `.mcp.json` ou settings locais equivalentes neste repo sem necessidade comprovada.
- Use os markdowns locais para contexto de projeto.
- Deixe settings persistentes do Gemini em escopo de usuario, salvo pedido explicito.
- Nao trate `cli-control-3ui` como repo alvo de edicao daqui.
- Nao versione segredos; `.env` e `.env.runtime.local` sao locais e ignorados.
- O auth padrao e `user_password_session`; `user_token` so pertence a smokes destrutivos `@mutation` com `ALLOW_GLPI_MUTATION_SMOKE=true`.

## Runtime externo relevante

- `DTIC/new-ticket` usa Hermes externo via `NEXT_PUBLIC_DTIC_AGENT_API_URL`
- a stack local do hub e publicada em `http://localhost:18080`
- o health esperado reporta `service_session_status=disabled`
