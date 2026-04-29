# Phase 32 - Hub Frontend Screen Review - 2026-04-09

## Objetivo

Executar uma revisao de frontend mais rigorosa do hub, baseada em:

- guideline externa atual de interface
- evidencia visual real das telas publicadas
- stack oficial de revisao visual usada como referencia operacional
- workspace de referencia no Stitch para a proxima rodada de design

## Metodo

### 1. Guideline externa

- Vercel Web Interface Guidelines
- fonte consultada em `2026-04-09`:
  - `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

### 2. Stack de revisao usada como referencia

- MCP `operationsFrontendUiKnowledge`
- recurso:
  - `operations-frontend://visual-review-stack`

Leitura principal:

- validacao visual consistente nao pode depender so de `lint`, `build` e smoke funcional
- a guarda visual recomendada e `Storybook + baseline visual local + comparacao remota`

### 3. Evidencia visual local

Capturas em runtime:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens\`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\`

Telas revistas em `dark` e `light`:

- login
- selector
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket`
- `portal`
- `portal/meus-chamados`

### 4. Stitch

Workspace criado para referencia visual da proxima rodada:

- Stitch project: `projects/14874545883568625909`
- titulo: `Hub Operacional Frontend Review`

Observacao:

- a primeira tentativa de gerar uma referencia do chat expirou no proxy do Stitch
- o workspace ficou aberto para a proxima fase de idealizacao

## Achados principais

### P1 - A revisao visual do repo ainda nao e confiavel como processo

O repo do hub nao tem uma camada canonica de revisao visual comparavel ao protocolo oficial consultado. Hoje a validacao real do frontend e `lint + build + smoke Playwright`, mas nao existe `Storybook`, baseline local de screenshot ou diff visual dedicado.

Evidencia:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package.json`
- scripts atuais:
  - `dev`
  - `build`
  - `start`
  - `lint`
  - `smoke:hub`
  - `smoke:hub:install`

Implicacao:

- regressao de contraste, densidade, hierarquia ou copy passa facil porque a validacao atual olha mais comportamento do que superficie visual

### P1 - `DTIC/new-ticket` continua estruturalmente fraco como experiencia principal

Mesmo com o chat inline funcionando, a tela ainda nao parece um atendimento pronto. No estado base, a area central vira um grande vazio branco com uma unica bolha pequena no topo e o composer fica deslocado no rodape como se fosse outra secao.

Evidencia visual:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\dtic_new_ticket-light.png`

Evidencia de codigo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
  - estrutura principal: linhas `0286` a `0420`
  - badges e header: linhas `0297` a `0339`
  - bolhas: linhas `0084` a `0124`
  - composer: linhas `0396` a `0417`

Leitura:

- o layout esta funcional, mas ainda nao tem densidade conversacional suficiente
- o estado inicial transmite inacabado, nao atendimento premium

### P1 - O portal ainda esta com copy de prototipo e expõe bastidor

Visualmente o portal e o melhor candidato a superficie institucional, mas o conteudo ainda fala em termos de arquitetura e dependencias internas. Isso enfraquece o posicionamento corporativo.

Evidencia visual:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\portal-light.png`

Evidencia de codigo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx`
  - hero: linhas `0126` a `0137`
  - bloco `Nucleo comprovado`: linhas `0182` a `0200`
  - bloco `Dependencias ainda abertas`: linhas `0203` a `0219`
  - secoes de servico/pending: linhas `0224` a `0349`

Leitura:

- o portal ainda explica o sistema em vez de orientar o usuario final
- a tela esta mais perto de um memorial de validacao do que de um produto de atendimento

### P1 - `portal/meus-chamados` ainda depende de estado de sessao escondido e degrada mal

A superficie consolidada do portal falha com uma mensagem tecnica quando as sessoes de contexto nao foram montadas antes. Isso atrapalha tanto o usuario quanto a propria revisao visual.

Evidencia visual:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\portal_meus_chamados-light.png`

Evidencia de codigo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\meus-chamados\page.tsx`
  - dependencia de sessao/contexto: linhas `0130` a `0167`
  - agregacao com falha parcial: linhas `0178` a `0223`
  - erro exibido: linhas `0328` a `0336`

Leitura:

- a tela consolidada nao esta auto-suficiente
- para revisao visual e fluxo real, ela ainda depende demais de precondicoes invisiveis

### P2 - Dashboard e lista estao lavados no light mode por excesso de opacidade baixa

O tema claro agora funciona tecnicamente, mas boa parte da informacao operacional perdeu contraste. Labels, subtitulos, ids, contadores e previews ficaram cinzas demais para uma superficie de trabalho.

Evidencia visual:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\dtic_dashboard-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\dtic_user-light.png`

Evidencia de codigo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx`
  - subtitle/header: linhas `0138` a `0155`
  - stat cards: linhas `0167` a `0177`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-column.tsx`
  - linhas `0016` a `0022`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\ticket-card.tsx`
  - id/SLA/preview: linhas `0039` a `0055`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx`
  - contador e hint: linhas `0158` a `0160`
  - avisos e previews: linhas `0247` a `0255`, `0289` a `0299`

Leitura:

- o problema nao e mais quebra brutal de tema
- agora e calibracao de contraste, sobretudo em texto auxiliar e microdados

### P2 - Login e selector preservam melhor a identidade, mas ainda concentram o visual bonito demais e o resto do produto fica para tras

Hoje existe um desbalanco claro: login e selector parecem telas de produto; dashboard, lista e chat parecem superficies ainda em transicao. O ecossistema nao le como um sistema continuo.

Evidencia visual:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens\login-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens\selector-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\dtic_dashboard-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens-auth\dtic_new_ticket-light.png`

Evidencia de codigo:

- login:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx`
- selector:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx`

Leitura:

- o sistema tem fundacao visual, mas ela ainda nao foi propagada com a mesma qualidade para as superficies operacionais

### P2 - Ainda existem residuos de hardcode visual e componente legado fora do sistema

Mesmo depois do hardening do tema, ainda ha trechos com `white/black` hardcoded, alem do `DticAgentEntry` legado que continua completamente fora da nova arquitetura visual.

Evidencia:

- hardcodes remanescentes encontrados em:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\auth\ProtectedRoute.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\SolutionModal.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TransferModal.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-button.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`

Leitura:

- o tema semantico ja existe
- mas o cleanup ainda nao terminou

### P2 - Acessibilidade e foco ainda nao estao consistentes com a guideline

O repo ainda usa `outline-none` e `transition-all` em pontos relevantes sem reposicao clara de `focus-visible` em todos os casos. Isso vale sobretudo para selector, inputs de busca e composer.

Evidencia:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx:207`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx:153`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx:213`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx:405`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-input.tsx:32`

Leitura:

- o sistema esta mais bonito do que antes no modo claro
- mas ainda nao esta revisado com rigor suficiente de teclado/foco

## Superficies com melhor resultado nesta rodada

### Melhor preservadas

- login
- selector

Motivo:

- direcao visual mais forte
- linguagem mais coesa
- composicao mais intencional

### Intermediarias

- `DTIC/dashboard`
- `DTIC/user`

Motivo:

- estrutura funcional boa
- contraste e refinamento visual ainda fracos no light mode

### Piores superficies agora

- `DTIC/new-ticket`
- `portal/meus-chamados`

Motivo:

- chat ainda nao parece produto premium
- consolidado do portal ainda degrada com dependencia interna de sessao

## Conclusao operacional

O problema do hub agora nao e mais "nao tem light mode". O problema passou a ser outro:

- falta uma guarda visual canonica
- falta calibracao de contraste nas superficies operacionais
- o chat principal ainda nao tem a qualidade visual do login e do selector
- o portal ainda carrega copy e estados de produto em transicao

## Recomendacao de proxima fase

### Ordem correta

1. criar a guarda visual canonica do hub
   - Storybook local
   - stories das superficies canonicas
   - baseline visual local com Playwright
2. atacar a trilha de contraste e densidade
   - `dashboard`
   - `user`
   - `ticket-card`
   - `kanban`
3. redesenhar a superficie do chat `DTIC/new-ticket`
   - com base no workspace Stitch ja aberto
4. revisar `portal` e `portal/meus-chamados`
   - retirar copy de prototipo
   - tratar dependencia de sessao como fluxo canonico, nao como erro tardio

### Nao recomendado

- continuar mexendo tela a tela sem baseline visual
- tratar so o CSS sem rever hierarquia, copy e estados vazios
