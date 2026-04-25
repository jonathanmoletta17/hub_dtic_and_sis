# Hub Operacional Web

Aplicacao canonica extraida do legado `hub_dtic_and_sis` para sustentar o nucleo operacional de `DTIC` e `SIS`.

## Estado atual

- stack local em `http://localhost:18080`
- health em `http://localhost:18080/health`
- contexto `DTIC` com entrada `agent-first`
- contexto `SIS` com `FormCreator`
- fluxos reais validados:
  - login e selector
  - dashboard
  - meus chamados
  - detalhe do ticket
- `DTIC` chat inline nativo no hub com Hermes via `http://localhost:8502`
  - `DTIC` criacao real via agente com cleanup
  - `SIS` criacao real via formulario com cleanup
  - `SIS` followup e anexo com cleanup

## Escopo canonico

O produto canonico desta base e o nucleo operacional de tickets:

- autenticacao e bootstrap de contexto
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket` agent-first
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`

A base nova ja teve os modulos legados de frontend fora do MVP removidos fisicamente. No backend, `db_read` ja foi reduzido ao contrato real do MVP e os services herdados de `kpis` e `query_engine` ja sairam da base. O que ainda permanece como divida controlada esta concentrado em configuracoes protegidas de navegacao e eventuais sobras herdadas fora do runtime canonico.

## Documentacao principal

- [BOOTSTRAP.md](C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md)
- [AGENTS.md](C:\Users\jonathan-moletta\code\hub-operacional-web\AGENTS.md)
- [GEMINI.md](C:\Users\jonathan-moletta\code\hub-operacional-web\GEMINI.md)
- [CLAUDE.md](C:\Users\jonathan-moletta\code\hub-operacional-web\CLAUDE.md)
- [HERMES.md](C:\Users\jonathan-moletta\code\hub-operacional-web\HERMES.md)
- [CLI_CONTROL_PLANE.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\CLI_CONTROL_PLANE.md)
- [ARCHITECTURE_RULES.md](C:\Users\jonathan-moletta\code\hub-operacional-web\ARCHITECTURE_RULES.md)
- [canonical-scope.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\canonical-scope.md)
- [deferred-legacy-debt.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\deferred-legacy-debt.md)
- [phase1-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase1-validation-2026-04-07.md)
- [phase2-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase2-validation-2026-04-07.md)
- [phase3-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase3-validation-2026-04-07.md)
- [phase4-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase4-validation-2026-04-07.md)
- [phase5-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase5-validation-2026-04-07.md)
- [phase6-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase6-validation-2026-04-07.md)
- [phase7-validation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase7-validation-2026-04-07.md)
- [phase8-consolidation-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase8-consolidation-2026-04-07.md)
- [phase9-legacy-batch-01-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase9-legacy-batch-01-2026-04-07.md)
- [phase10-legacy-batch-02-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase10-legacy-batch-02-2026-04-07.md)
- [phase11-backend-batch-01-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase11-backend-batch-01-2026-04-07.md)
- [phase12-backend-dbread-reduction-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase12-backend-dbread-reduction-2026-04-07.md)
- [phase13-backend-utils-cleanup-2026-04-07.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase13-backend-utils-cleanup-2026-04-07.md)
- [phase14-control-plane-runtime-revalidation-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase14-control-plane-runtime-revalidation-2026-04-08.md)
- [phase15-backend-pytest-bootstrap-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase15-backend-pytest-bootstrap-2026-04-08.md)
- [phase16-hermes-semantic-lab-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase16-hermes-semantic-lab-2026-04-08.md)
- [phase17-hermes-semantic-v1-implementation-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase17-hermes-semantic-v1-implementation-2026-04-08.md)
- [phase18-hermes-corpus-lab-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase18-hermes-corpus-lab-2026-04-08.md)
- [phase18-hermes-chat-dossier-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase18-hermes-chat-dossier-2026-04-08.md)
- [phase19-hermes-followup-lab-2026-04-08.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase19-hermes-followup-lab-2026-04-08.md)
- [phase20-hermes-dtic-corpus-cleanup-semantic-validation-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase20-hermes-dtic-corpus-cleanup-semantic-validation-2026-04-09.md)
- [phase21-hermes-semantic-runtime-hardening-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase21-hermes-semantic-runtime-hardening-2026-04-09.md)
- [phase22-hub-native-agent-chat-plan-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase22-hub-native-agent-chat-plan-2026-04-09.md)
- [phase23-hub-inline-agent-chat-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase23-hub-inline-agent-chat-2026-04-09.md)
- [phase24-hub-inline-agent-chat-polish-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase24-hub-inline-agent-chat-polish-2026-04-09.md)
- [phase25-casa-civil-corporate-visual-system-master-plan-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase25-casa-civil-corporate-visual-system-master-plan-2026-04-09.md)
- [phase26-hub-first-corporate-system-roadmap-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase26-hub-first-corporate-system-roadmap-2026-04-09.md)
- [phase27-hub-h1-visual-inventory-and-foundations-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase27-hub-h1-visual-inventory-and-foundations-2026-04-09.md)
- [phase28-hub-idealized-frontend-proposal-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase28-hub-idealized-frontend-proposal-2026-04-09.md)
- [phase29-hub-h1-foundations-shell-auth-implementation-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase29-hub-h1-foundations-shell-auth-implementation-2026-04-09.md)
- [phase30-hub-light-mode-correction-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase30-hub-light-mode-correction-2026-04-09.md)
- [phase31-hub-semantic-theme-hardening-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase31-hub-semantic-theme-hardening-2026-04-09.md)
- [phase32-hub-frontend-screen-review-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase32-hub-frontend-screen-review-2026-04-09.md)
- [phase33-hub-visual-contract-and-action-plan-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase33-hub-visual-contract-and-action-plan-2026-04-10.md)
- [phase34-hub-front-a-theme-foundations-and-operational-contrast-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase34-hub-front-a-theme-foundations-and-operational-contrast-2026-04-10.md)
- [phase35-hub-shell-and-accessibility-refinement-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase35-hub-shell-and-accessibility-refinement-2026-04-10.md)
- [phase36-dtic-chat-surface-refinement-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase36-dtic-chat-surface-refinement-2026-04-10.md)
- [phase37-portal-surface-and-session-hardening-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase37-portal-surface-and-session-hardening-2026-04-10.md)
- [phase38-hub-storybook-visual-guard-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase38-hub-storybook-visual-guard-2026-04-10.md)
- [phase39-hub-light-mode-review-and-frontend-skill-foundations-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase39-hub-light-mode-review-and-frontend-skill-foundations-2026-04-10.md)
- [phase40-runtime-repair-and-e2e-closure-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase40-runtime-repair-and-e2e-closure-2026-04-10.md)
- [prompt-gestao-carregadores-light-mode-operacional-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\prompt-gestao-carregadores-light-mode-operacional-2026-04-10.md)
- [phase41-carregadores-prompt-v2-and-frontend-skill-draft-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase41-carregadores-prompt-v2-and-frontend-skill-draft-2026-04-10.md)
- [prompt-gestao-carregadores-light-mode-operacional-v2-2026-04-10.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\prompt-gestao-carregadores-light-mode-operacional-v2-2026-04-10.md)

## Configuracao relevante

- `NEXT_PUBLIC_DTIC_AGENT_URL`: URL publica do Hermes usada pelo `DTIC/new-ticket`
- `NEXT_PUBLIC_DTIC_AGENT_API_URL`: URL da API conversacional usada pelo chat inline do `DTIC/new-ticket`
- `.env.runtime.local`: configuracao local de runtime do compose

## Regra de consolidacao

- o que ja foi validado ponta a ponta fica protegido
- zonas estruturais protegidas nao devem ser alteradas sem plano explicito
- modulos herdados fora do MVP devem ser primeiro classificados e isolados antes de qualquer remocao fisica
