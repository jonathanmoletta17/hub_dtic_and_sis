# Aceite Funcional SIS/DTIC — Baseline Validado
Data: **17/03/2026**  
Escopo: **Dashboard Analítico DTIC + Dashboard Analítico SIS (raiz, Manutenção, Conservação e Memória)**  
Objetivo: consolidar o baseline funcional atual com evidência automatizada e validação manual em ambiente real.

## 1. Baseline técnico executado

### Backend
- [x] `./.venv/bin/pytest -q` → **167 passed in 1.93s**
- [x] `./.venv/bin/pytest -q app/tests/test_analytics_routes.py app/tests/test_analytics_acceptance_sis.py` → **64 passed in 1.45s**

### Frontend
- [x] `npm run lint` → **ok**
- [x] `npx vitest run` → **95 passed**
- [x] `npx vitest run src/lib/api/analyticsService.test.ts src/lib/context-registry.test.ts src/__tests__/menu.test.ts src/components/auth/ContextGuard.test.tsx` → **25 passed**
- [x] `npm run build` → **ok**

### Evidências de código que sustentam o aceite automatizado
- Backend DTIC/SIS router/contrato/gate: `app/tests/test_analytics_routes.py:71-305`
- Backend SIS acceptance matrix: `app/tests/test_analytics_acceptance_sis.py:100-251`
- Frontend service contract analytics: `web/src/lib/api/analyticsService.test.ts:28-309`
- Frontend menu/gates por contexto: `web/src/lib/context-registry.test.ts:103-139`
- Frontend route guard do analytics DTIC: `web/src/components/auth/ContextGuard.test.tsx:156-215`

## 2. Checklist fechado — API/Contrato

### DTIC
- [x] OpenAPI expõe response models corretos para `summary`, `trends`, `ranking`, `recent-activity`, `distribution/entity` e `distribution/category`.  
  Evidência: `app/tests/test_analytics_routes.py:71-80`
- [x] `summary` sem datas aplica janela default de 30 dias e mantém `department=null`, `group_ids=[]`.  
  Evidência: `app/tests/test_analytics_routes.py:83-103`
- [x] `ranking` usa `limit=10` por default e rejeita `limit > 50` com `422`.  
  Evidência: `app/tests/test_analytics_routes.py:106-123`
- [x] `analytics` DTIC retorna `403` para role inválida (`solicitante`).  
  Evidência: `app/tests/test_analytics_routes.py:126-141`
- [x] `analytics` DTIC retorna `403` sem `dtic-metrics`.  
  Evidência: `app/tests/test_analytics_routes.py:144-159`
- [x] `analytics` DTIC retorna `403` com apenas `dtic-kpi`.  
  Evidência: `app/tests/test_analytics_routes.py:162-177`
- [x] `analytics` DTIC retorna `200` com `dtic-metrics`.  
  Evidência: `app/tests/test_analytics_routes.py:180-197`

### SIS
- [x] `summary`, `trends`, `ranking`, `recent-activity`, `distribution/entity` e `distribution/category` respondem `200` em `sis`, `sis-manutencao` e `sis-memoria`, com e sem `department`.  
  Evidência: `app/tests/test_analytics_acceptance_sis.py:100-129`
- [x] `department=manutencao` mapeia para `group_ids=[22]`; `department=conservacao` mapeia para `group_ids=[21]`; ausência de `department` mantém escopo global SIS.  
  Evidência: `app/tests/test_analytics_acceptance_sis.py:132-175`
- [x] `group_ids` explícito prevalece sobre `department`.  
  Evidência: `app/tests/test_analytics_acceptance_sis.py:178-203`
- [x] Gate permissional SIS retorna `200` para `gestor|tecnico* + sis-dashboard` e `403` para `solicitante` ou ausência de `sis-dashboard`.  
  Evidência: `app/tests/test_analytics_acceptance_sis.py:206-251`
- [x] `distribution/entity` aplica `limit=10` por default e respeita escopo de `department=conservacao -> [21]`.  
  Evidência: `app/tests/test_analytics_routes.py:230-252`
- [x] `distribution/category` rejeita `limit > 50` com `422`.  
  Evidência: `app/tests/test_analytics_routes.py:255-262`
- [x] `distribution/category` respeita precedência de `group_ids` explícito sobre `department`.  
  Evidência: `app/tests/test_analytics_routes.py:265-286`
- [x] `distribution/entity` retorna `403` sem `sis-dashboard`.  
  Evidência: `app/tests/test_analytics_routes.py:289-305`

## 3. Checklist fechado — Frontend/Menu/Gates

### Serialização e consumo
- [x] O frontend consome e normaliza corretamente os seis endpoints de analytics, incluindo `department` e `group_ids`.  
  Evidência de teste: `web/src/lib/api/analyticsService.test.ts:28-309`  
  Evidência de implementação: `web/src/lib/api/analyticsService.ts:21-111`

### Menu e visibilidade
- [x] O menu analítico DTIC exige apenas `dtic-metrics`; `dtic-kpi` não libera a tela.  
  Evidência de teste: `web/src/lib/context-registry.test.ts:111-119`
- [x] O menu analítico SIS exige `sis-dashboard` na raiz e nos subcontextos `sis-manutencao` e `sis-memoria`.  
  Evidência de teste: `web/src/lib/context-registry.test.ts:121-139`
- [x] O guard da tela analítica DTIC permite acesso com `dtic-metrics` e bloqueia com `dtic-kpi` isolado ou tags não autorizadas.  
  Evidência: `web/src/components/auth/ContextGuard.test.tsx:156-215`

### Estrutura de UI
- [x] A tela analítica aplica preset default de **30 dias** e polling de **60s**.  
  Evidência: `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:83-88`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:118-123`
- [x] Em `sis`, o seletor de departamento `all | manutencao | conservacao` existe e altera a query com `department`.  
  Evidência: `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:142-147`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:249-258`
- [x] Em `sis-manutencao` e `sis-memoria`, o departamento é fixado automaticamente pelo contexto.  
  Evidência: `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:76-81`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:111-116`
- [x] Os blocos SIS de distribuição por categoria e por entidade só aparecem em contextos SIS.  
  Evidência: `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:368-424`
- [x] Estados de loading, erro e vazio estão implementados no componente.  
  Evidência: `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:273-290`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:341-343`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:375-377`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:402-404`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:429-430`, `web/src/modules/analytics/components/AnalyticsDashboardPage.tsx:448-449`

## 4. Checklist fechado — Validação manual no browser

Validação manual executada em `http://hub.local:8080`, com dados reais e sessão autenticada.

### DTIC
- [x] `http://hub.local:8080/dtic/analytics` carregou com dados reais em cards KPI, tendência, ranking e atividade recente.
- [x] Em `http://hub.local:8080/dtic/permissoes`, a revogação de `Métricas DTIC` para `jonathan-moletta` removeu o item `Dashboard` do menu lateral na mesma sessão.
- [x] A navegação direta para `/dtic/analytics` após a revogação exibiu bloqueio de módulo restrito.
- [x] A concessão de `Métricas DTIC` restaurou o item `Dashboard` no menu lateral na mesma sessão, sem refresh manual.
- [x] A navegação direta para `/dtic/analytics` após a reatribuição voltou a carregar a tela com dados reais.

### SIS raiz
- [x] `http://hub.local:8080/sis/analytics` carregou com dados reais.
- [x] O seletor `Todos os departamentos | Manutenção | Conservação e Memória` estava visível.
- [x] Os blocos adicionais `Distribuição por Categoria` e `Top Entidades Solicitantes` estavam visíveis e preenchidos.

### SIS Manutenção
- [x] `http://hub.local:8080/sis-manutencao/analytics` carregou com dados reais.
- [x] O seletor de departamento **não** apareceu, coerente com contexto departamental fixo.
- [x] Os blocos de distribuição carregaram apenas dados coerentes com Manutenção.

### SIS Conservação e Memória
- [x] `http://hub.local:8080/sis-memoria/analytics` carregou com dados reais.
- [x] O seletor de departamento **não** apareceu, coerente com contexto departamental fixo.
- [x] Os blocos de distribuição carregaram apenas dados coerentes com Conservação e Memória.

## 5. Desvios observados no runtime

- [x] Warning não bloqueante no browser para `Recharts` sobre `width(-1)/height(-1)` do container do gráfico.
- [x] Nenhum erro JavaScript bloqueante foi observado nas páginas analytics validadas.
- [x] O comportamento anterior de precisar refresh manual após alterar permissão **não se reproduziu** no fluxo revogar/conceder validado nesta rodada.

## 6. Decisão de gate

### Resultado
- [x] **APROVADO** como baseline funcional atual de `analytics/*` para **DTIC** e **SIS**.
- [x] **APROVADO** para seguir usando este estado como referência de aceite antes de novas ampliações.

### Observação de fronteira
Este aceite consolida **funcionamento atual**, **contrato**, **gate permissional** e **UI real**.  
Ele **não substitui** a matriz de convergência legado x alvo já documentada em `docs/evidencias/sis_aceite_funcional_convergencia_2026-03-17.md`; os dois artefatos são complementares.
