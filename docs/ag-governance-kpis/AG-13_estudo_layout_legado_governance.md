# AG-13 — Estudo do Layout Legado do Spoke Governance

Data: 2026-03-18

## 1. O que o legado realmente era

O projeto legado `spokes/governance` nao era uma unica dashboard executiva. Ele era um spoke narrativo com **4 boards distintos**:

1. `Governanca` — grafo interativo e slide-over documental.
2. `Indicadores` — catalogo de KPIs operacionais e estrategicos.
3. `Matriz RACI` — responsabilidades por processo.
4. `POPs & Processos` — catalogo de procedimentos.

Fonte principal:

- `\\wsl.localhost\NVIDIA-Workbench\home\workbench\code\apps\spokes\governance\App.tsx`
  - rotas em `HashRouter`: linhas `1533-1540`
  - shell/layout: linhas `1421-1495`
  - board de governanca: linhas `356-838`
  - board de indicadores: linhas `1051-1178`
  - board de RACI: linhas `1211-1312`
  - board de POPs: linhas `1381-1418`

## 2. Por que ele parecia funcional

O valor do legado nao estava em densidade visual. Estava em **clareza de percurso**.

### 2.1 Shell simples e institucional

O layout era extremamente contido:

- fundo claro (`bg-slate-50`)
- header branco com logo RS e nome do sistema
- navegacao horizontal com 4 tabs
- breadcrumb simples
- footer institucional

Isso esta no `Layout`:

- header: `App.tsx:1435-1468`
- breadcrumb: `App.tsx:1470-1477`
- footer: `App.tsx:1483-1492`

Conclusao: a UI nao competia com o conteudo. Ela criava uma moldura institucional.

### 2.2 Uma pergunta por tela

Cada board respondia uma pergunta:

- `Governanca`: "de onde vem a legitimidade e como tudo se conecta?"
- `Indicadores`: "quais resultados e metas estamos acompanhando?"
- `RACI`: "quem responde por cada processo?"
- `POPs`: "como a execucao acontece?"

Essa separacao evitava mistura entre operacao, compliance e processo.

### 2.3 Navegacao por relacao, nao por menu apenas

O spoke tinha cross-linking real:

- KPI -> RACI
- KPI -> POP
- RACI -> KPI
- RACI -> POP
- governanca -> boards derivados

Implementacao:

- `useHighlightScroll`: `App.tsx:47-80`
- botoes de salto no board de governanca: `App.tsx:669-697`
- atalhos na tabela RACI: `App.tsx:1258-1274`

Conclusao: o sistema era funcional porque o usuario nao precisava "lembrar a arquitetura". A propria UI guiava a leitura.

## 3. Linguagem visual do legado

### 3.1 Governance board

O board principal usava:

- cards brancos com borda lateral colorida por tipo
- conectores com labels semanticos (`exige`, `institui`, `aprova`, `desdobra`, `operacionaliza`)
- hover para destacar relacoes
- slide-over lateral para detalhe documental

Referencias:

- `GovernanceCard`: `App.tsx:121-144`
- conectores e labels: `App.tsx:93-110`
- composicao do grafo: `App.tsx:536-699`
- slide-over documental: `App.tsx:701-835`

### 3.2 Indicadores

O board de indicadores era um **catalogo**, nao um cockpit:

- cabeçalho com contexto e seletor de periodo
- grupo 1: KPIs ativos
- grupo 2: KPIs estrategicos em roadmap
- grid 3 colunas
- cards autoexplicativos com formula, fonte, responsavel e semaforo

Referencias:

- `PeriodSelector`: `App.tsx:1025-1049`
- header e total de movimentacao: `App.tsx:1118-1140`
- grupo 1: `App.tsx:1150-1158`
- grupo 2: `App.tsx:1161-1174`

### 3.3 RACI

O board de RACI era quase documental:

- tabela larga
- sticky header
- primeira coluna fixa
- badges R/A/C/I com legenda

Referencias:

- `RaciBadge`: `App.tsx:1182-1208`
- tabela principal: `App.tsx:1233-1312`

### 3.4 POPs

O board de POPs seguia a mesma logica:

- catalogo por cards/processos
- foco em leitura e rastreio
- sem ruido visual

## 4. O que nao deve ser copiado literalmente para o Hub

1. **Shell branco completo**. O Hub atual ja tem identidade propria e nao deve abrir outro produto visualmente isolado dentro dele.
2. **HashRouter interno**. Isso pertence ao spoke legado, nao ao Hub Next.js.
3. **Footer institucional e header redundantes**. No Hub, isso precisa ser absorvido pelo shell global.
4. **Tudo em um `App.tsx` monolitico**. Isso foi funcional como prototipo preservado, nao como arquitetura alvo.

## 5. O que precisa ser preservado na integracao

1. **Separacao por board/assunto**. Misturar tudo numa home unica gera ruido.
2. **Narrativa de governanca**. O valor diferencial do legado estava no encadeamento norma -> processo -> owner -> indicador.
3. **Cross-linking**. Esse comportamento e mais importante do que o layout exato.
4. **Slide-over de evidencia/documento**. Isso da materialidade ao discurso executivo.
5. **Distincao entre KPI ativo e KPI estrategico**. O legado deixava claro o que era dado real e o que era roadmap.

## 6. Comparacao com o Hub atual

O Hub atual, especialmente em `/[context]/dashboard`, e orientado a **operacao**:

- cards de fila
- kanban
- busca de chamados
- refresh frequente

Fonte:

- `/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/dashboard/page.tsx:132-184`

Ja o legado Governance e orientado a **explicacao e responsabilizacao**.

Conclusao: tentar transformar o legado num "dashboard executivo dark e denso" foi o erro do concept board anterior. Ele perdeu o principal atributo do spoke: **ordem cognitiva**.

## 7. Direcao correta para integrar no Hub

### 7.1 Nao criar uma unica tela que engole tudo

A integracao correta para gestor DTIC e:

1. uma home executiva curta no Hub
2. um modulo de governanca com boards especializados

### 7.2 Modelo recomendado

- `Home do gestor`
  - resumo executivo
  - alertas
  - evidencias pendentes
  - atalhos para boards

- `Governanca`
  - portar o board legado quase integralmente

- `Indicadores`
  - portar o board legado, mas adaptar o visual ao shell do Hub

- `RACI`
  - portar como tabela especializada

- `POPs`
  - portar como catalogo navegavel

### 7.3 Regra de UX

O gestor nao deve ver a mesma home do tecnico.

Mas isso nao significa colapsar governanca, risco, KPI, RACI e POPs numa unica vista pesada.

Significa:

- **home do gestor = decisao**
- **boards de governanca = aprofundamento**

## 8. Proxima acao recomendada

Antes de redesenhar qualquer tela:

1. definir a arquitetura de navegacao do gestor dentro do Hub
2. separar o que e `home executiva` do que e `modulo governance`
3. desenhar wireframes com base nessa separacao

Sem essa divisao, qualquer tentativa de layout tende a ficar "baguncada", porque mistura:

- cockpit executivo
- base normativa
- catalogo de KPIs
- tabela RACI
- biblioteca documental

em um mesmo plano visual.
