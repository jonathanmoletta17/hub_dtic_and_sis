# Phase 31 - Hub Semantic Theme Hardening - 2026-04-09

## Objetivo

Corrigir a implementacao superficial do `light mode` e consolidar uma arquitetura de tema coerente no hub:

- tokens semanticos reais para `light` e `dark`;
- sidebar escura em ambos os modos;
- superficies, cards, inputs e badges sem hardcodes de `white/black`;
- persistencia e anti-flash do tema no carregamento.

## Decisao tecnica

O plano conceitual de `ThemeProvider + semantic tokens + anti-flash` foi mantido, mas adaptado ao stack real do projeto.

O hub usa `Tailwind CSS v4` com `@theme inline` em [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css), entao nao foi criado `tailwind.config.js` so para mapear tokens. A equivalencia foi implementada diretamente no `@theme inline`, mantendo o contrato do projeto.

## Implementacao

### Infraestrutura de tema

Arquivos:

- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [ThemeProvider.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ThemeProvider.tsx)
- [layout.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\layout.tsx)
- [theme-toggle.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\theme-toggle.tsx)

Entregas:

- tokens semanticos `bg`, `surface`, `text`, `border`, `card`, `status` e `sidebar`;
- `ThemeProvider` com persistencia em `localStorage`;
- compatibilidade de leitura/escrita para `theme` e `hub_theme`;
- `anti-flash` via script no `layout`;
- sincronizacao em `html.dark`, `dataset.theme` e `color-scheme`.

### Primitives semanticas de interface

Arquivos:

- [status-badge.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\status-badge.tsx)
- [category-badge.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\category-badge.tsx)

Classes semanticas novas em [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css):

- `theme-panel`
- `theme-panel-muted`
- `theme-card`
- `theme-card-interactive`
- `theme-input`
- `theme-chip`
- `theme-shell-button`
- `theme-shell-button-active`
- `theme-button-primary`
- `theme-button-secondary`
- `theme-sidebar`
- `theme-sidebar-surface`
- `theme-sidebar-button`
- `theme-sidebar-button-active`
- `theme-title-gradient`

### Superficies migradas

- login e selector:
  - [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx)
  - [selector/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx)
- shell:
  - [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
  - [AppSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
  - [UserProfileMenu.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx)
- dashboard e meus chamados:
  - [dashboard/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx)
  - [user/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx)
  - [ticket-card.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\ticket-card.tsx)
  - [kanban-board.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-board.tsx)
  - [kanban-column.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-column.tsx)
- detalhe do ticket:
  - [ticket/[id]/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\ticket\[id]\page.tsx)
  - [TicketSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketSidebar.tsx)
  - [TicketActions.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketActions.tsx)
  - [TicketAttachments.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketAttachments.tsx)
  - [TicketTimeline.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketTimeline.tsx)
  - [TimelineItem.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TimelineItem.tsx)
  - [SolutionModal.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\SolutionModal.tsx)
  - [TransferModal.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TransferModal.tsx)
- chat e portal:
  - [DticAgentChatEntry.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx)
  - [portal/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx)
  - [portal/meus-chamados/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\meus-chamados\page.tsx)

## Validacao executada

### Validacao padrao

- `npm run lint`
- `npm run build`
- `docker compose up -d --build`
- `powershell -ExecutionPolicy Bypass -File scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `web build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `Playwright full e2e`: `6/6`

### Smoke especifico de tema

Foi executado um smoke de runtime em browser automatizado, com `light mode` ligado, medindo estilos computados em login, selector, dashboard e portal.

Resultado:

- `body` claro: `rgb(240, 242, 245)`
- `sidebar` escura: `rgb(30, 35, 48)`
- `stat card` no dashboard: `rgb(255, 255, 255)`
- `ticket card` no portal: `rgb(255, 255, 255)`
- tema persistido: `theme=light`, `html.dark=false`, `dataset.theme=light`

## Leitura correta

Esta fase nao muda o produto nem os fluxos. Ela corrige a base visual do `light mode` para que:

- o claro nao seja um dark mal invertido;
- cards nao permaneçam escuros sobre pagina clara;
- textos e badges nao sumam por contraste ruim;
- a sidebar mantenha identidade corporativa escura.

## Proximo passo recomendado

Fazer revisao visual assistida no navegador das superficies protegidas em `light` e `dark`, com foco em:

- refinamento de contraste fino;
- reducao dos ultimos `white/black` decorativos restantes;
- calibracao de hover, estados vazios e modais secundarios.
