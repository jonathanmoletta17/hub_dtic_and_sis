# GEMINI.md - hub-operacional-web

Leia `C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md` primeiro.

## Papel deste repo

Este repo versiona o contexto do produto `hub-operacional-web`, nao o estado nativo do Gemini CLI.

## O que usar como contexto

- `C:\Users\jonathan-moletta\code\hub-operacional-web\README.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\ARCHITECTURE_RULES.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\canonical-scope.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\CLI_CONTROL_PLANE.md`

## Regras

- Nao crie `.gemini/settings.json`, `gemini-extension.json`, `.gemini/commands` ou `.gemini/skills` neste repo sem necessidade comprovada.
- Use os markdowns locais para contexto de projeto.
- Deixe settings persistentes do Gemini em escopo de usuario, salvo pedido explicito.
- Nao trate `cli-control-3ui` como repo alvo de edicao daqui.

## Runtime externo relevante

- `DTIC/new-ticket` abre o Hermes externo via `NEXT_PUBLIC_DTIC_AGENT_URL`
- a stack local do hub e publicada em `http://localhost:18080`
