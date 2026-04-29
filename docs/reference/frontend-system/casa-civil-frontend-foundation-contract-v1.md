# Casa Civil Frontend Foundation Contract v1

## Objetivo

Definir a fundacao visual e semantica compartilhada do `Casa Civil Frontend System v2`.

Este contrato responde:

- quais tokens sao obrigatorios;
- como themes e modos devem funcionar;
- quais primitives todo app deve compartilhar;
- quais regras de light/dark sao nao negociaveis;
- quais antipadroes devem ser proibidos na base.

Este documento nao define layout por familia de produto.

Ele define a infraestrutura visual comum.

## Papel deste contrato

No sistema:

- [casa-civil-frontend-system-v2.md](casa-civil-frontend-system-v2.md) define a verdade principal;
- este documento define a fundacao tecnica e semantica reutilizavel;
- os contratos de familia viram depois.

## Fundacao significa

Tudo o que deve permanecer coerente entre:

- hub
- buscadores
- dashboards
- carregadores
- futuras apps internas

Mesmo quando a composicao visual final for diferente.

## Regras de base

## 1. Token sempre representa papel

Tokens nao representam “cor bonita”.

Tokens representam:

- superficie
- borda
- texto
- acento
- status
- sombra
- foco
- motion

## 2. Token de componente nao substitui token de sistema

Hierarquia obrigatoria:

1. foundation token
2. semantic alias
3. component token

Exemplo correto:

- `surface.panel`
- `alias.panel.default`
- `card.background`

Exemplo errado:

- criar `ticket-card-blue-dark-2` como base sem token semantico por tras

## 3. Claro e escuro sao modos do sistema

Light mode e dark mode sao dois mapas do mesmo sistema.

Nao sao:

- inversao automatica
- hacks por utilitario
- overrides locais sem contrato

## 4. Hardcoded color nao e contrato

Hex, `slate-*`, `gray-*`, `bg-black`, `text-white`, `rgba(...)` e similares podem existir:

- em laboratorio
- em migracao controlada
- em excepcao explicitamente documentada

Nao podem definir o caminho oficial.

## 5. Contexto nao muda semantica

`DTIC`, `Manutencao`, `Conservacao` e outros contextos podem mudar acento e atmosfera.

Nao podem mudar:

- semantica de status
- escala de tipografia
- espaco
- foco
- comportamento de estados

## Taxonomia oficial de tokens

## Superficies

- `surface.app`
- `surface.app-atmosphere-a`
- `surface.app-atmosphere-b`
- `surface.shell`
- `surface.panel`
- `surface.panel-strong`
- `surface.panel-muted`
- `surface.card`
- `surface.card-hover`
- `surface.card-emphasis`
- `surface.input`
- `surface.input-hover`
- `surface.input-focus`
- `surface.overlay`
- `surface.track`
- `surface.empty`

## Bordas

- `border.subtle`
- `border.default`
- `border.strong`
- `border.focus`

## Texto

- `text.primary`
- `text.secondary`
- `text.muted`
- `text.inverse`
- `text.on-accent`
- `text.on-danger`
- `text.on-success`
- `text.on-warning`

## Marca e contexto

- `accent.brand`
- `accent.brand-soft`
- `accent.context`
- `accent.context-soft`

## Status

- `status.new`
- `status.progress`
- `status.pending`
- `status.resolved`
- `status.closed`
- `status.planned`

Soft variants obrigatorias:

- `status.new.soft`
- `status.progress.soft`
- `status.pending.soft`
- `status.resolved.soft`
- `status.closed.soft`
- `status.planned.soft`

## Sombras e elevacao

- `shadow.panel`
- `shadow.panel-soft`
- `shadow.card`
- `shadow.overlay`

## Foco

- `focus.ring`
- `focus.offset`

## Motion

- `motion.fast`
- `motion.default`
- `motion.slow`
- `motion.emphasis`

## Escalas obrigatorias

## Tipografia

Obrigatorio definir:

- display
- heading
- title
- body
- caption
- mono

Regras:

- tipografia institucional e operacional deve ser consistente;
- texto secundario continua legivel;
- texto muted nunca pode ser decorativo ao ponto de sumir;
- labels pequenas precisam ser pensadas para light mode, nao herdadas do dark.

## Espacamento

Obrigatorio definir uma escala unica.

Exemplo de referencia:

- `space.1`
- `space.2`
- `space.3`
- `space.4`
- `space.6`
- `space.8`
- `space.12`
- `space.16`
- `space.24`

Regra:

- espaco nao pode ser decidido por numero arbitrario em cada componente.

## Radius

Obrigatorio definir pelo menos:

- `radius.sm`
- `radius.md`
- `radius.lg`
- `radius.xl`
- `radius.pill`

## Border width

Obrigatorio definir:

- `stroke.hairline`
- `stroke.default`
- `stroke.strong`

## Modes

## Dark mode

O modo escuro e o baseline mais forte hoje no portfolio.

Deve manter:

- contraste alto
- profundidade controlada
- leitura de parede quando necessario
- atmosfera institucional, nao neon gamer

## Light mode

Deve ser sistema proprio.

Regras:

- fundo off-white ou frio claro, nao branco puro em tela cheia;
- borda mais presente do que no dark;
- sombra mais curta e limpa;
- acento mais contido;
- texto primario escuro e firme;
- metadata ainda legivel.

## Relação entre modos

O componente nao conhece `dark`.

O componente consome tokens.

Os modos apenas remapeiam os tokens.

## Context themes

Cada contexto pode ter um acento proprio.

Exemplos atuais reaproveitaveis:

- azul para `DTIC`
- laranja/ambar para `Manutencao`
- violeta/cobre para `Conservacao`

Regra:

- contexto altera `accent.context`;
- contexto nao redefine status.

## Primitives obrigatorias

Toda familia deve consumir equivalents funcionais para:

- `AppShell`
- `Sidebar`
- `Topbar`
- `SectionHeader`
- `SurfaceCard`
- `StatCard`
- `StatusBadge`
- `CategoryBadge`
- `FilterBar`
- `InputField`
- `PrimaryButton`
- `SecondaryButton`
- `EmptyState`
- `ModalShell`

Cada primitive deve nascer com:

- idle
- hover
- focus
- disabled
- dark/light

Quando aplicavel:

- loading
- error
- active
- selected

## Contrato de states visuais

Toda primitive relevante deve prever:

- `idle`
- `hover`
- `focus`
- `active`
- `selected`
- `disabled`
- `loading`
- `empty`
- `error`

Nem toda primitive usara todos, mas o contrato precisa existir.

## Regras de acessibilidade incorporadas

## Contraste

- texto primario e secundario precisam ser legiveis no modo claro e escuro;
- status color nao pode ser o unico diferenciador;
- badge e chip precisam ter foreground, background e, quando necessario, borda.

## Foco

- todo elemento interativo precisa de foco visivel;
- foco nao pode depender so de mudança minima de sombra.

## Estado

- loading nao pode ser substituido por estado vazio;
- erro nao pode parecer informacao neutra;
- disabled nao pode parecer quebrado.

## Copy minima

- helper text deve orientar;
- erro deve explicar;
- empty state deve ser semantico;
- microcopy nao pode competir com a acao principal.

## Antipadroes proibidos

- `text-white`, `bg-black`, `bg-[#...]`, `text-gray-*`, `text-slate-*` como contrato principal
- componente que conhece modo diretamente para definir cor
- token com nome de cor no contrato oficial
- claro por inversao automatica do dark
- glass reaproveitado sem recalibracao para qualquer familia
- status sem variante soft
- badge sem borda quando ela for necessaria para contraste
- motion generica com `transition-all` como estrategia base

## Modelo de implementacao recomendado

Cada app deveria convergir para:

- `src/design-system/tokens/`
- `src/design-system/themes/`
- `src/design-system/primitives/`
- `src/design-system/patterns/`

Estrutura minima:

- `tokens.foundation`
- `tokens.alias`
- `themes.dark`
- `themes.light`
- `themes.contexts`

## Critério de adocao no portfolio

Um app so pode ser considerado convergindo para esta fundacao quando:

- seus componentes principais consomem tokens semanticos;
- light e dark sao mapeados por theme, nao por hack;
- primitives principais existem ou equivalentes claros existem;
- estados basicos sao cobertos em story ou doc equivalente;
- hardcoded colors residuais estao em lista de migracao, nao espalhados sem controle.

## Relacao com o portfolio atual

Base mais madura para inspirar este contrato:

- dashboards para tokens e light/dark strategy

Base mais madura para shell e atmosfera:

- buscadores

Base mais madura para semantica operacional:

- carregadores

Base mais madura para fluxo de validacao:

- hub + docs de workflow e review visual

## Proximo desdobramento

Depois deste contrato, o sistema precisa fechar:

1. contrato das familias
2. protocolo de validacao
3. skillset modular

Sem esses tres, a fundacao fica correta no papel e fraca na execucao.
