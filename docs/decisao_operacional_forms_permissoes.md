# Decisão Operacional — Forms Duplicados e Fallback de Papel

Data: 2026-03-16  
Escopo: estabilização e hardening sem quebra de comportamento de negócio.

## 1) Forms duplicados (FormCreator / SIS)

Decisão adotada (conservadora e reversível):
- Não apagar nem alterar formulários no GLPI nesta etapa.
- Deduplicar apenas chaves conhecidas e mapeadas para ID canônico no frontend.
- Manter ambos quando houver risco funcional (caso explícito: `Projeto`) com sufixo `(ID X)`.
- Manter ambos quando o par duplicado não estiver mapeado (fail-safe).

Objetivo:
- Eliminar duplicidade visual indevida sem risco de perder fluxo de negócio ativo.

Onde está implementado:
- `web/src/lib/api/mappers/formcreator.ts`
  - `CANONICAL_FORM_IDS_BY_KEY`
  - `KEEP_ALL_DUPLICATES_BY_KEY`

Rollback:
- Remover chave do mapa canônico ou mover para `KEEP_ALL_DUPLICATES_BY_KEY`.

---

## 2) Fallback legado de papel (X-Active-Hub-Role ausente)

Estado anterior:
- Quando `X-Active-Hub-Role` não vinha, a autorização caía em união de todos os papéis da sessão.

Decisão adotada nesta etapa:
- Manter fallback legado para compatibilidade geral de leitura.
- Exigir `active_hub_role` explícito em ações sensíveis (writes) de tickets workflow e chargers.
- Sem header ativo, write sensível retorna `403`.

Objetivo:
- Reduzir risco de escalonamento de privilégio por ausência de papel ativo em ações destrutivas/operacionais.

Onde está implementado:
- `app/core/authorization.py`
  - novo parâmetro: `require_active_hub_role=True`
- `app/routers/ticket_workflow.py`
  - aplicado em `POST /followups`, `/solutions`, `/assume`, `/pending`, `/resume`, `/return-to-queue`, `/reopen`, `/transfer`
- `app/routers/chargers.py`
  - aplicado em writes (`PUT/POST/DELETE`) de schedule/offline/assign/crud/batch

Rollback:
- Remover `require_active_hub_role=True` dos endpoints desejados.

---

## 3) Critério de segurança e estabilidade

- Princípio usado: **fail-safe em operação sensível, compatibilidade em leitura**.
- A mudança não altera regra de negócio de permissão por papel; apenas endurece a exigência de papel ativo para writes.
- Fluxo de UI permanece funcional porque o frontend já envia `X-Active-Hub-Role` via `httpClient`.
