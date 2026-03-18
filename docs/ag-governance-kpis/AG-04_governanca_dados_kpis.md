# AG-04 — Governança de Dados e Confiabilidade dos KPIs

## Catálogo de KPIs — Grupo 1: Automatizados

---

### KPI 1: SLA Cumprido (%)

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Percentual de chamados resolvidos dentro do prazo (SLA oficial ou virtual) |
| **Fórmula** | [(Chamados dentro do SLA / Total fechados no período) × 100](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#1497-1546) |
| **Tabelas** | `glpi_tickets` (campos: `solvedate`, `time_to_resolve`, `date`, `priority`, [status](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance-backend/src/services/governance/kpis.py#44-64), `is_deleted`, `entities_id`), `glpi_groups_tickets` |
| **Filtros** | `is_deleted=0`, `entities_id≠0`, `status IN (5,6)`, `solvedate BETWEEN start AND end`, `groups_id IN (89,90,91,92)` |
| **SLA Virtual** | Para tickets sem `time_to_resolve`: Prioridade 5→8h, 4→16h, 3→24h, Else→40h (em business seconds) |
| **Business Hours** | 08:00–18:00, segunda a sexta. Cálculo inline via `WEEKDAY()`, `MID()` networkdays, `TIME_TO_SEC()` |
| **Periodicidade** | Mensal (configurável via period selector) |
| **Thresholds** | Meta: ≥90% (🟢), Alerta: ≥85% (🟡), Crítico: <85% (🔴) |

**Limitações:**
- SLA Virtual é uma **aproximação** — não reflete acordo real com o solicitante
- Feriados RS **não são considerados** no cálculo de business hours (tratados como dias úteis)
- Tickets resolvidos fora da janela 08-18h podem distorcer o cálculo parcial do dia

**Risco de interpretação:** Executivo pode confundir SLA Virtual com SLA contratual. O badge "SLA VIRTUAL" no frontend sinaliza isso, mas precisa ser explicado em reunião.

---

### KPI 2: TMA — Tempo Médio de Atendimento (h)

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Tempo médio (em horas úteis) desde a abertura até a resolução do chamado |
| **Fórmula** | `AVG(business_seconds_to_solve) / 3600` |
| **Tabelas** | `glpi_tickets` (campos: `solvedate`, `date`, `solve_delay_stat`, [status](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance-backend/src/services/governance/kpis.py#44-64)), `glpi_groups_tickets` |
| **Filtros** | Mesmos do SLA + `solve_delay_stat IS NOT NULL AND > 0` |
| **Business Hours** | Mesmo cálculo do SLA (08:00–18:00, seg-sex) |
| **Periodicidade** | Mensal |
| **Thresholds** | Meta: ≤24h (🟢), Alerta: ≤36h (🟡), Crítico: >48h (🔴) — **lower is better** |

**Limitações:**
- Exclui tickets sem `solve_delay_stat` (dados inconsistentes no GLPI)
- Média é sensível a outliers (um ticket de 500h puxa a média)
- Sem mediana disponível (seria mais resiliente)

---

### KPI 3: TME — Tempo Médio de Espera (h)

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Tempo médio (em horas úteis) entre criação do ticket e a **primeira interação humana** |
| **Fórmula** | `AVG(business_seconds_to_first_interaction) / 3600` |
| **Tabelas** | `glpi_tickets`, `glpi_groups_tickets`, `glpi_logs` (status change), `glpi_itilfollowups`, `glpi_tickettasks` |
| **Definição de "Primeira Interação"** | `MIN()` dentre: mudança de status (saindo de "Novo"), followup adicionado, ou task adicionada |
| **Filtros** | `date BETWEEN start AND end`, DTIC groups, outliers >30 dias excluídos |
| **Periodicidade** | Semanal (configurável) |
| **Thresholds** | Meta: ≤4h (🟢), Alerta: ≤8h (🟡), Crítico: >12h (🔴) |

**Limitações:**
- **UNION ALL de 3 tabelas** pode ser pesado em bases grandes
- Mudanças de status automáticas (regras GLPI) podem contar como "interação humana"
- Sem distinção entre interação real e interação by-system

---

### KPI 4: Incidentes por Severidade

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Contagem absoluta de tickets tipo Incidente, agrupados por prioridade |
| **Fórmula** | `COUNT(*) GROUP BY priority` |
| **Tabelas** | `glpi_tickets` (campos: `type=1`, `priority`), `glpi_groups_tickets` |
| **Mapeamento** | 5→Crítico, 4→Alto, 3→Médio, 2→Baixo, 1→Muito Baixo |
| **Trend** | Últimos 12 meses (apenas Alto+Crítico), `GROUP BY YEAR-MM` |
| **Periodicidade** | Semanal |
| **Thresholds** | Sem threshold (status=neutral). Valor informativo. |

**Limitações:**
- Severidade depende da classificação manual do atendente
- Sem conceito de "incidente de segurança" vs "incidente operacional" no filtro
- Classificação inconsistente entre N1/N2/N3

---

### KPI 5: % Reincidência

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Percentual de chamados que foram reabertos após resolução/fechamento |
| **Fórmula** | [(Chamados reabertos / Total fechados) × 100](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#1497-1546) |
| **Tabelas** | `glpi_tickets`, `glpi_groups_tickets`, `glpi_logs` |
| **Detecção de reopen** | `glpi_logs` com `id_search_option=12`, `old_value IN ('5','6','Resolvido','Fechado','Solved','Closed')` e `new_value NOT IN` esses valores |
| **Periodicidade** | Mensal |
| **Thresholds** | Meta: ≤5% (🟢), Alerta: ≤8% (🟡), Crítico: >10% (🔴) |

**Limitações:**
- Reopen por motivo administrativo (reclassificação) conta como reincidência
- Logs multilíngues (PT e EN) tratados com `IN ('Resolvido','Solved'...)` — pode falhar com outros idiomas
- Não diferencia reopen do mesmo solicitante vs reopen do atendente

---

### KPI 6: Volumetria (Abertos/Fechados)

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Contagem de tickets criados vs resolvidos no período |
| **Fórmula** | `COUNT(DISTINCT CASE WHEN date BETWEEN...) as created`, `COUNT(DISTINCT CASE WHEN solvedate BETWEEN...) as closed` |
| **Tabelas** | `glpi_tickets`, `glpi_groups_tickets` |
| **Dado derivado** | `backlog_delta = created - closed` (positivo = backlog crescendo) |
| **Periodicidade** | Mensal |
| **Thresholds** | Sem threshold (status=neutral) |

**Limitações:**
- `backlog_delta` não reflete backlog real (tickets antigos não resolvidos)
- Para backlog real, seria necessário `COUNT WHERE status NOT IN (5,6)`

---

### KPI 7: Mudanças de Sala / Layout

| Aspecto | Detalhe |
|---------|--------|
| **Definição** | Contagem de solicitações de mudança física (sala, layout, setor) |
| **Fórmula** | Busca keyword em `glpi_tickets` + `glpi_changes` |
| **Keywords (tickets)** | `mudança+sala`, `troca de sala`, `layout+mudança`, `transferência+sala`, `mudança de sala`, `novo local de trabalho` |
| **Keywords (changes)** | `local+troca|mudança|migração`, `sala+mudança|troca`, `mudança de sala`, `movidos para` |
| **Exclusões** | `NOT LIKE '%senha%'`, `NOT LIKE '%substituição%'` |
| **Periodicidade** | Mensal |
| **Thresholds** | Sem threshold (status=neutral) |

**Limitações:**
- **Alto risco de falso-positivos** (texto "mudança" em contextos irrelevantes)
- **Falso-negativos** (solicitações que não usam essas palavras)
- Solução definitiva: criar categoria GLPI específica

---

## Catálogo de KPIs — Grupo 2: Estratégicos (Sem Automação)

| KPI | Definição | Fonte Prevista | Periodicidade | Thresholds | Status Atual |
|-----|----------|---------------|--------------|------------|-------------|
| Disponibilidade (%) | Uptime de serviços críticos | Zabbix | Mensal | ≥99.5 / 99.0 / 98.5 | ❌ Sem integração |
| Backups Testados (%) | [(Testes restore OK / Planejados) × 100](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#1497-1546) | Relatório manual | Mensal | 100 / 95 / 90 | ❌ Sem automação |
| PCN Atualizado (%) | [(Sist. com PCN vigente / Total) × 100](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#1497-1546) | Portfólio | Semestral | 100 / 95 / 90 | ❌ Sem portfólio digital |

---

## Critérios de Qualidade de Dados

| Critério | Verificação | Status |
|---------|------------|--------|
| Completude | Tickets sem `time_to_resolve` tratados via SLA Virtual | ✅ Coberto |
| Consistência | Timestamps `date` e `solvedate` válidos e não-nulos | ⚠️ Filtro `solve_delay_stat > 0` nos TMAs |
| Unicidade | `COUNT(DISTINCT t.id)` em todas as queries | ✅ Implementado |
| Atualidade | Dados consultados diretamente da base GLPI produtiva | ✅ Real-time (±30s) |
| Acurácia | Business hours sem feriados; keywords para mudanças | ⚠️ Aproximação |
| Auditabilidade | Campo `performance` no response com benchmark por KPI | ✅ Implementado |

## Riscos de Interpretação Executiva

| Risco | Cenário |
|-------|--------|
| SLA inflado pelo Virtual | Se muitos tickets não têm SLA cadastrado, o fallback com thresholds generosos pode inflar o %. Executivo pode achar que SLA está ótimo quando na verdade o critério é mais brando. |
| TMA com outliers | Um ticket esquecido aberto por meses puxa a média fortemente. Executivo pode ver "TMA = 50h" e achar que o time é lento, quando 99% dos tickets foram <10h. |
| Reincidência administrativa | Ticket reaberto para reclassificação (não por problema real) entra como reincidência. Executivo pode interpretar como falha de qualidade. |
| Backlog Delta como backlog real | `created - closed = -50` pode parecer bom, mas se há 500 tickets antigos abertos, o backlog real é grande. |
| Mudanças subestimadas | Sem categoria, buscas keyword perdem solicitações que usam termos diferentes. Executivo pode achar que há poucas mudanças quando na verdade há muitas. |
