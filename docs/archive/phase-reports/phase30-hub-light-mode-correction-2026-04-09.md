# Phase 30 - Hub Light Mode Correction - 2026-04-09

## Objetivo

Corrigir a direcao da fase anterior e voltar o hub para o escopo certo:

- preservar a linguagem visual anterior do produto;
- remover o redesign amplo introduzido em `phase29`;
- ativar `light mode` real sobre a mesma anatomia do hub;
- manter contratos, fluxos e validacao protegidos intactos.

## O que foi corrigido

### Rollback visual da fase anterior

Arquivos principais:

- [layout.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\layout.tsx)
- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx)
- [selector/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx)
- [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [AppSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
- [UserProfileMenu.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx)
- [glass-card.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\glass-card.tsx)
- [premium-button.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-button.tsx)
- [premium-input.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-input.tsx)

Resultado:

- o login voltou para a composicao visual anterior;
- o selector voltou para a direcao original;
- o shell voltou para a familia visual que o hub ja sustentava;
- o fundo `aurora` deixou de ser aplicado em duplicidade pelo `layout`.

### Light mode sem redesign

Arquivos:

- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [layout.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\layout.tsx)
- [theme-toggle.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\theme-toggle.tsx)

Entregas:

- `data-theme="dark|light"` aplicado no `documentElement`;
- persistencia via `localStorage` em `hub_theme`;
- inicializacao do tema antes da hidratacao;
- overrides de `surface`, `text`, `glass`, `border` e `aurora` para `light`;
- toggle acessivel em login, selector e shell.

### Limpeza dos residuos do redesign

Arquivos removidos:

- [SystemBadge.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemBadge.tsx)
- [SystemButton.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemButton.tsx)
- [SystemCard.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemCard.tsx)
- [SystemInput.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemInput.tsx)
- [SystemPage.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemPage.tsx)
- [cn.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\utils\cn.ts)

Esses arquivos eram da tentativa de redesign e deixaram de ser parte do estado canônico do hub.

## Validacao executada

### Validacao tecnica

- `npm run lint`
- `npm run build`
- `docker compose up -d --build`
- `powershell -ExecutionPolicy Bypass -File scripts\doctor-runtime.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `web build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `Playwright full e2e`: `6/6`

### Smoke de tema

Foi executado um smoke adicional em navegador automatizado sobre `http://127.0.0.1:18080` para confirmar:

- troca do tema pelo toggle;
- persistencia em `localStorage`;
- continuidade do tema no login, no selector e no shell apos autenticacao.

Resultado observado:

- o tema alternou corretamente;
- `hub_theme` persistiu;
- o mesmo tema continuou ativo em `/selector` e no contexto `DTIC`.

## Leitura correta desta fase

Esta fase nao inaugura um sistema visual novo.

Ela corrige a interpretacao anterior e recoloca o hub no escopo pedido:

- manter o visual forte que ja existia;
- adicionar `light mode`;
- evitar redesign estrutural.

## Proximo passo recomendado

Expandir o `light mode` com revisao visual controlada das superfícies protegidas do hub, sem trocar layout, hierarquia ou linguagem:

- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket`
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`
