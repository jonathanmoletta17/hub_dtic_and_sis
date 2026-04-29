# Fase 5 - Validacao do Handoff Real DTIC -> Hermes

Data: 2026-04-07  
Projeto: `C:\Users\jonathan-moletta\code\hub-operacional-web`

## Objetivo

Fechar o primeiro fluxo real `DTIC agent-first` na base extraida, usando handoff do hub para o Hermes local sem abrir ticket automaticamente.

Escopo validado:

- login no hub novo
- selecao do contexto `DTIC`
- entrada agent-first em `/dtic/new-ticket`
- geracao de handoff estruturado no hub
- abertura do Hermes em popup
- leitura do handoff no Hermes
- geracao de draft a partir do handoff

Escopo deliberadamente fora desta fase:

- criacao de ticket pelo `DTIC` a partir do agente
- followup ou anexo no fluxo `DTIC`
- integracao backend-to-backend entre hub e agente

## Runtime validado

- hub novo: `http://localhost:18080`
- Hermes local: `http://localhost:8501`

O Hermes precisou ser alinhado ao contrato real do V1 para esta fase:

- `IDENTITY_MODE=fixed`
- `DEFAULT_REQUESTER_ID=1032`
- `DEFAULT_ENTITY_ID=1`
- `REQUIRE_REQUESTER_ID=true`
- `REQUIRE_ENTITY_ID=true`

Sem isso, o popup abria mas o Hermes parava antes do banner de handoff por falta de identidade resolvida.

## Evidencias

Saida desta fase:

- [summary.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase5-dtic-agent-handoff\summary.json)
- [01-dtic-agent-entry.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase5-dtic-agent-handoff\01-dtic-agent-entry.png)
- [02-hermes-handoff.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase5-dtic-agent-handoff\02-hermes-handoff.png)
- [03-hermes-draft.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase5-dtic-agent-handoff\03-hermes-draft.png)

Audit log do Hermes:

- [agent-events.jsonl](C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\logs\agent-events.jsonl)

## Resultado observado

O fluxo real passou:

1. o hub abriu `/dtic/new-ticket`
2. a trilha `Acessos e credenciais` gerou um resumo de handoff
3. o CTA `Abrir Hermes com este resumo` abriu `http://localhost:8501`
4. o Hermes exibiu `Handoff recebido do hub`
5. o clique em `Gerar draft a partir deste handoff` gerou confirmacao operacional

Conteudo observado no Hermes:

- tipo inferido: `Incidente`
- urgencia inferida: `4 (Alta)`
- categoria GLPI: `22`
- requester GLPI: `1032`
- entidade GLPI: `1`

No audit log, a validacao relevante ficou registrada como `draft_prepared`, sem `ticket_submit_started` nessa fase. Ou seja: houve interpretacao real do handoff, mas nao houve criacao de ticket.

## Validacoes automatizadas

Frontend novo:

- `npm exec vitest run src/modules/tickets/components/agent-entry/dtic-agent-flow.test.ts`
- `npm run build`
- `npm exec playwright test e2e/hub-dtic-agent-handoff.spec.ts`

Agente:

- `pytest`

Infra:

- `docker compose up -d --build`
- `docker compose ps`

## Estado atual

`DTIC` agora tem um fluxo real e consistente de entrada agent-first na base limpa:

- o hub nao depende mais do repo legado para essa entrada
- o Hermes recebe o resumo estruturado
- o Hermes gera draft real a partir do handoff
- nenhuma mutacao e disparada automaticamente

## Limites restantes

1. O handoff ainda e enviado como texto enriquecido, nao como contrato estruturado com campos separados.
2. O titulo do draft ainda fica verboso porque o Hermes interpreta o resumo completo como prompt.
3. A criacao real de ticket pelo fluxo `DTIC` ainda nao foi fechada nesta fase.
4. O classificador do Hermes continua heuristico; categoria, tipo e urgencia ainda merecem refinamento posterior.

## Conclusao

A base nova em `hub-operacional-web` ja sustenta:

- `SIS` com criacao, followup e anexo reais
- `DTIC` com handoff real para o Hermes e geracao de draft

O primeiro fluxo `DTIC agent-first` ja esta funcional na pratica, mas ainda para na etapa correta: confirmacao humana antes da mutacao.
