# Phase 26 - Hub First Corporate System Roadmap - 2026-04-09

## Objetivo

Priorizar o `hub-operacional-web` como o primeiro produto a absorver o padrao corporativo da Casa Civil RS, sem quebrar os fluxos operacionais que ja estao validados.

Este documento responde quatro perguntas:

1. como a ideia ficaria no produto;
2. como isso se moveria no codigo;
3. no que isso implica tecnicamente;
4. qual e a ordem correta das alteracoes.

## Tese

Se a Casa Civil quer um ecossistema coerente, o hub deve ser o primeiro produto a consolidar:

- shell corporativo;
- linguagem operacional;
- fundamentos visuais;
- superficie de atendimento;
- padrao de navegacao entre contextos.

Os buscadores e dashboards podem herdar o sistema depois, mas o hub e o lugar certo para incubar o padrao porque ele concentra:

- autenticacao;
- selector;
- modulos `DTIC` e `SIS`;
- atendimento com agente;
- ticket detail;
- navegacao entre contextos.

## Como isso ficaria

### Ideia de produto

O hub deixaria de parecer uma app "do modulo de tickets" e passaria a parecer o cockpit operacional da Casa Civil.

Experiencia-alvo:

1. login institucional limpo
2. selector enxuto e claro
3. shell unico para todos os contextos
4. dashboards, chamados e atendimento com a mesma familia visual
5. linguagens diferentes por contexto, mas com a mesma espinha dorsal

### O que o usuario sentiria

- menos texto redundante;
- menos termos tecnicos internos;
- mais previsibilidade;
- mais legibilidade;
- transicao natural entre `DTIC` e `SIS`;
- atendimento no chat como parte do produto, nao como ferramenta acoplada.

### Visualmente

O hub passaria a operar com quatro niveis claros:

1. `Institutional Layer`
   - assinatura Casa Civil RS
   - marca institucional contida
   - credibilidade publica

2. `Product Shell`
   - sidebar
   - topbar
   - contexto atual
   - conta/logoff
   - mudanca de ambiente

3. `Surface Archetype`
   - dashboard
   - new ticket/chat
   - detalhe do ticket
   - user/meus chamados

4. `Context Accent`
   - `DTIC`: azul frio
   - `SIS manutencao`: ambar
   - `SIS conservacao`: memoria/patrimonio

## O que isso significa no codigo do hub

## Estado atual observado

Pontos-chave existentes:

- shell atual em [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- tokens/globals atuais em [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- temas de contexto em [themes.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\themes.json)
- entrada de novo chamado em [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx)
- chat DTIC em [DticAgentChatEntry.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx)
- cliente de conversa com Hermes em [agent-chat-service.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts)

### Movimento estrutural recomendado

O hub deve ganhar uma arquitetura visual explicita.

Proposta de pastas:

- `web/src/design-system/`
  - `tokens/`
  - `foundations/`
  - `archetypes/`
  - `content/`
- `web/src/components/system/`
  - `shell/`
  - `navigation/`
  - `feedback/`
  - `states/`
- `web/src/components/surfaces/`
  - `auth/`
  - `dashboard/`
  - `ticket-detail/`
  - `agent-chat/`
  - `forms/`

O que isso nao significa:

- nao significa mexer no contrato do backend;
- nao significa mexer no store de auth protegido;
- nao significa mexer em `httpClient`;
- nao significa redesenhar tudo de uma vez.

## O que efetivamente mudaria por camada

### Camada 1 - Foundations

Arquivos a criar ou consolidar:

- `web/src/design-system/tokens/color-tokens.css`
- `web/src/design-system/tokens/spacing-tokens.css`
- `web/src/design-system/tokens/type-tokens.css`
- `web/src/design-system/foundations/motion.ts`
- `web/src/design-system/foundations/radii.ts`
- `web/src/design-system/foundations/shadows.ts`

Impacto:

- reduzir valores hardcoded espalhados em `globals.css`, componentes e modulos;
- tornar os contextos cromaticos semanticos e menos ad-hoc;
- preparar reaproveitamento por outros produtos depois.

### Camada 2 - Shell

Arquivos principais a evoluir:

- [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [AppSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
- [UserProfileMenu.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx)

Movimento:

- separar o shell em subprimitivas;
- tirar responsabilidade visual demais de um componente unico;
- estabilizar header, navegação e contexto ativo.

Estrutura sugerida:

- `SystemShell`
- `SystemSidebar`
- `SystemTopbar`
- `ContextBadge`
- `AccountMenu`

### Camada 3 - Surface Archetypes

#### Auth

Arquivos afetados:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx)
- [selector/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx)

Objetivo:

- limpar o discurso institucional inflado;
- reforcar orientacao e contexto;
- criar uma entrada mais corporativa e menos experimental.

#### Dashboard

Arquivos afetados:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx)
- [kanban-board.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-board.tsx)
- [kanban-column.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-column.tsx)

Objetivo:

- aproximar o dashboard do padrao corporativo de leitura;
- melhorar hierarquia visual;
- separar melhor `headline`, `secondary stats`, `board`.

#### Agent Chat

Arquivos afetados:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx)
- [DticAgentChatEntry.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx)
- [agent-chat-service.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts)

Objetivo:

- fazer o chat parecer uma superficie premium de atendimento;
- reduzir ruido;
- deixar `estado`, `mensagens`, `draft` e `confirmacao` mais naturais;
- desacoplar o visual da estrutura atual do componente unico.

Estrutura sugerida:

- `AgentChatSurface`
- `AgentConversation`
- `AgentMessageBubble`
- `AgentComposer`
- `AgentStatusRail`
- `AgentDraftPanel`
- `AgentEmptyState`

#### Ticket Detail

Arquivos afetados:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\ticket\[id]\page.tsx)
- [TicketSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketSidebar.tsx)
- [TicketTimeline.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketTimeline.tsx)
- [TicketActions.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketActions.tsx)

Objetivo:

- melhorar a leitura do ticket;
- reforcar prioridade, estado, historico e acoes;
- alinhar com a familia de `dashboard` e `chat`.

#### Form Surface

Arquivos afetados:

- `wizard/`
- `dynamic-form/`
- `inputs/`

Objetivo:

- consolidar um padrao de formularios corporativos reutilizavel por `SIS` e por futuros modulos.

## O que isso implica tecnicamente

### 1. Menos css global solto, mais tokens semanticos

Implicacao:

- o `globals.css` deixa de ser o unico lugar de verdade visual;
- os componentes param de depender tanto de classes hardcoded repetidas.

### 2. Mais componentes de sistema

Implicacao:

- o hub ganha mais arquivos pequenos e menos componentes gigantes;
- melhora manutencao;
- melhora repeticao correta;
- reduz divergencia visual entre telas.

### 3. Mais separacao entre produto e integracao

Implicacao:

- `agent-chat-service.ts` continua como contrato de API;
- a UX do chat deixa de carregar tanta regra visual acoplada ao contrato;
- se o Hermes evoluir, o shell de atendimento aguenta melhor.

### 4. Introducao de governanca visual

Hoje o hub ainda nao tem uma stack madura de revisao visual igual a carregadores.

Implicacao:

- adicionar Storybook ou camada equivalente para superficies criticas;
- adicionar baselines visuais locais;
- validar estados de loading, erro, vazio, sucesso e drafts.

### 5. Um custo de refactor controlado

Essa priorizacao implica:

- tocar em componentes centrais do frontend;
- rever copy;
- criar componentes-base;
- mover responsabilidades entre arquivos.

Nao implica:

- reescrever backend;
- mudar contratos protegidos;
- parar os fluxos validos.

## O que fica intacto inicialmente

Nao devem ser alvo da primeira onda:

- [context-registry.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\context-registry.ts)
- [useAuthStore.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\store\useAuthStore.ts)
- [httpClient.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\httpClient.ts)
- [auth_service.py](C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\services\auth_service.py)
- [contexts.yaml](C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\core\contexts.yaml)

Regra:

- a primeira fase e visual, estrutural de frontend e de linguagem;
- nao de autenticacao ou contrato de backend.

## Prioridade recomendada dentro do hub

### Ordem 1 - Shell e Foundations

Primeiro mexer em:

- `globals`
- `shell`
- `sidebar`
- `topbar`
- `page containers`

Motivo:

- isso espalha valor para todas as telas;
- cria o "rosto" corporativo antes de redesenhar superficies especificas.

### Ordem 2 - Login e Selector

Motivo:

- sao a primeira experiencia do produto;
- hoje carregam muito da percepcao de clareza ou confusao.

### Ordem 3 - Agent Chat

Motivo:

- e a principal superficie estrategica do hub;
- o usuario percebe qualquer ruido ali imediatamente;
- precisa parecer atendimento premium e controlado.

### Ordem 4 - Dashboard

Motivo:

- e uma superficie importante, mas menos sensivel do que auth e chat para a experiencia atual.

### Ordem 5 - Ticket Detail e User

Motivo:

- entram depois que o shell e o sistema de leitura estiverem maduros.

## Roadmap recomendado para o hub

### Fase H1 - Foundations do Hub

Entregaveis:

- semantic tokens locais;
- guideline de tipografia;
- guideline de espacamento;
- guideline de cores por contexto;
- page container canonico;
- card canonico;
- alert/empty/loading canonicos.

Arquivos alvo:

- `globals.css`
- `themes.json`
- `components/system/*`

### Fase H2 - Shell corporativo

Entregaveis:

- nova `OperationalShell` modular;
- sidebar mais clara;
- topbar mais forte;
- contexto ativo mais elegante;
- navegacao com mais consistencia.

Arquivos alvo:

- `components/ui/OperationalShell.tsx`
- `components/ui/AppSidebar.tsx`
- `components/ui/UserProfileMenu.tsx`

### Fase H3 - Auth surfaces

Entregaveis:

- login institucional claro;
- selector objetivo;
- copy revisada;
- estados de erro mais humanos e mais operacionais.

Arquivos alvo:

- `app/page.tsx`
- `app/selector/page.tsx`

### Fase H4 - Agent Chat premium

Entregaveis:

- superficie de chat mais limpa;
- composicao por subcomponentes;
- melhor hierarquia entre conversa e resumo do chamado;
- estados de draft e confirmacao mais naturais;
- menos linguagem mecânica.

Arquivos alvo:

- `app/[context]/new-ticket/page.tsx`
- `modules/tickets/components/agent-chat/*`

### Fase H5 - Dashboard e Ticket Detail

Entregaveis:

- dashboards mais corporativos;
- detalhe do ticket com leitura mais forte;
- alinhamento visual entre board, chat e detalhe.

## O que eu faria na pratica, se a prioridade e o hub

### Sprint 1

- levantar inventario visual do hub
- congelar screenshots das telas-chave
- definir foundations locais
- modularizar shell

### Sprint 2

- redesenhar login
- redesenhar selector
- limpar copy
- estabilizar page containers

### Sprint 3

- refatorar `DTIC/new-ticket`
- transformar o chat em composicao premium
- alinhar `draft review`
- revisar estados de erro e loading

### Sprint 4

- alinhar dashboard
- alinhar ticket detail
- alinhar `user/meus chamados`

### Sprint 5

- consolidar docs
- consolidar baselines visuais
- preparar extracao das foundations para as outras apps

## Riscos reais

1. Fazer redesign sem foundations e criar mais divergencia.
2. Melhorar o chat sem corrigir linguagem operacional.
3. Criar novos componentes sem governanca visual.
4. Tocar contratos protegidos cedo demais.
5. Tentar levar o mesmo layout para todos os arquetipos.

## Criterios de aceite para a prioridade no hub

1. Login, selector e shell parecem partes do mesmo produto.
2. `DTIC/new-ticket` parece um atendimento premium do hub, nao uma ferramenta enxertada.
3. Dashboards e detalhe de ticket compartilham a mesma fundacao visual.
4. `DTIC` e `SIS` variam por contexto, nao por identidade quebrada.
5. O sistema visual do hub fica pronto para ser herdado pelos buscadores e dashboards.

## Sintese

Se a prioridade e o hub, a ideia correta nao e "mexer no chat primeiro".

A ideia correta e:

1. fundacao visual
2. shell
3. auth
4. chat
5. dashboards e detalhe

Esse caminho reduz risco, aumenta reaproveitamento e transforma o hub no primeiro produto realmente corporativo da Casa Civil RS.
