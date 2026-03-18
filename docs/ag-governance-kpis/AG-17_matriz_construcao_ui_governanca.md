# AG-17 - Matriz de Construcao da UI do Modulo Governanca

Data: 2026-03-18

## 1. Objetivo

Traduzir a auditoria de dados reais (`AG-16`), a arquitetura de navegacao (`AG-14`) e os wireframes textuais (`AG-15`) em um criterio operacional de construcao de tela.

Este documento responde:

1. o que entra em cada rota do modulo `Governanca`
2. qual o nivel de verdade de cada bloco
3. qual fonte real sustenta cada informacao
4. o que pode entrar agora, o que entra como proxy e o que deve ficar fora ate nova integracao

## 2. Regra central de produto

Nenhum bloco visual do modulo `Governanca` deve misturar, sem rotulo explicito, informacoes de naturezas diferentes.

Cada informacao precisa nascer marcada em uma destas classes:

1. `LIVE`
   - dado operacional calculado diretamente de fonte real em execucao
2. `PROXY`
   - indicador derivado util, mas que nao representa fielmente o KPI oficial
3. `EXTERNO`
   - indicador valido, mas dependente de fonte fora do GLPI puro
4. `NORMATIVO`
   - conteudo mestre de governanca: documento, RACI, POP, ownership, alinhamento
5. `EVIDENCIA`
   - anexo, documento, logica de relacao ou dado operacional que sustenta um item normativo

Regra de interface:

- `LIVE` pode aparecer como numero principal
- `PROXY` pode aparecer, mas com badge explicito de proxy
- `EXTERNO` nao deve aparecer como se estivesse calculado enquanto a integracao nao existir
- `NORMATIVO` nao deve aparecer como dado "descoberto" automaticamente
- `EVIDENCIA` deve aparecer como trilha de sustentacao, nao como headline

## 3. Rotas-alvo do modulo

Conforme `AG-14`, o modulo fica distribuido assim:

1. `/dtic/governanca`
2. `/dtic/governanca/mapa`
3. `/dtic/governanca/indicadores`
4. `/dtic/governanca/raci`
5. `/dtic/governanca/pops`

## 4. Inventario mestre por tipo de informacao

| Item | Tipo | Fonte primaria | Estado atual | Observacao de produto |
| --- | --- | --- | --- | --- |
| SLA cumprido | LIVE | GLPI / Hub backend | Disponivel hoje | Exibir com badge de `fallback virtual` quando aplicavel |
| TMA | LIVE | GLPI / Hub backend | Disponivel hoje | Pode ser headline |
| TME | LIVE | GLPI real | Dado existe, nao portado no Hub | Pode entrar apos port do backend |
| Incidentes por severidade | LIVE | GLPI / Hub backend | Disponivel hoje | Exibir ressalva de classificacao manual |
| % Reincidencia | LIVE | GLPI / Hub backend | Disponivel hoje | Pode ser headline |
| Abertos/fechados | LIVE | GLPI / Hub backend | Disponivel hoje | Pode ser headline ou apoio |
| Mudancas de Sala / Layout | PROXY | GLPI + busca textual | Existiu no legado | Nao vender como KPI oficial |
| % Mudancas com sucesso | EXTERNO/NAO COBERTO | workbook oficial pede regra mais forte | Nao sustentado hoje | Nao publicar como live |
| Disponibilidade | EXTERNO | Zabbix / monitoramento | Nao integrado | Mostrar somente como placeholder de roadmap |
| % Backups testados | EXTERNO | ferramenta/processo de backup | Nao integrado | Nao publicar como numero real |
| % Sistemas com PCN atualizado | EXTERNO | portfolio / gestao de continuidade | Nao integrado | Nao publicar como numero real |
| Matriz RACI | NORMATIVO | planilha oficial + validacao institucional | Disponivel em documento | Nao inferir do GLPI |
| POPs | NORMATIVO | caderno de POPs + manual | Disponivel em documento | Nao inferir do GLPI |
| Mapa normativo | NORMATIVO | dossie, PDTI, PSI, INs | Disponivel em documento | Eixo narrativo do modulo |
| Evidencias de execucao | EVIDENCIA | tickets, logs, tasks, followups, docs | Parcialmente disponivel | Alimenta drawers e relacoes |

## 5. Tela a tela: o que entra e como entra

## 5.1 Resumo Executivo

Rota:

- `/dtic/governanca`

Papel da tela:

- sintetizar o que exige decisao do gestor agora
- distribuir o gestor para boards especializados

### Blocos recomendados

| Bloco | Tipo dominante | Pode entrar agora | Fonte real | Como deve aparecer | O que evitar |
| --- | --- | --- | --- | --- | --- |
| Aderencia geral do modulo | NORMATIVO + EVIDENCIA | Parcial | documentos + status manual de aderencia | semaforo textual, nao percentual inventado | numero sintetico sem metodo claro |
| KPIs em alerta | LIVE | Sim | SLA, TMA, TME, reincidencia, incidentes | cards de alerta com variacao e owner | incluir metricas estrategicas nao integradas |
| Pendencias de documento/processo | NORMATIVO + EVIDENCIA | Parcial | RACI, POPs, docs, validacao institucional | lista curta de pendencias | tratar ausencia de metadado como fato automatico |
| Risco operacional | LIVE + NORMATIVO | Sim | combinacao de KPI live e regra de negocio | card resumido com criterios explicitados | score opaco sem explicacao |
| Snapshot do mapa | NORMATIVO | Sim | dossie + cadeia normativa | preview navegavel | tentar resumir tudo em um unico grafo denso |
| Responsabilizacao em risco | NORMATIVO + EVIDENCIA | Parcial | RACI oficial + evidencias relacionadas | contador de processos sem validacao/evidencia | inferir ownership por ticket |

### Composicao recomendada da home

1. linha 1: `KPIs em alerta`, `Pendencias`, `Risco`, `Ultima atualizacao`
2. linha 2: `Decisoes e pendencias` + `Indicadores-chave`
3. linha 3: `Preview do Mapa` + `Responsabilizacao e execucao`

### KPIs que podem entrar na home

Somente estes:

1. SLA
2. TMA
3. TME
4. Incidentes
5. % Reincidencia
6. Abertos/fechados

Recomendacao:

- limitar a home a 4 ou 6 indicadores sinteticos
- deixar o catalogo completo para `/indicadores`

## 5.2 Mapa de Governanca

Rota:

- `/dtic/governanca/mapa`

Papel da tela:

- explicar encadeamento entre norma, estrategia, processo e execucao

### Blocos recomendados

| Bloco | Tipo dominante | Pode entrar agora | Fonte real | Como deve aparecer | O que evitar |
| --- | --- | --- | --- | --- | --- |
| Cadeia normativa principal | NORMATIVO | Sim | Dossie, PDTI, PSI, INs | nodes em niveis com labels de relacao | transformar em mural textual |
| Cards KPI / RACI / POP como desdobramentos | NORMATIVO + LIVE | Sim | matriz oficial + auditoria de metricas | atalhos para boards | mostrar numero live dentro do node sem contexto |
| Drawer documental do node | EVIDENCIA | Sim | docs e anexos | painel lateral com origem, revisao, anexos e links relacionados | abrir nova pagina para cada clique |
| Evidencia operacional associada | EVIDENCIA + LIVE | Parcial | GLPI, logs, tickets, consultas | secao secundaria do drawer | sugerir prova operacional onde nao existe |

### Regra de verdade do Mapa

O `Mapa` e predominantemente normativo.

Portanto:

- a visualizacao principal e de relacao entre documentos e estruturas
- dados live entram apenas como evidencia associada ou como atalho para `Indicadores`
- o grafo nao deve ser tratado como dashboard estatistico

## 5.3 Indicadores

Rota:

- `/dtic/governanca/indicadores`

Papel da tela:

- catalogar indicadores, separar os realmente medidos dos estrategicos e explicitar fonte, owner e metodo

### Segmentacao obrigatoria da pagina

A tela precisa nascer separada em tres secoes:

1. `KPIs live`
2. `Indicadores proxy`
3. `Indicadores estrategicos dependentes de integracao`

### Matriz de cards

| Grupo | Itens | Tipo | Estado atual | Tratamento visual |
| --- | --- | --- | --- | --- |
| KPIs live | SLA, TMA, TME, Incidentes, Reincidencia, Abertos/Fechados | LIVE | 5 no Hub hoje, 1 pronto para portar | cards completos com valor, meta, tendencia, owner, fonte e links |
| Proxy operacional | Mudancas de Sala / Layout | PROXY | existiu no legado | card proprio com badge `proxy operacional` |
| Estrategicos | Disponibilidade, Backups testados, PCN atualizado | EXTERNO | sem integracao atual | cards sem numero ou com estado `fonte nao integrada` |
| KPI oficial em disputa | % Mudancas com sucesso | EXTERNO/NAO COBERTO | nao sustentado no GLPI atual | nao publicar como calculado enquanto nao houver definicao metodologica |

### Estrutura minima de cada card de KPI

1. nome oficial
2. badge de tipo: `live`, `proxy`, `externo`
3. valor atual
4. meta e semaforo
5. owner oficial
6. fonte
7. links: `Ver RACI`, `Ver POP`, `Ver Evidencia`

### Regras fortes para esta tela

1. o workbook oficial e a fonte primaria do catalogo
2. `constants.ts` legado nao pode sobrescrever ownership ou periodicidade sem validacao
3. o card de KPI precisa mostrar claramente se o numero e:
   - calculado agora
   - proxy
   - aguardando integracao

## 5.4 RACI

Rota:

- `/dtic/governanca/raci`

Papel da tela:

- mostrar responsabilizacao oficial por processo e vazios de governanca

### Blocos recomendados

| Bloco | Tipo dominante | Pode entrar agora | Fonte real | Como deve aparecer | O que evitar |
| --- | --- | --- | --- | --- | --- |
| Matriz RACI principal | NORMATIVO | Sim | `RACI_DTIC.xlsx` validado | tabela principal | reconstruir por heuristica de grupos/tickets |
| Alertas de lacuna | NORMATIVO | Parcial | comparacao entre matriz, revisao e evidencias | faixa superior com contadores | calcular automaticamente sem regra formal |
| Drawer de processo | NORMATIVO + EVIDENCIA | Sim | processo, RACI, POP, KPI, docs | painel lateral relacionado | abrir modais fragmentados demais |
| Evidencias operacionais do processo | EVIDENCIA | Parcial | tickets, changes, logs, docs | bloco secundario no drawer | sugerir causalidade sem amarracao metodologica |

### Regra de modelagem

RACI no Hub deve ser armazenado como dado mestre versionado.

Campos minimos recomendados:

1. processo
2. sigla/cluster
3. responsaveis por papel
4. versao
5. data de vigencia
6. referencias documentais
7. links para KPIs relacionados
8. links para POPs relacionados

## 5.5 POPs

Rota:

- `/dtic/governanca/pops`

Papel da tela:

- tornar navegavel o caderno de procedimentos e sua relacao com KPI, RACI e evidencia

### Blocos recomendados

| Bloco | Tipo dominante | Pode entrar agora | Fonte real | Como deve aparecer | O que evitar |
| --- | --- | --- | --- | --- | --- |
| Cards/lista de POPs | NORMATIVO | Sim | caderno de POPs + manual | catalogo por processo/cluster | tentar transformar POP em log de execucao |
| Status documental | NORMATIVO | Parcial | metadata de revisao/versionamento | selo de revisao, owner e vigencia | inventar status se o metadado ainda nao existir |
| Etapas resumidas | NORMATIVO | Sim | conteudo documental | mini fluxo no card | fluxo detalhado demais na grid |
| Evidencias operacionais | EVIDENCIA | Parcial | tickets, changes, followups | drawer relacionado | prometer rastreabilidade automatica total |

### Regra de construcao

POPs precisam ser navegados como biblioteca processual.

O relacionamento correto e:

- `POP -> RACI`
- `POP -> KPI`
- `POP -> Documentos`
- `POP -> Evidencias operacionais`

Nao:

- `POP = lista automatica de tickets`

## 6. Sistema de badges e rotulos obrigatorios

Para evitar ambiguidade semantica, a UI deve ter um contrato visual fixo.

### Tipos de badge

| Badge | Significado | Uso |
| --- | --- | --- |
| `LIVE` | calculado de fonte operacional real | KPI e detalhe de evidencia |
| `PROXY` | derivado util, nao oficial | indicador adaptado |
| `EXTERNO` | depende de outra integracao/fonte | KPI estrategico ainda nao integrado |
| `NORMATIVO` | definicao, regra, ownership, processo | RACI, POP, mapa, owner |
| `EVIDENCIA` | trilha de sustentacao | drawer, anexos, logs, fontes |
| `VIRTUAL` | fallback calculado por regra substituta | SLA quando `time_to_resolve` nao existir |

### Regras de uso

1. nenhum KPI com fallback pode esconder o badge `VIRTUAL`
2. nenhum card `PROXY` pode ocupar o mesmo agrupamento visual dos KPIs oficiais sem diferenciacao
3. nenhum item `EXTERNO` deve exibir valor ficticio
4. nenhum item `NORMATIVO` deve ser estilizado como se fosse telemetria

## 7. Matriz de implementacao por fase

## 7.1 Fase 1 - modulo honesto com dados reais e normativos

Pode ser construido agora:

1. rota `Governanca`
2. subnav do modulo
3. `Resumo Executivo`
4. `Mapa`
5. `Indicadores` com:
   - 5 KPIs live ja existentes
   - placeholder claro para `TME`
   - estrategicos marcados como nao integrados
6. `RACI` como master-data documental
7. `POPs` como biblioteca documental
8. drawer transversal de evidencias

## 7.2 Fase 2 - consolidacao live

Deve entrar na sequencia:

1. portar `TME` para o backend atual
2. associar evidencias operacionais por processo de RACI
3. associar evidencias operacionais por POP
4. estruturar metadata de revisao/versionamento de documentos

## 7.3 Fase 3 - expansao estrategica

So depois de novas fontes:

1. Disponibilidade
2. % Backups testados
3. % Sistemas com PCN atualizado
4. eventual definicao metodologica real para `% Mudancas com sucesso`

## 8. Decisoes de produto que precisam ser tomadas antes do design final

1. Confirmar que o workbook oficial e a fonte primaria do catalogo de KPIs.
2. Decidir formalmente se `Mudancas de Sala / Layout` continua existindo como indicador separado ou sai da camada executiva.
3. Definir se a home executiva mostrara 4 ou 6 KPIs.
4. Definir o modelo de versionamento de RACI e POPs no Hub.
5. Definir o criterio de "pendencia" e "risco" da home para nao virar score opaco.

## 9. Veredito final para a proxima etapa

Sim, ja da para desenhar a interface final.

Mas o desenho precisa partir desta matriz:

1. `LIVE` no topo da leitura executiva
2. `NORMATIVO` como espinha de contexto e responsabilizacao
3. `EVIDENCIA` como mecanismo de confianca
4. `PROXY` separado e rotulado
5. `EXTERNO` tratado como roadmap de integracao, nao como dado presente

Se essa disciplina for respeitada, o modulo `Governanca` entra no Hub com coerencia tecnica, sem inflar a interface com metricas que o ecossistema ainda nao sustenta.
