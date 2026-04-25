# Prompt - Light Mode Operacional Para Gestao Carregadores Oficial - 2026-04-10

Use este prompt no projeto `gestao-carregadores-oficial` para conduzir a implementacao do modo claro com a mesma disciplina aplicada no hub, mas respeitando a linguagem, os contratos e a stack especificos desse produto.

---

## Prompt

Voce esta atuando no repositório `gestao-carregadores-oficial`, com foco no frontend e especialmente nas superfícies operacionais do modulo `operations`.

Sua missao e implementar um `light mode` real, consistente e validado, preservando a qualidade visual, a semantica operacional e a estabilidade do produto.

### O que este trabalho **nao** e

- nao e um redesign amplo do produto
- nao e uma inversao rapida do dark mode
- nao e uma rodada de CSS superficial
- nao e uma troca de identidade visual do sistema
- nao e uma oportunidade para enfiar componentes novos sem necessidade

### O que este trabalho **e**

- uma migracao controlada para tema claro
- com arquitetura semantica de tokens
- preservando a anatomia do produto atual
- mantendo a qualidade do dark como baseline protegido
- com validacao em Storybook **e** validacao direta no app publicado/local

---

## Leitura obrigatoria antes de editar

Leia primeiro, nesta ordem:

1. `docs/FRONTEND_VISUAL_REVIEW_STACK_2026-04-01.md`
2. `docs/PROTOCOLO_OPERACIONAL_DESENVOLVIMENTO_2026-04-01.md`
3. `.stitch/DESIGN.md`
4. se o MCP `operationsFrontendUiKnowledge` estiver disponivel, leia:
   - `operations-frontend://visual-review-stack`
   - `operations-frontend://development-protocol`
   - `operations-frontend://stitch-design-contract`
   - `operations-frontend://loading-patterns`
   - `operations-frontend://loading-design-system`
   - `operations-frontend://surface/{surface}` para cada superficie relevante

Se Stitch for usado:

1. valide antes com `npx @_davideast/stitch-mcp doctor --json`
2. confirme `allPassed=true`
3. use Stitch para ideacao e comparacao visual, nao como fonte cega de implementacao

---

## Principios nao negociaveis

### 1. Preservar o baseline atual

O dark mode atual e a referencia protegida.  
Nao degrade o dark para fazer o light funcionar.

### 2. O light mode e um sistema paralelo, nao uma inversao

O tema claro deve ser modelado como sistema proprio:

- superfícies
- textos
- bordas
- hover
- focos
- cards
- modais
- badges
- estados vazios
- esqueletos

Nao use apenas:

- `bg-white`
- `text-black`
- `dark:` espalhado superficialmente
- `opacity` arbitraria para “resolver” contraste

### 3. Semantica operacional e obrigatoria

O projeto continua sendo um `operational control surface`, nao um SaaS branco generico.

No light mode:

- mantenha densidade operacional
- mantenha hierarquia de KPIs
- mantenha leitura rapida de estados
- mantenha CTA clusters estaveis
- mantenha a semantica de cores do dominio

O resultado **nao pode** parecer:

- dashboard SaaS pastel
- landing page corporativa
- mock de template admin claro genérico

### 4. Storybook vem antes do runtime

Toda mudanca visual relevante precisa passar por:

1. diagnostico da superficie
2. story isolada
3. `npm run storybook:test`
4. `npm run storybook:visual`
5. so depois validacao no app real

### 5. Validacao direta no app e obrigatoria

Nao pare em Storybook.

A cada frente implementada:

- rode a aplicacao real
- navegue na tela real
- capture screenshots antes/depois
- compare dark e light
- confirme que o layout continua estavel

### 6. Modo claro nao autoriza regressao estrutural

Nao mexa em:

- contratos de loading
- transicoes de dominio
- runtime
- shell/header/CTA clusters

sem necessidade comprovada e sem gate correspondente.

### 7. Ferramenta experimental nao entra no caminho oficial

Siga a doutrina do projeto:

- nada de dependencias nao homologadas no caminho canônico
- nada de workflows visuais improvisados fora do stack oficial

---

## Licoes extraidas da implementacao do hub que devem ser reaplicadas aqui

### Licao A - Nao redesenhar quando o pedido e tema

O erro mais facil aqui e confundir:

- “adicionar modo claro”

com:

- “reinventar a UI inteira”

Nao faca isso.  
Preserve a anatomia atual do produto.

### Licao B - Comece por foundations, nao por paginas soltas

A ordem correta e:

1. contrato visual
2. tokens
3. shell
4. superfícies
5. modais e estados secundarios
6. baseline visual

### Licao C - Tokens semanticos primeiro, hardcodes depois nunca

Todo hardcode de cor encontrado em:

- cards
- headers
- status
- sidebar
- modais
- inputs
- chips

deve ser inventariado e substituido por tokens semanticos.

### Licao D - Contraste fino precisa de runtime real

Mesmo com tokens corretos, o light mode pode ficar “lavado”.  
Por isso:

- ajuste contraste de metadados
- ajuste opacidades
- ajuste estados vazios
- ajuste previews e labels

sempre olhando a tela real.

### Licao E - Acessibilidade e parte do tema

Corrija tambem:

- labels de inputs
- foco visivel
- contraste de placeholder
- hover e active states

Se a implementacao de tema piorar automacao, foco ou leitura, ela nao esta pronta.

---

## Processo de trabalho obrigatorio

### Fase 0 - Diagnostico inicial

Antes de editar:

1. classifique a mudanca como `UI + Tooling`
2. identifique as superfícies criticas do modulo `operations`
3. capture o estado atual em dark
4. identifique:
   - hardcodes de cor
   - pontos onde o claro quebraria contraste
   - headers/CTAs sensiveis
   - cards e modais mais arriscados

Entregue um diagnostico curto e objetivo antes da primeira rodada de patch.

### Fase 1 - Contrato visual do light mode

Defina formalmente:

- o que muda entre dark e light
- o que permanece identico
- como ficam:
  - shell
  - surfaces
  - KPI cards
  - kanban
  - ranking
  - modais
  - filtros
  - loading
  - empty states

Nao implemente ainda sem fechar esse contrato.

### Fase 2 - Foundations do tema

Implemente primeiro:

- variaveis CSS semanticas
- tokens por tema
- bootstrap do tema
- persistencia
- anti-flash
- classes semanticas de surfaces/buttons/cards/inputs/chips

Regra:

- o light mode deve viver no mesmo sistema
- o dark mode deve continuar funcionando com equivalencia real

### Fase 3 - Shell e elementos estruturais

Depois:

- sidebar
- topbar
- header de dashboards
- CTA clusters
- user/profile menu
- controles globais

Meta:

- estabilidade de header
- zero width jump
- foco visivel
- leitura forte nos dois temas

### Fase 4 - Superficies operacionais principais

Depois:

- KPI cards
- colunas do kanban
- cards de tickets/planejamento/disponibilidade
- ranking
- grids/listas
- empty states

Aqui voce deve ser agressivo com contraste e legibilidade, mas conservador com layout.

### Fase 5 - Modais e estados secundarios

Depois:

- modais principais
- drawers
- formularios
- loading overlays
- refresh states
- submitting states

Lembre:

- `initial-loading` usa skeleton estrutural
- `refreshing` nao desmonta conteudo
- `submitting` e local
- empty state nunca substitui loading

### Fase 6 - Guarda visual

Feche com:

- stories atualizadas
- baseline visual local
- comparacao dark/light das principais superfícies

Se faltarem stories, crie-as.

---

## Regras especificas para o modo claro do Gestao Carregadores

### 1. Light mode deve continuar “operational”

No modo claro, use algo nesta direcao:

- canvas frio e técnico
- surfaces claras elevadas
- bordas estruturais visiveis
- tipografia forte
- cores de status semanticamente preservadas
- sem cara de admin template branco

### 2. CTA cluster principal nao pode oscilar

Se houver refresh de background:

- nao montar/desmontar texto no mesmo cluster do CTA
- nao alterar largura do header
- nao empurrar botoes

### 3. Sem spinner-first paint em superficies densas

Para dashboards e kanban:

- use skeleton estrutural
- preserve geometria
- nao troque tudo por um spinner no centro

### 4. Nao introduzir modos mistos incoerentes

Evite:

- fundo claro com cards escuros sem justificativa
- header claro e modal ainda hardcoded escuro
- chips e badges sem contraste suficiente
- sidebars e painéis “meio claros, meio dark” por acidente

### 5. Nao copie o hub literalmente

Extraia o metodo, nao o visual.

Do hub, reaproveite:

- disciplina de tokens
- ordem de execucao
- validacao direta no app
- contrast tuning
- correcao de acessibilidade

Nao reaproveite cegamente:

- copy
- anatomia do shell
- linguagem institucional do hub

---

## Validacao obrigatoria

### Gate minimo por rodada de UI

Rode, nesta ordem:

1. `npm ci` se a rodada tocar dependencias ou se houver duvida de reproducibilidade
2. `npm run build`
3. `npm run build-storybook`
4. `npm run storybook:test`
5. `npm run storybook:visual`
6. build Docker do frontend, se esse for o caminho oficial do repo
7. validacao direta no app real

### Na validacao do app real, verifique explicitamente

- dark continua intacto
- light nao ficou lavado
- cards mantem hierarquia
- textos secundarios ainda sao legiveis
- KPIs continuam escaneaveis a distancia
- headers nao pulam
- CTAs nao deslocam
- modais mantem shell estavel
- empty states nao parecem tela quebrada
- loading/refresing/submitting seguem o contrato oficial

### Se houver tempo relativo ou data dinamica

Congele relogio e timezone nas stories e nos testes visuais, para evitar falso diff.

---

## Formato de execucao esperado

Trabalhe em ondas pequenas e sempre reporte:

1. diagnostico da rodada
2. arquivos-alvo
3. o que foi alterado
4. como validou
5. evidencias reais
6. o que ficou pendente

Nao declare a tarefa pronta sem os gates canonicos da trilha.

---

## Entregavel esperado

Ao final, o projeto deve ter:

- `light mode` real e coerente
- `dark mode` preservado
- sistema semantico de tema
- surfaces operacionais legiveis nos dois modos
- stories cobrindo as superfícies mais sensiveis
- baseline visual local
- validacao real no app, e nao apenas nos componentes isolados

Se em algum momento voce perceber que esta caindo em redesign em vez de tema, pare, declare isso explicitamente e recoloque o trabalho no escopo correto.

---

## Observacao final

A prioridade e qualidade operacional, nao velocidade cosmetica.

A pergunta correta nao e:

- “o claro apareceu?”

E sim:

- “o produto continua forte, coerente, operacional e validado nos dois temas?”

Esse e o criterio de aceite.
