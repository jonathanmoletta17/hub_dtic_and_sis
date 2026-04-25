# Casa Civil Frontend System v2

## Objetivo

Estabelecer o sistema oficial de construcao frontend para o ecossistema Casa Civil RS.

Este documento e o ponto de verdade principal.

Ele define:

- principios
- fundacao
- familias de produto
- workflow oficial
- governanca
- direcao de rollout

Os documentos abaixo passam a ser suporte:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\casa-civil-visual-system-portfolio-study-v1.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\casa-civil-frontend-system-v2-study.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\casa-civil-frontend-system-v2-blueprint.md`

## Decisao de base

O ecossistema Casa Civil nao vai consolidar o frontend atual como padrao final.

O objetivo e construir um sistema novo, profissional, que torne qualidade visual, semantica, validacao e runtime comportamentos previsiveis do processo.

## O problema que este sistema resolve

Sem sistema, o frontend tende a cair em:

- vibecoding
- decisao por gosto
- remendo por tela
- claro/escuro inconsistente
- regressao silenciosa
- padroes diferentes entre apps
- dependencia de uma boa rodada individual

O `Frontend System v2` existe para substituir isso por:

- semantica
- repetibilidade
- prova
- governanca

## Principios

## 1. Servico antes de cenografia

A tela deve servir a tarefa, nao competir com ela.

## 2. Semantica antes de cor

Status, superficies e estados sao definidos por papel visual e operacional, nao por cor escolhida localmente.

## 3. Sistema antes de tela

Tokens, primitives e familias precisam vir antes da proliferacao de componentes soltos.

## 4. Estado antes de variacao visual

Toda superficie importante precisa nascer com inventario de estados reais.

## 5. Story antes de runtime

A unidade de construcao e validacao visual e a superficie modelada em stories, nao a pagina final.

## 6. Runtime proof antes de aceite

Build local nao fecha mudanca. O runtime canonico precisa provar a alteracao.

## 7. Portfolio antes de excecao local

Toda evolucao deve responder se entra em fundacao, familia ou excecao.

## Escopo do sistema

Este sistema cobre:

- buscadores
- dashboards
- hub
- gestao de carregadores
- futuras aplicacoes web internas da Casa Civil

Nao cobre, por si so:

- regras de negocio
- backend
- auth
- contratos de API

## Estrutura do sistema

O `Frontend System v2` possui 4 camadas.

## 1. Foundation

Define:

- design tokens
- themes
- light/dark modes
- tipografia
- espacamento
- bordas
- elevacao
- motion policy
- focus states
- status semantics

Saida:

- contrato de fundacao

## 2. Product Families

Define padroes por familia de superficie.

Familias atuais:

- `workspace-shell`
- `search`
- `analytics`
- `operations`

Saida:

- contratos de familia

## 3. Validation Stack

Define como a qualidade e provada.

Camadas:

- stories
- testes de componente
- baseline visual
- runtime proof
- revisao de copy e acessibilidade

Saida:

- protocolo de validacao

## 4. Governance

Define como o portfolio evolui sem divergir.

Decisoes:

- o que sobe para fundacao
- o que fica em familia
- o que e excecao local

Saida:

- dossie de governanca

## Fundacao obrigatoria

Toda aplicacao nova ou refactor estrutural deve convergir para tokens semanticos equivalentes a:

- `surface.app`
- `surface.shell`
- `surface.panel`
- `surface.panel-strong`
- `surface.card`
- `surface.input`
- `surface.overlay`
- `border.subtle`
- `border.default`
- `border.strong`
- `text.primary`
- `text.secondary`
- `text.muted`
- `text.inverse`
- `accent.brand`
- `accent.brand-soft`
- `accent.context`
- `status.new`
- `status.progress`
- `status.pending`
- `status.resolved`
- `status.closed`
- `status.planned`
- `shadow.panel`
- `shadow.card`
- `focus.ring`

Regra:

- componentes nao podem conhecer `white`, `black`, `slate-*`, `gray-*` ou hex local como contrato principal.

## Familias oficiais

## `workspace-shell`

Usos:

- login
- selector
- hub
- shells institucionais

Caracteristicas:

- identidade institucional
- navegacao
- contexto
- baixa poluicao

## `search`

Usos:

- buscadores

Caracteristicas:

- busca como acao central
- refinamento progressivo
- atmosfera controlada
- resultados legiveis

## `analytics`

Usos:

- dashboards

Caracteristicas:

- leitura de parede
- comparacao rapida
- fullscreen
- densidade controlada
- estabilidade

## `operations`

Usos:

- gestao de carregadores
- futuras telas operacionais com filas, reservas, alocacoes e estados ativos

Caracteristicas:

- acao imediata
- semantica operacional forte
- estados visiveis
- leitura de fila e coluna

## Workflow oficial

Toda mudanca relevante deve seguir esta ordem:

1. strategic framing
2. discovery
3. information architecture
4. design system mapping
5. ideation
6. story-first modeling
7. implementation
8. validation
9. portfolio decision

## Artefatos obrigatorios

Para nova superficie importante:

- `surface-intent`
- `surface-brief`
- `state-inventory`
- `domain-glossary`
- `ia-map`
- `token-map`
- `surface-contract`
- stories
- baseline visual
- runtime proof
- `governance-decision`

Para refactor visual relevante:

- diagnostico
- delta de estados
- stories atualizadas
- baseline atualizada
- runtime proof

## Gates minimos

Nenhuma superficie importante fecha sem:

- state inventory
- story correspondente
- baseline visual
- build valido
- runtime proof

Se houver impacto em linguagem, estado ou contraste:

- revisao de content/accessibility tambem e obrigatoria

## Regras de qualidade

## O que e proibido como caminho oficial

- ferramenta experimental no caminho principal
- dependencias que so funcionam com workaround
- refactor visual sem story
- aceite visual sem runtime proof
- light mode por inversao crua
- componente preso a hardcoded colors

## O que e obrigatorio

- design tokens semanticos
- stories reais de estado
- evidencias
- governanca de portfolio

## Skillset oficial do sistema

O sistema usara um conjunto modular de skills, nao uma skill unica.

Skills-alvo:

- `casa-civil-frontend-discovery`
- `casa-civil-design-system-foundation`
- `casa-civil-surface-ideation`
- `casa-civil-storybook-modeling`
- `casa-civil-visual-gates`
- `casa-civil-runtime-proof`
- `casa-civil-content-and-accessibility`
- `casa-civil-portfolio-governance`

Regra:

- skill executa trecho recorrente;
- workflow dita a ordem;
- system dita a verdade.

## Estrategia de rollout

## Etapa 1

Fechar os documentos canônicos do sistema.

## Etapa 2

Formalizar:

- contrato de fundacao
- contrato das familias
- protocolo de validacao

## Etapa 3

Criar o skillset modular.

## Etapa 4

Rodar um piloto real por familia.

Ordem sugerida:

1. `workspace-shell` no hub
2. `search` nos buscadores
3. `analytics` nos dashboards
4. `operations` em carregadores

## Etapa 5

Levar o sistema ao portfolio completo.

## Papel do que ja existe

O estado atual do portfolio nao e o sistema final.

Ele serve como laboratorio de evidencia.

Melhores pontos de partida:

- buscadores para `search`
- dashboards para `analytics` e tokens
- carregadores para `operations`
- hub para `workspace-shell` e fluxo de validacao

## Definicao de pronto do sistema

O `Frontend System v2` so pode ser considerado estabelecido quando existir:

1. documento mestre
2. contrato de fundacao
3. contratos de familia
4. protocolo de validacao
5. skillset modular
6. pelo menos um piloto real por familia
7. dossie de governanca do portfolio

## Veredito

O caminho correto nao e melhorar o frontend atual ate ele “parecer profissional”.

O caminho correto e construir um sistema profissional que torne:

- qualidade visual
- semantica
- consistencia
- validacao
- runtime

propriedades normais do trabalho.
