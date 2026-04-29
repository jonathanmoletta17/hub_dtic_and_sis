# Hub Visual Standard v1

## Objetivo

Este documento consolida o padrao visual e operacional validado no `hub-operacional-web` depois da rodada de limpeza do modo claro/escuro, contraste, shells, `DTIC/new-ticket`, `SIS/new-ticket`, login e selector.

O hub passa a ser a referencia pratica para as proximas aplicacoes da Casa Civil RS quando a demanda for:

- padronizacao visual
- modo claro/escuro consistente
- contraste operacional
- reducao de poluicao visual
- validacao em runtime real

Este documento nao redefine fluxo de produto. Ele define como apresentar melhor as mesmas informacoes.

## Escopo Canonico

Superficies tratadas e validadas:

- `login`
- `selector`
- `DTIC/new-ticket`
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/ticket/[id]`
- `SIS/new-ticket`
- `SIS/dashboard`
- `SIS/user`
- `SIS/ticket/[id]`

## Regras Nao Negociaveis

1. Nao corrigir modo claro trocando apenas o fundo da pagina.
2. Nao usar `text-white`, `bg-black`, `bg-[#...]`, `text-gray-*` e variantes hardcoded como estrategia final.
3. Nao redesenhar fluxo so para "parecer moderno".
4. Nao deixar a UI depender de portas internas quando o usuario acessa a URL canonica.
5. Nao validar apenas por build local. Toda mudanca visual precisa passar no runtime real.

## Fundacao de Tema

O tema valido do hub depende de tokens semanticos definidos em:

- `web/src/app/globals.css`

Tokens-base:

- `--bg-base`
- `--bg-surface`
- `--bg-surface-alt`
- `--bg-surface-raised`
- `--border-subtle`
- `--border-default`
- `--border-strong`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--accent-primary`
- `--accent-primary-subtle`
- `--status-*`

Classes semanticas compartilhadas:

- `.theme-panel`
- `.theme-panel-muted`
- `.theme-floating-panel`
- `.theme-card`
- `.theme-card-interactive`
- `.theme-input`
- `.theme-shell-button`
- `.theme-shell-button-active`
- `.theme-button-primary`
- `.theme-copy-muted`
- `.theme-copy-soft`
- `.theme-meta`

Regra pratica:

- texto secundario precisa continuar legivel
- texto auxiliar nao pode virar decoracao invisivel
- badges precisam de foreground, background e border
- hover/focus precisam ser deliberados, nunca acidentais

## Componentes de Referencia

Use estes componentes como referencia antes de criar equivalentes locais:

- `web/src/components/ui/glass-card.tsx`
- `web/src/components/ui/premium-input.tsx`
- `web/src/components/ui/premium-button.tsx`
- `web/src/components/ui/theme-toggle.tsx`
- `web/src/components/ui/category-badge.tsx`
- `web/src/components/ui/status-badge.tsx`
- `web/src/components/ui/AppSidebar.tsx`
- `web/src/components/ui/OperationalShell.tsx`

## Padroes de Superficie

### 1. Login

Objetivo:

- acesso direto
- leitura rapida
- identidade institucional clara

Regras:

- uma acao principal visivel
- helper curto e legivel
- labels e icones de input com contraste suficiente
- rodape institucional discreto, mas legivel

Arquivo de referencia:

- `web/src/app/page.tsx`

### 2. Selector

Objetivo:

- decisao entre ambientes
- sem ruido
- sem taxonomia interna exposta

Regras:

- cards de ambiente com peso equivalente
- acento cromatico por contexto
- CTA implicita no card, nao um excesso de botoes
- texto de apoio curto e operacional

Arquivo de referencia:

- `web/src/app/selector/page.tsx`

### 3. Agent-first chat

Objetivo:

- entrada limpa
- composer proximo do contexto
- sem hero cenografico vazio

Regras:

- no estado inicial, introducao e composer devem ficar juntos
- depois da primeira mensagem, o rodape fixo pode voltar
- exemplos rapidos devem ser curtos e plausiveis
- status do atendimento precisa ser legivel e discreto

Arquivo de referencia:

- `web/src/modules/tickets/components/agent-chat/DticAgentChatEntry.tsx`

### 4. Wizard de servicos

Objetivo:

- descoberta guiada
- sem taxonomia tecnica crua do GLPI

Regras:

- usar camada de apresentacao amigavel
- evitar mosaico uniforme sem hierarquia
- reduzir stepper cenografico
- separar atalhos de resultados reais

Arquivos de referencia:

- `web/src/modules/tickets/components/wizard/FormWizard.tsx`
- `web/src/modules/tickets/components/wizard/ServiceSelector.tsx`
- `web/src/modules/tickets/components/wizard/serviceCatalogPresentation.ts`

### 5. Dashboard

Objetivo:

- leitura operacional
- busca real
- cards e colunas compreensiveis

Regras:

- busca precisa filtrar de verdade
- kanban deve aceitar largura minima e scroll horizontal
- colunas vazias precisam explicar o estado
- contadores precisam ser lidos em 2 segundos

Arquivos de referencia:

- `web/src/app/[context]/dashboard/page.tsx`
- `web/src/components/ui/kanban-board.tsx`
- `web/src/components/ui/kanban-column.tsx`

### 6. Ticket detail

Objetivo:

- leitura de historico
- sidebar clara
- baixa poluicao

Regras:

- sidebar dividida por secoes
- timeline com contraste suficiente no modo claro
- metadata em blocos pequenos
- composer e estado de leitura claramente diferenciados

Arquivos de referencia:

- `web/src/components/ticket/TicketSidebar.tsx`
- `web/src/components/ticket/TimelineItem.tsx`
- `web/src/components/ticket/TicketTimeline.tsx`

## Antipadroes Confirmados

Estes foram problemas reais encontrados no hub e nao devem voltar:

- background claro com cards escuros ou vice-versa
- texto claro demais no modo claro
- metadata com `opacity` baixa demais
- badges sem borda
- icons com cor clara demais herdada do dark mode
- grids uniformes para catalogos que exigem descoberta guiada
- `getByText` ambiguo em smoke de UI quando a mesma copy aparece em heading e helper
- build local sem rebuild do container servido ao usuario

## Validacao Minima Obrigatoria

Sempre executar:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
npm run lint
npm run build
```

Depois:

```bash
cd /home/jonathan/projects/work/hub-operacional-web
docker compose up -d --build hub-frontend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/doctor-runtime.ps1)"
```

Quando a mudanca tocar fluxos principais, executar pelo menos um smoke Playwright real.

Exemplos:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
export SMOKE_USERNAME='...'
export SMOKE_PASSWORD='...'
npx playwright test e2e/hub-mvp.spec.ts --workers=1
npx playwright test e2e/hub-dtic-agent-chat.spec.ts --workers=1
```

## Sequencia de Aplicacao em Outros Apps

Ao levar esse padrao para dashboards, buscadores ou carregadores:

1. identificar a URL canonica e o runtime real
2. auditar tokens e hardcodes
3. corrigir tema compartilhado antes da tela individual
4. corrigir componentes compartilhados antes de patchs locais
5. validar claro e escuro no app real
6. rebuildar o servico correto
7. registrar a evidencia

## Relacao com Skills

Materiais reutilizaveis alinhados com este padrao ficam em `docs/reference/frontend-system/`.

Uso recomendado:

- qualidade visual primeiro
- rebuild/runtime depois

## Resultado Esperado

Quando uma aplicacao estiver alinhada com este padrao, ela deve parecer:

- corporativa
- limpa
- legivel
- consistente entre claro e escuro
- validada no runtime de verdade

Se a tela so "ficou bonita" no editor, mas nao passou em runtime, ela ainda nao esta pronta.
