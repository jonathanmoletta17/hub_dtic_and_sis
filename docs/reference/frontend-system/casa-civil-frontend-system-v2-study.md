# Casa Civil Frontend System v2 Study

## Objetivo

Definir um modelo novo de construcao frontend para o ecossistema Casa Civil RS.

Este estudo parte de uma decisao explicita:

- nao consolidar o frontend atual como padrao final;
- nao profissionalizar o vibecoding por maquiagem;
- construir um metodo novo, com skillset, fluxo e criterios de qualidade de nivel profissional.

## Problema que precisa ser resolvido

O problema central hoje nao e falta de tema, componente ou screenshot.

O problema e de processo.

Quando a equipe pula:

- descoberta de contexto
- arquitetura de informacao
- design tokens
- states model
- stories reais
- baseline visual
- runtime proof

o resultado tende a ser:

- tela bonita em um momento e fraca no seguinte;
- inconsistencias entre apps;
- claro e escuro divergindo;
- regressao por acoplamento visual;
- retrabalho alto;
- dependencia de intuicao individual.

## Evidencia local

### Portifolio atual

Estudo consolidado anteriormente em:

- `../../archive/side-studies/casa-civil-visual-system-portfolio-study-v1.md`

Conclusoes reaproveitadas:

- os buscadores ja formam uma familia;
- os dashboards ja formam outra familia;
- carregadores tem a melhor semantica operacional, mas a base de tema menos governada.

Ou seja:

- ja existe sinal de sistema;
- mas ainda nao existe um modelo de construcao frontend profissional compartilhado.

## Referencias qualificadas

## 1. Storybook

Fonte:

- [How to test UIs with Storybook](https://storybook.js.org/docs/writing-tests)
- [Component tests](https://storybook.js.org/docs/8/writing-tests/component-testing)
- [Visual tests](https://storybook.js.org/docs/writing-tests/visual-testing/)

Leituras-chave:

- stories sao casos de teste da UI em seus estados reais;
- o fluxo correto e desenvolver e testar a UI ao mesmo tempo;
- testes de componente e testes visuais se complementam.

Implicacao para a Casa Civil:

- nenhum frontend serio deve nascer apenas da pagina final;
- a unidade de construcao precisa ser a superficie em story, nao o app inteiro.

## 2. Playwright

Fonte:

- [Visual comparisons](https://playwright.dev/docs/next/test-snapshots)

Leituras-chave:

- baseline visual depende de ambiente consistente;
- screenshot de referencia e parte do contrato de qualidade;
- comparacao visual e nativa ao runner.

Implicacao:

- runtime visual precisa ser provado em ambiente padronizado;
- nao basta “olhar no navegador”.

## 3. Design Tokens Community Group

Fonte:

- [Design Tokens Format Module](https://www.designtokens.org/tr/drafts/format/)

Leituras-chave:

- tokens sao um formato de intercambio e governanca, nao so um arquivo CSS;
- nomes e propriedades devem ser estaveis e semanticos;
- o valor tecnico do token esta na interoperabilidade entre ferramentas.

Implicacao:

- a Casa Civil precisa tratar tokens como contrato do sistema, nao como variaveis dispersas.

## 4. Figma Variables e Dev Mode

Fontes:

- [Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Variables in Dev Mode](https://help.figma.com/hc/en-us/articles/27882809912471-Variables-in-Dev-Mode)
- [Use code snippets in Dev Mode](https://help.figma.com/hc/en-us/articles/15023202277399-Use-code-snippets-in-Dev-Mode)

Leituras-chave:

- variaveis e modos existem para modelar sistemas, inclusive light/dark;
- Dev Mode expoe variaveis, modos e snippets de codigo;
- handoff de design para codigo melhora quando o sistema visual ja esta semantico.

Implicacao:

- Figma deve entrar como camada de contrato e inspeção;
- nao como gerador arbitrario de UI.

## 5. GOV.UK Design System

Fontes:

- [Home](https://design-system.service.gov.uk/)
- [Colour](https://design-system.service.gov.uk/styles/colour/)
- [Accessibility statement](https://design-system.service.gov.uk/accessibility-statement/)

Leituras-chave:

- design system reduz repeticao de trabalho e concentra pesquisa;
- cor deve ser aplicada por funcao;
- o sistema assume acessibilidade como requisito de base, nao auditoria tardia.

Implicacao:

- a Casa Civil precisa de padroes que sirvam o servico, nao a vaidade da tela;
- acessibilidade e semantica precisam entrar no processo desde o inicio.

## 6. Atlassian Design System

Fontes:

- [Foundations](https://atlassian.design/foundations/)
- [Design tokens explained](https://atlassian.design/foundations/tokens/design-tokens/)
- [Color](https://atlassian.design/foundations/color/)
- [Spacing](https://atlassian.design/foundations/spacing)

Leituras-chave:

- tokens sao single source of truth;
- escolher token por significado, nao por semelhanca visual;
- cor, espaco, elevacao e tipografia sao fundacoes coordenadas.

Implicacao:

- o sistema Casa Civil precisa evitar o erro classico de “pegar a cor que combina”;
- semantica de token deve vencer preferencia visual local.

## 7. Carbon Design System

Fontes:

- [Accessibility color guidance](https://v10.carbondesignsystem.com/guidelines/accessibility/color/)
- [Color overview](https://carbondesignsystem.com/elements/color/overview/)
- [Tag accessibility](https://v10.carbondesignsystem.com/components/tag/accessibility/)

Leituras-chave:

- texto, UI component e estado visual tem metas de contraste distintas;
- foco e borda tambem sao contratos de acessibilidade;
- cor nao pode ser o unico mecanismo de diferenciacao.

Implicacao:

- badges, chips, estados e colunas operacionais na Casa Civil precisam comunicar por mais de uma camada: cor, rotulo, hierarquia e estrutura.

## 8. Conhecimento MCP local de operacoes

Fontes:

- `operations-frontend://visual-review-stack`
- `operations-frontend://development-protocol`

Leituras-chave:

- story primeiro, baseline local depois, runtime real por ultimo;
- ferramentas experimentais nao entram no caminho oficial;
- gate canônico depende da trilha da mudanca;
- telas sensiveis devem nascer com states model e stories reais.

Implicacao:

- esse conhecimento ja prova, localmente, o tipo de fluxo profissional que devemos generalizar.

## Diagnostico consolidado

O frontend profissional que queremos nao nasce de “mais capricho visual”.

Ele nasce de seis pilares:

1. sistema semantico
2. componentes modelados por estados
3. validacao visual automatizada
4. runtime proof
5. conteudo e semantica operacional
6. governanca transversal entre produtos

## O que muda de verdade em relacao ao estado atual

Hoje o caminho predominante e:

- tela
- ajuste visual
- rebuild
- revisao tardia

O caminho profissional deve ser:

1. contexto
2. fluxo e informacao
3. states model
4. tokens
5. story
6. componente
7. visual regression
8. runtime proof
9. rollout

## Modelo alvo de construcao

## Camada 1 - Discovery

Perguntas obrigatorias:

- qual e a tarefa principal da tela?
- qual e o usuario operacional?
- qual informacao e primaria?
- quais estados reais existem?
- o que e permanente e o que e transitorio?
- o que precisa ser comparado?
- o que precisa ser confirmado?

Saida:

- surface brief
- mapa de estados
- glossario de dominio

## Camada 2 - Information Architecture

Antes de desenhar:

- classificar o conteudo em primaria, secundaria e suporte;
- identificar redundancia;
- separar acao principal de acao auxiliar;
- definir densidade por familia de produto.

Saida:

- arquitetura de informacao da superficie

## Camada 3 - Semantic Design System

Construir:

- tokens
- themes
- modes
- status semantics
- typography scale
- spacing scale
- elevation rules
- focus rules
- empty/loading/error rules

Saida:

- contrato de design tokens
- contrato de componentes base

## Camada 4 - Story-first Modeling

Toda superficie relevante precisa nascer ou passar por:

- story de idle
- story de loading
- story de empty
- story de error
- story de selected/active
- story de dark/light quando aplicavel

Saida:

- catalogo vivo de estados reais

## Camada 5 - Validation

Gates obrigatorios:

- component test
- visual baseline
- runtime proof
- acessibilidade minima
- content review

## Camada 6 - Governance

Toda evolucao precisa responder:

- isso entra na fundacao?
- isso e especifico de uma familia?
- isso e especifico de uma superficie?

Sem essa resposta, o sistema volta a se fragmentar.

## Skillset recomendado

Nao criar uma skill unica.

Criar um conjunto pequeno, especializado e componivel.

### 1. `casa-civil-frontend-discovery`

Responsabilidade:

- levantar contexto, usuarios, jornadas, estados e linguagem do modulo

Entrada:

- repo
- docs
- screenshots
- brief

Saida:

- surface brief
- state inventory
- IA checklist

### 2. `casa-civil-design-system-foundation`

Responsabilidade:

- criar ou evoluir tokens, themes, primitives e familias visuais

Saida:

- tokens
- theme map
- primitives contract

### 3. `casa-civil-surface-ideation`

Responsabilidade:

- explorar 2-3 direcoes visuais para a superficie com criterio tecnico

Saida:

- comparativo de direcoes
- recomendacao
- riscos

### 4. `casa-civil-storybook-modeling`

Responsabilidade:

- converter superficies reais em stories e cenarios de teste

Saida:

- stories canônicas
- fixtures de estado

### 5. `casa-civil-visual-gates`

Responsabilidade:

- baseline local
- diff visual
- congelamento de tempo quando necessario

Saida:

- suite visual confiavel

### 6. `casa-civil-runtime-proof`

Responsabilidade:

- rebuildar, subir e validar a superficie real

Saida:

- evidencias de runtime
- URL canonica validada

### 7. `casa-civil-content-and-accessibility`

Responsabilidade:

- revisar linguagem, hierarquia, contraste, foco, erro, vazio e estados

Saida:

- dossie de copy e acessibilidade

### 8. `casa-civil-portfolio-governance`

Responsabilidade:

- decidir o que vira fundacao, familia ou excecao local

Saida:

- decisao de governanca do sistema

## Fluxo operacional v2

## Trilha ideal

1. discovery
2. IA
3. state model
4. tokens
5. ideation
6. Storybook
7. implementation
8. visual gates
9. runtime proof
10. portfolio decision

## Regra dura

Nenhuma tela importante deve pular:

- state model
- story
- baseline visual
- runtime proof

## O que reaproveitar do que ja existe

### Dos buscadores

- shell de busca
- hero institucional
- logica de tema por contexto

### Dos dashboards

- maturidade de tokens
- racional de light mode como sistema proprio
- disciplina de densidade e fullscreen

### De carregadores

- semantica operacional
- clareza de coluna e estado
- urgencia de action-first UI

## O que abandonar

- padrao por tentativa e erro no app inteiro
- cor hardcoded como atalho
- tela sem state inventory
- screenshot isolada como criterio de aceite
- padrao visual decidido so por “gosto”

## Conclusao

O caminho profissional existe e e totalmente viavel no ecossistema atual.

Mas ele exige mudar a pergunta.

Nao perguntar:

- “como deixamos esta tela mais bonita?”

E sim:

- “qual e o sistema de construcao que faz qualidade visual, semantica e runtime virarem rotina?”

Este estudo conclui que a Casa Civil deve construir:

- um frontend system v2;
- um skillset modular;
- um fluxo oficial story-first + visual gate + runtime proof;
- e uma governanca de portfolio que separe fundacao, familia e excecao local.

Sem isso, qualquer melhoria visual futura continua dependendo de esforco individual e tende a regredir.
