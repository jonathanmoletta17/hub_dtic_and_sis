# Casa Civil Frontend System v2 Blueprint

## Objetivo

Traduzir o estudo conceitual do `Frontend System v2` em um modelo operacional executavel.

Este documento responde:

- o que exatamente deve ser construído;
- quais artefatos cada fase precisa entregar;
- quais gates precisam fechar;
- como skills e fluxo se separam;
- como isso se aplica ao portfolio real.

## Regra de base

O sistema novo nao pode nascer como:

- redesign livre por tela;
- empilhamento de prompts inspiracionais;
- conjunto solto de componentes “bonitos”;
- tema visual sem contrato de estados;
- skill unica que tenta decidir tudo.

Ele precisa nascer como:

- fundacao semantica;
- workflow oficial;
- conjunto modular de skills;
- governanca de portfolio.

## O que e o Frontend System v2

O `Frontend System v2` e composto por 4 blocos.

## 1. Foundation

Responsabilidade:

- tokens
- themes
- modes
- status semantics
- typography scale
- spacing scale
- elevation
- focus
- border
- motion policy

Entrega:

- contrato de tokens
- contrato de themes
- primitives base

## 2. Surface Patterns

Responsabilidade:

- modelar familias de produto

Familias:

- `search`
- `analytics`
- `operations`
- `workspace-shell`

Entrega:

- padroes de layout por familia
- heuristicas de densidade
- regras de header/filter/action
- regras de empty/loading/error por familia

## 3. Validation Stack

Responsabilidade:

- provar qualidade

Camadas:

- Storybook
- component tests
- visual baselines
- runtime proof
- accessibility/content review

Entrega:

- suite de validacao por superficie
- baseline confiavel

## 4. Governance

Responsabilidade:

- decidir o que sobe para a fundacao
- impedir divergencia descontrolada entre apps

Entrega:

- criterio de decisao
- dossie de adocao
- registro de excecoes

## O que e skill e o que nao e

## Skill

Skill deve ser:

- onboarding especializado para uma tarefa recorrente;
- guardrail procedural;
- guia de ferramenta e processo;
- nao a propria politica inteira do sistema.

## Workflow

Workflow e:

- a ordem oficial do trabalho;
- os gates e evidencias;
- a trilha de desenvolvimento do inicio ao fim.

## System

System e:

- a fundacao semantica e operacional;
- os contratos que sobrevivem a cada tarefa;
- a gramatica comum do portfolio.

## Regra de arquitetura

- `System` define o que e verdadeiro;
- `Workflow` define como se trabalha;
- `Skill` ajuda um agente a executar um trecho do workflow sem desviar do system.

Sem essa separacao, a skill vira dumping ground de conhecimento.

## Arquitetura do fluxo oficial

## Fase 0 - Strategic framing

Perguntas:

- qual modulo estamos atacando?
- qual familia de produto ele pertence?
- o problema e de semantica, IA, visual, runtime ou portfolio?
- o objetivo e exploracao, consolidacao ou entrega?

Artefato:

- `surface-intent.md`

Gate:

- escopo e familia definidos

## Fase 1 - Discovery

Perguntas:

- quem usa?
- para que usa?
- o que precisa ver primeiro?
- o que precisa comparar?
- o que precisa decidir?
- quais estados reais existem?

Artefatos:

- `surface-brief.md`
- `state-inventory.md`
- `domain-glossary.md`

Gate:

- estados reais identificados

## Fase 2 - Information Architecture

Perguntas:

- qual e a unidade semantica da tela?
- o que e primario?
- o que e suporte?
- o que e redundante?
- qual e a carga cognitiva aceitavel?

Artefato:

- `ia-map.md`

Gate:

- hierarquia de informacao aprovada

## Fase 3 - Design System Mapping

Perguntas:

- quais papeis visuais existem?
- quais tokens faltam?
- o comportamento claro/escuro e simetrico ou de sistema proprio?
- quais primitives a tela deveria consumir?

Artefatos:

- `token-map.md`
- `surface-contract.md`
- `component-inventory.md`

Gate:

- nenhum componente depende de cor hardcoded por necessidade conceitual

## Fase 4 - Ideation

Perguntas:

- quais 2 ou 3 direcoes sao plausiveis?
- qual melhor equilibra funcao, identidade e complexidade?
- o que parece sofisticado sem parecer cenografico?

Artefatos:

- `direction-a.md`
- `direction-b.md`
- opcional `direction-c.md`
- `decision-note.md`

Gate:

- direcao escolhida por criterio, nao por impressao vaga

## Fase 5 - Story-first modeling

Perguntas:

- quais stories sao obrigatorias?
- quais estados precisam freeze de tempo?
- que fixtures impedem variacao aleatoria?

Artefatos:

- stories
- fixtures
- local visual baselines

Gate:

- cada superficie critica possui story correspondente

## Fase 6 - Implementation

Perguntas:

- o patch entra em foundation, family pattern ou surface?
- o acoplamento esta controlado?

Artefatos:

- codigo
- testes
- docs de mudanca quando necessario

Gate:

- diff coerente com a fase anterior

## Fase 7 - Validation

Gate minimo:

- lint
- build
- story tests
- visual tests
- runtime proof
- content/accessibility review proporcional ao impacto

## Fase 8 - Portfolio decision

Perguntas:

- isso sobe para fundacao?
- fica na familia?
- e excecao local?

Artefato:

- `governance-decision.md`

Gate:

- destino da mudanca explicitado

## Artefatos obrigatorios por tipo de trabalho

## Nova superficie importante

Obrigatorio:

- `surface-brief`
- `state-inventory`
- `ia-map`
- `token-map`
- stories
- visual baseline
- runtime proof

## Refactor visual relevante

Obrigatorio:

- diagnostico
- state delta
- stories ajustadas
- baseline atualizada
- runtime proof

## Evolucao de design system

Obrigatorio:

- proposta de token/primitives
- impacto em familias
- plano de migracao
- prova em pelo menos uma superficie real

## Modelo de skillset v2

## Skill 1 - Discovery

Nome sugerido:

- `casa-civil-frontend-discovery`

Responsabilidade:

- leitura do repo
- leitura de docs
- levantamento de superficies
- state inventory
- glossario de dominio

Nao faz:

- design system
- implementacao

## Skill 2 - Foundation

Nome sugerido:

- `casa-civil-design-system-foundation`

Responsabilidade:

- tokens
- themes
- primitives
- light/dark strategy

Nao faz:

- decidir IA por tela

## Skill 3 - Surface Ideation

Nome sugerido:

- `casa-civil-surface-ideation`

Responsabilidade:

- explorar direcoes visuais com criterio

Nao faz:

- codificacao direta sem direcao definida

## Skill 4 - Storybook Modeling

Nome sugerido:

- `casa-civil-storybook-modeling`

Responsabilidade:

- surface to story
- fixtures
- state freeze

## Skill 5 - Visual Gates

Nome sugerido:

- `casa-civil-visual-gates`

Responsabilidade:

- story tests
- visual baselines
- diffs

## Skill 6 - Runtime Proof

Nome sugerido:

- `casa-civil-runtime-proof`

Responsabilidade:

- identificar runtime real
- rebuildar
- validar URL canonica

## Skill 7 - Content and Accessibility

Nome sugerido:

- `casa-civil-content-and-accessibility`

Responsabilidade:

- microcopy
- linguagem operacional
- contraste
- foco
- leitura de erro/vazio/loading

## Skill 8 - Portfolio Governance

Nome sugerido:

- `casa-civil-portfolio-governance`

Responsabilidade:

- decidir fundacao vs familia vs excecao

## O que faz uma skill ser boa aqui

Seguindo o racional de `skill-creator`:

- curta no corpo principal;
- acoplada a workflow real;
- com referencias carregadas sob demanda;
- com scripts quando houver repeticao;
- sem tentar carregar toda a doutrina do sistema em um unico arquivo.

## O que deve existir fora das skills

- documento mestre do Frontend System v2
- contrato de tokens
- contrato de familias
- protocolo de validacao
- dossie de portfolio

Esses itens sao permanentes demais para viver apenas dentro de skills.

## Modelo de repositorio para o futuro

Cada app deveria convergir para algo assim:

- `docs/system/`
  - `surface-briefs/`
  - `ia/`
  - `tokens/`
  - `governance/`
- `src/design-system/`
  - `tokens/`
  - `themes/`
  - `primitives/`
  - `patterns/`
- `src/features/...`
- `stories/` ou stories junto dos componentes
- `e2e/visual/`

## Riscos se pularem etapas

Se pular discovery:

- tela bonita, mas semanticamente errada

Se pular IA:

- excesso de cards, contadores redundantes e poluicao

Se pular tokens:

- claro/escuro quebrado
- divergencia entre apps

Se pular stories:

- regressao visual silenciosa

Se pular runtime proof:

- falso verde local

Se pular governance:

- o portfolio volta a bifurcar em poucos ciclos

## Aplicacao ao portfolio atual

### Buscadores

Melhor ponto de partida para:

- `search` family
- shell de busca
- estrategia de contexto visual

### Dashboards

Melhor ponto de partida para:

- foundation tokens
- light/dark strategy
- analytics family

### Carregadores

Melhor ponto de partida para:

- operations family
- state semantics
- action-first patterns

### Hub

Melhor ponto de partida para:

- workspace shell
- fluxo de validacao
- documentacao operacional

## Decisao final deste blueprint

O `Frontend System v2` deve nascer nesta ordem:

1. documento mestre do sistema
2. contrato de fundacao
3. contrato das familias
4. protocolo de validacao
5. skillset modular
6. piloto real em uma familia
7. rollout para o portfolio

Nao o contrario.

Se a skill nascer antes do sistema, ela vai carregar remendos.

Se o sistema nascer antes do workflow, ele nao sera usado.

Se o workflow nascer sem governance, o portfolio volta a divergir.
