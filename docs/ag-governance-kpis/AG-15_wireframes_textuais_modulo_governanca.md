# AG-15 - Wireframes Textuais do Modulo Governanca no Hub

Data: 2026-03-18

## 1. Objetivo

Traduzir a arquitetura do `AG-14` em uma visao de telas limpa e implementavel, preservando:

1. o shell visual do Hub
2. a ordem cognitiva do legado
3. a separacao entre resumo executivo e boards de aprofundamento

Estes wireframes sao deliberadamente de baixa fidelidade.

Eles servem para validar:

- hierarquia
- ritmo de leitura
- distribuicao de blocos
- relacao entre telas

Nao servem para fechar design final de cor, espacamento ou microinteracao.

## 2. Diretriz visual global

O modulo `Governanca` deve parecer parte do Hub, mas com clima mais documental que operacional.

Traducao pratica:

- manter sidebar, fundo e identidade do Hub
- reduzir densidade de cards e ruidao do analytics
- usar paineis grandes e respirados
- usar cor como estado e hierarquia, nao como ornamento

Formula visual:

```text
Hub shell atual
+ rigor documental do legado
+ menos ruido operacional
= tela de gestor coerente
```

## 3. Estrutura de navegacao interna do modulo

Todas as telas do modulo devem compartilhar a mesma subnavegacao:

```text
[Resumo Executivo] [Mapa] [Indicadores] [RACI] [POPs]
```

Comportamento:

1. sempre visivel no topo do modulo
2. abaixo do header global da pagina
3. ativa por rota, nao por estado local

## 4. Tela 1 - Resumo Executivo

Rota:

- `/dtic/governanca`

Pergunta que responde:

- "O que exige atencao ou decisao do gestor agora?"

Wireframe:

```text
+----------------------------------------------------------------------------------+
| Sidebar Hub | Header do modulo: Governanca / Resumo Executivo   [Periodo] [Sync]|
+----------------------------------------------------------------------------------+
| Subnav: [Resumo Executivo] [Mapa] [Indicadores] [RACI] [POPs]                   |
+----------------------------------------------------------------------------------+
| [Card: Aderencia geral] [Card: KPIs em alerta] [Card: Pendencias] [Card: Risco] |
+----------------------------------------------------------------------------------+
|                                                                                  |
|  +----------------------------------+  +--------------------------------------+  |
|  | DECISOES E PENDENCIAS            |  | INDICADORES CHAVE                    |  |
|  | - aprovacoes em aberto           |  | - 4 a 6 KPIs sinteticos              |  |
|  | - documentos sem evidencia       |  | - variacao vs periodo anterior       |  |
|  | - itens para comite              |  | - semaforo e tendencia               |  |
|  | [Ver mapa] [Ver evidencias]      |  | [Abrir indicadores]                  |  |
|  +----------------------------------+  +--------------------------------------+  |
|                                                                                  |
|  +----------------------------------+  +--------------------------------------+  |
|  | MAPA DE GOVERNANCA (preview)     |  | RESPONSABILIZACAO E EXECUCAO         |  |
|  | - snapshot simplificado          |  | - processos criticos sem owner       |  |
|  | - 1 clique leva ao board Mapa    |  | - POPs pendentes/revisao             |  |
|  | [Abrir mapa completo]            |  | [Abrir RACI] [Abrir POPs]            |  |
|  +----------------------------------+  +--------------------------------------+  |
+----------------------------------------------------------------------------------+
| Faixa inferior opcional: evidencias recentes / ultima atualizacao / observacoes  |
+----------------------------------------------------------------------------------+
```

Leitura esperada:

1. primeiro, estado geral
2. depois, o que exige decisao
3. depois, qual trilha seguir

O que nao entra nesta tela:

- tabela longa
- grafo completo
- listao de tickets
- matriz RACI inteira

## 5. Tela 2 - Mapa de Governanca

Rota:

- `/dtic/governanca/mapa`

Pergunta que responde:

- "Como norma, estrategia, processo e execucao se conectam?"

Wireframe:

```text
+----------------------------------------------------------------------------------+
| Sidebar Hub | Header do modulo: Governanca / Mapa de Governanca  [Busca de node]|
+----------------------------------------------------------------------------------+
| Subnav: [Resumo Executivo] [Mapa] [Indicadores] [RACI] [POPs]                   |
+----------------------------------------------------------------------------------+
|                                                                                  |
|  +--------------------------------------------------------------------------+    |
|  | NIVEL 1  Normativas externas                                             |    |
|  +--------------------------------------------------------------------------+    |
|              | exige/orienta                    | institui/alinha                |
|  +---------------------------+        +---------------------------+              |
|  | NIVEL 2  PDTI / PSI       |------->| NIVEL 2  CIG-TIC / SI    |              |
|  +---------------------------+        +---------------------------+              |
|                     | desdobra/complementa                                        |
|  +--------------------------------------------------------------------------+    |
|  | NIVEL 3  INs DTIC                                                     |      |
|  +--------------------------------------------------------------------------+    |
|                     | operacionaliza                                           |
|  +--------------------------------------------------------------------------+    |
|  | NIVEL 4  Manual Operacional                                           |      |
|  +--------------------------------------------------------------------------+    |
|           |                         |                         |                  |
|      [KPIs]                    [RACI]                    [POPs]                 |
|                                                                                  |
+----------------------------------------------------------------------------------+
| Painel lateral / drawer de evidencia abre a partir do node selecionado          |
+----------------------------------------------------------------------------------+
```

Comportamentos obrigatorios:

1. hover e selecao por relacao
2. drawer de evidencia pela direita
3. atalhos para `Indicadores`, `RACI` e `POPs`

O que preservar do legado:

- narrativa vertical
- labels semanticos entre niveis
- detalhe documental sem sair da tela

## 6. Tela 3 - Indicadores

Rota:

- `/dtic/governanca/indicadores`

Pergunta que responde:

- "Quais indicadores existem, o que medem e onde ha alerta?"

Wireframe:

```text
+----------------------------------------------------------------------------------+
| Sidebar Hub | Header do modulo: Governanca / Indicadores      [Periodo] [Filtro]|
+----------------------------------------------------------------------------------+
| Subnav: [Resumo Executivo] [Mapa] [Indicadores] [RACI] [POPs]                   |
+----------------------------------------------------------------------------------+
| [Card total de movimentacao] [Card qtd KPIs ativos] [Card qtd KPIs estrategicos]|
+----------------------------------------------------------------------------------+
| KPIs ativos                                                                       |
+----------------------------------------------------------------------------------+
| +--------------+ +--------------+ +--------------+ +--------------+             |
| | KPI 01       | | KPI 02       | | KPI 03       | | KPI 04       |             |
| | valor/meta   | | valor/meta   | | valor/meta   | | valor/meta   |             |
| | semaforo     | | semaforo     | | semaforo     | | semaforo     |             |
| | owner/fonte  | | owner/fonte  | | owner/fonte  | | owner/fonte  |             |
| | [Ver RACI]   | | [Ver POP]    | | [Evidencia]  | | [Detalhes]   |             |
| +--------------+ +--------------+ +--------------+ +--------------+             |
|                                                                                  |
| KPIs estrategicos / roadmap                                                      |
+----------------------------------------------------------------------------------+
| +--------------+ +--------------+ +--------------+                              |
| | KPI 05       | | KPI 06       | | KPI 07       |                              |
| | status road  | | status road  | | status road  |                              |
| | owner        | | owner        | | owner        |                              |
| +--------------+ +--------------+ +--------------+                              |
+----------------------------------------------------------------------------------+
```

Regra de leitura:

1. primeiro, estado agregado
2. depois, KPIs ativos
3. por fim, KPIs estrategicos

Importante:

- esta tela continua sendo um catalogo, nao um cockpit
- o gestor aprofunda por card, nao por mural estatistico

## 7. Tela 4 - RACI

Rota:

- `/dtic/governanca/raci`

Pergunta que responde:

- "Quem responde por cada processo e onde ha vazio de responsabilizacao?"

Wireframe:

```text
+----------------------------------------------------------------------------------+
| Sidebar Hub | Header do modulo: Governanca / Matriz RACI        [Busca] [Filtro]|
+----------------------------------------------------------------------------------+
| Subnav: [Resumo Executivo] [Mapa] [Indicadores] [RACI] [POPs]                   |
+----------------------------------------------------------------------------------+
| Faixa de alerta: [Processos sem A] [Processos sem R] [Itens em revisao]         |
+----------------------------------------------------------------------------------+
| Processo                | Gestor | Coordenacao | Tecnico | Apoio | Evidencias    |
+----------------------------------------------------------------------------------+
| Atendimento inicial     |   A    |     R       |    C    |   I   | [Abrir]       |
| Incidente critico       |   A    |     C       |    R    |   I   | [Abrir]       |
| Mudanca programada      |   A    |     R       |    C    |   I   | [Abrir]       |
| Backup e restauracao    |   A    |     C       |    R    |   I   | [Abrir]       |
| ...                                                                            |
+----------------------------------------------------------------------------------+
| Coluna Processo fixa | Header sticky | clique em processo abre drawer lateral    |
+----------------------------------------------------------------------------------+
```

Comportamento chave:

1. destacar vazio de ownership
2. permitir salto para KPI e POP relacionados
3. abrir evidencias sem sair da tabela

O que evitar:

- transformar a tabela em grid visualmente pesado
- adicionar excesso de filtros antes de validar uso real

## 8. Tela 5 - POPs e Processos

Rota:

- `/dtic/governanca/pops`

Pergunta que responde:

- "Como os processos sao executados e quais procedimentos precisam revisao?"

Wireframe:

```text
+----------------------------------------------------------------------------------+
| Sidebar Hub | Header do modulo: Governanca / POPs e Processos  [Busca] [Cluster]|
+----------------------------------------------------------------------------------+
| Subnav: [Resumo Executivo] [Mapa] [Indicadores] [RACI] [POPs]                   |
+----------------------------------------------------------------------------------+
| [Cluster: Service Desk] [Cluster: Seguranca] [Cluster: Continuidade] [Todos]    |
+----------------------------------------------------------------------------------+
| +----------------------------------+  +--------------------------------------+  |
|  | POP 01                           |  | POP 02                               |  |
|  | nome do processo                 |  | nome do processo                     |  |
|  | owner / ultima revisao           |  | owner / ultima revisao               |  |
|  | status da documentacao           |  | status da documentacao               |  |
|  | etapas: [1]--[2]--[3]--[4]       |  | etapas: [1]--[2]--[3]                |  |
|  | [Ver evidencias] [Ver RACI]      |  | [Ver KPI] [Abrir POP]                |  |
|  +----------------------------------+  +--------------------------------------+  |
|                                                                                  |
| +----------------------------------+  +--------------------------------------+  |
|  | POP 03                           |  | POP 04                               |  |
|  | ...                              |  | ...                                  |  |
|  +----------------------------------+  +--------------------------------------+  |
+----------------------------------------------------------------------------------+
```

Foco:

- navegacao por processo
- status documental
- rastreabilidade para KPI, RACI e evidencia

## 9. Drawer transversal de evidencia

Todas as telas acima compartilham o mesmo padrao de detalhe:

```text
+---------------------------------------+
| Drawer lateral: Evidencia / Detalhe   |
+---------------------------------------+
| Titulo                                |
| Tipo de item                          |
| Owner                                 |
| Origem / norma / referencia           |
| Documentos anexos                     |
| Historico de revisao                  |
| Links relacionados: KPI / RACI / POP  |
+---------------------------------------+
```

Este drawer e parte central da experiencia. Sem ele, o modulo perde a materialidade que fazia o legado funcionar.

## 10. Fluxo recomendado do gestor

Fluxo principal:

1. entra em `/dtic/governanca`
2. le `Resumo Executivo`
3. escolhe trilha:
   - risco normativo -> `Mapa`
   - performance -> `Indicadores`
   - ownership -> `RACI`
   - execucao -> `POPs`
4. abre drawer de evidencia quando precisar materializar o tema
5. desce para modulo operacional apenas se houver necessidade de caso concreto

## 11. Regras de composicao para evitar "bagunca"

1. Uma pergunta por tela.
2. No maximo dois blocos grandes por linha na home executiva.
3. Cards sinteticos no topo; detalhe no meio; apoio no rodape.
4. Sem empilhar grafo + tabela + lista + catalogo na mesma superficie.
5. Se um bloco precisar de mais de 2 niveis de leitura, ele virou tela propria.

## 12. Decisao de design resultante

O modulo do gestor deve parecer:

- mais estrategico que o `Painel`
- menos exibicionista que o `Dashboard` analytics
- mais claro e institucional que o concept board anterior

Em resumo:

```text
tecnico -> opera no Painel
gestor -> decide em Governanca
analytics -> apoia ambos como leitura complementar
```

## 13. Proxima etapa recomendada

Se estes wireframes estiverem corretos, o proximo passo nao e codar ainda.

O proximo passo certo e produzir um mockup limpo de:

1. `Resumo Executivo`
2. `Mapa de Governanca`

Essas duas telas bastam para validar se a integracao respeita o legado e conversa com o Hub atual.
