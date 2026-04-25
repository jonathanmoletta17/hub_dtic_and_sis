# Phase 34 - Hub Front A Theme Foundations And Operational Contrast - 2026-04-10

## Objetivo

Executar a `Frente A` do contrato visual do hub e iniciar a recalibracao da `Frente C` nas superficies operacionais mais sensiveis, sem alterar fluxo, contratos de autenticacao ou zonas protegidas.

Objetivos desta rodada:

- separar visualmente o sidebar entre light e dark
- alinhar shell e perfil do usuario com o novo contrato de tema
- recuperar contraste e legibilidade em `DTIC/dashboard` e `DTIC/user`
- validar a superficie publicada com screenshots reais do runtime

## Arquivos alterados

### Foundations e shell

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\auth\ProtectedRoute.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-button.tsx`

### Contraste operacional

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\ticket-card.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-column.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-board.tsx`

## O que mudou

## 1. Sidebar agora responde ao tema

O light mode nao usa mais o mesmo trilho lateral do dark.

Em `globals.css`:

- `--bg-sidebar` no light passou a usar superficie clara elevada
- foram introduzidos tokens especificos para sidebar:
  - `--sidebar-surface`
  - `--sidebar-surface-hover`
  - `--sidebar-border`
  - `--sidebar-text-primary`
  - `--sidebar-text-muted`
  - `--sidebar-button-active-*`
  - `--sidebar-shadow`
  - `--sidebar-focus-ring`

Em `AppSidebar.tsx`, `OperationalShell.tsx` e `UserProfileMenu.tsx`:

- textos deixaram de depender de `text-on-dark`
- sombra do sidebar/dropdown passou a seguir token semantico
- hover, active e foco visivel foram alinhados ao tema

## 2. Shell deixou de depender de residuos escuros fixos

O trilho do shell e o menu de usuario passaram a respeitar o contrato visual do tema, reduzindo a sensacao de blocos montados por pecas.

Tambem foi removida dependencia hardcoded do botao de retorno em `ProtectedRoute.tsx`, que passou a usar a familia `theme-button-secondary`.

## 3. Dashboard e Meus Chamados ganharam mais leitura

Em `DTIC/dashboard`:

- subtitulo ficou mais legivel
- estados de refresh e busca ficaram menos lavados
- labels e icones dos contadores ganharam mais contraste

Em `DTIC/user`:

- subtitulo, contagem e notas auxiliares ficaram mais legiveis
- busca e select ficaram mais claros no canvas claro
- `ticket list` ganhou reforco em ids, datas, previews e estados vazios

Nos componentes compartilhados:

- `ticket-card.tsx` aumentou contraste de id, SLA e descricao
- `kanban-column.tsx` aumentou contraste de titulo, contador e icone
- `kanban-board.tsx` ajustou o empty state para nao desaparecer no light mode

## Evidencia visual

Capturas reais da aplicacao publicada:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\dtic_dashboard-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\dtic_dashboard-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\dtic_user-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\dtic_user-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\selector-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\selector-light.png`

Resumo da verificacao de tema:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\summary.json`

Valores confirmados no runtime:

- `DTIC/dashboard` dark: `rgb(18, 21, 30)`
- `DTIC/dashboard` light: `rgb(247, 249, 252)`
- `DTIC/user` dark: `rgb(18, 21, 30)`
- `DTIC/user` light: `rgb(247, 249, 252)`

## Validacao executada

### Build e sanidade

- `docker compose up -d --build`
- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`

### Validacao padrao consolidada

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `24 arquivos / 94 testes` ok
- `web build`: ok
- `backend pytest`: `9 testes` ok
- `doctor runtime`: `PASS`
- `Playwright full e2e`: `6/6`

## O que ficou pendente

Esta fase fecha foundations e melhora contraste, mas ainda nao fecha o redesign das superfices mais criticas.

Ainda pendente:

- `DTIC/new-ticket` como surface premium de atendimento
- `portal` e `portal/meus-chamados` com linguagem de produto
- baseline visual canonica com `Storybook` e revisao por stories

Tambem permanecem residuos visuais fora do escopo desta frente:

- detalhes decorativos da auth em `page.tsx`
- overlays hardcoded em modais de ticket
- shimmer residual em `premium-button.tsx`
- componente legado `DticAgentEntry.tsx`, que segue fora do sistema novo e precisa ser tratado como divida isolada

## Conclusao

`Frente A` foi fechada com evidencia real de runtime:

- o sidebar agora distingue light e dark de forma material
- shell e perfil deixaram de depender de linguagem escura fixa
- `dashboard` e `meus chamados` ficaram mais legiveis no light mode

O proximo passo correto e continuar na `Frente C` e depois atacar a `Frente D`, em vez de voltar a mexer superficialmente no tema.
