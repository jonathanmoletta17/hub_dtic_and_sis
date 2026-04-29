# HERMES.md - hub-operacional-web

Leia `BOOTSTRAP.md` primeiro.

## Papel deste repo

Este repo e consumidor do Hermes/Antigravity no fluxo `DTIC` agent-first. Ele nao versiona o runtime Hermes, memoria, configuracao nativa, sessoes ou storage do agente.

Raiz canonica do hub:

- `/home/jonathan/projects/work/hub-operacional-web`

Hermes/Antigravity, GLPI/SIS, knowledge base/RAG e control plane sao externos a este repo.

## Arquivos chave da integracao

- `web/src/modules/tickets/components/agent-chat/DticAgentChatEntry.tsx`
- `web/src/lib/api/agent-chat-service.ts`
- `web/src/lib/config/runtime.ts`
- `docs/dtic-new-ticket-assisted-flow-contract-v1.md`
- `docs/archive/phase-reports/phase5-validation-2026-04-07.md`
- `docs/archive/phase-reports/phase6-validation-2026-04-07.md`
- `docs/archive/phase-reports/phase7-validation-2026-04-07.md`

## Contrato observado

- `DTIC/new-ticket` usa chat inline no hub contra `NEXT_PUBLIC_DTIC_AGENT_API_URL`.
- O valor padrao da API conversacional externa e `http://localhost:8502`.
- `NEXT_PUBLIC_DTIC_AGENT_URL` permanece como URL publica do Hermes, padrao `http://localhost:8501`.
- O hub envia contexto estruturado de usuario, contexto `dtic`, mensagens e confirmacao de draft.
- O Hermes continua dono de classificacao, clarificacao, draft e submit no GLPI.

## Regras

- Nao mover configuracao nativa do Hermes/Antigravity para dentro deste repo.
- Nao criar `config.yaml`, memorias, sessoes, bancos ou arquivos de runtime do Hermes neste repo sem mudanca explicita de ownership.
- Nao usar `user_token` como dependencia runtime normal do Hub; ele so aparece nos smokes destrutivos `@mutation` protegidos por `ALLOW_GLPI_MUTATION_SMOKE=true`.
- Se a integracao falhar, validar primeiro `runtime.ts`, `agent-chat-service.ts`, `DticAgentChatEntry.tsx`, compose do hub e disponibilidade do Hermes externo.
