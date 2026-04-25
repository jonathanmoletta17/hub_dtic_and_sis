# Prompt V2 - Light Mode Operacional Para Gestao Carregadores Oficial - 2026-04-10

Use este prompt no chat do projeto `gestao-carregadores-oficial`.

Ele substitui o prompt anterior quando o objetivo for executar a rodada com mais rigor, menos liberdade de redesign e validacao visual obrigatoria no app real.

---

## Prompt

Voce esta atuando no repositório `gestao-carregadores-oficial`, com foco no frontend do modulo operacional.

Sua missao e implementar e revisar o `light mode` do produto sem descaracterizar o sistema existente.

### Escopo desta rodada

- preservar o `dark mode` atual como baseline protegido
- consolidar `light mode` real, consistente e operacional
- revisar tela por tela
- validar em `Storybook` e no app real
- registrar evidencias objetivas antes de declarar qualquer frente pronta

### O que voce nao pode fazer

- nao transformar essa rodada em redesign amplo
- nao trocar a identidade do produto
- nao reinventar shell, header ou layout sem prova de necessidade
- nao usar cores hardcoded como atalho
- nao encerrar a tarefa com base apenas em lint, build ou Playwright funcional

### O que voce deve assumir

- o `dark mode` atual e a fonte de verdade visual
- o `light mode` deve ser um sistema paralelo, nao uma inversao superficial
- o produto continua sendo uma superficie operacional, nao um admin template claro

---

## Protocolo obrigatorio

### 1. Leitura antes de editar

Leia primeiro:

1. `docs/FRONTEND_VISUAL_REVIEW_STACK_2026-04-01.md`
2. `docs/PROTOCOLO_OPERACIONAL_DESENVOLVIMENTO_2026-04-01.md`
3. `.stitch/DESIGN.md`
4. Se o MCP `operationsFrontendUiKnowledge` estiver disponivel:
   - `operations-frontend://visual-review-stack`
   - `operations-frontend://development-protocol`
   - `operations-frontend://stitch-design-contract`
   - `operations-frontend://loading-patterns`
   - `operations-frontend://loading-design-system`

Se usar Stitch:

1. rode `npx @_davideast/stitch-mcp doctor --json`
2. confirme `allPassed=true`
3. use Stitch para comparar, idear e revisar
4. nao use Stitch como substituto de validacao no app real

### 2. Classifique a rodada antes do patch

Declare explicitamente:

- `UI`
- `Tooling`
- `Runtime`

E liste as superfícies reais que entram na frente atual.

### 3. Ordem obrigatoria de execucao

1. diagnostico da superficie
2. inventario dos hardcodes e contrastes fracos
3. story ou baseline visual da superficie
4. patch pequeno e focado
5. `storybook:test`
6. `storybook:visual`
7. validacao no app real
8. captura de evidencias

### 4. Formato obrigatorio de evidencia

Ao final de cada rodada, entregue:

1. diagnostico curto
2. arquivos alterados
3. o que mudou visualmente
4. como validou
5. screenshots reais
6. o que ainda ficou pendente

---

## Regras de design e tema

### Regra A - Light mode nao pode lavar a operacao

Corrija especialmente:

- textos secundarios muito cinza
- sombras herdadas do dark
- surfaces sem separacao clara entre canvas, painel e card
- badges com contraste insuficiente
- placeholders e metadados quase invisiveis

### Regra B - Sidebar, shell e header sao estruturas, nao enfeites

Se o tema claro entrar nessas areas:

- preserve estabilidade de largura e alinhamento
- preserve clusters de CTA
- preserve foco visivel
- preserve leitura forte de navegação

### Regra C - Loading continua sendo contrato de produto

Se tocar estados de loading:

- `initial-loading` usa skeleton estrutural
- `refreshing` mantem conteudo montado
- `submitting` e local
- empty state nunca substitui loading

### Regra D - Contrast tuning e obrigatorio

Nao aceite a superficie so porque:

- o fundo virou claro
- o card virou branco
- o build passou

Aceite apenas se:

- titulo continua forte
- metadado continua legivel
- KPI continua escaneavel
- badge continua semanticamente claro
- hover/focus continuam nítidos

### Regra E - Anti-padroes proibidos

Recuse estes atalhos:

- `bg-white text-black` espalhado
- `opacity-50/60/70` como hierarquia principal
- modal claro em cima de shell ainda com tokens errados
- sidebar escura por acidente no light
- story ausente para superficie critica
- “ficou bom no navegador” sem baseline visual

---

## Licoes obrigatorias herdadas do hub

### 1. Nao abrir escopo

Se a tarefa e `light mode`, execute `light mode`.
Nao redesenhe o produto.

### 2. Tema vem antes da pagina

Comece por:

- tokens
- foundations
- surfaces
- sombras
- contraste

Depois propague para telas.

### 3. Storybook sozinho nao basta

Toda conclusao precisa fechar nos dois lados:

- componente/surface isolada
- tela real do produto

### 4. Problema visual nao e so cor

Revise sempre:

- hierarquia
- densidade
- respiracao
- CTA cluster
- foco
- texto auxiliar

### 5. Nao declarar pronto com pendencia silenciosa

Se houver:

- hardcodes restantes
- contrastes fracos
- telas nao revisadas
- states faltando

declare isso explicitamente.

---

## Superficies que devem ser revisadas uma a uma

Monte o trabalho por superfícies reais do produto, por exemplo:

- login
- shell
- dashboard principal
- cards/KPIs
- kanban ou listas
- ranking
- modais
- formularios
- empty states
- loading/refreshing states

Nao misture tudo numa unica rodada.

---

## Gates minimos

Para cada frente de UI:

1. `npm run build`
2. `npm run build-storybook`
3. `npm run storybook:test`
4. `npm run storybook:visual`
5. validacao do app real

Se houver clock, data ou janela operacional:

- congele tempo nos testes visuais

---

## Criterio de aceite

O trabalho so pode ser considerado pronto se:

- o dark continua intacto
- o light ficou coerente
- a semantica operacional foi preservada
- as superficies principais passaram por Storybook
- a validacao foi feita no app real
- ha evidencia objetiva da rodada

Se em algum momento voce perceber que esta fazendo redesign em vez de tema, pare e recoloque a tarefa no escopo correto.

---

## Decisao operacional

Nao espere uma skill final para executar essa rodada.

Use este prompt agora para a execucao no `gestao-carregadores-oficial`.

A skill compartilhada deve nascer so depois que essas regras forem provadas em:

1. `hub-operacional-web`
2. `gestao-carregadores-oficial`

Esse e o criterio minimo para consolidacao.
