# AG-06 — Plano de Integração no Hub (Sem Perda de Contexto)

## Visão Geral

Migrar o spoke `spokes/governance` (frontend + backend + stream) para dentro do Hub consolidado em `tensor-aurora`, preservando 100% da funcionalidade, narrativa visual e confiabilidade dos KPIs.

---

## Fase 0 — Levantamento e Contratos

**Duração estimada:** 1 sprint (5 dias úteis)

### Escopo
1. Mapear todos os endpoints consumidos pelo governance frontend (já documentado no AG-02)
2. Validar se o Hub (`tensor-aurora`) já expõe GLPI database access ou se precisa de proxy
3. Definir o contrato de roteamento no Hub: como as 4 telas serão acessíveis (rota dedicada vs módulo lazy-loaded)
4. Inventariar as 7 queries SQL dos KPIs e verificar compatibilidade com o database layer do Hub
5. Auditar o modelo de autenticação do Hub e definir como o token GLPI será gerenciado (eliminar query param)

### Riscos
| Risco | Mitigação |
|-------|----------|
| Hub não tem acesso à base GLPI DTIC | Manter `governance-backend` como microsserviço externo consumido pelo Hub |
| Conflito de versão React entre spoke e Hub | Usar module federation ou web components |

### Critérios de Aceite
- [ ] Documento de contratos (endpoints, payloads, auth) revisado e aprovado
- [ ] Decision record: backend integrado vs microsserviço externo
- [ ] Mapeamento de rotas no Hub definido

### Testes
- N/A (fase documental)

### Rollback
- N/A (sem mudança de código)

---

## Fase 1 — Landing Funcional Mínima

**Duração estimada:** 2 sprints (10 dias úteis)

### Escopo
1. Criar rota `/governance` no Hub que carrega a [IndicatorsView](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#1051-1179) (Board 1 — KPIs)
2. Implementar KPI service no Hub backend (ou proxy para `governance-backend`)
3. Period selector funcional com dados reais do GLPI
4. Auth: token GLPI via sistema de auth do Hub (session cookie ou JWT), eliminando localStorage hack
5. Loading states e error handling com padrões do Hub (skeleton, toast, fallback)

### Riscos
| Risco | Mitigação |
|-------|----------|
| Queries KPI lentas em produção | Implementar cache Redis com TTL de 60s |
| Hub auth incompatível com GLPI token | Implementar adapter layer no backend |
| UI inconsistência com design system do Hub | Usar tokens do Hub, não TailwindCSS arbitrário |

### Critérios de Aceite
- [ ] 7 KPIs do Grupo 1 exibidos corretamente com semáforo
- [ ] Period selector funcional (6 opções)
- [ ] MOVIMENTAÇÃO TOTAL correta
- [ ] Auth via mecanismo do Hub (sem query param)
- [ ] Tempo de carregamento <3s em 95th percentile
- [ ] Tratamento de erro amigável (toast, não crash)

### Testes
| Tipo | Escopo |
|------|--------|
| Unit | Cada calc_* function com valores mock conhecidos |
| Integration | Endpoint `/governance/kpis` retorna schema esperado |
| E2E | Navegar até Indicadores, trocar período, verificar cards |
| Performance | Benchmark de queries vs base de produção |

### Rollback
- Feature flag no Hub: se `GOVERNANCE_ENABLED=false`, rota não aparece no menu
- Fallback: redirect para spoke original `localhost:4010`

---

## Fase 2 — Paridade Visual/Funcional

**Duração estimada:** 3 sprints (15 dias úteis)

### Escopo
1. Migrar Board 0 (Grafo de Governança) para componente Hub
2. Migrar Board 2 (RACI Matrix) com sticky columns
3. Migrar Board 3 (POPs & Processos) com clusters
4. Implementar cross-linking (KPI↔RACI↔POP) com router do Hub
5. Migrar gestão de documentos (upload/preview/delete) para storage do Hub
6. Migrar SSE connection para o event system do Hub (ou manter websocket)
7. Implementar governance nodes, KPIs, RACI e POPs como dados de API (não constants.ts)

### Riscos
| Risco | Mitigação |
|-------|----------|
| Grafo interativo complexo de reimplementar | Usar biblioteca de grafos existente no Hub ou portar como componente isolado |
| Preview de documentos (PDF/DOCX/XLSX) pesado | Lazy-load libraries, bundle splitting |
| Cross-linking com scroll+highlight pode conflitar com router do Hub | Implementar como query param `?highlight=sla` em vez de route state |

### Critérios de Aceite
- [ ] 4 boards (Governança, Indicadores, RACI, POPs) 100% funcionais
- [ ] Cross-link navega entre boards com highlight visual
- [ ] Upload/download/preview de documentos operacional
- [ ] SSE ou equivalente atualiza documentos em tempo real
- [ ] Governança nodes vêm de API (não hardcoded)
- [ ] Responsive: funciona em desktop (1920px) e TV (1080p)

### Testes
| Tipo | Escopo |
|------|--------|
| E2E | Fluxo completo: Grafo → clicar nó → ver documentos → upload → preview |
| E2E | Navegar Board 1 → clicar "Ver POP" → chegar no POP correto com highlight |
| Visual regression | Comparar screenshots spoke vs Hub para cada board |
| TV test | Verificar legibilidade em 1920×1080 à distância de 3m |

### Rollback
- Manter spoke funcional em paralelo até sign-off do diretor
- Feature flag per-board: ativar boards incrementalmente

---

## Fase 3 — Hardening e Rollout Executivo

**Duração estimada:** 1 sprint (5 dias úteis)

### Escopo
1. Cache server-side para KPIs com invalidação inteligente (TTL + SSE trigger)
2. Métricas de performance (P50, P95, P99 dos endpoints)
3. Alerting: notificação se algum KPI calculator falhar por >5 min
4. Dashboard de health check interno (status dos 7 KPIs)
5. Documentação de operação (runbook) para equipe de infra
6. Sessão de validação com diretor usando checklist AG-07
7. Descomissionar spoke original:
   - Remover `governance-dtic` do [docker-compose.yml](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/docker-compose.yml)
   - Remover `governance-backend` (se integrado) ou manter como microsserviço
   - Remover `governance-stream` (se integrado ao event system do Hub)
   - Mover `spokes/governance*` para `_quarantine/`

### Riscos
| Risco | Mitigação |
|-------|----------|
| Diretor encontra discrepância KPI spoke vs Hub | Rodar ambos em paralelo por 1 semana, comparar valores |
| Equipe interna usa bookmarks do spoke antigo | Redirect 301 do antigo URL para o Hub |

### Critérios de Aceite
- [ ] 100% dos critérios do AG-07 (checklist executivo) atendidos
- [ ] Zero discrepância KPI entre spoke e Hub por 5 dias consecutivos
- [ ] Diretor assina homologação
- [ ] Spoke original descomissionado sem impacto
- [ ] Runbook publicado

### Testes
| Tipo | Escopo |
|------|--------|
| Smoke | Todos os boards acessíveis após deploy em produção |
| Parity | Comparação automatizada spoke vs Hub para cada KPI |
| Load | Simulação de N clientes simultâneos (TV mode) |

### Rollback
- Reativar spoke: `docker compose --profile legacy up`
- DNS/proxy switch instantâneo

---

## Cronograma Resumido

| Fase | Sprint(s) | Marcos |
|------|----------|--------|
| Fase 0 | S1 | Contratos aprovados |
| Fase 1 | S2–S3 | KPIs live no Hub |
| Fase 2 | S4–S6 | Paridade total |
| Fase 3 | S7 | Go-live + descomissão |

**Total estimado: 7 sprints (~35 dias úteis / 7 semanas)**
