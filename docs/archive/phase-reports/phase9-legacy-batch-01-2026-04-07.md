# Phase 9 Validation

## Objetivo

Executar a primeira remocao fisica de legado na base nova, mantendo integridade funcional do produto canonico.

## Lote removido

### Frontend `chargers`

- `src/components/chargers/*`
- `src/hooks/useChargerData.ts`
- `src/lib/api/chargerManagementService.ts`
- `src/lib/api/chargerService.ts`
- `src/lib/api/contracts/chargers.ts`
- `src/lib/api/mappers/chargers.ts`
- testes relacionados
- `src/types/charger.ts`

## Base para a remocao

- o lote nao aparecia nas rotas canonicas
- o lote nao aparecia mais em imports do runtime MVP
- o `context-registry.ts` continua intocado
- a navegacao MVP continua filtrando o menu ao nucleo operacional

## Validacao executada

- busca residual por referencias `charger*`: sem referencias restantes no frontend canônico
- `npm exec vitest run`: ok
- `npm run build`: ok
- `docker compose up -d --build`: ok
- `GET http://localhost:18080/health`: ok
- `npm exec playwright test e2e/hub-mvp.spec.ts`: ok

## Resultado

O primeiro lote legado foi removido sem regressao no produto canonico.

O app novo continua operacional em:

- `http://localhost:18080`

Com os fluxos canonicos preservados:

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

Continuam presentes, mas fora do escopo canonico:

- `analytics`
- `inventory`
- `search`
- `knowledge`
- `permissions`

O proximo lote deve repetir a mesma disciplina:

1. busca de referencias
2. remocao pequena
3. build
4. smoke
