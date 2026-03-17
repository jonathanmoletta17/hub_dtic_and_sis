# B2 - Diagnostico de Inconsistencias (Search + FormCreator + Fallback de Papel)

Data: 2026-03-16  
Ambiente: `http://hub.local:8080` (sessao real via UI, contexto `sis`)

## 1) Problema A - Smart Search com totais divergentes ao clicar nos cards

### Evidencia de runtime (sessao real)
- Cards exibidos no topo:
  - Novos: `0`
  - Em Atendimento: `30`
  - Pendentes: `9`
  - Solucionados: `6`
- Lista inicial:
  - `Resultados (100)`
- Ao clicar em cada card:
  - Novos -> `Resultados (0)`
  - Em Atendimento -> `Resultados (14)`
  - Pendentes -> `Resultados (1)`
  - Solucionados -> `Resultados (6)`

### Evidencia de chamadas de rede (browser)
- `GET /api/v1/sis/db/stats` (cards)
- `GET /api/v1/sis/db/tickets?limit=100` (lista)

### Evidencia de payload coletado na mesma sessao
- `/db/stats`:
  - `em_atendimento = 30`
  - `pendentes = 9`
  - `solucionados = 6`
- `/db/tickets?limit=100`:
  - `status=2`: `14`
  - `status=3`: `1`
  - `status=4`: `1`
  - `status=5`: `6`
  - `status=6`: `78`

### Causa-raiz (codigo)
1. Os cards usam universo global (SQL agregado):
   - [`app/services/stats_service.py`](/home/jonathan-moletta/projects/tensor-aurora/app/services/stats_service.py:57)
   - `em_atendimento` = `status IN (2,3)`
   - escopo de stats = `status IN (1,2,3,4,5)` (fechado `6` excluido)
2. A lista base do Search usa outro universo:
   - [`web/src/modules/search/hooks/useTicketsSearch.ts`](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/hooks/useTicketsSearch.ts:49)
   - `fetchTickets(..., limit: 100)` sem filtro de status
3. O filtro local do card "Em Atendimento" pega apenas `statusId === 2`:
   - [`web/src/modules/search/hooks/useTicketsSearch.ts`](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/hooks/useTicketsSearch.ts:90)
   - card id definido como `2` em [`web/src/modules/search/components/organisms/KPIGrid.tsx`](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/components/organisms/KPIGrid.tsx:34)
4. O backend da lista nao aplica default de status (logo inclui `6`):
   - [`app/services/ticket_list_service.py`](/home/jonathan-moletta/projects/tensor-aurora/app/services/ticket_list_service.py:70)

### Conclusao
A divergencia nao e aleatoria. Ela acontece por contrato inconsistente entre:
- fonte de contagem (stats global de abertos+solucionados),
- fonte da lista (top 100 sem filtro),
- semantica do card "Em Atendimento" (2+3) vs filtro aplicado (somente 2).

---

## 2) Problema B - Duplicidade de servicos no Novo Chamado (SIS)

### Evidencia de runtime (sessao real)
- `GET /api/v1/sis/domain/formcreator/forms` retorna `36` formularios ativos/visiveis.
- Duplicidade por `(category_id, nome_normalizado)`:
  - `15` grupos duplicados.
  - Exemplos: `Ar-Condicionado`, `Carregadores`, `Copa`, `Eletrica`, `Hidraulica`, etc.

### Evidencia de renderizacao
- Tela `/sis/new-ticket` exibe os itens duplicados (mesmo nome repetido lado a lado).

### Evidencia de schema (risco de dedupe cega)
- Pares com mesmo nome nao sao necessariamente identicos.
- Exemplo recorrente:
  - um ID com `conditions` alto (ex.: 10, 13, 22),
  - outro ID com `conditions = 3`.

### Causa-raiz (codigo)
1. O frontend mapeia e exibe todos os forms recebidos:
   - [`web/src/lib/api/mappers/formcreator.ts`](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/mappers/formcreator.ts:105)
2. Nao existe criterio de dedupe semantica por versao/ownership.
3. O backend lista forms ativos/visiveis sem consolidacao:
   - [`app/routers/domain_formcreator.py`](/home/jonathan-moletta/projects/tensor-aurora/app/routers/domain_formcreator.py:95)

### Conclusao
A duplicidade e de origem de dados (FormCreator no GLPI), e o frontend atualmente reflete isso 1:1.  
Como os pares nao sao sempre equivalentes, remover duplicatas apenas por nome pode quebrar fluxo.

---

## 3) Problema C - Fallback de permissao sem papel ativo

### Evidencia de comportamento
- Endpoint sensivel testado: `GET /api/v1/sis/metrics/chargers/kanban`
  - sem header `X-Active-Hub-Role`: `200`
  - com `X-Active-Hub-Role: solicitante`: `403`
- Isso comprova fallback para uniao de papeis quando nao ha papel ativo explicitado.

### Onde esta implementado
- [`app/core/authorization.py`](/home/jonathan-moletta/projects/tensor-aurora/app/core/authorization.py:93)
  - com `active_hub_role`: autoriza por papel ativo
  - sem `active_hub_role`: expande e une todos `hub_roles`

### Conclusao
O comportamento existe e esta codificado.  
Ele precisa entrar explicitamente na matriz permissional como regra transitoria, com plano de remocao.

---

## 4) Risco de propagacao para outros modulos

Varredura de padrao mostrou que o maior caso confirmado e Search.  
Nao houve evidencia equivalente no caminho principal do Dashboard, mas ele ainda usa composicao de fontes diferentes (`stats` + duas listas separadas), entao merece teste de contrato dedicado.

---

## 5) Decisoes recomendadas (com gate de negocio)

## Decisao D1 - Contrato do Search (obrigatoria)
Escolher uma unica semantica para cards e lista:
- Opcao A (recomendada): cards e lista usam o mesmo universo `status IN (1,2,3,4,5)`, e filtro "Em Atendimento" = `(2 OR 3)`.
- Opcao B: cards passam a refletir apenas a lista carregada (top 100), abrindo mao de total global.

Sem D1, a divergencia continuara por desenho.

## Decisao D2 - Estrategia para duplicidade do FormCreator (obrigatoria)
- Opcao A (recomendada): nao deduplicar por nome automaticamente; exibir label diferenciador (ex.: sufixo por ID) enquanto saneamos origem no GLPI.
- Opcao B: dedupe por regra explicita e aprovada (ex.: manter maior ID, ou manter mais condicoes), assumindo risco funcional.

Sem D2, qualquer "fix rapido" pode esconder formulario valido.

## Decisao D3 - Fallback de papel ativo (obrigatoria para seguranca)
- Opcao A (recomendada): manter fallback apenas como modo legado com telemetria e prazo de desativacao.
- Opcao B: bloquear imediatamente qualquer request sem papel ativo (mais seguro, maior chance de quebra imediata).

Sem D3, a matriz permissional segue incompleta frente ao runtime real.

---

## 6) Proxima execucao tecnica sugerida (incremental, sem big-bang)

1. Congelar contrato do Search (D1) e implementar ajuste com teste de contrato E2E.  
2. Introduzir modo de coexistencia para FormCreator (D2): distinguir duplicados na UI sem apagar dados.  
3. Formalizar regra do papel ativo (D3) em documento + testes backend de autorizacao.  
4. Reexecutar bateria:
   - `pytest`
   - `npm run lint`
   - `npx vitest run`
   - `npm run build`
   - Playwright: login + search cards + novo chamado + carregadores

