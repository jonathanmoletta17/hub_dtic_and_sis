# Hub Visual Review Workflow v1

## Objetivo

Formalizar o fluxo oficial de revisao visual do hub operacional sem alterar contratos de runtime, autenticacao ou backend.

Esta fase trata o hub como piloto canonico do ecossistema e fecha um processo repetivel para mudancas visuais nas superficies:

1. `login`
2. `selector`
3. `DTIC/dashboard`
4. `DTIC/new-ticket`

## Hierarquia de verdade

### Produto e identidade

A doutrina de produto e design desta fase deriva do documento fornecido externamente `DTIC_SYSTEM_PROMPT_V2.md`.

Ele vale aqui como:

- direcao de produto
- identidade institucional
- criterio de coesao visual entre modulos

Ele **nao** vale como contrato literal de stack para este repositorio.

### Stack real e runtime canonico

O hub continua no stack real documentado em `BOOTSTRAP.md`:

- `Next.js 16`
- `React 19`
- `App Router`
- `storybook` ja configurado no frontend
- runtime canonico no proxy `http://localhost:18080`

Decisao explicita desta fase:

- **nao havera migracao para Vite**
- **nao havera migracao para React Router**

### Contrato visual local do repo

O padrao visual do hub continua consolidado em:

- [hub-visual-standard-v1.md](hub-visual-standard-v1.md)

Este documento nao duplica tokens ou regras de composicao. Ele define processo.

### Processo oficial de revisao visual

As referencias operacionais desta fase sao:

- recurso `visual-review-stack` do plugin `operations-frontend-ui`
- recurso `development-protocol` do plugin `operations-frontend-ui`

Traducao para este repo:

- story primeiro
- baseline visual local depois
- runtime real por ultimo

## Piloto oficial do hub

O piloto desta fase cobre exatamente estas superficies:

1. `login`
2. `selector`
3. `DTIC/dashboard`
4. `DTIC/new-ticket`

Motivo:

- cobrem shell institucional, escolha de contexto, operacao tecnica e fluxo agent-first
- ja possuem runtime real validado no hub
- evitam abrir escopo desnecessario em `SIS` e detalhe de ticket nesta formalizacao

## Workflow oficial

### Etapa 1. Diagnostico sem mutacao

Antes de editar qualquer tela:

- identificar a superficie
- classificar a mudanca como `UI`, `tooling` ou `runtime`
- mapear a unidade visual real que precisa de story

Nao fechar mudanca visual com diagnostico apenas no app inteiro.

### Etapa 2. Modelagem em Storybook

Toda mudanca visual relevante precisa de story correspondente no menor nivel coerente.

Regra:

- evitar story de pagina inteira quando a superficie depender fortemente de auth, router ou chamadas reais
- preferir componentes apresentacionais reutilizados pela pagina real

Cobertura minima do piloto:

- shell de login
- card de ambiente do selector
- cabecalho e estatisticas do dashboard
- estado inicial do `DTIC/new-ticket`

### Etapa 3. Baseline visual local

Depois da story:

1. `npm run storybook:test`
2. `npm run storybook:visual`

Se a mudanca for intencional e exigir novos snapshots:

1. `npm run storybook:visual:update`
2. `npm run storybook:visual`

Screenshot de runtime sem story correspondente **nao fecha** alteracao visual relevante.

### Etapa 4. Validacao no runtime real

So depois do Storybook:

1. `docker compose up -d --build hub-frontend`
2. `powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\doctor-runtime.ps1`
3. smoke real da superficie tocada

Gates minimos desta fase:

1. `npm run lint`
2. `npm run build`
3. `npm run storybook:test`
4. `npm run storybook:visual`
5. rebuild do `hub-frontend`
6. `doctor-runtime.ps1`
7. `npx playwright test e2e/hub-mvp.spec.ts --workers=1`
8. `npx playwright test e2e/hub-dtic-agent-chat.spec.ts --workers=1` quando tocar `DTIC/new-ticket`

### Etapa 5. Evidencia e fechamento

Toda rodada deve registrar:

- arquivos alterados
- stories criadas ou ajustadas
- resultado de lint/build/storybook/runtime
- URL canonica validada
- risco residual, quando existir

## Trilha Figma read-only

Nesta fase, Figma entra apenas como auditoria e contrato visual.

Permitido:

- contexto de design
- metadata
- screenshot
- lista de gaps entre Figma e codigo

Nao permitido como dependencia do piloto:

- `use_figma`
- `create_new_file`
- escrita de componente
- escrita de token

Estado atual do acesso:

- o acesso disponivel nesta sessao e somente leitura (`View`)

Regra operacional:

- se houver arquivo Figma fornecido para a superficie, ele entra como referencia complementar
- se nao houver arquivo Figma fornecido, o workflow segue normalmente e registra `sem fonte Figma para comparacao`

Nesta formalizacao do piloto do hub, nenhuma das quatro superficies depende de arquivo Figma fornecido. O gap fica explicitamente registrado como:

- `sem fonte Figma para comparacao`

## Contratos protegidos

Ficam fora de escopo nesta fase:

- APIs publicas runtime
- autenticacao
- backend
- `context-registry`
- `useAuthStore`
- `httpClient`
- `auth_service.py`
- `contexts.yaml`

## Definicao de pronto

Uma mudanca visual do piloto so fecha quando:

- existe story correspondente
- light e dark passam na superficie principal
- o baseline visual local fecha
- o runtime canonico do hub continua saudavel
- nao houve necessidade de decisao adicional sobre stack, Figma write access ou escopo do piloto
