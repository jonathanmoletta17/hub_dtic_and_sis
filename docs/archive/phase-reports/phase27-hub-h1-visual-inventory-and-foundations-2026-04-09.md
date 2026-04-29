# Phase 27 - Hub H1 Visual Inventory And Foundations - 2026-04-09

## Objetivo

Consolidar o inventario visual canonico do `hub-operacional-web` e definir as foundations locais que devem sustentar a primeira onda de consolidacao corporativa.

Esta fase nao implementa redesign. Ela identifica:

- o que o hub e hoje;
- o que cada superficie comunica;
- onde estao as incoerencias;
- quais foundations devem nascer primeiro;
- quais arquivos serao tocados na primeira onda.

## Escopo desta fase

Superficies analisadas:

- login
- selector
- shell/navegacao
- dashboard
- `DTIC/new-ticket`
- `user`
- `ticket detail`

Primitives analisadas:

- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [GlassCard](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\glass-card.tsx)
- [PremiumButton](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-button.tsx)
- [PremiumInput](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-input.tsx)
- [AppSidebar](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
- [OperationalShell](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [themes.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\themes.json)

## Leitura do hub atual

## 1. Login

Arquivo:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx)

### O que ele comunica bem

- identidade de produto centralizada;
- brasao e contexto institucional presentes;
- acesso unificado `DTIC/SIS`;
- sensacao de entrada importante.

### O que ele comunica mal

- teatralidade demais para uma tela de autenticacao;
- excesso de linhas decorativas, blur orbs, footer tecnico e detalhamento de bastidor;
- forte cheiro de landing page e nao de autenticacao corporativa;
- copy ainda puxa mais "narrativa visual" do que clareza operacional.

### Diagnostico

O login hoje e visualmente forte, mas nao e suficientemente institucional nem suficientemente funcional. Ele esta mais perto de uma tela de showcase do que de uma entrada de produto corporativo.

## 2. Selector

Arquivo:

- [selector/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx)

### O que ele comunica bem

- separacao entre ambientes;
- identidade por contexto;
- uso coerente de `GlassCard`;
- noção de escolha de ambiente.

### O que ele comunica mal

- existe decoracao demais para uma decisao simples;
- cabe muito texto em torno de uma acao objetiva;
- `Visao do portal`, `Voltar ao acesso`, `Ambiente monitorado`, `Usuario de rede` e labels longas competem entre si;
- a superficie ainda parece transitoria, nao um selector maduro do produto.

### Diagnostico

O selector precisa virar uma superficie de decisao rapida, nao uma vitrine.

## 3. Shell e navegacao

Arquivos:

- [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [AppSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
- [context-registry.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\context-registry.ts)

### O que ele comunica bem

- existe um shell persistente;
- a navegacao respeita contexto e papel;
- o produto ja tem uma espinha dorsal.

### O que ele comunica mal

- responsabilidades visuais e de navegacao estao concentradas demais em poucos componentes;
- a sidebar mistura marca institucional, area, modulo e usuario num bloco denso;
- a topbar mobile e correta, mas ainda nao virou um padrao claro de produto;
- falta uma anatomia visual de `shell corporativo` propriamente dita.

### Diagnostico

O shell existe, mas ainda nao esta formalizado como sistema. Ele funciona mais como componente do que como arquitetura visual.

## 4. Dashboard

Arquivo:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx)

### O que ele comunica bem

- foco em operacao;
- leitura rapida;
- separacao header / KPIs / board;
- densidade razoavel.

### O que ele comunica mal

- muito utilitario solto;
- os cards, filtros e header ainda nao parecem parte de um sistema maior;
- o dashboard parece funcional, mas ainda nao parece "o dashboard corporativo da Casa Civil".

### Diagnostico

O dashboard esta mais maduro como layout do que como linguagem de sistema.

## 5. New Ticket / Agent Chat

Arquivos:

- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx)
- [DticAgentChatEntry.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx)
- [agent-chat-service.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts)

### O que ele comunica bem

- a conversa esta no hub;
- ja existe a direcao correta de produto;
- o chat nao depende mais de popup como experiencia principal;
- ha status, draft e submissao dentro da mesma superficie.

### O que ele comunica mal

- um unico componente concentra muita responsabilidade visual e comportamental;
- ainda ha muito "produto em transicao" na composicao;
- o painel lateral aparece mais como acessorio do que como parte natural da conversa;
- a experiencia ainda oscila entre minimalismo e excesso de chrome.

### Diagnostico

O chat esta na direcao certa, mas ainda nao e uma `surface archetype`. Hoje ele e uma implementacao concreta com carga demais no componente raiz.

## 6. User / Meus Chamados

Arquivo:

- [user/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx)

### O que ele comunica bem

- utilidade;
- filtros reais;
- busca local;
- densidade operacional boa.

### O que ele comunica mal

- visualmente ele esta mais seco e mais cru do que login, selector e chat;
- o hub muda muito de "tom visual" quando entra nessa tela;
- falta um padrao claro de listas operacionais.

### Diagnostico

A tela e funcional, mas subdesenvolvida visualmente em relacao a outras superficies do hub.

## 7. Ticket Detail

Arquivo:

- [ticket/[id]/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\ticket\[id]\page.tsx)

### O que ele comunica bem

- a estrutura funcional esta correta;
- sidebar + timeline + attachments + composer faz sentido;
- a leitura operacional existe.

### O que ele comunica mal

- falta hierarquia visual mais forte;
- a pagina conversa pouco com o resto do hub em termos de acabamento;
- o composer inferior e util, mas ainda parece um bloco acoplado.

### Diagnostico

O detalhe do ticket ja tem arquitetura funcional. O que falta e elevar a composicao ao nivel do shell e do chat.

## Diagnostico consolidado do hub

1. O hub nao sofre por falta de interface; sofre por excesso de linguagens dentro da mesma app.
2. Auth e selector estao visualmente intensos demais.
3. `user` e `ticket detail` estao visivelmente mais secos do que auth e chat.
4. O shell e bom o bastante para servir de base, mas ainda nao e uma plataforma de design.
5. O chat e a superficie estrategica, mas ele ainda nao pode ser a origem das foundations.

## Foundations recomendadas para o hub

## 1. Tipografia

### Proposta

- `Display`: `Space Grotesk`
- `UI/Body`: `Inter`
- `Mono/Operational`: `IBM Plex Mono`

### Justificativa

- `Space Grotesk` ja funciona muito bem na familia de dashboards;
- `Inter` ja conversa com a familia do hub e com UX de produto;
- `IBM Plex Mono` tem leitura operacional mais institucional do que o mono atual espalhado.

### Aplicacao

- headlines de pagina: `Display`
- labels, inputs, textos correntes: `Inter`
- ids, ticket numbers, estados tecnicos e microdados: `IBM Plex Mono`

## 2. Cor

### Estrutura recomendada

#### Base neutra do produto

- `surface.base`
- `surface.shell`
- `surface.panel`
- `surface.elevated`
- `surface.input`

#### Texto

- `text.primary`
- `text.secondary`
- `text.tertiary`
- `text.inverse`

#### Identidade institucional

Usar com parcimonia:

- verde institucional RS
- vermelho institucional RS
- amarelo institucional RS

Essas cores nao devem virar a base da interface operacional. Devem aparecer como:

- assinatura;
- detalhe institucional;
- assets de marca;
- raros momentos de chancela.

#### Acentos operacionais por contexto

- `DTIC`: azul frio
- `SIS manutencao`: ambar
- `SIS conservacao/memoria`: violeta patrimonial controlado

### Regra

A marca institucional entra como credibilidade. O contexto operacional entra como usabilidade.

## 3. Espacamento

### Escala recomendada

- `space.2`
- `space.3`
- `space.4`
- `space.6`
- `space.8`
- `space.10`
- `space.12`

### Regra

O hub deve reduzir a quantidade de espacamentos improvisados e estabilizar:

- header spacing
- card padding
- gaps entre secoes
- gaps de filtros
- rhythm de formularios

## 4. Raios e profundidade

### Proposta

- `radius.sm` para chips e badges
- `radius.md` para inputs
- `radius.lg` para cards de operacao
- `radius.xl` para superficies premium

### Sombra

- sombra curta para cards comuns
- sombra media para paineis
- sombra forte apenas para modais e chat containers

## 5. Motion

### Regra

Motion deve comunicar estado, nao enfeite.

Prioridades:

- transicao de rota/surface
- aparicao de feedback
- entrada de mensagens no chat
- mudanca de draft/status

Reduzir:

- brilhos decorativos demais;
- halos sem funcao;
- excesso de blur competitivo.

## 6. Componentes-base do hub

### Primitives a consolidar

Hoje o hub ja tem:

- [GlassCard](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\glass-card.tsx)
- [PremiumButton](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-button.tsx)
- [PremiumInput](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-input.tsx)

Problema:

- essas primitives ainda carregam linguagem demais no nome e no estilo;
- elas ainda nao sao foundations de sistema, sao componentes "premium" de uma fase visual anterior.

### Evolucao recomendada

Criar versoes de sistema:

- `SystemCard`
- `SystemButton`
- `SystemInput`
- `SystemBadge`
- `SystemPanel`
- `SystemEmptyState`
- `SystemInlineStatus`

As primitives antigas podem permanecer como ponte de migracao.

## Shell-alvo do hub

## Anatomia recomendada

### Sidebar

Deve conter:

- assinatura curta institucional;
- area/modulo atual;
- navegacao principal;
- conta do usuario.

Nao deve conter:

- textos longos;
- subtitulo institucional gigante;
- excesso de descricao fixa.

### Topbar

Deve conter:

- titulo da superficie;
- subtitulo curto contextual;
- acoes primarias da pagina;
- estado secundario de refresh ou sync.

### Page Container

Cada pagina do hub deve cair em um container unico de sistema:

- largura maxima clara;
- padding consistente;
- comportamento mobile previsivel;
- rhythm comum.

## Mapa de codigo recomendado para a Fase H1

### Novas areas

- `web/src/design-system/tokens/`
- `web/src/design-system/foundations/`
- `web/src/components/system/`
- `web/src/components/surfaces/`

### Componentes a nascer primeiro

- `SystemPage`
- `SystemSection`
- `SystemCard`
- `SystemHeader`
- `SystemTopbar`
- `SystemBadge`
- `SystemInlineStatus`
- `SystemEmptyState`

### Arquivos que devem ser evoluidos na primeira onda

- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [AppSidebar.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx)
- [page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx)
- [selector/page.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx)

## O que isso implica

### Implicacao positiva

- o hub deixa de depender de "estilo de tela";
- passa a depender de foundations e arquetipos;
- auth, dashboard, chat e ticket detail ficam mais proximos como familia;
- o produto vira referencia para as demais apps.

### Implicacao de manutencao

- mais arquivos pequenos;
- menos componentes gigantes;
- mais previsibilidade de reuse;
- mais facilidade para testes visuais futuros.

### Implicacao de migracao

- nao sera um PR unico;
- a migracao correta e por ondas;
- algumas primitives antigas coexistirao com o novo sistema por um periodo.

## Ordem executiva recomendada

### H1.1 - Foundations do hub

- tipografia
- semantic tokens
- page container
- system card/button/input/badge

### H1.2 - Shell corporativo

- sidebar
- topbar
- user menu
- context badge

### H1.3 - Auth surfaces

- login
- selector

### H1.4 - Chat surface

- dividir o componente unico;
- transformar a conversa em surface canonica do produto.

## Criterios de aceite da Fase H1

1. O hub passa a ter foundations explicitas.
2. Login e selector param de parecer uma "fase visual separada".
3. O shell fica pronto para sustentar as demais superficies.
4. O chat pode ser refatorado depois sem rediscutir foundations.

## Sintese

A prioridade correta no hub nao e "desenhar telas melhores". E criar uma fundacao de sistema que explique por que as telas devem parecer parentes.

Se a H1 for feita direito:

- o hub ganha identidade corporativa real;
- o chat melhora com menos risco;
- dashboards e buscadores passam a ter uma base clara para convergir depois.
