# Phase 23 - Hub Inline Agent Chat - 2026-04-09

## Objetivo

Substituir a tela poluida de pre-triagem do `DTIC/new-ticket` por um chat nativo no hub, mantendo o Hermes como runtime externo de classificacao e criacao real de tickets.

## Entregue

- API conversacional minima no Hermes em `http://localhost:8502` com sessao, mensagem, confirmacao e descarte.
- Novo shell de chat nativo React no hub para `DTIC/new-ticket`, sem popup e sem handoff manual como primeira experiencia.
- Fallback operacional para abrir o Hermes separado se a API nao responder.
- Atualizacao do `doctor` para validar `hermes.api`.
- Migracao dos E2E DTIC do modelo popup para o fluxo inline.

## Arquivos principais

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\api.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\cli.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_chat_api.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_cli.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-handoff.spec.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-submit-clean.spec.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`

## Validacao

- `python -m pytest -q` em `glpi-ticket-agent-mvp`: `70 passed`
- `npm run lint`: ok
- `npm exec vitest run`: `94 passed`
- `npm run build`: ok
- `python -m pytest` no backend do hub: `9 passed`
- `powershell -ExecutionPolicy Bypass -File scripts\doctor-runtime.ps1`: `PASS`
- `powershell -ExecutionPolicy Bypass -File scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`: `6/6` specs `Playwright` ok

## Estado resultante

- `DTIC/new-ticket` agora entra direto em conversa inline no hub.
- O fluxo real `DTIC -> Hermes -> GLPI -> hub` segue validado com criacao e cleanup.
- O Hermes continua externo ao repo, mas agora exposto tambem como API HTTP minima para a UX nativa do hub.
