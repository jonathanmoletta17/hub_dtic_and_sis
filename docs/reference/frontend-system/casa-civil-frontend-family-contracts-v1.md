# Casa Civil Frontend Family Contracts v1

## Objetivo

Definir os contratos das familias de produto do `Casa Civil Frontend System v2`.

Este documento traduz a fundacao comum em linguagem de produto.

Regra central:

- a fundacao e compartilhada;
- a familia define composicao, densidade, ritmo visual e heuristicas de uso;
- familia nao pode quebrar semantica da fundacao.

Base de referencia:

- [casa-civil-frontend-system-v2.md](casa-civil-frontend-system-v2.md)
- [casa-civil-frontend-foundation-contract-v1.md](casa-civil-frontend-foundation-contract-v1.md)

## Regra comum para todas as familias

Toda familia:

- consome os mesmos tokens de fundacao;
- respeita a mesma semantica de status;
- respeita a mesma escala de tipografia, spacing, border e focus;
- tem stories reais de seus estados principais;
- define o que e composicao propria e o que e primitive compartilhada.

## Familia 1 - `workspace-shell`

## Papel

Dar coesao institucional e operacional para:

- login
- selector
- hub
- shell de futuras apps

## Tipo de tarefa dominante

- entrada
- orientacao
- mudanca de contexto
- navegacao
- leitura de estado global

## Ritmo visual

- limpo
- seco
- confiavel
- institucional

## Heuristicas

- navegacao precisa ser imediatamente compreensivel;
- contexto precisa estar visivel sem poluicao;
- a interface nao pode parecer “produto de marketing”;
- a acao primaria deve ser inequívoca;
- excesso de blocos paralelos deve ser evitado.

## Componentes tipicos

- sidebar institucional
- topbar de contexto
- cards de ambiente
- login shell
- command surfaces curtas
- lista curta de acessos ou servicos

## Densidade

- baixa a media

## Light/dark

- pode manter sidebar escura como identidade institucional;
- light mode precisa reduzir ruído, nao lavar a tela;
- dark mode nao pode parecer pesado demais para telas de entrada.

## O que herdar do portfolio atual

Principal referencia:

- hub

## O que evitar

- hero cenografico vazio
- excesso de texto explicativo
- superficie com look de dashboard
- glass pesado desnecessario

## Familia 2 - `search`

## Papel

Servir tarefas centradas em:

- busca
- refinamento
- leitura de resultado
- comparacao de ocorrencias

## Tipo de tarefa dominante

- encontrar
- filtrar
- priorizar
- abrir detalhe

## Ritmo visual

- concentrado
- elegante
- acolhedor sem perder objetividade

## Heuristicas

- o campo de busca e o centro real da tela;
- o resultado precisa ser mais importante que a moldura;
- atmosfera visual pode existir, mas nao competir com a busca;
- filtros precisam ficar legiveis e organizados por prioridade;
- resultado vazio precisa orientar proximo passo.

## Componentes tipicos

- hero de busca
- campo principal
- chips de filtro
- cards de resultado
- lista de resultados
- paineis de apoio

## Densidade

- media

## Light/dark

- pode usar atmosfera e acento contextual;
- light mode precisa continuar premium sem virar branco burocratico;
- dark mode pode manter profundidade moderada.

## O que herdar do portfolio atual

Principal referencia:

- buscadores

## O que evitar

- rigidez fullscreen de dashboard
- cards operacionais duros
- redundancia entre hero, filtros e resultados

## Familia 3 - `analytics`

## Papel

Servir leitura operacional e comparativa de dados agregados.

## Tipo de tarefa dominante

- monitorar
- comparar
- detectar carga
- identificar anomalia
- acompanhar janela temporal

## Ritmo visual

- rapido
- rigoroso
- denso
- estavel

## Heuristicas

- metricas precisam ser lidas a distancia;
- a tela deve funcionar como “parede operacional”;
- scroll global deve ser evitado;
- comparacao entre blocos deve ser imediata;
- empty states e loading states nao podem quebrar a geometria.

## Componentes tipicos

- kpi row
- ranking strip
- top lists
- filtros de periodo
- painéis comparativos
- charts e barras ranqueadas

## Densidade

- media a alta

## Light/dark

- dark mode segue forte como baseline;
- light mode deve ser sistema proprio, mais frio e seco;
- borda e track precisam aparecer mais no claro do que no dark.

## O que herdar do portfolio atual

Principal referencia:

- dashboards

## O que evitar

- glass search-style
- cards altos demais
- excesso de texto
- comportamento de app transacional em tela de monitoramento

## Familia 4 - `operations`

## Papel

Servir trabalho em tempo real orientado a estado e acao.

## Tipo de tarefa dominante

- alocar
- decidir
- mover
- confirmar
- resolver excecao

## Ritmo visual

- direto
- energico
- operacional
- controlado

## Heuristicas

- estado precisa ser entendido antes do detalhe;
- acao principal precisa estar proxima da decisao;
- colunas e filas devem refletir a regra de negocio;
- semanticamente, agrupamento errado e pior que imperfeicao estetica;
- badge, coluna e estatistica precisam falar a mesma lingua.

## Componentes tipicos

- colunas por estado
- kpis de capacidade
- modais de acao
- detalhes operacionais
- header com contexto de turno/janela
- feedback local

## Densidade

- alta

## Light/dark

- dark mode deve continuar dominante nas primeiras iteracoes;
- light mode precisa nascer so depois da tokenizacao;
- cromia de status deve ser disciplinada por semantica, nao por impacto visual bruto.

## O que herdar do portfolio atual

Principal referencia:

- gestao de carregadores

## O que evitar

- cores hardcoded
- dependencia de `slate-*`
- mistura entre agrupamento visual e regra de negocio
- grid decorativo sem semantica

## Relacao entre familias

## O que deve variar

- composicao
- densidade
- peso do hero
- intensidade atmosferica
- formato dos painéis
- proximidade entre dado e acao

## O que nao deve variar

- semantica de status
- tokens-base
- foco
- acessibilidade minima
- regras de light/dark
- primitives compartilhadas

## Regras de transbordo

Quando uma superficie parecer misturar duas familias:

- escolher a familia dominante pela tarefa principal;
- herdar componentes secundarios da outra familia apenas quando fizer sentido;
- nunca copiar a composicao inteira de uma familia para outra.

Exemplos:

- um buscador com painéis auxiliares continua sendo `search`;
- um dashboard com acao secundaria continua sendo `analytics`;
- uma tela operacional com ranking historico continua sendo `operations`.

## Criterio de classificacao de nova superficie

Perguntas:

1. o usuario esta entrando, navegando ou trocando contexto?
   - `workspace-shell`
2. o usuario esta tentando encontrar algo?
   - `search`
3. o usuario esta monitorando e comparando?
   - `analytics`
4. o usuario esta decidindo e agindo sobre estados vivos?
   - `operations`

Se a resposta der empate, usar a tarefa primaria e registrar a decisao.

## Regra de governanca

Nenhuma nova superficie deve nascer sem familia declarada.

Se a familia nao estiver clara:

- discovery e IA ainda nao fecharam;
- logo, a tela ainda nao esta pronta para ideation e implementacao.

## Proximo passo

Depois dos contratos de familia, o sistema precisa fechar:

1. protocolo de validacao
2. skillset modular

Sem esses dois artefatos, as familias ficam corretas no papel e instaveis na execucao.
