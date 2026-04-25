# Phase 28 - Hub Idealized Frontend Proposal - 2026-04-09

## Objetivo

Materializar uma proposta idealizada de frontend para o hub e, por extensao, para o ecossistema operacional da Casa Civil RS.

Esta fase nao e implementacao. E a descricao do alvo visual e de experiencia:

- como o produto deve parecer;
- como cada tela deve se comportar;
- como `dark/light` deve coexistir;
- o que aproveitar dos buscadores;
- o que transformar no hub.

## Tese visual

O hub ideal deve parecer um **cockpit institucional de operacao**, nao um portal burocratico e nao um experimento de UI.

Ele precisa equilibrar tres coisas:

1. **credibilidade publica**
2. **clareza de produto**
3. **densidade operacional**

Em uma frase:

> Um produto de trabalho serio, elegante, escaneavel e claramente pertencente a Casa Civil do Estado do RS.

## Visual thesis

### Mood

- calmo
- tecnico
- institucional
- premium sem exibicionismo
- denso sem poluicao

### Materialidade

- painéis foscos e profundos
- contrastes limpos
- bordas discretas
- brilho controlado
- acentos pequenos e funcionais

### Energia

- menos vitrine
- mais comando
- menos efeitos cenograficos
- mais presenca por composicao

## Content plan do produto

### 1. Entrada

- login
- selector

Job:

- orientar e autenticar

### 2. Operacao

- dashboard
- meus chamados
- detalhe do ticket
- novo chamado/chat

Job:

- monitorar
- decidir
- agir

### 3. Atendimento

- agente/chat
- formularios
- confirmacao de abertura

Job:

- capturar contexto
- deixar o chamado correto
- confirmar antes de abrir

## Interaction thesis

As animacoes do hub devem ser poucas, mas memoraveis:

1. `Surface settle`
   - cada tela entra com um ajuste leve de opacidade e deslocamento vertical
   - objetivo: dar sensacao de produto lapidado, nao de render seco

2. `State pulse`
   - refresh, envio, draft pronto e submissao usam motion curto e muito funcional
   - objetivo: estado perceptivel sem barulho

3. `Context shift`
   - ao mudar entre `DTIC` e `SIS`, o shell nao troca de cara inteira; so recalibra luz, accent e pequenos markers
   - objetivo: mudar de ambiente sem parecer que saiu do produto

## A ideia geral de frontend

### O que nao fazer

- nao fazer um hub cheio de cards por todos os lados
- nao transformar tudo em vidro/brilho
- nao usar a marca do RS como textura o tempo todo
- nao lotar a interface de explicacao
- nao deixar cada tela com um "micro-estilo" proprio

### O que fazer

- trabalhar por **shell + surface archetype**
- dar ao produto uma estrutura visual unica
- permitir que cada tela tenha sua funcao sem perder a familia

## Arquitetura visual ideal

## 1. Institutional Layer

Elementos:

- brasao
- assinatura curta Casa Civil RS
- selo institucional

Regra:

- sempre presente
- nunca protagonista demais

Uso correto:

- login
- selector
- sidebar/topbar
- footer institucional minimo

Uso incorreto:

- fundo tematico espalhado
- repeticao de brasao em todo painel
- excesso de texto institucional em superficie operacional

## 2. Product Shell

Anatomia:

- sidebar esquerda
- topbar contextual
- page container
- area principal
- feedback discreto global

Comportamento:

- shell nao muda de estrutura entre telas
- so muda de contexto

O shell ideal do hub:

- sidebar compacta, densa, com leitura rapida
- topbar curta e forte
- page title claro
- action area previsivel

## 3. Surface Archetypes

As telas nao devem ser desenhadas uma a uma. Devem ser desenhadas por arquetipo.

### Auth Surface

Telas:

- login
- selector

Caracteristicas:

- composicao centrada
- hierarquia imediata
- pouco texto
- atmosfera institucional

### Dashboard Surface

Telas:

- `DTIC/dashboard`
- `SIS/dashboard`

Caracteristicas:

- leitura panoramica
- headline + kpis + board
- alto contraste
- comparacao rapida

### Workbench Surface

Telas:

- meus chamados
- ticket detail
- formularios operacionais

Caracteristicas:

- mais utilitaria
- menos cenografica
- densidade controlada
- lista, timeline, filtros e acoes fortes

### Agent Chat Surface

Tela:

- `DTIC/new-ticket`

Caracteristicas:

- calma
- centrada na conversa
- sem excesso de chrome
- resumo e confirmacao aparecem como consequencia natural

## A estrategia correta de dark and light

## O que os buscadores ja provaram

Os buscadores ja demonstram uma base importante:

- `dark` e `light` podem coexistir na mesma app;
- a chave tecnica correta e `semantic tokens` + `data-theme`;
- a troca de tema nao precisa reestruturar a aplicacao;
- a experiencia fica melhor quando o sistema nao depende de inversao bruta de cor.

Evidencia:

- [globals.css](C:\Users\jonathan-moletta\code\buscador-dtic\src\app\globals.css)
- [theme-toggle.tsx](C:\Users\jonathan-moletta\code\buscador-dtic\src\components\ui\theme-toggle.tsx)

## O que os dashboards ensinaram

Os dashboards registraram o ponto critico:

> modo claro nao deve nascer por inversao do modo escuro

Evidencia:

- [07-modo-claro-e-estrategia.md](C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\07-modo-claro-e-estrategia.md)

## Estrategia recomendada para o hub

### Fase interna

- construir `dark` e `light` sobre as mesmas foundations
- nao expor o toggle cedo demais
- validar visualmente tela a tela

### Regra de design

#### Dark mode

- modo operacional principal
- mais profundo
- mais focado
- ideal para acompanhamento e trabalho continuo

#### Light mode

- nao pode ser branco puro
- precisa parecer institucional e adulto
- deve usar fundos frios claros e paineis de off-white
- deve reduzir brilho e depender mais de composicao

### Recomendacao objetiva

O hub deve nascer preparado para `dark/light`, mas com rollout controlado.

O buscador serve como referencia tecnica.
O dashboard serve como alerta metodologico.

## Idealizacao por tela

## 1. Login ideal

### Papel

Autenticar com clareza e dar credibilidade institucional.

### Composicao ideal

- fundo profundo e calmo
- marca institucional no topo
- titulo curto
- uma frase de orientacao
- formulario simples
- zero excesso de rodape decorativo

### O que deve sair

- linhas cenograficas demais
- excesso de blur orbs
- footer tecnico longo
- microdetalhes visuais que competem com a autenticacao

### O que deve entrar

- headline mais curta
- descricao mais util
- credencial de rede explicada de forma direta
- layout mais solido e menos performatico

### Como deveria soar

- "Acesse o hub operacional"
- "Use sua credencial de rede"

Nao:

- discursos de plataforma ou convergencia

## 2. Selector ideal

### Papel

Escolher ambiente sem friccao.

### Composicao ideal

- uma tela de decisao
- dois ou tres blocos fortes
- labels curtos
- subtitulo direto
- contexto do usuario visivel, mas discreto

### O que deve sair

- textos de apoio demais
- indicadores secundarios sem valor
- excesso de chrome no topo e no rodape

### O que deve entrar

- decisao rapida
- cards mais secos
- acento por ambiente
- feedback claro de escolha ativa

## 3. Dashboard ideal

### Papel

Mostrar o estado operacional do contexto.

### Composicao ideal

Primeiro viewport:

- titulo + subtitulo operacional
- 4 ou 5 KPIs muito claros
- board ou painel central de atividade
- refresh/status discreto

### Caracter

- forte
- seco
- comparativo
- nada de textos explicativos demais

### Visual

- grandes massas
- pouca borda
- hierarquia via escala e contraste
- acentos pequenos

## 4. Meus Chamados ideal

### Papel

Ser a mesa de trabalho do usuario final.

### Composicao ideal

- topo: titulo + acao principal
- faixa de filtros simples
- lista principal dominante
- estados vazio/erro/loading muito claros

### Caracter

- mais utilitario do que o dashboard
- mais silencioso do que o chat

### O que deve mudar em relacao ao estado atual

- aumentar maturidade visual da lista
- alinhar com shell e chat
- parar de parecer "a tela menos desenhada do produto"

## 5. Chat ideal

### Papel

Abrir chamado com assistencia inteligente e confiavel.

### Composicao ideal

#### Coluna principal

- conversa
- mensagens
- composer

#### Coluna secundaria

- so aparece quando fizer sentido
- rascunho do chamado
- confirmacao
- estado da abertura

### Regras

- a conversa manda
- o resumo ajuda
- a interface nao explica demais o proprio funcionamento

### O que o chat ideal precisa transmitir

- "estou sendo atendido aqui"
- "o sistema entendeu"
- "o que falta esta claro"
- "nao vou abrir um chamado errado"

### O que precisa desaparecer

- copy mecanica
- rotulos artificiais
- sensacao de componente unico sobrecarregado

## 6. Ticket Detail ideal

### Papel

Ser o painel de leitura e acao do chamado.

### Composicao ideal

- coluna lateral com estado, ownership e acoes
- coluna principal com timeline e conversacao
- attachments integrados
- composer inferior muito claro

### Caracter

- mais denso
- mais serio
- mais operacional

### O que precisa melhorar

- hierarquia visual
- acabamento do composer
- integracao com a linguagem do resto do hub

## Exemplo de sistema visual idealizado para o hub

## Tipografia

- `Display`: Space Grotesk
- `Body/UI`: Inter
- `Operational Mono`: IBM Plex Mono

## Cores

### Base

- grafite profundo
- azul-ardosia frio
- off-white frio para light mode

### Contexto

- `DTIC`: azul institucional operacional
- `SIS manutencao`: ambar seco
- `SIS conservacao`: violeta patrimonial mais adulto

### Marca

- verde/vermelho/amarelo RS aparecem como camada institucional
- nunca como carnaval operacional

## Motion

- entrada curta
- refresh sutil
- feedback de estado curto
- troca de contexto leve

## Bordas e sombras

- bordas finas
- sombras curtas
- zero dependencia de glow para parecer premium

## Como o exemplo dos buscadores entra nisso

Os buscadores servem como **prova de abordagem**, nao como template direto.

Eles mostram corretamente:

- semantic tokens
- coexistencia `dark/light`
- identidade por contexto
- hero/search com boa hierarquia

Mas o hub nao deve copiar o buscador literalmente, porque o hub nao e uma busca. O que ele deve herdar e:

- o rigor do sistema de temas
- o uso de `data-theme`
- a coerencia de tokens
- a leitura limpa do dark e do light

## O frontend idealizado do ecossistema

Se o plano for bem executado, o ecossistema deveria convergir para isto:

### Buscadores

- poster/workspace
- mais atmosfericos
- mais orientados a busca

### Dashboards

- panoramicos
- mais informacionais
- foco em comparacao

### Hub

- cockpit operacional
- auth + shell + atendimento + ticketing
- centro de gravidade do ecossistema

### Carregadores

- workbench operacional especializado
- mais denso
- governanca visual de referencia

## O que isso implica no planejamento

1. O hub deve ser o primeiro produto a receber as foundations novas.
2. O sistema `dark/light` deve nascer por tokens e `data-theme`, como nos buscadores.
3. O light mode do hub deve ser tratado como segunda camada de sistema, nao como inversao do dark.
4. O chat deve ser redesenhado so depois das foundations e do shell.
5. O buscador deve servir como exemplo tecnico e o dashboard como exemplo metodologico.

## Sintese final

O frontend idealizado nao e um conjunto de telas bonitas.

E um sistema onde:

- cada tela faz seu trabalho;
- todas pertencem ao mesmo ecossistema;
- o usuario sente Casa Civil RS;
- o produto parece serio, atual e claro;
- `dark/light` coexistem sem improviso;
- o hub vira a referencia para todo o resto.
