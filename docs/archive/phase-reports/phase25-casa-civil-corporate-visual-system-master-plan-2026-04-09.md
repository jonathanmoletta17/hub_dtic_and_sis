# Phase 25 - Casa Civil Corporate Visual System Master Plan - 2026-04-09

## Objetivo

Definir um plano-mestre para tornar o ecossistema operacional da Casa Civil do Estado do RS:

- mais claro como produto;
- mais coerente como linguagem;
- mais consistente como interface;
- mais governavel como frontend;
- mais confiavel como experiencia de atendimento humano + agente.

Este documento nao implementa a mudanca. Ele consolida o estudo, a arquitetura-alvo e a ordem correta das acoes.

## Escopo analisado

Aplicacoes analisadas nesta rodada:

- `hub-operacional-web`
- `buscador-dtic`
- `buscador-sis-manutencao`
- `buscador-sis-conservacao`
- `dashboard-dtic-glpi`
- `dashboard-sis-manutencao`
- `dashboard-sis-conservacao`
- `gestao-carregadores-oficial`
- `gestao-carregadores-oficial-frontend`
- `gestao-carregadores-oficial-integrated`

## Base de evidencia

### Fontes locais

- O hub e o produto canonico do nucleo operacional em [BOOTSTRAP.md](C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md) e [README.md](C:\Users\jonathan-moletta\code\hub-operacional-web\README.md).
- Os buscadores compartilham a mesma base visual: os tres `globals.css` possuem o mesmo hash SHA256 `0D8B5A47737B6FEB1C6DD0FD34D72E0F560785ACDCDE393573A204CCD7315244`.
- Os dashboards compartilham a mesma base visual: os tres `globals.css` possuem o mesmo hash SHA256 `F97B8E9218FA1A024F293D96B7A591400EE3CD15968B5B54692E1BB782A7E1BF`.
- Os tres repositorios de carregadores compartilham o mesmo `index.css`: hash SHA256 `561879D041B4276CE95CAC35BF43CD5D17CDFF4B9BBDAACAF7C54BD4F33F760F`.
- O hub tem uma linguagem propria em [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css), [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx) e [themes.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\themes.json).
- Os dashboards ja possuem direcao visual formalizada em [04-direcao-visual-e-layout.md](C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\04-direcao-visual-e-layout.md) e uma matriz de tokens em [08-matriz-de-tokens-light-mode.md](C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\08-matriz-de-tokens-light-mode.md).
- O modulo de carregadores ja possui disciplina madura de revisao visual com Storybook, Chromatic, Percy e Playwright, conforme a base operacional lida via `operations-frontend://visual-review-stack`.

### Fontes institucionais externas

- O RS ja define um modelo institucional para sites com "unidade e consistencia na linguagem visual", cabecalhos padronizados, rodapes padronizados e paleta aderente ao manual de identidade em [Modelo Institucional - Matriz](https://matriz.rs.gov.br/novo-modelo-institucional).
- O manual oficial do Governo do RS 2023 formaliza marca, cores institucionais, tipografia institucional, aplicacao para site e favicon em [Manual de Identidade Visual do Governo do RS 2023](https://trabalho.rs.gov.br/upload/arquivos/202401/11090335-miv-o-futuro-nos-une.pdf).
- O Gov.br estabelece como principio que design systems publicos servem para manter unidade, consistencia, qualidade de interface, linguagem clara e experiencia unificada, mantendo flexibilidade por orgao, em [Manual de Diretrizes Gov.br](https://www.gov.br/governodigital/pt-br/legislacao/gov-br/gov_br_manual_de_diretrizes.pdf).

## Leitura objetiva do estado atual

### Familia 1 - Buscadores

Base:

- `Next 16`
- `React 19`
- `Tailwind 4`
- `Framer Motion`

Arquitetura visual observada:

- hero central forte;
- brasao em destaque;
- busca como elemento principal da pagina;
- atmosfera escura com `aurora mesh`;
- alternancia `dark/light`;
- transicao de hero para workspace apos interacao.

Arquivos-chave:

- [globals.css](C:\Users\jonathan-moletta\code\buscador-dtic\src\app\globals.css)
- [SearchPage.tsx](C:\Users\jonathan-moletta\code\buscador-dtic\src\modules\search\components\SearchPage.tsx)
- [layout.tsx](C:\Users\jonathan-moletta\code\buscador-dtic\src\app\layout.tsx)

Leitura:

- esta familia ja e uma plataforma visual coerente;
- o problema nao e identidade interna;
- o problema e a distancia dela para as demais familias.

### Familia 2 - Dashboards

Base:

- `Next 16`
- `React 19`
- `Tailwind 4`
- `Recharts`

Arquitetura visual observada:

- painel fullscreen;
- leitura de monitor/TV;
- tipografia `Space Grotesk` + `IBM Plex Mono`;
- fundo escuro institucional;
- densidade controlada;
- prioridade em metricas e comparacao.

Arquivos-chave:

- [globals.css](C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\src\app\globals.css)
- [layout.tsx](C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\src\app\layout.tsx)
- [04-direcao-visual-e-layout.md](C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\04-direcao-visual-e-layout.md)

Leitura:

- esta familia e a mais madura em direcao visual formalizada;
- ela ja pensa em tokens e superficies;
- ela e um forte candidato a origem dos padroes de dashboards corporativos.

### Familia 3 - Hub

Base:

- `Next 16`
- `React 19`
- `Tailwind 4`
- `Framer Motion`
- `Recharts`

Arquitetura visual observada:

- shell operacional com sidebar;
- contexto tematico por ambiente (`DTIC`, `SIS`, `SIS manutencao`, `SIS memoria`);
- linguagem dark-first;
- `Inter` + `JetBrains Mono`;
- UX ainda em transicao entre produto operacional e plataforma de atendimento.

Arquivos-chave:

- [globals.css](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css)
- [OperationalShell.tsx](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx)
- [themes.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\themes.json)

Leitura:

- o hub ja tem semantica de contexto;
- ele pode virar a superficie principal da linguagem corporativa;
- mas ainda nao e a base ideal de design system porque esta resolvendo produto e integracao ao mesmo tempo.

### Familia 4 - Gestao de Carregadores

Base:

- `React 18`
- `Vite`
- `Tailwind 3`
- `Storybook`
- `Playwright`

Arquitetura visual observada:

- workspace operacional denso;
- modais ricos;
- foco forte em estados de carregamento, estabilidade de header e revisao visual;
- disciplina de frontend mais madura do que o restante do ecossistema.

Arquivos-chave:

- [App.tsx](C:\Users\jonathan-moletta\code\gestao-carregadores-oficial\frontend\src\App.tsx)
- [index.css](C:\Users\jonathan-moletta\code\gestao-carregadores-oficial\frontend\src\index.css)
- [tailwind.config.js](C:\Users\jonathan-moletta\code\gestao-carregadores-oficial\frontend\tailwind.config.js)

Leitura:

- nao deve ser copiado visualmente como origem de linguagem institucional;
- deve ser usado como referencia de governanca visual e stack de revisao.

## Diagnostico consolidado

1. O ecossistema nao esta sem identidade. Ele esta com identidades demais.
2. Existem pelo menos quatro familias visuais validas, mas nao existe um sistema corporativo acima delas.
3. O problema principal nao e componente isolado. E falta de hierarquia entre:
   - marca institucional;
   - shell de produto;
   - arquetipo de superficie;
   - biblioteca de componentes;
   - copy operacional.
4. A maioria das apps ja esta em `Next 16 + React 19 + Tailwind 4`, o que facilita consolidacao tecnica.
5. O modulo de carregadores mostra que a maturidade desejada de revisao visual e possivel hoje, mas ainda nao foi adotada como regra transversal.
6. O agente Hermes agrava a percepcao de confusao porque a experiencia conversacional ainda nao esta alinhada com uma doutrina unica de linguagem e UX.

## Conceitos que precisam ser dominados antes de mexer

### 1. Design System

Nao e um pacote de botoes. E o sistema que define:

- tokens;
- grids;
- shells;
- componentes;
- comportamento;
- linguagem;
- revisao;
- governanca.

### 2. Tokens

Tokens sao a camada mais baixa e mais reutilizavel:

- cor
- espaco
- raio
- tipografia
- sombra
- motion
- opacidade

Sem tokens, cada app repete estilo. Com tokens, varias apps mudam de forma controlada.

### 3. Surface Archetype

Nem toda tela deve parecer igual. O padrao correto nasce por arquetipo:

- busca
- dashboard
- workspace operacional
- atendimento/chat
- autenticacao
- detalhe de ticket

O que precisa ser igual e a familia; o que pode variar e a composicao por tipo de trabalho.

### 4. Product Shell

Shell e a moldura persistente:

- header
- sidebar
- navegação
- contexto
- status global

Se o shell mudar demais entre apps, o usuario sente que entrou em produtos diferentes.

### 5. Conversation Design

Para agentes e chat, o valor nao esta em parecer humano. Esta em:

- entender o pedido;
- pedir o minimo necessario;
- falar a lingua da operacao;
- nunca perguntar a coisa errada;
- deixar claro o estado do chamado.

### 6. Visual Governance

Governanca visual e o que impede regressao silenciosa:

- stories
- snapshots
- revisao de estados
- criterios de aceite visuais
- pilotos controlados

Sem isso, o sistema visual se fragmenta novamente.

## Principios recomendados para o padrao corporativo Casa Civil RS

1. Um ecossistema, varios modulos.
2. Marca institucional contida, nao espalhada em excesso.
3. Dark-first operacional, com light-mode controlado onde fizer sentido.
4. Clareza > decoracao.
5. Densidade controlada para trabalho real.
6. Navegacao previsivel.
7. Contraste alto e acessibilidade como regra.
8. Contexto cromatico por dominio, sem virar carnaval de cores.
9. Copys operacionais e diretas.
10. Um unico sistema de validacao visual para todas as apps.

## Arquitetura-alvo recomendada

### Camada 1 - Fundacao institucional

Fonte:

- marca RS;
- assinatura Casa Civil;
- paleta institucional;
- regras de cabecalho/rodape;
- principios de comunicacao publica.

Saida:

- `Casa Civil Brand Foundations`

Observacao:

- nao copiar literalmente o portal institucional para apps operacionais;
- usar o manual como camada de identidade e credibilidade, nao como layout da ferramenta.

### Camada 2 - Fundacao de produto

Definir um pacote comum com:

- tokens semanticos;
- tipografia canonica;
- espacamento;
- bordas;
- sombras;
- motion;
- icones;
- estados.

Saida:

- `CCRS Design Tokens`

### Camada 3 - Arquetipos de superficie

Criar contratos separados para:

- `Search Surface`
- `Dashboard Surface`
- `Operational Workbench Surface`
- `Agent Chat Surface`
- `Auth Surface`

Saida:

- regras de layout;
- anatomia da tela;
- densidade;
- estados;
- anti-padroes.

### Camada 4 - Biblioteca de componentes

Criar primitivas e componentes compartilhados:

- shell
- topbar
- sidebar
- cards
- filters
- search input
- kpi card
- kanban column
- table/list
- status chip
- form field
- modal
- empty state
- alert state
- loading state
- agent message
- composer
- draft review card

### Camada 5 - Conteudo e linguagem

Normatizar:

- microcopy;
- labels;
- erros;
- empty states;
- confirmacoes;
- nomes reais de contexto;
- termos proibidos.

### Camada 6 - Governanca visual

Padronizar:

- Storybook ou equivalente;
- baseline visual local;
- gate de screenshots;
- docs de estados;
- checklist de revisao.

## Recomendacao de estrategia tecnica

### O que deve ser compartilhado primeiro

1. Tokens CSS / semantic tokens
2. Tipografia
3. Shells-base
4. Estados de loading/empty/error
5. Copy rules

### O que nao deve ser compartilhado de inicio

1. Componentes muito especificos de negocio
2. Toda a UI num pacote monolitico
3. Regras do agente misturadas com visual

### Recomendacao objetiva

Como os repositorios ainda nao estao em um monorepo unico, a fundacao deve nascer em duas camadas:

- camada normativa: documentacao, Figma, contratos, snapshots
- camada tecnica: package compartilhado de tokens/primitivas ou subtree controlado

O componente package completo deve vir depois dos tokens e dos arquetipos, nao antes.

## Ordem correta das frentes de trabalho

### Frente A - Inventario e diagnostico canonico

Objetivo:

- mapear todas as apps, familias, tokens, fontes, shells, padroes e divergencias.

Entregaveis:

- inventario de superfices;
- mapa de stacks;
- mapa de tipografia;
- mapa de cores e temas;
- mapa de componentes repetidos;
- mapa de textos e linguagem.

Gate:

- nenhuma app relevante fora do mapa;
- nenhuma decisao de design tomada antes do inventario.

### Frente B - Doutrina visual Casa Civil RS

Objetivo:

- transformar a identidade institucional e o contexto operacional em principios de produto.

Entregaveis:

- principios visuais;
- principios de conteudo;
- matriz de contrastes;
- regras de assinatura institucional;
- regras de uso de brasao e nomenclatura.

Gate:

- clareza sobre o que e institucional;
- clareza sobre o que e operacional;
- clareza sobre o que e proibido.

### Frente C - Design System Foundations

Objetivo:

- consolidar tokens, tipografia, grids e estados-base.

Entregaveis:

- semantic tokens;
- escalas de espacamento;
- escala tipografica;
- motion grammar;
- estados de feedback;
- guideline de acessibilidade.

Gate:

- um unico conjunto de foundations aprovado;
- tokens aplicaveis em `Next/Tailwind 4` e `React/Vite/Tailwind 3`.

### Frente D - Arquetipos corporativos

Objetivo:

- definir a anatomia oficial das familias de tela.

Entregaveis:

- `Search Surface`
- `Dashboard Surface`
- `Operational Workbench`
- `Agent Chat`
- `Auth`

Gate:

- cada app existente consegue ser classificada em um arquetipo principal.

### Frente E - Governanca visual

Objetivo:

- garantir que o sistema nao degrade.

Entregaveis:

- stack oficial de review visual;
- stories obrigatorias;
- snapshots;
- checklist de aceite;
- baseline por superficie critica.

Gate:

- regra oficial de que mudanca visual relevante nao entra sem coverage de estado.

### Frente F - Linguagem operacional

Objetivo:

- consolidar vocabulario real da Casa Civil para apps e agentes.

Entregaveis:

- glossario operacional;
- termos permitidos;
- termos proibidos;
- nomes canonicos de sistemas;
- frases de clarificacao;
- templates de erro/confirmacao.

Gate:

- evitar textos artificiais, inflados ou desalinhados do ambiente real.

### Frente G - Migracao por ondas

Objetivo:

- aplicar o sistema sem parar o ecossistema.

Ondas sugeridas:

1. Piloto foundations + shell
2. Buscadores
3. Dashboards
4. Hub
5. Agente/chat
6. Carregadores como convergencia de governanca e componentes

## Ordem recomendada de pilotagem

### Piloto 1 - Fundacao visual

Repositorios:

- `hub-operacional-web`
- `dashboard-dtic-glpi`
- `buscador-dtic`

Motivo:

- representam os tres arquetipos centrais do ecossistema.

### Piloto 2 - Governanca visual

Repositorio base:

- `gestao-carregadores-oficial`

Motivo:

- e a melhor referencia hoje para Storybook, loading discipline e review visual.

### Piloto 3 - Atendimento conversacional

Repositorios:

- `hub-operacional-web`
- `glpi-ticket-agent-mvp`

Motivo:

- a interface do chat so deve ser redesenhada depois que foundations, linguagem e shell estiverem definidos.

## Criticos de planejamento

### O que nao fazer

1. Nao redesignar cada app separadamente.
2. Nao escolher uma app atual e clonar para todas.
3. Nao confundir identidade institucional com portal institucional.
4. Nao subir um pacote de componentes antes da doutrina.
5. Nao acoplar visual do agente a heuristicas temporarias do Hermes.
6. Nao deixar validacao visual como atividade manual tardia.

### O que precisa ser decidido cedo

1. Tipografia canonica do ecossistema
2. Paleta institucional + acentos por dominio
3. Estrutura do shell corporativo
4. Arquetipos oficiais
5. Stack oficial de revisao visual
6. Fonte de verdade da linguagem
7. Estrategia de distribuicao de tokens/componentes entre repositorios

## Proposta de governanca

### Fonte de verdade

Criar uma superficie canonica de design corporativo com:

- foundations
- arquetipos
- componentes
- copy
- exemplos aprovados
- snapshots

Essa superficie pode nascer inicialmente dentro do proprio ecossistema atual, mas deve ser tratada como fonte normativa unica.

### Conselho de aprovacao

Toda mudanca relevante em produto/visual deve responder:

- respeita a identidade institucional?
- respeita o arquetipo da superficie?
- respeita a linguagem operacional?
- respeita a acessibilidade?
- possui evidencia visual?

## Criterios de sucesso

Considerar a estrategia bem-sucedida somente quando:

1. O usuario reconhece que todas as apps pertencem ao mesmo ecossistema.
2. Cada familia de tela tem identidade propria sem parecer outro produto.
3. O hub deixa de parecer uma excecao.
4. O chat/atendimento parece parte do produto e nao uma ferramenta acoplada.
5. Dashboards, buscadores e workbenches compartilham fundacao visual real.
6. Existe processo replicavel para evoluir UI sem recomeçar a discussao toda vez.

## Proximo passo recomendado

Abrir a Fase 26 como inventario canonico transversal do ecossistema, com estes entregaveis minimos:

1. matriz completa de apps e superficies
2. matriz de fontes, cores e tokens
3. matriz de componentes repetidos
4. matriz de copys e termos
5. proposta inicial de `Casa Civil Brand Foundations`
6. proposta inicial de `CCRS Design Tokens`
7. proposta inicial de `Search`, `Dashboard`, `Workbench` e `Agent Chat` como arquetipos oficiais

## Sintese final

E possivel construir uma versao clara e corporativa de todo o ecossistema.

Mas isso nao deve ser tratado como soma de ajustes visuais. O trabalho correto e:

- consolidar identidade;
- consolidar arquitetura de produto;
- consolidar linguagem;
- consolidar foundations;
- consolidar governanca.

Sem essa ordem, as apps continuam "bonitas por partes" e incoerentes no conjunto.
