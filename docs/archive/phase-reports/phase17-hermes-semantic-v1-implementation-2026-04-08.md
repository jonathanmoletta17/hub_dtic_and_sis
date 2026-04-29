# Phase 17 - Hermes Semantic v1 Implementation - 2026-04-08

## Objetivo

Implementar a fase `Semantic v1` no runtime Hermes sem alterar contratos do hub para `DTIC/new-ticket`, mantendo o rollout em `shadow mode` e revalidando o fluxo oficial ponta a ponta.

## Escopo executado

- Implementacao aplicada no repo externo `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`.
- Nenhuma mudanca funcional no hub alem de evidencias e este registro.
- Hub mantido como consumidor do mesmo handoff, popup Hermes e detalhe de ticket.

## Mudancas principais no Hermes

- Novo motor `decision_engine.py` com:
  - classificacao heuristica por intencao/categoria/urgencia
  - `dual-threshold clarification loop`
  - `slot-filling` por dominio DTIC
  - guardrail para outage coletivo contra falso `request`
- `parser.py` reorganizado para:
  - normalizacao
  - classificador semantico opcional
  - decisao heuristica
  - fusao
  - validacao de slots
  - politica de thresholds
  - construcao do `TicketDraft`
- `llm.py` convertido para classificacao semantica estruturada em JSON.
- `config.py` e `env.py` centralizados para bootstrap sem dependencia do `streamlit_app`.
- `service.py` enriquecido com logging explicito de:
  - `heuristic_decision`
  - `semantic_decision`
  - `fused_decision`
  - `missing_slots`
  - `disagreement`
  - `llm_status`
  - `llm_error`
  - `shadow_winner`

## Ajustes operacionais finais

- Shadow mode mantido fora da decisao oficial.
- Timeout do classificador semantico em shadow reduzido para falha rapida, evitando regressao de UX no popup do hub.
- Titulo e descricao do draft passaram a preservar melhor o relato original do usuario, inclusive o `marker` usado no smoke oficial do hub.

## Evidencias

### Probes de servico Hermes

- Pasta: `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase17-hermes-semantic-v1-service-probes`
- Resultado esperado confirmado:
  - `probe-sei-request`: `request`, cat `22`, sem clarificacao
  - `probe-vague-access`: clarificacao com `uncertain_operational_context`
  - `probe-collective-outage`: `incident`, urgencia `4`, cat `22`
  - `probe-sei-error-500`: clarificacao por `low_category_confidence`

### Probes de popup Hermes

- Pasta: `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase17-hermes-semantic-v1-probes`
- A automacao direta do `body.innerText()` do Streamlit nao foi uma fonte confiavel nesta sessao.
- O comportamento visual do popup foi validado de forma canonica pela suite Playwright oficial do hub.

### Validacao oficial consolidada

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright
```

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `next build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `playwright full e2e`: `5/5`

## Estado final

O Hermes agora opera com:

- heuristica forte como caminho oficial
- classificacao semantica estruturada em `shadow mode`
- clarificacao por threshold duplo
- `slot-filling` minimo por dominio DTIC
- observabilidade suficiente para promover ou nao a camada semantica depois

Sem regressao funcional no hub ao final da fase.
