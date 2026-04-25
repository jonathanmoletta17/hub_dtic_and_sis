# Deferred Legacy Debt

## Objetivo

Registrar o que ainda veio do legado para dentro do `hub-operacional-web`, mas nao faz parte do nucleo canonico atual.

## Frontend herdado residual

Os modulos legados de frontend fora do MVP ja foram removidos fisicamente.

O que ainda resta no frontend como heranca controlada e:

- declaracoes de features legadas em `src/lib/config/features.json`
- labels e temas associados
- zona protegida de `src/lib/context-registry.ts`

Status:
- nao fazem parte do runtime canonico
- permanecem por dependencia estrutural da navegacao protegida
- exigem plano proprio antes de enxugamento final

### Lote ja removido

O lote `chargers` foi removido fisicamente desta base na rodada atual.

### Lote adicional ja removido

Tambem ja foram removidos:

- `permissions`
- `knowledge`
- `analytics`
- `inventory`
- `search`
- services, contracts, models, mappers e testes de frontend ligados a esses domínios

## Backend herdado e oculto

O principal excesso herdado do backend ja foi reduzido.

Status atual:
- `app/routers/db_read.py` ficou limitado a `stats` e `tickets`
- `app/services/kpis_service.py` removido
- `app/services/query_engine_service.py` removido
- a reducao foi validada com compile, build, health e smoke

### Lote backend ja removido

Tambem ja foram removidos do backend:

- `app/schemas/analytics.py`
- `app/schemas/charger_management.py`
- `app/schemas/charger_schemas.py`
- `app/schemas/inventory.py`
- `app/schemas/knowledge_schemas.py`
- `app/schemas/mobile.py`
- `app/schemas/universal.py`

## Divida de consolidacao

1. Reduzir `db_read.py` e seus services associados por lotes pequenos.
2. Revisar a configuracao protegida de features no frontend.
3. Manter compile, build e smoke a cada lote de reducao.

No estado atual, o foco deixa de ser `db_read` e passa a ser identificar eventuais sobras herdadas menores fora do runtime canônico.

O lote de utilitários herdados em `app/core/utils` também já foi limpo quando confirmado sem referências no runtime.

*** Add File: C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase12-backend-dbread-reduction-2026-04-07.md
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

Nao existe uso canônico de `db/aggregate`, `db/query` ou `db/kpis`.

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

## O que ja pode ser limpo livremente

- `__pycache__`
- `*.pyc`
- artefatos temporarios de runtime e build

Esses artefatos nao fazem parte da base canonica e podem ser eliminados sem impacto funcional.
