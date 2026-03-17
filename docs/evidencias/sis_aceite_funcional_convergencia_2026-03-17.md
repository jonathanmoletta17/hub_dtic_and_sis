# Aceite Funcional + Convergência Legado x Alvo (SIS)
Data: 17/03/2026  
Janela comparável: **2026-02-15 até 2026-03-16** (D-30 até D-1)  
Tolerância: **0% estrita**

## 1) Baseline técnico (Etapa 1)
- [x] `pytest app/tests` → **160 passed**
- [x] `vitest analyticsService + context-registry` → **14 passed**
- [x] `npm run lint` (web) → **ok**
- [x] `npm run build` (web) → **ok**

## 2) Checklist funcional por endpoint (Etapa 1)
Evidência automatizada principal: `app/tests/test_analytics_acceptance_sis.py` (**52 passed**).

- [x] `summary` responde 200 em `sis`, `sis-manutencao`, `sis-memoria`, com e sem `department`.
- [x] `trends` responde 200 em `sis`, `sis-manutencao`, `sis-memoria`, com e sem `department`.
- [x] `ranking` responde 200 em `sis`, `sis-manutencao`, `sis-memoria`, com e sem `department`.
- [x] `recent-activity` responde 200 em `sis`, `sis-manutencao`, `sis-memoria`, com e sem `department`.
- [x] `distribution/entity` responde 200 em `sis`, `sis-manutencao`, `sis-memoria`, com e sem `department`.
- [x] `distribution/category` responde 200 em `sis`, `sis-manutencao`, `sis-memoria`, com e sem `department`.
- [x] Precedência de escopo validada: `group_ids` explícito > `department`.
- [x] Mapeamento `department` validado: `manutencao -> [22]`, `conservacao -> [21]`.
- [x] Gate permissional validado: `gestor|tecnico* + sis-dashboard` = 200; `solicitante` ou sem `sis-dashboard` = 403.

## 3) Checklist UI/menu (Etapa 1)
- [x] Gate de menu para analytics SIS raiz validado em teste de manifesto.
- [x] Gate de menu para analytics em subcontextos (`sis-manutencao`, `sis-memoria`) validado em teste de manifesto.
- [ ] Validação manual de sessão (logout/login após alteração de permissão) pendente de execução humana em ambiente do Hub.

## 4) Matriz legado x alvo (Etapa 2)
Script de comparação: `scripts/sis_legacy_target_convergence.py`  
Artefatos gerados:
- `output/analytics_acceptance/sis_legacy_vs_target_matrix_20260317_025845.csv`
- `output/analytics_acceptance/sis_legacy_vs_target_summary_20260317_025845.json`

### Resultado consolidado
- Total de linhas: **392**
- PASS: **331**
- FAIL estrito: **61**
- FAIL esperados: **61**
- FAIL bloqueadores: **0**

| Endpoint | PASS | FAIL |
|---|---:|---:|
| summary | 11 | 1 |
| trends | 300 | 0 |
| ranking | 20 | 0 |
| recent-activity | 0 | 20 |
| distribution/entity | 0 | 20 |
| distribution/category | 0 | 20 |

### Resultado de gate (dois critérios)
- Convergência estrita com legado: **FAIL**
- Convergência alinhada ao contrato oficial do MVP: **PASS**

## 5) Consolidação de discrepâncias (Etapa 3)
### Ajuste fino aplicado nesta rodada
- [x] Ajustada regra de `summary.resolvidos_periodo` para compatibilizar status 5 por `solvedate` e status 6 por `closedate`.
- [x] Ajustada regra de `summary.backlog_aberto` para remover corte por `date_to` (alinha backlog aberto total).

Arquivo alterado: `app/services/analytics_service.py`

### Divergências remanescentes classificadas
1. `summary.backlog_aberto` (1 linha FAIL)
   - Causa: legado aplica filtro departamental híbrido (grupo **OU** prefixo de categoria), alvo usa escopo oficial por `group_ids`.
2. `recent-activity` (20 linhas FAIL)
   - Causa: legado usa `glpi_logs` (mudanças) e recorte fixo de 7 dias; alvo usa atividade derivada de estado de ticket no período selecionado.
3. `distribution/entity` e `distribution/category` (40 linhas FAIL)
   - Causa: legado usa **all-status** + filtro híbrido; alvo usa regra oficial do MVP (**status abertos 1,2,3,4** + `group_ids`).

## 6) Decisão de gate para Fase 3
- [x] Decisão aplicada: **seguir contrato oficial do MVP** (recomendado), sem forçar mimetismo do legado em `recent-activity` e `distribution/*`.
- [x] **Gate aprovado sob critério de contrato oficial** (`fail_unexpected = 0`).
- [ ] Ainda pendente validação manual de sessão/menu no ambiente Hub (logout/login após troca de permissões), conforme checklist da Etapa 1.

Observação:
- Se o objetivo voltar a ser “espelhar legado 1:1”, o gate deve retornar ao modo estrito e bloquear em `61` divergências.
