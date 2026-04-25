# Phase 12 - Backend `db_read` Reduction

## Objetivo

Reduzir `backend/app/routers/db_read.py` ao contrato real usado pelo hub operacional canônico.

## Escopo aplicado

Mantido:

- `GET /api/v1/{context}/db/stats`
- `GET /api/v1/{context}/db/tickets`

Removido:

- `GET /api/v1/{context}/db/aggregate`
- `GET /api/v1/{context}/db/query`
- `GET /api/v1/{context}/db/kpis`
- `backend/app/services/kpis_service.py`
- `backend/app/services/query_engine_service.py`

## Evidência de contrato

O frontend canônico usa apenas:

- `web/src/lib/api/ticketService.ts` -> `db/stats`
- `web/src/lib/api/ticketService.ts` -> `db/tickets`

Não existe uso canônico de `db/aggregate`, `db/query` ou `db/kpis`.

## Validação executada

- `python -m compileall app`
- `npm exec vitest run`
- `npm run build`
- `docker compose up -d --build`
- `GET http://localhost:18080/health`
- `npm exec playwright test e2e/hub-mvp.spec.ts`

## Resultado

Todos os checks passaram.

Estado final:

- backend mais alinhado ao MVP real
- `db_read` agora reflete o contrato canônico
- services herdados fora do runtime foram removidos sem regressão funcional observada
