# Phase 38 - Hub Storybook Visual Guard - 2026-04-10

## Objetivo

Fechar a guarda visual canonica do frontend do hub com uma trilha propria de Storybook, separada do smoke de produto:

- Storybook local com stories reais do hub
- testes de stories em trilha dedicada
- baseline visual local dark/light via Playwright
- sem contaminar `lint`, `vitest` ou `Playwright` canonicos do runtime

## Arquivos alterados

### Tooling Storybook

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package-lock.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\.storybook\main.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\.storybook\preview.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\.storybook\vitest.setup.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\vitest.config.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\vitest.storybook.config.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\playwright.storybook.config.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\eslint.config.mjs`

### Stories canonicas

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.stories.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\ticket-card.stories.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\status-badge.stories.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\_components\PortalServiceCard.stories.tsx`

### Ajustes de componentes para review

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\_components\PortalServiceCard.tsx`

### Trilha visual isolada

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\storybook-e2e\storybook-visual.spec.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\storybook-e2e\storybook-visual.spec.ts-snapshots\`

## O que mudou

## 1. O bootstrap generico do Storybook saiu do caminho oficial

O init tinha deixado:

- examples em `web/src/stories`
- `addon-onboarding`
- config de Vitest misturando tests do app com Storybook
- spec visual dentro de `web/e2e`, contaminando o Playwright canonico do hub

Agora:

- `web/src/stories` foi removido
- o pacote oficial ficou sem `addon-onboarding`
- o Storybook ganhou scripts proprios:
  - `npm run storybook`
  - `npm run build-storybook`
  - `npm run storybook:test`
  - `npm run storybook:visual`
  - `npm run storybook:visual:update`
- a trilha visual foi movida para `web/storybook-e2e`

## 2. O Storybook agora cobre superficies reais do hub

As primeiras stories homologadas sao:

- `Shell/AppSidebar`
- `Tickets/TicketCard`
- `Tickets/StatusBadge`
- `Portal/PortalServiceCard`

Todas rodam com:

- tema `dark`
- tema `light`
- `ThemeProvider` real do hub
- CSS real do app

## 3. O Vitest do hub voltou a cuidar so do app

O `vitest.config.ts` principal voltou a ser o baseline do frontend do produto:

- `jsdom`
- alias `@`
- exclusao de `e2e/**`
- exclusao de `storybook-e2e/**`

Storybook ficou em uma config propria:

- `vitest.storybook.config.ts`

Isso evita que a trilha visual vaze para o gate canonico do app.

## 4. O lint do repo agora ignora artefatos gerados

Sem isso, `storybook-static` quebrava o gate de `eslint` com JS minificado gerado pelo build.

Agora `eslint.config.mjs` ignora:

- `storybook-static/**`
- `playwright-report-storybook/**`

## 5. A baseline visual local ficou versionada

Os snapshots reais ficaram em:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\storybook-e2e\storybook-visual.spec.ts-snapshots\`

Arquivos gerados nesta fase:

- `app-sidebar-desktop-dark-win32.png`
- `app-sidebar-desktop-light-win32.png`
- `ticket-card-novo-dark-win32.png`
- `ticket-card-novo-light-win32.png`
- `status-badges-dark-win32.png`
- `status-badges-light-win32.png`
- `portal-service-technology-dark-win32.png`
- `portal-service-technology-light-win32.png`
- `portal-service-protocol-dark-win32.png`
- `portal-service-protocol-light-win32.png`

## 6. O `AppSidebar` ganhou suporte seguro para story

Para isolar a superficie real sem tocar zonas protegidas:

- `contextOverride`
- `pathnameOverride`
- `currentUserRoleOverride`
- `showProfileMenu`

Tambem foi corrigido:

- hook condicional de `usePathname`
- `sizes` do `next/image` do brasao

## Evidencias geradas

### Build Storybook

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\storybook-static\`

### Baseline visual local

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\storybook-e2e\storybook-visual.spec.ts-snapshots\`

### Relatorio HTML do Playwright visual

- `C:\Users\jonathan-moletta\code\hub-operacional-web\playwright-report-storybook\index.html`

## Validacao executada

### Tooling/frontend

- `npm ci`
- `npm run lint`
- `npm run build`
- `npm run build-storybook`
- `npm run storybook:test`
- `npm run storybook:visual:update`
- `npm run storybook:visual`

### Runtime canonico do hub

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`
- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado final:

- `doctor runtime`: `PASS`
- `web lint`: ok
- `web vitest`: `24 arquivos / 94 testes`
- `web build`: ok
- `backend pytest`: `9/9`
- `Playwright full e2e`: `6/6`
- `storybook:test`: `4 arquivos / 9 testes`
- `storybook:visual`: `10/10`

## Conclusao

O hub agora tem uma guarda visual local homologada sem misturar:

- testes de produto
- testes de stories
- baseline visual

Com isso, as proximas mudancas de frontend no hub passam a ter trilha correta:

1. story da superficie
2. `npm run storybook:test`
3. `npm run storybook:visual`
4. so depois validacao no app real

Isso fecha a principal pendencia estrutural do frontend do hub depois das rodadas de tema, shell, portal e chat.
