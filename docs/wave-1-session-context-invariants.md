# Invariantes da Onda 1 — Sessão, Contexto e Identidade

Data-base: 2026-03-15

## Objetivo
Registrar o comportamento que a refatoração da Onda 1 deve preservar. Este documento não define design final; ele define o que não pode regredir.

## Invariantes obrigatórios

### 1. Login e bootstrap
- o login pela UI continua entrando pelo gateway em `hub.local`;
- o browser continua falando same-origin em `/api/v1/...`;
- após login bem-sucedido, o usuário continua indo para `/selector`;
- o bootstrap de sessões por contexto continua funcionando quando as credenciais são válidas em mais de um contexto.

### 2. Sessão persistida
- o store continua persistindo:
  - autenticação básica;
  - contexto ativo;
  - sessão ativa por contexto;
  - tokens por contexto.
- o store não persiste credenciais brutas;
- `logout` continua limpando identidade, contexto, cache de sessão e tokens.

### 3. Seleção de contexto
- reload em `/selector` não pode fazer o usuário perder a possibilidade de entrar no outro contexto já bootstrapado;
- trocar entre `DTIC` e `SIS` continua sem exigir re-login quando a sessão do outro contexto já existir;
- subcontextos continuam sendo normalizados para o contexto raiz no contrato de API.

### 4. Autorização e visão operacional
- rotas protegidas continuam barrando usuário não autenticado no gateway root;
- usuário autenticado sem contexto ativo continua sendo redirecionado para `/selector`;
- sub-roles continuam herdando permissões da role-base onde essa herança já existe:
  - exemplo: `tecnico-manutencao` satisfaz contratos de `tecnico`;
- funcionalidades com `requireApp` continuam exigindo a tag correspondente em `app_access`.

### 5. Navegação e same-origin
- nenhuma página do browser volta a depender de URL pública absoluta para chamar a API;
- o smoke em `hub.local` continua exercitando:
  - login;
  - troca de contexto;
  - reload em `/selector`;
  - dashboard, search, knowledge, chargers;
  - workflow de ticket e lookup crítico.

## Base de testes que protege esses invariantes

### Unitário / componente
- [useAuthStore.test.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/store/useAuthStore.test.ts)
- [ProtectedRoute.test.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/components/auth/ProtectedRoute.test.tsx)
- [ContextGuard.test.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/components/auth/ContextGuard.test.tsx)
- [contextSessionBootstrap.test.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/auth/contextSessionBootstrap.test.ts)
- [httpClient.test.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/httpClient.test.ts)

### Browser / runtime
- [hub-smoke.spec.ts](/home/jonathan-moletta/projects/tensor-aurora/web/e2e/hub-smoke.spec.ts)
- [hub-ux-critical-flows.spec.ts](/home/jonathan-moletta/projects/tensor-aurora/web/e2e/hub-ux-critical-flows.spec.ts)

## Critério de aceite da Onda 1
A Onda 1 só pode ser considerada concluída quando:
- todos os testes acima passarem;
- `pytest`, `lint`, `vitest`, `build` e smoke Playwright continuarem verdes;
- nenhum comportamento desta lista tiver sido perdido, exceto o que for explicitamente removido por obsolescência ou inconsistência previamente aprovada.

## Decisão operacional
Se uma mudança estrutural melhorar o design, mas quebrar um destes invariantes sem substituto aprovado e testado, a mudança deve ser rejeitada.
