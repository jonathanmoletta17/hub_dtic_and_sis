# Canonical Scope

## Aplicacao canonica

Repositorio:
- `/home/jonathan/projects/work/hub-operacional-web`

URL local:
- `http://localhost:18080`

Backend direto:
- `http://127.0.0.1:18081`

Frontend direto:
- `http://127.0.0.1:18082`

Agente externo integrado:
- URL publica Hermes: `http://localhost:8501`
- API conversacional Hermes: `http://localhost:8502`

Sistemas externos:
- Hermes/Antigravity
- GLPI/SIS
- knowledge base/RAG
- control plane

## Escopo funcional validado

### DTIC

- `dashboard`
- `user`
- `ticket/[id]`
- `new-ticket` agent-first
- chat inline integrado ao Hermes externo
- criacao real de ticket via Hermes com cleanup

### SIS

- `dashboard`
- `user`
- `ticket/[id]`
- `new-ticket` com `FormCreator`
- criacao real de ticket com cleanup
- followup real com cleanup
- anexo real com cleanup

## Backend canonico

Somente o nucleo minimo extraido e considerado canonico:

- `health`
- `domain_auth`
- `lookups`
- `domain_formcreator`
- `db_read`
- `ticket_workflow`
- `events`

No backend, `db_read` agora expõe apenas o contrato realmente usado pelo MVP:

- `GET /api/v1/{context}/db/stats`
- `GET /api/v1/{context}/db/tickets`

A base tambem ja teve o primeiro lote de schemas herdados removido e a superficie antiga de `aggregate`, `query` e `kpis` foi removida.

Auth/session canonico:

- `auth_mode=user_password_session`
- login com usuario/senha reais do GLPI
- sessao do usuario por `session_token`
- health com `service_session_status=disabled`
- sem dependencia runtime normal de `user_token`

Smokes destrutivos:

- marcados com `@mutation`
- fora do comando padrao `npm run smoke:hub`
- opt-in por `ALLOW_GLPI_MUTATION_SMOKE=true`
- podem usar `*_GLPI_USER_TOKEN` apenas para cleanup/purge dos dados reais criados pelo proprio smoke

## Frontend canonico

Somente as rotas abaixo fazem parte do produto canonico:

- `src/app/page.tsx`
- `src/app/selector/page.tsx`
- `src/app/[context]/dashboard/page.tsx`
- `src/app/[context]/user/page.tsx`
- `src/app/[context]/new-ticket/page.tsx`
- `src/app/[context]/ticket/[id]/page.tsx`

## Shell canonico

- `src/components/ui/OperationalShell.tsx`
- `src/components/ui/AppSidebar.tsx`
- `src/lib/mvp-navigation.ts`

## Fora do escopo canonico atual

O frontend legado fora do MVP ja foi removido fisicamente desta base.

O que ainda permanece fora do escopo canonico e:

- configuracoes e declaracoes protegidas de features em `context-registry.ts` e JSONs associados
- backend herdado ainda nao reduzido por completo

## Remocao fisica ja concluida

O primeiro lote legado ja foi removido fisicamente da base nova:

- `components/chargers`
- `hooks/useChargerData.ts`
- `lib/api/chargerManagementService.ts`
- `lib/api/chargerService.ts`
- `lib/api/contracts/chargers.ts`
- `lib/api/mappers/chargers.ts`
- testes relacionados
- `types/charger.ts`

O segundo lote legado tambem ja foi removido fisicamente:

- `features/permissions`
- `lib/knowledge`
- `lib/api/adminService.ts`
- `lib/api/analyticsService.ts`
- `lib/api/inventoryService.ts`
- `lib/api/knowledgeService.ts`
- contratos, models, mappers e testes relacionados
- `modules/analytics`
- `modules/inventory`
- `modules/search`

O primeiro lote legado de backend tambem ja foi removido:

- `app/schemas/analytics.py`
- `app/schemas/charger_management.py`
- `app/schemas/charger_schemas.py`
- `app/schemas/inventory.py`
- `app/schemas/knowledge_schemas.py`
- `app/schemas/mobile.py`
- `app/schemas/universal.py`

O segundo lote de backend ja foi reduzido fisicamente:

- endpoints `db/aggregate`
- endpoints `db/query`
- endpoints `db/kpis`
- `app/services/kpis_service.py`
- `app/services/query_engine_service.py`

O terceiro lote de backend tambem ja foi reduzido fisicamente:

- `app/core/utils/cache_utils.py`
- `app/core/utils/time_utils.py`
