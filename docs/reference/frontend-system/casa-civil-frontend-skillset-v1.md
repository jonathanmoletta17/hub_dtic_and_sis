# Casa Civil Frontend Skillset v1

## Objetivo

Definir o skillset modular oficial do `Casa Civil Frontend System v2`.

Este documento nao cria as skills ainda.

Ele fecha:

- quais skills existem;
- qual o papel de cada uma;
- o que cada uma recebe e devolve;
- o que cada uma nao deve fazer;
- como elas se encadeiam no workflow.

## Regra de base

O sistema nao usara uma super-skill unica.

Motivo:

- contexto demais em um unico artefato;
- responsabilidades misturadas;
- gatilhos ruins;
- dificuldade de manutencao;
- validacao fraca.

O sistema usara um conjunto pequeno de skills especializadas.

## Mapa do skillset

Skills oficiais:

1. `casa-civil-frontend-discovery`
2. `casa-civil-design-system-foundation`
3. `casa-civil-surface-ideation`
4. `casa-civil-storybook-modeling`
5. `casa-civil-visual-gates`
6. `casa-civil-runtime-proof`
7. `casa-civil-content-and-accessibility`
8. `casa-civil-portfolio-governance`

## Regras gerais para todas as skills

Seguindo o racional de `skill-creator`:

- corpo principal conciso;
- referencias carregadas sob demanda;
- scripts so quando houver repeticao real;
- assets apenas quando realmente entrarem no output;
- nada de README, changelog ou documentacao lateral desnecessaria dentro da skill;
- skill guia a execucao, nao tenta substituir o system.

## Skill 1 - `casa-civil-frontend-discovery`

## Papel

Levantar o contexto real da superficie antes de qualquer ideacao ou patch.

## Quando usar

- estudo inicial de app
- nova superficie
- tela confusa
- duvida sobre familia dominante
- pedido de “entender antes de alterar”

## Entrada

- repo
- docs locais
- screenshots
- contexto funcional

## Saida

- `surface-intent`
- `surface-brief`
- `state-inventory`
- `domain-glossary`
- classificacao da familia

## Nao faz

- design system
- redesign
- implementacao

## Freedom level

- medio

## Recursos ideais da skill

- `references/diagnostic-checklist.md`
- opcional `scripts/surface_inventory.py`

## Skill 2 - `casa-civil-design-system-foundation`

## Papel

Projetar ou evoluir tokens, themes, primitives e regras de dark/light.

## Quando usar

- tokenizacao
- tema claro/escuro
- convergencia entre apps
- extracao de fundacao comum

## Entrada

- contrato de fundacao
- exemplos reais do portfolio
- estado atual do repo

## Saida

- `token-map`
- `surface-contract`
- proposta de primitive
- estrategia de modes

## Nao faz

- decidir IA de tela
- escolher composicao final de superficie

## Freedom level

- medio

## Recursos ideais da skill

- `references/foundation-contract.md`
- `references/token-taxonomy.md`
- opcional `scripts/token_audit.py`

## Skill 3 - `casa-civil-surface-ideation`

## Papel

Explorar direcoes visuais plausiveis para uma superficie, com criterio tecnico e semantico.

## Quando usar

- nova superficie
- redesenho estrutural
- tela sem hierarquia
- duvida entre duas direcoes de composicao

## Entrada

- `surface-brief`
- `state-inventory`
- familia declarada
- contrato da fundacao

## Saida

- `direction-a`
- `direction-b`
- opcional `direction-c`
- `decision-note`

## Nao faz

- implementar direto no app
- decidir token base fora da fundacao

## Freedom level

- alto

## Recursos ideais da skill

- `references/family-contracts.md`
- `references/ideation-criteria.md`

## Skill 4 - `casa-civil-storybook-modeling`

## Papel

Transformar superficies e componentes em stories reais de estado.

## Quando usar

- toda mudanca visual relevante
- toda nova primitive relevante
- toda superficie critica

## Entrada

- componente ou superficie
- state inventory
- familia declarada

## Saida

- stories
- fixtures
- cenarios obrigatorios

## Nao faz

- aceitar story cenografica como suficiente
- fechar alteracao sem surface real equivalente

## Freedom level

- medio

## Recursos ideais da skill

- `references/story-rules.md`
- `references/freeze-time-rules.md`
- opcional `scripts/check_story_coverage.py`

## Skill 5 - `casa-civil-visual-gates`

## Papel

Executar e orientar baseline visual, diffs e aceite de UI.

## Quando usar

- alteracao de UI
- ajustes de theme
- regressao visual
- validacao de stories

## Entrada

- stories prontas
- stack de testes do repo

## Saida

- baseline local
- diff visual
- resultado do gate

## Nao faz

- decidir design
- substituir runtime proof

## Freedom level

- baixo a medio

## Recursos ideais da skill

- `references/validation-protocol.md`
- `references/storybook-visual-stack.md`
- opcional `scripts/validate_visual_stack.ps1`

## Skill 6 - `casa-civil-runtime-proof`

## Papel

Identificar runtime real, rebuildar servico correto e validar a URL canônica.

## Quando usar

- toda entrega visual relevante
- duvida sobre cache
- docker compose
- runtime aparentemente desatualizado

## Entrada

- repo
- runtime docs
- scripts locais

## Saida

- evidencia de rebuild
- health/status
- URL validada

## Nao faz

- decidir design
- substituir testes visuais

## Freedom level

- baixo

## Recursos ideais da skill

- `references/runtime-checklist.md`
- scripts reutilizaveis de probe

## Skill 7 - `casa-civil-content-and-accessibility`

## Papel

Revisar linguagem, contraste, foco, erro, vazio e semantica de estado.

## Quando usar

- microcopy
- legibilidade
- badge e status
- empty state
- mensagens de erro
- contraste questionavel

## Entrada

- screenshot ou superficie
- state inventory
- contrato da familia

## Saida

- dossie de copy
- lista de ajustes semanticos
- riscos de acessibilidade

## Nao faz

- reescrever regra de negocio
- substituir discovery

## Freedom level

- medio

## Recursos ideais da skill

- `references/content-rules.md`
- `references/accessibility-checklist.md`

## Skill 8 - `casa-civil-portfolio-governance`

## Papel

Decidir o destino da mudanca dentro do portfolio.

## Quando usar

- novo token
- nova primitive
- novo padrao
- excecao local
- convergencia entre apps

## Entrada

- diff ou proposta
- contratos do sistema
- evidencias de superficie real

## Saida

- `governance-decision`
- classificacao:
  - fundacao
  - familia
  - superficie
  - excecao local

## Nao faz

- implementar a mudanca
- validar runtime

## Freedom level

- medio a alto

## Recursos ideais da skill

- `references/governance-matrix.md`
- `references/portfolio-decision-examples.md`

## Ordem oficial de uso

Fluxo base:

1. `casa-civil-frontend-discovery`
2. `casa-civil-design-system-foundation`
3. `casa-civil-surface-ideation`
4. `casa-civil-storybook-modeling`
5. implementacao no repo
6. `casa-civil-visual-gates`
7. `casa-civil-runtime-proof`
8. `casa-civil-content-and-accessibility`
9. `casa-civil-portfolio-governance`

## Fluxos reduzidos permitidos

## Ajuste pequeno de contraste

1. `storybook-modeling`
2. implementacao
3. `visual-gates`
4. `runtime-proof`
5. `content-and-accessibility`

## Duvida de sistema entre apps

1. `frontend-discovery`
2. `portfolio-governance`
3. opcional `design-system-foundation`

## Light mode estrutural

1. `frontend-discovery`
2. `design-system-foundation`
3. `surface-ideation`
4. `storybook-modeling`
5. implementacao
6. `visual-gates`
7. `runtime-proof`
8. `portfolio-governance`

## Relacao com os artefatos do sistema

Cada skill deve apontar para documentos canônicos, nao duplicar tudo em `SKILL.md`.

Mapeamento:

- `casa-civil-frontend-discovery`
  - usa `casa-civil-frontend-system-v2.md`
- `casa-civil-design-system-foundation`
  - usa `casa-civil-frontend-foundation-contract-v1.md`
- `casa-civil-surface-ideation`
  - usa `casa-civil-frontend-family-contracts-v1.md`
- `casa-civil-visual-gates`
  - usa `casa-civil-frontend-validation-protocol-v1.md`
- `casa-civil-portfolio-governance`
  - usa todos os contratos relevantes

## Regras de fronteira

Uma skill esta mal desenhada se:

- precisa explicar o sistema inteiro sozinha;
- mistura discovery com implementacao com governance;
- nao deixa claro o que nao faz;
- depende de contexto secreto nao documentado;
- so funciona com o “jeito” de um repo unico.

## Estrategia de implementacao do skillset

Ordem sugerida:

1. `casa-civil-runtime-proof`
2. `casa-civil-visual-gates`
3. `casa-civil-frontend-discovery`
4. `casa-civil-design-system-foundation`
5. `casa-civil-surface-ideation`
6. `casa-civil-storybook-modeling`
7. `casa-civil-content-and-accessibility`
8. `casa-civil-portfolio-governance`

Motivo:

- primeiro fechar o que prova;
- depois fechar o que pensa;
- por ultimo fechar o que governa.

## Proximo passo

Com o skillset fechado no papel, a fase seguinte correta e:

1. escolher a ordem de criacao real das skills
2. criar a primeira wave de skills
3. forward-testar em tarefas reais
