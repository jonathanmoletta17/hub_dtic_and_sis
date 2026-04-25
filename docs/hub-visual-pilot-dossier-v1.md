# Hub Visual Pilot Dossier v1

## Objetivo

Registrar o inventario operacional do piloto visual do hub apos a formalizacao do workflow `Storybook -> baseline local -> runtime real`.

Este dossie nao redefine regra de processo. Ele lista:

- superficies do piloto
- componente visual de referencia
- story correspondente
- baseline local vinculada
- rota real validada
- gap Figma da fase

Documento de processo principal:

- [hub-visual-review-workflow-v1.md](/C:/Users/jonathan-moletta/code/hub-operacional-web/docs/hub-visual-review-workflow-v1.md)

Documento de padrao visual local:

- [hub-visual-standard-v1.md](/C:/Users/jonathan-moletta/code/hub-operacional-web/docs/hub-visual-standard-v1.md)

## Estado da fase

- repo canonico: `hub-operacional-web`
- runtime canonico: [http://localhost:18080](http://localhost:18080)
- stack real preservada: `Next.js 16`, `React 19`, `App Router`
- trilha Figma: somente leitura
- migracoes proibidas nesta fase: `Vite`, `React Router`

## Inventario do piloto

### 1. Login

- superficie real: `/`
- componente de referencia: [LoginSurface.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/_components/LoginSurface.tsx)
- pagina runtime que o consome: [page.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/page.tsx)
- stories:
  - [LoginSurface.stories.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/_components/LoginSurface.stories.tsx)
  - `auth-loginsurface--default`
  - `auth-loginsurface--error`
- snapshots baseline:
  - `login-surface-default-dark-win32.png`
  - `login-surface-default-light-win32.png`
  - `login-surface-error-dark-win32.png`
  - `login-surface-error-light-win32.png`
- foco visual congelado:
  - shell institucional
  - card de acesso
  - estado com erro

### 2. Selector

- superficie real: `/selector`
- componente de referencia: [WorkspaceSelectorCard.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/selector/_components/WorkspaceSelectorCard.tsx)
- pagina runtime que o consome: [page.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/selector/page.tsx)
- stories:
  - [WorkspaceSelectorCard.stories.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/selector/_components/WorkspaceSelectorCard.stories.tsx)
  - `selector-workspaceselectorcard--default`
  - `selector-workspaceselectorcard--loading`
- snapshots baseline:
  - `selector-workspace-default-dark-win32.png`
  - `selector-workspace-default-light-win32.png`
  - `selector-workspace-loading-dark-win32.png`
  - `selector-workspace-loading-light-win32.png`
- foco visual congelado:
  - card de ambiente
  - estado de carregamento
  - hierarquia de titulo/subtitulo/descricao

### 3. DTIC Dashboard

- superficie real: `/dtic/dashboard`
- componentes de referencia:
  - [DashboardOverviewHeader.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/components/dashboard/DashboardOverviewHeader.tsx)
  - [DashboardQueuePanel.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/components/dashboard/DashboardQueuePanel.tsx)
- pagina runtime que o consome: [page.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/[context]/dashboard/page.tsx)
- stories:
  - [DashboardOverviewHeader.stories.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/components/dashboard/DashboardOverviewHeader.stories.tsx)
  - `dashboard-dashboardoverviewheader--default`
  - `dashboard-dashboardoverviewheader--loading`
  - `dashboard-dashboardoverviewheader--filtered`
  - [DashboardQueuePanel.stories.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/components/dashboard/DashboardQueuePanel.stories.tsx)
  - `dashboard-dashboardqueuepanel--default`
  - `dashboard-dashboardqueuepanel--filtered`
  - `dashboard-dashboardqueuepanel--loading`
  - `dashboard-dashboardqueuepanel--empty`
- snapshots baseline:
  - `dashboard-overview-default-dark-win32.png`
  - `dashboard-overview-default-light-win32.png`
  - `dashboard-overview-loading-dark-win32.png`
  - `dashboard-overview-loading-light-win32.png`
  - `dashboard-overview-filtered-dark-win32.png`
  - `dashboard-overview-filtered-light-win32.png`
  - `dashboard-queue-default-dark-win32.png`
  - `dashboard-queue-default-light-win32.png`
  - `dashboard-queue-filtered-dark-win32.png`
  - `dashboard-queue-filtered-light-win32.png`
  - `dashboard-queue-loading-dark-win32.png`
  - `dashboard-queue-loading-light-win32.png`
  - `dashboard-queue-empty-dark-win32.png`
  - `dashboard-queue-empty-light-win32.png`
- foco visual congelado:
  - chip de contexto
  - papel ativo
  - busca do quadro
  - estatisticas
  - cabecalho da fila
  - densidade do kanban
  - estados `filtered`, `loading` e `empty`

Documento de discovery/governance desta rodada:

- [hub-analytics-family-pilot-v1.md](C:/Users/jonathan-moletta/code/hub-operacional-web/docs/hub-analytics-family-pilot-v1.md)

### 4. DTIC New Ticket

- superficie real: `/dtic/new-ticket`
- componente de referencia: [DticAgentWelcomePanel.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentWelcomePanel.tsx)
- componente runtime que o consome: [DticAgentChatEntry.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentChatEntry.tsx)
- story:
  - [DticAgentWelcomePanel.stories.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentWelcomePanel.stories.tsx)
  - `dtic-agentwelcomepanel--default`
- snapshots baseline:
  - `dtic-agent-welcome-default-dark-win32.png`
  - `dtic-agent-welcome-default-light-win32.png`
- foco visual congelado:
  - estado inicial do atendimento
  - card de introducao
  - exemplos rapidos
  - composer inicial

### 5. Portal

- superficie real: `/portal`
- componente de referencia: [PortalServiceCard.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/portal/_components/PortalServiceCard.tsx)
- story:
  - [PortalServiceCard.stories.tsx](C:/Users/jonathan-moletta/code/hub-operacional-web/web/src/app/portal/_components/PortalServiceCard.stories.tsx)
  - `portal-portalservicecard--active-technology`
  - `portal-portalservicecard--pending-protocol`
- snapshots baseline:
  - `portal-service-technology-dark-win32.png`
  - `portal-service-technology-light-win32.png`
  - `portal-service-protocol-dark-win32.png`
  - `portal-service-protocol-light-win32.png`
- foco visual congelado:
  - card ativo
  - card pendente
  - CTA principal/secundaria
  - nota operacional

## Baseline local

Arquivo canonico da suite visual:

- [storybook-visual.spec.ts](C:/Users/jonathan-moletta/code/hub-operacional-web/web/storybook-e2e/storybook-visual.spec.ts)

Diretorio dos snapshots:

- [storybook-visual.spec.ts-snapshots](C:/Users/jonathan-moletta/code/hub-operacional-web/web/storybook-e2e/storybook-visual.spec.ts-snapshots)

Relatorio local gerado pelo fluxo:

- [playwright-report-storybook](C:/Users/jonathan-moletta/code/hub-operacional-web/playwright-report-storybook/index.html)

## Gap Figma da fase

Estado do acesso na sessao que formalizou esta fase:

- conta autenticada com permissao `View`

Estado do piloto:

- nenhuma das cinco superficies do piloto recebeu arquivo Figma fornecido
- portanto, o gap desta fase e explicito: `sem fonte Figma para comparacao`

Consequencia:

- o contrato visual vigente veio do `DTIC_SYSTEM_PROMPT_V2.md`, do padrao local do hub e da revisao direta no codigo/runtime
- nenhuma decisao desta fase dependeu de escrita em Figma

## Validacao que fechou o piloto

Sequencia executada no estado final:

1. `npm run lint`
2. `npm run build`
3. `npm run storybook:test`
4. `npm run storybook:visual:update`
5. `npm run storybook:visual`
6. `docker compose up -d --build hub-frontend`
7. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor-runtime.ps1`
8. `npx playwright test e2e/hub-mvp.spec.ts --workers=1`
9. `npx playwright test e2e/hub-dtic-agent-handoff.spec.ts --workers=1`

## Observacao operacional sobre Hermes

Para fechar o smoke real do `DTIC/new-ticket`, foi necessario corrigir o runtime externo do Hermes em:

- `C:/Users/jonathan-moletta/code/glpi-ticket-agent-mvp`

Causa raiz encontrada:

- `.venv` sem `fastapi` e `uvicorn`
- o `doctor-runtime.ps1` podia parecer saudavel se existisse apenas um Streamlit respondendo, mas o handoff do hub exige tambem a API em `8502/health`

Estado correto ao final:

- `http://localhost:8501` -> Streamlit
- `http://localhost:8502/health` -> API healthy
