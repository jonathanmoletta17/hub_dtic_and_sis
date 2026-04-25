# Phase 8 Validation

## Objetivo

Consolidar `hub-operacional-web` como base canonica do produto novo, sem regressao no nucleo operacional validado.

## Acoes executadas

### 1. Limpeza segura

- remocao de `__pycache__` em `backend/app`
- confirmacao de ausencia de `*.pyc` residuais dentro de `backend/app`

### 2. Documentacao canonica

- criacao de [ARCHITECTURE_RULES.md](C:\Users\jonathan-moletta\code\hub-operacional-web\ARCHITECTURE_RULES.md)
- criacao de [canonical-scope.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\canonical-scope.md)
- criacao de [deferred-legacy-debt.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\deferred-legacy-debt.md)
- alinhamento do [README.md](C:\Users\jonathan-moletta\code\hub-operacional-web\README.md) ao estado real da base

## Decisoes de consolidacao

### Canonico

- rotas operacionais de `DTIC` e `SIS`
- `DTIC` agent-first
- `SIS` com `FormCreator`
- backend minimo extraido para auth, lookups, leitura e workflow

### Mantido, mas fora do escopo canonico

- `analytics`
- `search`
- `inventory`
- `knowledge`
- `permissions`
- `chargers`

Esses modulos ainda existem na arvore, mas nao foram revalidados na base nova e nao devem ser tratados como produto atual.

### Zonas protegidas

- `web/src/lib/context-registry.ts`
- `web/src/store/useAuthStore.ts`
- `web/src/lib/api/httpClient.ts`
- `backend/app/services/auth_service.py`
- `backend/app/core/contexts.yaml`

## Validacao executada

### Backend

- `python -m compileall app`

### Frontend

- `npm exec vitest run src/lib/mvp-navigation.test.ts src/modules/tickets/components/agent-entry/dtic-agent-flow.test.ts src/lib/api/mappers/ticket-detail.test.ts`
- `npm run build`

### Runtime

- `docker compose ps`
- `GET http://localhost:18080/health`

## Resultado

- build do frontend: ok
- testes do nucleo MVP: ok
- backend compilando: ok
- stack saudavel: ok
- `health`: ok com `dtic` e `sis` conectados

## Estado final da fase

`hub-operacional-web` permanece funcionalmente consistente apos a consolidacao segura.

O repositorio agora deixa explicito:

- qual e o produto canonico
- quais zonas nao devem ser alteradas sem plano
- quais modulos sao heranca do legado e continuam apenas como divida controlada

## Proximo passo correto

Fazer a limpeza estrutural por lotes pequenos, com busca de referencias e smoke a cada lote, começando pelos modulos herdados fora do MVP que nao participam do runtime validado.
