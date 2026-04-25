# Validacao da Fase 1

Data: 2026-04-07

## Resultado

A extracao inicial do hub operacional para:

- `C:\Users\jonathan-moletta\code\hub-operacional-web`

foi validada com sucesso para o nucleo DTIC + SIS.

## O que foi extraido nesta fase

### Backend

- `health`
- `domain_auth`
- `db_read`
- `ticket_workflow`

### Frontend

- gateway de login
- selector
- `dashboard`
- `user`
- `ticket/[id]`
- `new-ticket`

### Recorte funcional

- `DTIC/new-ticket` permanece agent-first
- `SIS/new-ticket` ainda nao foi trazido com FormCreator nesta fase

## Validacoes executadas

### Backend

Comando:

- `python -m compileall app`

Resultado:

- ok

### Frontend

Comando:

- `npm run build`

Resultado:

- ok

### Testes centrais do frontend

Comando:

- `npm exec vitest run src/__tests__/contracts src/lib/mvp-navigation.test.ts src/modules/tickets/components/agent-entry/dtic-agent-flow.test.ts`

Resultado:

- `17` testes passando

### Runtime Docker

Comando:

- `docker compose up -d --build`

Resultado:

- `hub-backend`: healthy
- `hub-frontend`: healthy
- `hub-proxy`: healthy

### Health real

URL:

- `http://localhost:18080/health`

Resultado:

- `healthy`
- `dtic`: ok
- `sis`: ok

### Smoke do MVP

Comando:

- `npm exec playwright test e2e/hub-mvp.spec.ts`

Resultado:

- `1` teste passando

Fluxos cobertos:

- login
- selector
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket`
- `SIS/dashboard`
- `SIS/user`

## Estado atual do projeto novo

URL local:

- `http://localhost:18080`

Stack:

- compose proprio
- nomes de servico proprios
- proxy proprio
- pasta propria

Ou seja, a base nova ja sobe e funciona separada do repo legado.

## O que ainda nao entrou nesta fase

- `SIS` com FormCreator
- limpeza profunda de suportes internos nao usados
- smoke expandido de detalhe de ticket
- pruning mais agressivo de modules/contracts herdados mas ainda nao nocivos

## Risco residual controlado

A base nova ainda carrega algum suporte interno que veio do legado para garantir build e consistencia da primeira subida. Isso foi uma escolha deliberada para evitar regressao estrutural em:

- auth
- contexto
- store
- cliente HTTP

A limpeza mais agressiva deve acontecer so depois da Fase 2.
