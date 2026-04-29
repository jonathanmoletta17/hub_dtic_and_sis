# Hub Analytics Family Pilot v1

## Objetivo

Fechar o primeiro piloto canonico da familia `analytics` dentro do hub operacional, usando `DTIC/dashboard` como superficie real de referencia.

Esta rodada nao abre nova arquitetura de runtime, nao muda backend e nao toca contratos protegidos de autenticacao ou contexto.

## Governance decision

- `governance-decision`: o dashboard do hub pertence de forma dominante a familia `analytics`
- `classification`: piloto de familia com implementacao em superficie real canonica
- `follow-up-action`: se o piloto fechar verde, o padrao de composicao pode orientar os demais dashboards do portfolio sem promover workaround local para fundacao

Justificativa:

- a tarefa principal do usuario e monitorar e comparar carga operacional
- a tela precisa funcionar como parede operacional leve, nao como formulario nem como tela de busca
- o bloco mais critico da superficie e a leitura rapida por status, nao a navegacao

## Surface intent

Permitir que a equipe tecnica veja a fila ativa por status, reconheca volume e encontre rapidamente chamados relevantes sem perder a geometria operacional do painel.

## Surface brief

Superficie: `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx`

Composicao dominante:

1. `DashboardOverviewHeader`
2. `DashboardQueuePanel`
3. `KanbanBoard`

Decisao estrutural desta fase:

- `DashboardOverviewHeader` continua como unidade de contexto, busca e estatistica
- `DashboardQueuePanel` passa a ser a unidade storyavel da faixa operacional do quadro
- `KanbanBoard` permanece como primitive de distribuicao por status, agora desacoplada da navegacao obrigatoria para permitir modelagem em Storybook

## State inventory

Estados reais modelados nesta fase:

### Header

- `default`
- `loading`
- `filtered`

### Queue panel

- `default`
- `filtered`
- `loading`
- `empty`

Estados ainda fora desta rodada:

- erro de carregamento em nivel de pagina
- redirect de `solicitante` para `/[context]/user`

Motivo:

- sao estados reais, mas pertencem a outra unidade semantica do fluxo
- o piloto desta fase foca a faixa `analytics` de leitura operacional

## Domain glossary

- `fila ativa`: conjunto de chamados distribuidos por status operacionais visiveis
- `novos`: entrada recente que ainda nao recebeu tratamento efetivo
- `em atendimento`: chamados em trabalho ativo ou planejado
- `pendentes`: chamados aguardando retorno ou insumo externo
- `resolvidos em 30 dias`: indicador recente de fechamento para leitura de ritmo
- `resultados filtrados`: subconjunto da fila preservando a mesma geometria do quadro

## Family decision

- familia dominante: `analytics`
- familia secundaria herdada: nenhuma

Regra aplicada:

- apesar de existir busca local, a tarefa primaria continua sendo monitoramento e comparacao, nao descoberta de registros

## Artefatos desta rodada

- componente novo:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\dashboard\DashboardQueuePanel.tsx`
- fixtures novas:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\dashboard\dashboardFixtures.ts`
- helper semantico novo:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\dashboard\dashboardStats.tsx`
- stories:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\dashboard\DashboardOverviewHeader.stories.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\dashboard\DashboardQueuePanel.stories.tsx`
- runtime smoke:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dashboard-analytics.spec.ts`
- validacao canônica ajustada:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1`

## Gates previstos

Trilhas desta rodada:

- `ui`
- `runtime`
- `governance`

Gates:

1. `npm run lint`
2. `npm run build`
3. `npm run storybook:test`
4. `npm run storybook:visual:update`
5. `npm run storybook:visual`
6. probe de runtime
7. `docker compose up -d --build hub-frontend`
8. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor-runtime.ps1`
9. smoke real do hub em runtime canonico

## Risco residual conhecido

- o alerta de erro do dashboard ainda vive em nivel de pagina, fora da unidade storyavel desta rodada
- o piloto fecha a familia `analytics` para o dashboard atual do hub, mas nao substitui um piloto futuro de dashboards mais densos do portfolio

## Validacao executada

- `npm run lint`
- `npm run build`
- `npm run storybook:test`
- `npm run storybook:visual:update`
- `npm run storybook:visual`
- `python C:\Users\jonathan-moletta\.codex\skills\casa-civil-runtime-proof\scripts\runtime_probe.py C:\Users\jonathan-moletta\code\hub-operacional-web`
- `docker compose up -d --build hub-frontend`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor-runtime.ps1`
- `npx playwright test e2e/hub-dashboard-analytics.spec.ts --workers=1`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-runtime.ps1 -SkipDockerBuild -RunPlaywright`

## Resultado operacional

- o smoke dedicado do dashboard provou:
  - carga de `/dtic/dashboard`
  - render das estatisticas principais
  - transicao `Visao por status` -> `Resultados filtrados`
  - empty state controlado por busca sem resultado
- o `validate-runtime.ps1` agora cobre:
  - `hub-mvp.spec.ts`
  - `hub-dashboard-analytics.spec.ts`
