# Matriz Completa de Consumo de Dados e Atualização

## Objetivo

Inventariar todas as superfícies relevantes que consomem dados no Tensor Aurora, indicando:

1. endpoints envolvidos;
2. modo atual de atualização;
3. estratégia de cache e invalidação;
4. dependências principais;
5. risco de inconsistência;
6. ação proposta.

Esta matriz deve ser lida em conjunto com:

- [inconsistency-root-cause-map.md](/home/jonathan-moletta/projects/tensor-aurora/docs/inconsistency-root-cause-map.md)
- [network-availability-consolidated-diagnosis.md](/home/jonathan-moletta/projects/tensor-aurora/docs/network-availability-consolidated-diagnosis.md)

## Legenda de Update

1. `Manual`: só atualiza por ação explícita do usuário ou remount da tela.
2. `Bus`: atualização via `publishLiveDataEvent` + `useLiveDataRefresh`.
3. `Polling`: refresh periódico por intervalo fixo.
4. `SSE tentativa`: `ContextLiveSync` consome `/events/stream`; a efetividade cross-session ainda é parcial por semântica frágil de domínio e fallback incompleto para `inventory`.
5. `SWR`: cache local com `keepPreviousData` e revalidação por `mutate`.

## Superfícies de Rota

| Superfície | Endpoints/Fonte de dado | Modo update atual | Cache/Invalidação | Dependências principais | Latência percebida atual | Risco | Ação proposta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` Login | `POST /api/v1/dtic/auth/login`, fallback `POST /api/v1/sis/auth/login`; pré-aquecimento do segundo contexto repetindo `auth/login` | Manual no submit | `useAuthStore`, `contextSessions`, cookie `sessionToken` | [page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/page.tsx), [glpiService.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/glpiService.ts) | imediata por ação do usuário | Média | Tratar login como bootstrap e adicionar revalidação posterior por `/auth/me` |
| `/selector` | cache local de `contextSessions` ou novo `POST /api/v1/{context}/auth/login` | Manual na seleção | `useAuthStore.getCachedSession`, `setActiveContext` | [selector/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/selector/page.tsx) | imediata se cache; uma ida à rede se não houver cache | Média | Revalidar identidade ao trocar contexto quando sessão estiver antiga |
| Shell de contexto `/[context]/layout` + sidebar/guards | sem fetch próprio; lê `currentUserRole`, `activeContext`, `app_access`, `hub_roles` da store | Sem refresh remoto | Zustand persistido | [layout.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/layout.tsx), [AppSidebar.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/components/ui/AppSidebar.tsx), [useAuthStore.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/store/useAuthStore.ts) | instantâneo, mas pode ficar stale por horas | Alta | Revalidar `auth/me` periodicamente e no foco |
| `/[context]/dashboard` | `GET /api/v1/{context}/db/stats`, `GET /api/v1/{context}/db/tickets` | Bus + Polling 90s + SSE tentativa | estado local com `hasLoadedOnceRef`; preserva dados anteriores em refresh | [dashboard/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/dashboard/page.tsx) | local mutate imediato; cross-session hoje degrada para até 90s | Média | Corrigir SSE semântico para reduzir janela cross-session |
| `/[context]/analytics` | `GET /analytics/summary`, `/analytics/trends`, `/analytics/ranking`, `/analytics/recent-activity`, `/analytics/distribution/entity`, `/analytics/distribution/category`; `GET /db/tickets` no modo kiosk DTIC | Bus + Polling 60s + SSE tentativa | estado local + `requestCounter` anti-race; preserva conteúdo válido | [AnalyticsDashboardPage.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/analytics/components/AnalyticsDashboardPage.tsx) | local mutate imediato; cross-session até 60s | Média | Corrigir SSE e manter refresh granular já existente |
| `/[context]/search` | `GET /api/v1/{context}/db/stats`, `GET /api/v1/{context}/db/tickets`, `GET /api/v1/{context}/tickets/search` | Bus + Polling 90s só sem termo ativo; busca remota só quando termo muda | estado local; sem SWR | [SearchPage.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/components/SearchPage.tsx), [useTicketsSearch.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/hooks/useTicketsSearch.ts) | sem termo: até 90s; com termo ativo: potencialmente indefinida | Alta | Reexecutar `tickets/search` ao receber evento também com termo ativo |
| `/[context]/ticket/[id]` | `GET /api/v1/{context}/tickets/{id}/detail`; mutações `followups`, `solutions`, `assume`, `pending`, `resume`, `return-to-queue`, `reopen`, `solution-approval/*`, `transfer`; lookup auxiliar `GET /lookups/users/technicians` | Bus + Polling 45s + SSE tentativa | estado local; reload silencioso após ações | [ticket/[id]/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/ticket/[id]/page.tsx), [useTicketDetail.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/components/ticket/useTicketDetail.ts) | mutate local imediato; cross-session até 45s | Média | Manter modelo atual e conectar a SSE semântica |
| `/[context]/user` | `GET /api/v1/{context}/db/tickets` via `fetchMyTickets` | Bus + Polling 120s + SSE tentativa | estado local com preservação do dataset anterior | [user/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/user/page.tsx), [ticketService.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/ticketService.ts) | mutate local imediato; cross-session até 120s | Média | Reduzir intervalo se a UX exigir visão quase em tempo real |
| `/[context]/user/profile` | nenhuma; dados hardcoded | Nenhum | nenhum | [user/profile/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/user/profile/page.tsx) | sempre instantânea, mas falsa | Alta | Conectar a dados reais ou remover a superfície |
| `/[context]/knowledge` | `GET /api/v1/dtic/knowledge/categories`, `/knowledge/articles`, `/knowledge/articles/{id}`, `/knowledge/documents/{id}/content`; mutações create/update/delete/upload/delete attachment | Bus + Polling 120s + SSE tentativa | estado local; recarrega listas/categorias; contexto fixo `dtic` | [knowledge/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/knowledge/page.tsx), [knowledgeService.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/knowledgeService.ts) | mutate local imediato; cross-session até 120s | Média | Documentar claramente que KB é DTIC-only ou generalizar por contexto |
| `/[context]/new-ticket` | `GET /api/v1/{context}/domain/formcreator/categories`, `/domain/formcreator/forms`, `/domain/formcreator/forms/{id}/schema`, múltiplos `/lookups/*`; `POST /domain/formcreator/forms/{id}/submit` | Leitura manual por abertura da tela/form; submit publica Bus para outras telas | estado local nos hooks `useServiceCatalog` e `useFormSchema` | [new-ticket/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/new-ticket/page.tsx), [useServiceCatalog.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/hooks/useServiceCatalog.ts), [useFormSchema.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/hooks/useFormSchema.ts) | estável durante o uso; catálogo/schema ficam stale até reopen | Média | Decidir se catálogo/schema devem entrar no barramento de refresh |
| `/[context]/gestao-carregadores` | `GET /api/v1/{context}/chargers/kanban`, `/metrics/chargers`, `/chargers/global-schedule`; auxiliares: `GET /lookups/locations`, `GET /chargers/tickets/{id}/detail`, `GET/PUT /chargers/{id}/schedule`, `GET/PUT /chargers/{id}/offline`; várias mutações de atribuição e CRUD | SWR + Bus + Polling 60s + SSE tentativa | SWR `keepPreviousData`; mutações chamam `publishLiveDataEvent`; alguns refreshes manuais | [gestao-carregadores/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/gestao-carregadores/page.tsx), [useChargerData.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/hooks/useChargerData.ts), [chargerService.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/chargerService.ts) | mutate local imediato; cross-session até 60s | Média | Remover `setTimeout(500)` eventual após desvincular e substituir por evento/ack mais determinístico |
| `/[context]/permissoes` | `GET /api/v1/{context}/admin/users?target_context=*`, `GET /admin/module-catalog?target_context=*`; mutações `POST/DELETE /admin/users/{id}/groups*` | Bus + Polling 180s; sem depender de SSE para mutate local | estado local; autoajusta `app_access` do usuário corrente quando ele aparece na lista | [permissoes/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/permissoes/page.tsx), [PermissionsMatrix.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/features/permissions/components/PermissionsMatrix.tsx) | mutate local imediato; cross-session até 180s; `hub_roles` podem continuar stale | Alta | Revalidar identidade completa via `/auth/me`, não só `app_access` |
| `/[context]/inventario` | `GET /api/v1/{context}/inventory/summary`, `/inventory/assets`, `/inventory/assets/{itemtype}/{id}`; lookups `/lookups/states`, `/locations`, `/groups/responsible`, `/users/responsible`, `/users/technicians`, `/manufacturers`, `/models`; mutações create/update/delete/export | SWR + Bus + Polling 120s | SWR `keepPreviousData` + `refreshAll` | [inventario/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/inventario/page.tsx), [InventoryPage.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/inventory/components/InventoryPage.tsx), [useInventoryData.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/inventory/hooks/useInventoryData.ts) | mutate local imediato; cross-session até 120s | Alta | Incluir `inventory` no fallback do `ContextLiveSync` e sanear `lookups/manufacturers` para evitar `500` por `name = null` |

## Consumidores Compartilhados e Auxiliares

| Componente/Hook | Endpoints/Fonte | Modo update | Risco | Ação proposta |
| --- | --- | --- | --- | --- |
| `ContextLiveSync` | `GET /api/v1/{context}/events/stream` | SSE tentativa + reconnect + heartbeat + fallback polling 120s | Alta | Evoluir contrato SSE (`domain/action`) e incluir domínio `inventory` no fallback | 
| `useLiveDataRefresh` | `BroadcastChannel` + barramento local | Bus + Polling configurado por tela | Baixa | Manter como base do modelo unificado |
| `CreateChargerModal` | `GET /lookups/locations` | SWR sob demanda | Baixa | Sem ação imediata |
| `TransferModal` | `GET /lookups/users/technicians` | Manual ao abrir | Baixa | Sem ação imediata |
| `TicketDetailModal` (carregadores) | `GET /chargers/tickets/{id}/detail` | Manual ao abrir/repetir fetch | Média | Pode assinar barramento quando o modal estiver aberto |
| `useInventoryLookups` | múltiplos `/lookups/*` | SWR por contexto/itemtype | Baixa | Sem ação imediata |
| `UserProfileMenu` | store local + re-login por contexto quando necessário | Manual | Média | Herdará correção de `/auth/me` centralizado |

## Observações de Arquitetura

### 1. O frontend já usa um padrão relativamente coerente

Padrão predominante:

1. leitura inicial por hook/página;
2. `loading` só no primeiro carregamento;
3. `refreshing` para revalidação em background;
4. `publishLiveDataEvent` nas mutações;
5. `useLiveDataRefresh` nos consumidores;
6. `polling` de fallback por superfície.

Isso explica por que o app já evita boa parte do flicker bruto.

### 2. O principal gargalo hoje não é ausência de wiring no frontend

O principal gargalo é:

1. contrato SSE ainda frágil para mapeamento semântico de domínio;
2. fallback de refresh não cobre todos os domínios (`inventory`);
3. algumas superfícies fora do ciclo unificado;
4. identidade/RBAC congelados após login.

### 3. Latência percebida atual depende do tipo de mudança

#### Mutação na mesma sessão

Em geral:

1. propagação imediata pelo barramento local;
2. sem necessidade de refresh global;
3. baixo risco de flicker.

#### Mutação em outra sessão/dispositivo

Hoje:

1. depende de SSE, que está inconsistente;
2. quando o SSE falha, degrada para polling;
3. a latência percebida passa a ser o intervalo da tela.

## Principais Lacunas Prioritárias

1. `liveDataBus` ainda infere domínio do SSE por heurística textual.
2. `ContextLiveSync` fallback não publica domínio `inventory`.
3. `useTicketsSearch` perde refresh quando há termo ativo.
4. `useServiceCatalog` e `useFormSchema` não participam do ciclo unificado.
5. `useAuthStore` usa snapshot do login sem revalidação de `/auth/me`.
6. `user/profile` não é integrado a fonte real alguma.
7. `GET /lookups/manufacturers` ainda pode quebrar contrato quando o banco retorna `name = NULL`.
8. ciclo de sessão do SSE precisa revisão para evitar warnings de conexão não devolvida ao pool em cancelamentos.
