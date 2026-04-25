# Casa Civil Visual System Portfolio Study v1

## Objetivo

Definir se existe base real para um padrao visual corporativo compartilhado entre:

- buscadores
- dashboards
- gestao de carregadores

E, se existir, qual deve ser a arquitetura correta desse padrao.

## Escopo analisado

### Buscadores

- `C:\Users\jonathan-moletta\code\buscador-dtic`
- `C:\Users\jonathan-moletta\code\buscador-sis-manutencao`
- `C:\Users\jonathan-moletta\code\buscador-sis-conservacao`

### Dashboards

- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi`
- `C:\Users\jonathan-moletta\code\dashboard-sis-manutencao`
- `C:\Users\jonathan-moletta\code\dashboard-sis-conservacao`

### Operacao

- `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend`

## Evidencia objetiva

### 1. Os tres buscadores ja formam uma familia visual unica

Os arquivos abaixo possuem o mesmo hash:

- `C:\Users\jonathan-moletta\code\buscador-dtic\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\buscador-sis-manutencao\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\buscador-sis-conservacao\src\app\globals.css`

Conclusao:

- a base de tema dos buscadores ja esta consolidada como familia;
- a variacao hoje acontece por contexto e nao por arquitetura.

### 2. Os tres dashboards ja formam uma segunda familia visual unica

Os arquivos abaixo possuem o mesmo hash:

- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\dashboard-sis-manutencao\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\dashboard-sis-conservacao\src\app\globals.css`

Conclusao:

- os dashboards ja possuem uma arquitetura visual compartilhada;
- a familia de dashboards ja esta mais semantica e madura que a de carregadores.

### 3. Carregadores ainda nao esta no mesmo nivel de tokenizacao

Evidencia:

- `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend\frontend\src\App.tsx`
- `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend\frontend\src\index.css`

Achados principais:

- `App.tsx` ancora a aplicacao em `bg-[#0f172a] text-slate-200 font-sans`;
- `index.css` usa scrollbar dark hardcoded;
- utilitarios `.glpi-html-content` usam `text-slate-*` e `text-blue-400` diretamente;
- a base cromatica e forte, mas ainda nao esta modelada como sistema semantico reutilizavel.

Conclusao:

- carregadores tem identidade operacional forte;
- mas nao deve ser a fundacao do sistema visual;
- deve ser um consumidor da fundacao.

## Diagnostico visual por familia

## Buscadores

Arquivos principais lidos:

- `C:\Users\jonathan-moletta\code\buscador-dtic\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\buscador-dtic\src\modules\search\components\SearchPage.tsx`

Caracteristicas:

- hero forte com marca institucional;
- busca como centro absoluto da tela;
- fundo atmosferico `aurora-mesh`;
- superficies em vidro escuro/claro com blur;
- tema claro e escuro ja modelados por tokens;
- variacao de contexto por classes `theme-dtic`, `theme-manutencao`, `theme-memoria`.

Pontos fortes:

- boa presenca institucional;
- shell visual consistente;
- light e dark nascem da mesma taxonomia;
- experiencia focada em uma tarefa principal.

Limites:

- o hero e mais cenografico do que operacional;
- glass e aurora funcionam muito bem em busca, mas nao devem contaminar dashboards densos;
- o padrao tipografico ainda depende muito do clima da tela, nao so da semantica do dado.

Veredito:

- buscadores devem ser a referencia da familia `search`.

## Dashboards

Arquivos e evidencias principais:

- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\src\components\dashboard\DashboardShell.tsx`
- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\04-direcao-visual-e-layout.md`
- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\07-modo-claro-e-estrategia.md`
- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\08-matriz-de-tokens-light-mode.md`
- screenshots:
  - `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\baselines\dark\01-dashboard-full.png`
  - `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\baselines\light-lab\01-dashboard-full.png`

Caracteristicas:

- fullscreen sem scroll vertical global;
- layout de parede;
- leitura rapida de metricas;
- tokens semanticos maduros para superficie, toolbar, KPI, input, empty state e status;
- light mode tratado como segundo sistema visual, nao como inversao.

Pontos fortes:

- e a familia mais madura em engenharia de tema;
- separa bem shell, painel, card, strip e estado;
- bom equilibrio entre densidade operacional e elegancia;
- documentação ja fala a lingua correta de sistema visual.

Limites:

- a linguagem e certa para dashboards, mas pesada demais para buscadores;
- se aplicada sem filtro em apps transacionais, pode endurecer interfaces que pedem acolhimento maior.

Veredito:

- dashboards devem ser a referencia da fundacao de tokens e da familia `analytics`.

## Gestao de Carregadores

Arquivos e evidencias principais:

- `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend\frontend\src\index.css`
- `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend\frontend\src\modules\operations\OperationsView.tsx`
- `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend\docs\REVISAO_UI_ESTADOS_OPERACIONAIS_2026-03-25.md`
- screenshot:
  - `C:\Users\jonathan-moletta\code\gestao-carregadores-oficial-frontend\docs\ui-smoke\dashboard-consolidacao-canonical.png`

Caracteristicas:

- composicao fortemente operacional;
- colunas por estado de negocio;
- KPI row com cromia alta;
- header compacto e denso;
- foco em decisao rapida;
- grande dependencia de classes hardcoded.

Pontos fortes:

- semantica operacional clara;
- boa leitura de estados e colunas;
- UX de trabalho em tempo real mais forte do que nos demais produtos.

Limites:

- cromia ainda muito direta e pouco governada;
- tipografia e superficies dependem demais de `slate` hardcoded;
- modo claro fica mais dificil de estabilizar sem antes refatorar tokens;
- ainda mistura decisao visual com decisao de negocio no mesmo componente.

Veredito:

- carregadores deve ser a referencia da familia `operations`;
- mas precisa adotar a fundacao semantica comum antes de virar modelo replicavel.

## Conclusao principal

Sim, existe base real para um padrao visual corporativo compartilhado.

Mas o padrao correto nao e uma skin unica para tudo.

O caminho certo e um sistema federado com:

1. uma fundacao comum;
2. tres familias de superficie;
3. variacao cromatica por contexto;
4. um workflow de validacao visual igual para todos.

## Arquitetura recomendada

## Camada 1: Fundacao corporativa unica

Esta camada deve ser compartilhada entre todas as aplicacoes.

### Tokens obrigatorios

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

### Regras

- componente nao conhece `white`, `black`, `slate-900` ou `text-gray-500`;
- componente consome papel semantico;
- light mode nunca nasce por inversao crua;
- status mantem significado entre apps, mesmo se o tom exato variar por familia.

## Camada 2: Shell corporativo unico

O shell compartilhado deve unificar:

- sidebar institucional;
- header de contexto;
- areas de filtro;
- cards de resumo;
- botoes primarios e secundarios;
- badges e chips;
- tabelas/listas/cards de estado vazio;
- inputs e modais.

Isso nao significa que todas as telas ficarao iguais.

Significa que:

- navegacao
- tipografia
- borda
- sombra
- foco
- comportamento claro/escuro

devem obedecer a mesma gramática visual.

## Camada 3: Familias de superficie

### Familia `search`

Referência atual:

- buscadores

Regra:

- hero e busca podem ter mais atmosfera;
- foco em entrada unica e refinamento;
- resultados em paineis elegantes;
- maior permisso para marca e acolhimento visual.

### Familia `analytics`

Referência atual:

- dashboards

Regra:

- fullscreen;
- metricas primeiro;
- densidade controlada;
- estabilidade;
- sem scroll global;
- sem cenografia excessiva.

### Familia `operations`

Referência atual:

- gestao de carregadores

Regra:

- leitura de estado e acao imediata;
- colunas e filas;
- semantica de negocio visivel;
- modais de decisao e feedback local;
- cromia disciplinada por significado operacional.

## O que deve ser padrao entre todas

- familia tipografica;
- escala de espacamento;
- raio de borda;
- intensidade de sombra;
- linguagem de status;
- linguagem de badges;
- comportamento de focus e hover;
- estrategia de claro/escuro;
- grid de header/sidebar;
- fluxo de revisao visual.

## O que nao deve ser igual em tudo

- composicao de pagina;
- densidade da tela;
- peso do hero;
- quantidade de atmosfera de fundo;
- estrutura de cards operacionais;
- distribuicao de filtros.

## Decisao de design system

### O que reaproveitar como fundacao

Dos dashboards:

- maturidade de tokens semanticos;
- estrategia correta de claro/escuro;
- regra de superficie, toolbar, KPI, empty state e track.

Dos buscadores:

- shell institucional com atmosfera;
- tratamento de hero, chips e paineis de busca;
- dominio de modo claro/escuro em tela de consulta.

De carregadores:

- semantica operacional;
- modelagem de estados;
- clareza de colunas e acao imediata.

### O que nao deve ser herdado sem filtro

Dos buscadores:

- glass pesado em telas operacionais densas.

Dos dashboards:

- rigidez fullscreen em apps de fluxo transacional.

De carregadores:

- hardcoded colors;
- dependencia de `slate-*`;
- cromia de KPI sem tokenizacao.

## Implicacao direta no codigo

## Buscadores

Mudanca necessaria: baixa.

Ja estao proximos do padrao. Precisam principalmente:

- alinhar nomenclatura de tokens a um contrato global;
- compartilhar primitives com os demais apps;
- formalizar shell e componentes centrais.

## Dashboards

Mudanca necessaria: media.

Ja sao a melhor base para fundacao. Precisam:

- extrair o contrato de tokens para fora da familia;
- separar fundacao corporativa de regras especificas de dashboard;
- exportar primitives compartilhaveis.

## Carregadores

Mudanca necessaria: alta.

Precisa:

- trocar cores hardcoded por tokens semanticos;
- separar shell, card, modal e estado de negocio;
- preparar light mode como sistema proprio;
- alinhar status, bordas, tipografia e superficies ao contrato comum.

## Proposta de rollout

### Fase 1

Consolidar o `Casa Civil Visual System` como documento central com:

- fundacao de tokens;
- familias `search`, `analytics`, `operations`;
- paleta institucional;
- regras de tipografia, borda, sombra, foco e status.

### Fase 2

Transformar isso em primitives compartilhadas:

- `AppShell`
- `Sidebar`
- `Topbar`
- `SectionHeader`
- `StatCard`
- `StatusBadge`
- `FilterBar`
- `SurfaceCard`
- `EmptyState`
- `ModalShell`

### Fase 3

Aplicar por ordem de menor risco:

1. buscadores
2. dashboards
3. carregadores

Motivo:

- buscadores e dashboards ja estao mais proximos do alvo;
- carregadores precisa de refactor mais estrutural.

### Fase 4

Formalizar validacao unica:

- Storybook primeiro quando existir;
- baseline local depois;
- runtime real por ultimo;
- claro e escuro obrigatorios;
- sem fechamento visual no olho sem evidencia.

## Veredito final

O padrao visual para todas as aplicacoes e viavel.

Mas ele deve ser:

- compartilhado na fundacao;
- especializado por familia de produto;
- validado com workflow unico;
- aplicado com prioridade em tokenizacao e semantica, nao em maquiagem cromatica.

Se a execucao for correta, o resultado nao sera "tudo com a mesma cara".

O resultado sera:

- tudo com a mesma gramática corporativa;
- cada familia preservando sua funcao e seu ritmo visual.
