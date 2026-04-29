# Phase 29 - Hub H1 Foundations Shell Auth Implementation - 2026-04-09

## Objetivo

Executar a primeira onda real da consolidacao visual do `hub-operacional-web`, priorizando:

- foundations globais;
- shell corporativo;
- login;
- selector.

Esta fase manteve intactas as zonas protegidas do repositario e nao alterou contratos de auth, contexto ou API.

## Escopo implementado

### Foundations

Arquivos:

- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [layout.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\layout.tsx)
- [cn.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\utils\cn.ts)

Entregas:

- tokens semanticos novos para superficie, texto, borda, radius e sombra;
- preparo estrutural para `dark/light` via `data-theme`;
- tipografia consolidada em `Space Grotesk`, `Inter` e `IBM Plex Mono`;
- aurora global recalibrada para um fundo mais corporativo e menos cenografico.

### Primitives de sistema

Arquivos:

- [SystemBadge.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemBadge.tsx)
- [SystemButton.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemButton.tsx)
- [SystemCard.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemCard.tsx)
- [SystemInput.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemInput.tsx)
- [SystemPage.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\system\SystemPage.tsx)

Entregas:

- primitives novas para cards, botoes, badges, inputs e page container;
- ponte de migracao preservando [glass-card.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\glass-card.tsx), [premium-button.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-button.tsx) e [premium-input.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-input.tsx) como wrappers leves.

### Shell corporativo

Arquivos:

- [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [AppSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
- [UserProfileMenu.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx)

Entregas:

- sidebar mais curta, limpa e orientada por contexto;
- assinatura institucional mais discreta;
- navegacao com item ativo mais forte e menos ruido visual;
- menu de perfil alinhado ao novo shell;
- cabecalho mobile com badge contextual e CTA de ambientes mais consistente.

### Auth surfaces

Arquivos:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx)
- [selector/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx)

Entregas:

- login refeito como entrada corporativa limpa;
- selector refeito como superficie de decisao rapida;
- remocao de decoracao redundante, copy excessiva e chrome de transicao;
- estado de erro mais claro;
- botoes do selector com nome acessivel estavel para Playwright.

## Regressao protegida

Arquivos ajustados:

- [hub.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\helpers\hub.ts)
- [hub-dtic-agent-handoff.spec.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-handoff.spec.ts)
- [hub-dtic-agent-submit-clean.spec.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-submit-clean.spec.ts)
- [hub-mvp.spec.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-mvp.spec.ts)

Motivo:

- o selector novo passou a usar `aria-label` explicito por ambiente;
- o chat `DTIC/new-ticket` passou a ser validado por `heading` unico em vez de badge textual ambigua.

## Validacao executada

Com a stack rebuildada e publicada no proxy local:

- `docker compose up -d --build`
- `powershell -ExecutionPolicy Bypass -File scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `web build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `Playwright full e2e`: `6/6`

## Impacto

O hub agora tem uma base visual explicita e reutilizavel para as proximas ondas:

- `H1.2/H1.3` ja nao dependem mais de linguagem herdada de `Premium*`;
- login e selector deixaram de parecer uma familia separada do resto do produto;
- o shell passou a sustentar o movimento de convergencia corporativa sem tocar contratos protegidos.

## Limites desta fase

- nao houve redesenho de dashboard, `user`, `ticket detail` ou chat;
- nao houve ativacao publica de `light mode`;
- nao houve alteracao em `context-registry.ts`, `useAuthStore.ts`, `httpClient.ts`, `auth_service.py` ou `contexts.yaml`.

## Proximo passo recomendado

Abrir a `H1.3/H1.4` do hub:

- consolidar `dashboard`, `user` e `ticket detail` no mesmo sistema de superficies;
- refatorar `DTIC/new-ticket` em subcomponentes de conversa, draft e composer sobre as foundations novas.
