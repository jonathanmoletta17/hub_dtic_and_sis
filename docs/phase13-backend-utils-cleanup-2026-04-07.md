# Phase 13 - Backend Utils Cleanup

## Objetivo

Remover utilitários herdados sem uso no runtime canônico do backend.

## Escopo aplicado

Removido:

- `app/core/utils/cache_utils.py`
- `app/core/utils/time_utils.py`

## Evidência de não uso

Busca de referências no backend mostrou:

- nenhuma referência a `cache_utils`
- nenhuma referência a `ttl_cache`
- nenhuma referência a `clear_ttl_cache`
- nenhuma referência a `time_utils`

As funções realmente usadas de data/hora permanecem em `app/core/datetime_contract.py`.

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

- backend mais enxuto
- nenhuma regressão observada no runtime canônico
- próxima redução deve mirar apenas sobras com prova de não uso ou simplificação contratual clara
