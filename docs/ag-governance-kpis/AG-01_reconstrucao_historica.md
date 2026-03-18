# AG-01 — Reconstrução Histórica Completa: Governance KPI

## Cronologia por Marco

### Marco 0 — Contexto Institucional (pré-projeto)
**Situação:** O DTIC (Departamento de Tecnologia da Informação e Comunicação) da Casa Civil RS operava sem visibilidade unificada de seus indicadores. O diretor precisava demonstrar resultados mensuráveis ao CIG-TIC/SI (comitê deliberativo) e alinhar-se às normativas federais (EFGD, SISP, IN SGD) e estaduais (Decretos 57.547/2024 e 57.669/2024).

**Problema de negócio:** Ausência de instrumento digital que consolidasse a estrutura de governança (PDTI, PSI, INs, Manual Operacional), os KPIs operacionais do GLPI e as responsabilidades RACI — tudo em uma interface acessível para a diretoria e o comitê.

---

### Marco 1 — Decisão de Arquitetura "Spoke"
**Decisão:** Construir como *spoke* isolado em `spokes/governance`, não como módulo dentro do `portal` (hub legado).

**Motivo:** O portal (antigo hub GLPI/institucional) já estava em processo de quarentena e migração para `tensor-aurora`. Criar dentro do portal significaria acoplar funcionalidade nova a código em extinção.

**Tradeoff:** A aplicação ficaria dependendo dos contratos de API do `platform/backend` legado — uma dependência que bloquearia limpeza futura daquele backend. O ganho era velocidade de entrega e independência de deploy.

---

### Marco 2 — Definição dos Dados Fonte e KPIs
**Decisão:** Usar exclusivamente dados do GLPI (MySQL direto via SQLAlchemy) para os 7 KPIs automatizáveis, com grupo de IDs fixo `[89, 90, 91, 92]` (N1, N2, N3, N4).

**Requisitos do diretor:**
- SLA, TMA, TME com horário útil (8h-18h, dias úteis)
- Incidentes por severidade
- Reincidência (chamados reabertos)
- Volumetria (entrada vs saída)
- Mudanças de sala/layout

**Tradeoff:** Sem categoria dedicada no GLPI para "mudanças de sala", decidiu-se por busca keyword-based (`LIKE '%mudança%sala%'`). Sabe-se que isso gera falso-positivos/negativos, mas era a solução viável sem alterar a configuração do GLPI.

**Requisito meu determinante:** SLA com "base virtual" — para tickets sem `time_to_resolve` cadastrado (sem SLA oficial), aplicar thresholds por prioridade (Muito Alta=8h, Alta=16h, Média=24h, Baixa=40h). Isso garantiu que 100% dos chamados seriam avaliados.

---

### Marco 3 — Frontend: Hierarquia Visual de Governança
**Decisão:** Construir um grafo interativo de governança (Board 0) que mostrasse o fluxo normativo completo: Normativas Federais → Estaduais → PDTI → PSI → INs → Manual → KPIs/RACI/POPs.

**Motivo do diretor:** Precisava de uma ferramenta que contasse a "história de governança" de cima para baixo, linkando cada nível ao seguinte. Não era um dashboard de números — era uma narrativa institucional.

**Tradeoff:** O grafo ficou totalmente client-side (nodes/connections hardcoded em [constants.ts](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/constants.ts)). Qualquer mudança normativa exigiria redeploy.

---

### Marco 4 — Cross-Linking de Boards
**Decisão:** Implementar navegação cruzada entre os 4 boards (Governança, Indicadores, RACI, POPs) via `linkRaci`, `linkPop`, `linkKpi` em cada entidade.

**Requisito meu:** Cada KPI deveria ter link direto para o POP que o operacionaliza e para a linha RACI que define responsabilidades. Isso criou rastreabilidade total.

**Implementação:** [useHighlightScroll()](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#47-70) hook que, ao navegar entre boards, faz scroll automático + highlight amarelo temporário (2.5s) no elemento alvo.

---

### Marco 5 — SSE (Server-Sent Events) para Tempo Real
**Decisão:** Implementar `governance-stream` (Node.js, multi-tenant) como Change Data Capture via polling MySQL + EventSource no frontend.

**Motivo:** O diretor queria que a tela de governança (especialmente documentos anexados) atualizasse automaticamente quando alguém inserisse um ticket/documento no GLPI.

**Tradeoff:** Polling de banco + SSE broadcast. Não é CDC verdadeiro (binlog), é polling com debounce de 1.5s. Latência aceitável para caso executivo, mas não é real-time exato.

---

### Marco 6 — Gestão de Documentos
**Decisão:** Cada nó de governança (Federal, Estadual, PDTI, PSI, etc.) pode ter documentos anexados via upload/download direto na aplicação.

**Implementação:** API REST em `governance-backend` com upload para volume Docker (`governance-docs`). Preview in-app de PDF (react-pdf), DOCX (docx-preview), XLSX (xlsx.js), e imagens (yet-another-react-lightbox com zoom).

---

### Marco 7 — Período Selecionável
**Decisão:** Period selector com 6 opções: Mês Atual, Mês Anterior, Ano Atual (YTD), Últimos 12 Meses, Ano 2025, Ano 2024.

**Motivo:** O comitê CIG-TIC/SI se reúne mensalmente e precisa comparar períodos. O diretor precisa de visão YTD para planejamento orçamentário.

---

### Marco 8 — Extração do Backend Legado
**Decisão:** Criar `spokes/governance-backend` como clone extraído de `platform/backend`, com apenas os endpoints de governança.

**Motivo:** Desacoplar do monólito legado. O [docker-compose.yml](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/docker-compose.yml) reflete isso: `governance-backend` na porta 4012, com perfil `legacy` mantendo o `glpi-backend-legacy` na porta 4202 como rollback.

---

## Problemas de Negócio que o Diretor Queria Resolver

| # | Problema | Board que Resolve |
|---|---------|------------------|
| 1 | Sem visibilidade de compliance normativo | Board 0 — Governança (grafo) |
| 2 | Sem KPIs automatizados do service desk | Board 1 — Indicadores |
| 3 | Responsabilidades não documentadas digitalmente | Board 2 — Matriz RACI |
| 4 | Procedimentos operacionais dispersos em documentos Word | Board 3 — POPs |
| 5 | Documentos de governança sem repositório centralizado | Document management (slide-over) |
| 6 | Apresentação em comitê exigia preparação manual de dados | Auto-refresh 30s + SSE |

## Requisitos Determinantes (pelo dev/arquiteto)

1. **SLA Virtual Fallback** — sem ele, ~40% dos tickets ficariam sem avaliação de SLA
2. **Business Hours no SQL** — cálculo de horas úteis inline (sem stored procedure), considerando dias úteis e janela 08:00-18:00
3. **Cross-linking profundo** — rastreabilidade KPI↔RACI↔POP↔Governança
4. **Canary Deployment** — perfil Docker `canary` para validação antes de cutover
5. **Entrypoint dinâmico** — [entrypoint.sh](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/entrypoint.sh) com `window.APP_CONFIG` para injeção de variáveis em runtime (sem rebuild para trocar URLs)

## Riscos Percebidos na Época

| Risco | Severidade | Mitigação Aplicada |
|-------|-----------|-------------------|
| Query KPI lenta em base GLPI grande | Alta | Benchmark por KPI com log de warning >1s |
| Mudanças keyword-based com falso-positivos | Média | Exclusões (`NOT LIKE '%senha%'`, `'%substituição%'`) |
| SSE desconectando em rede instável | Média | `EventSource` nativo (reconecta automaticamente) |
| Dependência de `platform/backend` legado | Alta | Extração para `governance-backend` standalone |
| Hardcoded governance nodes | Baixa | Aceitável para escopo governamental estável |

## Dívida Técnica Remanescente

1. **3 KPIs estratégicos sem automação** — Disponibilidade (precisa Zabbix), Backups Testados (manual), PCN Atualizado (portfólio) — ficaram como cards estáticos
2. **Sem autenticação própria** — depende de `glpi_session_token` via URL query param ou localStorage, sem refresh automático
3. **Monólito frontend** — tudo em um único [App.tsx](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx) de 1546 linhas
4. **Sem testes** — nenhum teste unitário ou e2e existe (nem no frontend nem no backend KPI)
5. **Horário UTC vs local** — [_get_period_range](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance-backend/src/services/governance/kpis.py#85-144) usa `datetime.now()` sem timezone awareness
6. **Busca por keyword** — KPI "Mudanças" sem categoria GLPI dedicada
7. **Volume Docker** — `governance-docs` sem backup automatizado
