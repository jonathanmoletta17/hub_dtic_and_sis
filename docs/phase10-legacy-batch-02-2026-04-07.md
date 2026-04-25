# Phase 10 Validation

## Objetivo

Executar o segundo lote de remocao fisica de legado frontend na base nova, mantendo integridade total do produto canonico.

## Lote removido

- `src/features/permissions/*`
- `src/lib/knowledge/*`
- `src/lib/api/adminService.ts`
- `src/lib/api/analyticsService.ts`
- `src/lib/api/inventoryService.ts`
- `src/lib/api/knowledgeService.ts`
- `src/lib/api/contracts/{analytics,inventory,knowledge}.ts`
- `src/lib/api/models/{analytics,inventory,knowledge}.ts`
- `src/lib/api/mappers/{analytics,inventory,knowledge}.ts`
- testes relacionados
- `src/modules/analytics/*`
- `src/modules/inventory/*`
- `src/modules/search/*`

As pastas vazias remanescentes tambem foram removidas.

## Base para a remocao

- nenhum desses domínios aparece nas rotas canonicas
- nenhum deles participa do runtime MVP validado
- nao havia mais referencias ativas fora dos proprios arquivos do lote
- o backend canonico em `main.py` nao expõe essas areas como parte do produto atual

## Validacao executada

- busca residual por imports e referencias dos domínios removidos: sem ocorrencias funcionais restantes
- `npm exec vitest run`: ok
- `npm run build`: ok
- `docker compose up -d --build`: ok
- `GET http://localhost:18080/health`: ok
- `npm exec playwright test e2e/hub-mvp.spec.ts`: ok

## Resultado

O frontend legado fora do MVP foi removido da base nova sem regressao.

Estado validado apos a remocao:

- `DTIC` operacional no fluxo agent-first
- `SIS` operacional no fluxo de formulario
- login, selector, dashboard, meus chamados, detalhe e entradas principais preservados

## Divida restante

Permanece como divida controlada:

- backend herdado ainda nao reduzido por completo
- configuracoes protegidas de features e labels no frontend

O proximo trabalho de consolidacao deve atacar o backend herdado com a mesma disciplina:

1. mapa de referencias
2. reducao pequena
3. compile
4. build
5. smoke
