# AG-03 — Requisitos de Negócio e Diretrizes Executivas

## 1. Preocupações e Restrições Reportadas Durante a Construção

### Confiabilidade de Dados GLPI
- **Tickets sem SLA cadastrado:** ~40% dos chamados no GLPI DTIC não tinham campo `time_to_resolve` preenchido. Sem tratamento, o KPI de SLA só cobriria 60% da operação. **Solução:** "SLA Virtual" com thresholds por prioridade hardcoded (ver AG-04).
- **Horas úteis vs horas corridas:** GLPI armazena `solve_delay_stat` em segundos totais (incluindo finais de semana e horário não-útil). O cálculo preciso exigia SQL complexo inline. **Solução:** Fórmula de business-hours no próprio SQL usando `WEEKDAY()`, `MID()` para networkdays, e janela 08:00-18:00.
- **Categoria "Mudanças de Sala" inexistente:** GLPI não tem categoria para mudanças físicas. **Risco:** busca por keywords gera imprecisão. Levantei que a longo prazo seria necessário criar categoria no GLPI ou aceitar a margem de erro.

### Performance
- **Queries pesadas em base de produção:** KPIs executam 7 queries complexas (JOINs, subqueries, UNION ALL) contra a base GLPI produtiva. Reportei risco de impacto em horário de pico. **Mitigação:** benchmark individual por KPI com log de warning para queries >1s. Polling de 30s (não 5s) para reduzir carga.

### Segurança
- **Token sin validação server-side:** O token GLPI é passado via query param ou localStorage sem validação no backend. Reportei que isso é inseguro em rede pública, mas aceitável em rede interna estadual.
- **CORS/CSRF:** Não há proteção CSRF. Backend responde a qualquer origem.

---

## 2. Diretrizes do Diretor que Influenciaram UX e Métricas

| Diretriz | Impacto na UX | Impacto nas Métricas |
|---------|--------------|---------------------|
| "Preciso mostrar que estamos alinhados com normativas federais e estaduais" | Criação do Board 0 (Grafo de Governança) com 7 nós hierárquicos e conexões interativas | N/A — visual, não métrica |
| "O comitê CIG-TIC precisa ver tendência no tempo" | Period selector (6 opções) + trend data em Incidentes | Cada KPI recalculado por período selecionado |
| "Quero sinais claros: está bom, está razoável ou está crítico" | Semáforo tricolor (verde/amarelo/vermelho) com thresholds textuais Meta/Alerta/Crítico | Thresholds definidos no `Indicadores_DTIC 1.xlsx`, Sheet 5 |
| "A tela de governança precisa funcionar em TV na sala de reunião" | Font-sizes generosos, cards espaçados, scroll minimizado no Board 0 | N/A |
| "Cada indicador precisa ter um dono (responsável)" | Campo "Owner" visível em cada KpiCard | Mapeamento `responsible` de [constants.ts](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/constants.ts) |
| "Documentos de referência (PDTI, PSI etc.) precisam estar acessíveis direto na aplicação" | Upload/download/preview de documentos no slide-over, com suporte a PDF/DOCX/XLSX/imagens | N/A |
| "Preciso que mostre a movimentação total — não só o SLA" | Widget "MOVIMENTAÇÃO TOTAL" ao lado do period selector | `total_tickets` via [_get_total_volume()](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance-backend/src/services/governance/kpis.py#622-635) |

---

## 3. Regras de Priorização Usadas

### Critério Principal: Automatizável via GLPI
Os KPIs foram divididos em dois grupos explícitos:

**Grupo 1 — Ativos (prioridade máxima):** KPIs que podiam ser 100% automatizados lendo GLPI MySQL.
- SLA, TMA, TME, Incidentes, Reincidência, Volumetria, Mudanças

**Grupo 2 — Estratégicos (diferido):** KPIs que dependiam de fontes externas.
- Disponibilidade (Zabbix), Backups Testados (manual), PCN Atualizado (portfólio)
- Decisão: mostrar como cards estáticos com nota "Aguardando integração" em vez de omiti-los.

### Critério Secundário: Valor para a Diretoria
| Prioridade | Decisão |
|-----------|---------|
| 1 | SLA e Volumetria — as duas métricas mais pedidas pelo diretor |
| 2 | RACI Matrix — exigida pelo comitê |
| 3 | POPs — documentação operacional para novos servidores |
| 4 | Grafo de Governança — storytelling institucional |
| 5 | Documentos anexados — conveniência |

---

## 4. Decisões de Escopo (O Que Entrou vs O Que Foi Adiado)

### ✅ O Que Entrou (V2.1)

| Feature | Justificativa |
|---------|--------------|
| 7 KPIs automatizados (Grupo 1) | Core business — sem isso não há dashboard |
| 3 KPIs estáticos (Grupo 2) | Visibilidade futura, mesmo sem dados live |
| Grafo de Governança interativo | Storytelling normativo para o comitê |
| RACI com 30 processos e 7 papéis | Exigência regulatória para demonstrar responsabilidades |
| 9 POPs com fluxo visual | Base do Manual Operacional V5 |
| Cross-linking total (KPI↔RACI↔POP) | Rastreabilidade exigida pelo diretor |
| Upload/Preview de documentos | Repositório centralizado de referência |
| SSE para refresh automático | Experiência "TV/kiosk" sem interação |
| Period selector com 6 opções | Comparação temporal para reuniões |
| SLA Virtual Fallback | Cobertura 100% dos tickets |
| Canary deployment profile | Segurança de rollout |

### ❌ O Que Foi Adiado (Dívida)

| Feature Adiada | Motivo do Adiamento |
|---------------|---------------------|
| Integração Zabbix (disponibilidade) | Sem API/acesso configurado na infra estadual |
| Controle de backup automatizado | Sem ferramenta de backup com API REST |
| PCN automático | Depende de portfólio de sistemas que não existe digitalmente |
| Autenticação/Autorização própria | Token GLPI passthrough era suficiente para rede interna |
| Multi-tenant no frontend | Apenas "dtic" era necessário neste momento |
| Dashboard histórico (gráficos de evolução) | Trend parcial (só incidentes); gráficos completos adiados |
| Export PDF/CSV dos KPIs | Diretor preferia mostrar na tela, não em relatório |
| Testes automatizados | Pressão de prazo; validação feita manualmente |
| Notificações (email/push para KPI crítico) | Complexidade de infraestrutura de mensageria |
| Versionamento de documentos | Upload-only sem controle de versão; overwrite implícito |
