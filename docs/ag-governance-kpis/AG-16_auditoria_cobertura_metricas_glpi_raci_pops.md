# AG-16 - Auditoria de Cobertura de Metricas, GLPI, RACI e POPs

Data: 2026-03-18

## 1. Objetivo

Verificar, com base em fontes reais, se temos sustentacao de dados para construir o modulo `Governanca` no Hub sem inventar metricas, ownership ou relacoes que o ecossistema atual nao suporta.

Este documento responde quatro perguntas:

1. Quais metricas oficiais existem no material de origem?
2. Quais delas sao realmente calculaveis hoje com dados reais do GLPI?
3. Onde o legado divergiu do material oficial?
4. Como RACI e POPs se relacionam com dados reais, sem fingir automacao onde ela nao existe?

## 2. Fontes consultadas

### 2.1 Fontes oficiais do spoke legado

- `spokes/governance/docs/Indicadores_DTIC 1.xlsx`
- `spokes/governance/docs/RACI_DTIC.xlsx`
- `spokes/governance/docs/Caderno_POPS_DTIC_V2_Com_RACI.docx`
- `spokes/governance/docs/Manual_DTIC_V5.docx`
- `spokes/governance/docs/PDTI.docx`
- `spokes/governance/docs/PSI (1).docx`
- `spokes/governance/docs/Dossie_Governanca_TIC_Casa_Civil_TOC_v3.docx`

Esses arquivos foram copiados para:

- `tmp/legacy-governance-docs/`

e lidos com `openpyxl` e `python-docx` em ambiente isolado local.

### 2.2 Codigo legado

- `\\wsl.localhost\NVIDIA-Workbench\home\workbench\code\apps\spokes\governance\constants.ts`
- `\\wsl.localhost\NVIDIA-Workbench\home\workbench\code\apps\spokes\governance\App.tsx`
- `\\wsl.localhost\NVIDIA-Workbench\home\workbench\code\apps\spokes\governance-backend\src\services\governance\kpis.py`
- `\\wsl.localhost\NVIDIA-Workbench\home\workbench\code\apps\spokes\governance-backend\src\services\governance\docs.py`

### 2.3 Hub atual em execucao

Endpoints consultados com login real em `http://localhost:8080`:

- `POST /api/v1/dtic/auth/login`
- `GET /api/v1/dtic/db/stats`
- `GET /api/v1/dtic/analytics/summary`
- `GET /api/v1/dtic/analytics/trends`
- `GET /api/v1/dtic/analytics/ranking`
- `GET /api/v1/dtic/analytics/recent-activity`
- `GET /api/v1/dtic/db/kpis?group_ids=89,90,91,92&period=2026-02`
- `GET /api/v1/dtic/db/query`
- `GET /api/v1/dtic/db/aggregate`

### 2.4 Validacao read-only no banco DTIC

Consultas diretas executadas dentro do container `glpi-universal-backend` com a conexao DTIC configurada no backend local:

- verificacao de existencia de tabelas
- contagem de registros
- amostragem de estrutura de `glpi_changes`, `glpi_itilfollowups`, `glpi_tickettasks`, `glpi_logs`
- execucao pontual da logica de TME do legado

## 3. Conclusao executiva

O quadro real e este:

1. O catalogo oficial tem **10 metricas**, nao 7.
2. O Hub atual calcula **5 metricas** em dados reais hoje.
3. O GLPI atual suporta tecnicamente **mais 1 metrica importante** que ainda nao esta exposta no Hub: `TME`.
4. O principal ponto de inconsistencia e o KPI oficial `% Mudancas com sucesso`, que o legado trocou por um proxy de `Mudancas de Sala / Layout`.
5. `Disponibilidade`, `% Backups testados` e `% Sistemas com PCN atualizado` **nao sao metricas de GLPI puro**; exigem outras fontes.
6. RACI e POPs **nao sao dados que saem automaticamente do GLPI**. Sao camadas normativas que precisam ser ligadas ao GLPI por evidencias, links e regras de interpretacao.

## 4. Catalogo oficial de metricas vs cobertura real

| KPI oficial | Fonte oficial | Legado | Hub atual | Cobertura real hoje | Veredito |
| --- | --- | --- | --- | --- | --- |
| SLA cumprido (%) | CAU/GLPI | Implementado | Implementado | Alta, mas quase toda a base usa SLA virtual | Viavel agora, com badge de `virtual` obrigatorio |
| TMA - Tempo Medio de Atendimento (h) | CAU/GLPI | Implementado | Implementado | Alta | Viavel agora |
| TME - Tempo Medio de Espera (h) | CAU/GLPI | Implementado | Nao implementado | Alta, via logs + followups + tasks | Viavel agora, mas precisa portar para o Hub |
| Incidentes por severidade | CAU/GLPI / Incidentes SI | Implementado | Implementado | Media, depende de classificacao manual | Viavel agora, com ressalva de qualidade |
| Disponibilidade (%) | Zabbix | Estrategico, sem automacao | Nao implementado | Nao coberto por GLPI | Exige integracao externa |
| % Backups testados | N3 / backup | Estrategico, sem automacao | Nao implementado | Nao coberto por GLPI | Exige ferramenta/processo externo |
| % Sistemas com PCN atualizado | N4/N3 | Estrategico, sem automacao | Nao implementado | Nao coberto por GLPI | Exige portfolio/registro de PCN |
| % Mudancas com sucesso | N3 / Mudancas | **Nao implementado fielmente** | Nao implementado | GLPI tem `glpi_changes`, mas nao tem indicador claro de rollback/reincidencia de mudanca | **Nao sustentar como metrica oficial ainda** |
| % Reincidencia | CAU/GLPI | Implementado | Implementado | Media | Viavel agora, com ressalva de reopen administrativo |
| Chamados abertos/fechados | CAU/GLPI | Implementado | Implementado | Alta | Viavel agora |

## 5. Evidencias reais do GLPI DTIC

## 5.1 Cobertura de campos criticos

Consultas read-only no banco DTIC mostraram:

- `glpi_tickets` com `time_to_resolve IS NULL`: `12805`
- `glpi_tickets` com `time_to_resolve IS NOT NULL`: `3`
- `glpi_tickets` com `solve_delay_stat IS NOT NULL`: `12808`

Leitura:

- `time_to_resolve` esta vazio em **99.9766%** dos tickets.
- qualquer KPI de SLA contratual baseado em `time_to_resolve` vai cair quase sempre em fallback.
- `solve_delay_stat` esta preenchido em **100%** da base consultada, o que fortalece TMA.

## 5.2 Tabelas auxiliares necessarias para TME existem e tem volume real

- `glpi_itilfollowups`: existe, `17079` registros, `9223` tickets distintos
- `glpi_tickettasks`: existe, `2909` registros, `2007` tickets distintos
- `glpi_logs`: existe, `323599` registros; `487` tickets distintos com `id_search_option = 12`

Conclusao:

- a materia-prima para `TME` existe no GLPI real
- a metrica nao esta impedida por falta de dado
- o impedimento atual e de implementacao/exposicao no Hub

## 5.3 Tabela de mudancas existe, mas nao resolve o KPI oficial sozinha

`glpi_changes` existe e contem `28` registros nao deletados.

Campos relevantes presentes:

- `status`
- `solvedate`
- `closedate`
- `time_to_resolve`
- `backoutplancontent`
- `rolloutplancontent`
- `validation_percent`

Problema:

o KPI oficial do workbook e `% Mudancas com sucesso`, descrito como:

- `Mudancas sem falha / Mudancas implementadas * 100`

O banco nao oferece, por si so:

- flag de rollback executado
- indicacao confiavel de falha de mudanca
- reincidencia tecnica vinculada a cada mudanca

Ou seja:

- da para montar **proxy**
- nao da para afirmar a metrica oficial com rigor apenas com a estrutura atual

## 5.4 Leitura real de fevereiro de 2026

Consultando o Hub atual com `group_ids=89,90,91,92` e periodo `2026-02`:

- `SLA`: `51.6%`
- `TMA`: `117.3h`
- `Incidentes`: `9`
- `% Reincidencia`: `0.5%`
- `Volumetria`: `374` abertos / `419` fechados

Consultando o banco diretamente com a logica legada de `TME`:

- `TME`: `10.48h`
- tickets com interacao valida no calculo: `329`
- cobertura sobre os `374` tickets abertos do periodo: `87.97%`

Leitura:

- o GLPI atual ja sustenta uma leitura executiva real para `SLA`, `TMA`, `TME`, `Incidentes`, `Reincidencia` e `Volumetria`
- o Hub, neste momento, so expoe 5 dessas 6 metricas

## 6. Divergencias entre fonte oficial e implementacao legada

## 6.1 KPI de mudancas

Workbook oficial:

- `% Mudancas com sucesso`
- formula: `Mudancas sem falha / Mudancas implementadas * 100`

Legado implementado:

- `Mudancas de Sala / Layout`
- formula baseada em busca textual em `glpi_tickets` + `glpi_changes`

Veredito:

- esta e a maior divergencia funcional encontrada
- o legado **nao implementou fielmente** o KPI oficial do workbook
- ele criou um proxy operacional diferente

## 6.2 Ownership e periodicidade

Exemplos de divergencia entre workbook e `constants.ts`:

- `SLA cumprido (%)`
  - workbook: responsavel `N4 (Governanca)`
  - legado: `Gestores N1/N2/N3`
- `TMA`
  - workbook: `Semanal e Mensal`
  - legado: `Mensal`
- `TME`
  - workbook: responsavel `N1/N2`
  - legado: `N1 (Triagem)`
- `Chamados abertos/fechados`
  - workbook: `Semanal e Mensal`
  - legado: `Mensal`

Leitura:

- o workbook deve ser tratado como referencia oficial primaria
- `constants.ts` deve ser tratado como adaptacao de produto, nao como verdade normativa

## 6.3 RACI do workbook vs RACI do legado

O `RACI_DTIC.xlsx` e altamente uniforme:

- quase todos os processos aparecem como `N3 = R`, `Diretor = A`, demais como `C`

Ja o `constants.ts` cria uma matriz um pouco mais refinada, introduzindo:

- `I` para algumas relacoes
- combinacoes diferentes de `C` e `I`

Veredito:

- a UI legada interpretou e enriqueceu a planilha
- isso pode ser valido como refinamento de produto
- mas precisa ser validado com a fonte oficial antes de virar verdade no Hub

## 7. O que o Hub mede hoje vs o que ainda falta portar

## 7.1 Ja medido no Hub atual

No backend atual, `app/services/kpis_service.py` e `GET /api/v1/{context}/db/kpis` entregam:

1. `SLA`
2. `TMA`
3. `Incidentes`
4. `% Reincidencia`
5. `Volumetria`

## 7.2 Dados reais existentes, mas ainda nao expostos no Hub

1. `TME`
   - o banco suporta
   - o legado ja tinha a query
   - o Hub ainda nao portou

## 7.3 Nao implementados e nao sustentados por GLPI puro

1. `Disponibilidade (%)`
2. `% Backups testados`
3. `% Sistemas com PCN atualizado`
4. `% Mudancas com sucesso`

## 7.4 Proxy legado que nao deve ser promovido a KPI oficial sem decisao explicita

1. `Mudancas de Sala / Layout`

Se ele for mantido, precisa aparecer como:

- indicador operacional derivado
- nao como KPI oficial do workbook

## 8. Mapeamento RACI para dados reais

RACI e uma camada de governanca. O GLPI nao "gera" a matriz. O que ele gera sao evidencias operacionais que podem sustentar ou ilustrar cada processo.

### 8.1 Matriz resumida

| Processo RACI | Evidencia real disponivel | Confianca | Observacao |
| --- | --- | --- | --- |
| Atendimento N1 (Triagem) | tickets, `date`, `status`, followups, tasks | Forte | Base real para TME e fluxo inicial |
| Atendimento N2 | tickets, tecnico atribuido, `solvedate`, `solve_delay_stat` | Forte | Base real para TMA e parte de SLA |
| Atendimento N3 | tickets tecnicos, incidentes, mudancas, tasks | Media | Existe base, mas depende de classificacao/categoria corretas |
| Governanca N4 | volumetria, documentos, parte administrativa | Fraca a media | GLPI cobre so parte do processo |
| Gestao de Mudancas | `glpi_changes`, tickets, docs | Media | Base existe, mas KPI oficial de sucesso continua fraco |
| Incidentes de Seguranca | tickets `type=1`, prioridade, logs | Media | Falta separar seguranca de operacional com mais rigor |
| Gestao de Acessos (IAM) | categorias de acesso, tickets, solicitante/tecnico | Media | A autorizacao formal muitas vezes esta fora do GLPI |
| Backup e Continuidade | alguns tickets e mudancas | Fraca | teste de restore e PCN estao fora do GLPI |
| IntegraRS / APIs | documentacao e eventualmente tickets | Fraca | evidencias principais estao em processos/documentos externos |
| Contratacoes TIC | externalidades administrativas | Fraca | depende de PROA, contratos e workflow externo |
| Publicacoes / PROA / DOE-e | externalidades administrativas | Fraca | fora do GLPI |
| Sistemas Estruturantes | tickets, mudancas, docs | Fraca a media | falta portfolio estruturado |

Conclusao:

- RACI pode ser usado no Hub
- mas como **master-data de governanca**
- e nao como tabela automaticamente inferida do GLPI

## 9. Mapeamento POP para dados reais

Os POPs tambem nao saem automaticamente do GLPI. O GLPI registra evidencias de execucao, nao o procedimento normativo.

| POP | Evidencia real no ecossistema | Confianca | Observacao |
| --- | --- | --- | --- |
| POP N1 - Triagem | abertura, classificacao, primeira interacao, followup | Forte | Boa aderencia ao fluxo de atendimento |
| POP N2 - Suporte Especializado | tecnico, resolucao, tasks, solucao | Forte | Boa aderencia operacional |
| POP N3 - Infra, Sistemas e Projetos | changes, tasks, tickets tecnicos | Media | Depende de boa classificacao |
| POP N4 - Governanca Administrativa | documentos, prazos, tickets administrativos | Fraca a media | parte relevante esta fora do GLPI |
| Incidentes de Seguranca | tickets de incidente, logs, followups | Media | sem fonte externa de SI, fica limitado |
| Gestao de Mudancas | `glpi_changes`, tickets, aprovacoes parciais | Media | sem prova de rollback/sucesso oficial |
| Gestao de Acessos | tickets de acesso, categorias, solicitacoes | Media | autorizacao formal pode estar fora |
| Backup e Continuidade | docs + alguns registros tecnicos | Fraca | metricas e evidencias principais sao externas |
| IntegraRS / APIs | documentacao e trilhas administrativas | Fraca | GLPI nao e fonte principal |

Conclusao:

- POPs devem entrar no Hub como biblioteca processual
- com evidencias operacionais anexadas
- e nao como algo "descoberto" automaticamente pelo sistema

## 10. Comportamento de relacionamento no legado

O spoke legado tinha uma ideia correta que deve ser preservada:

1. KPI apontava para RACI e POP
2. RACI apontava para KPI e POP
3. POP apontava para KPI e RACI
4. nodes de governanca abriam documentos e evidencias

Implementacao identificada:

- `useHighlightScroll()` em `App.tsx:47-80`
- KPI -> POP/RACI em `App.tsx:1002-1012`
- RACI -> POP/KPI em `App.tsx:1259-1269`
- POP -> RACI/KPI em `App.tsx:1360-1370`
- drawer/modal documental em `App.tsx:148-355`
- fetch de documentos por node em `App.tsx:378`, `App.tsx:438`, `App.tsx:464`

Leitura correta:

- o valor do legado nao era apenas visual
- ele organizava rastreabilidade entre norma, processo, papel, metrica e evidencia

Esse comportamento deve ser reproduzido no Hub.

## 11. O que pode e o que nao pode ser mostrado como dado real

## 11.1 Pode entrar como metrica live agora

1. SLA, com identificacao explicita de fallback virtual
2. TMA
3. TME
4. Incidentes por severidade
5. % Reincidencia
6. Chamados abertos/fechados

## 11.2 Pode entrar, mas como proxy operacional e nao como KPI oficial

1. Mudancas de Sala / Layout

## 11.3 Nao deve entrar como live KPI sem nova fonte

1. Disponibilidade (%)
2. % Backups testados
3. % Sistemas com PCN atualizado
4. % Mudancas com sucesso

## 11.4 Nao deve ser apresentado como se fosse dado inferido automaticamente

1. RACI
2. POPs
3. ownership executivo
4. aderencia normativa

Esses itens precisam ser tratados como:

- dados mestres normativos
- vinculados a evidencias e documentos
- com enriquecimento por dados operacionais reais

## 12. Recomendacoes objetivas para os proximos passos

1. Congelar o workbook `Indicadores_DTIC 1.xlsx` como fonte oficial primaria do catalogo de KPIs.
2. Corrigir a matriz de produto: decidir se o KPI 8 oficial sera implementado de verdade ou se o proxy `Mudancas de Sala / Layout` sera assumido como indicador separado.
3. Portar `TME` para o `app/services/kpis_service.py` do Hub.
4. Nao publicar `Disponibilidade`, `Backups` e `PCN` como live metricas enquanto as fontes externas nao estiverem integradas.
5. Tratar RACI e POPs como master-data versionado, nao como descoberta automatica do GLPI.
6. Reproduzir o modelo de cross-linking do legado no Hub:
   - KPI <-> RACI
   - KPI <-> POP
   - RACI <-> POP
   - node de governanca -> drawer documental
7. Revisar `constants.ts`/modelo futuro contra as planilhas oficiais antes de qualquer UI final, porque ha divergencias reais de ownership, periodicidade e semantica.

## 13. Veredito final

Sim, temos base real suficiente para iniciar a construcao do modulo de governanca no Hub.

Mas essa base e suficiente apenas se respeitarmos esta divisao:

- **metricas live reais agora:** 6
- **proxy operacional opcional:** 1
- **metricas dependentes de fonte externa:** 3
- **camadas normativas nao automaticas:** RACI, POPs, documentos e alinhamento de governanca

O risco principal nao e falta de dado bruto.

O risco principal e misturar:

- KPI oficial
- proxy de conveniencia
- documento normativo
- e evidencia operacional

como se tudo tivesse o mesmo nivel de verdade.

Esse erro precisa ser evitado no desenho do Hub.
