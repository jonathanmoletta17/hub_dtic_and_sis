# Phase 11 Validation

## Objetivo

Executar a primeira reducao fisica segura do backend herdado na base nova.

## Lote removido

- `app/schemas/analytics.py`
- `app/schemas/charger_management.py`
- `app/schemas/charger_schemas.py`
- `app/schemas/inventory.py`
- `app/schemas/knowledge_schemas.py`
- `app/schemas/mobile.py`
- `app/schemas/universal.py`

## Base para a remocao

- nenhum desses schemas tinha import ativo nas rotas e services canonicos
- o runtime atual nao dependia deles para login, selector, dashboard, user, detail, handoff DTIC ou fluxo SIS
- a superficie viva do backend continuou concentrada em:
  - `domain_auth`
  - `lookups`
  - `domain_formcreator`
  - `db_read`
  - `ticket_workflow`

## Validacao executada

- busca residual por imports desses schemas: sem ocorrencias
- `python -m compileall app`: ok
- `npm exec vitest run`: ok
- `npm run build`: ok
- `docker compose up -d --build`: ok
- `GET http://localhost:18080/health`: ok
- `npm exec playwright test e2e/hub-mvp.spec.ts`: ok

## Resultado

O primeiro lote de schemas herdados do backend foi removido sem regressao.

O app novo continua operacional em:

- `http://localhost:18080`

Com o nucleo canonico preservado:

- login
- selector
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket`
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`

## Divida restante

A divida backend agora deixou de ser schema orfao e ficou concentrada em superficie ainda ampla demais para o MVP:

- `app/routers/db_read.py`
- `app/services/kpis_service.py`
- `app/services/query_engine_service.py`

O proximo lote correto deve reduzir essas areas por contrato e uso real, nao por nome de arquivo apenas.
