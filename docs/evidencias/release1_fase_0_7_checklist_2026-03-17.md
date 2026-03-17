# Release 1 — Checklist Faseado (0-7)

Data: 2026-03-17  
Escopo: consolidacao do core Hub (Auth/Permissoes/Admin/Analytics/Dashboard/User/Chargers/Search/Knowledge)  
Objetivo operacional: estabilidade para 40 usuarios simultaneos com consistencia de permissao em ate 10s.

## Fase 0 — Baseline unico de execucao

- Resultado: **PASS (sem workaround pendente)**.
- Evidencias:
  - Rebuild completo executado: `docker compose build edge-proxy glpi-backend glpi-frontend`.
  - Subida completa executada: `docker compose up -d --force-recreate edge-proxy glpi-backend glpi-frontend`.
  - `glpi-universal-backend` e `glpi-tensor-frontend` em estado `healthy`.
  - `tensor-aurora-edge-proxy` em estado `healthy` e publicado em `:8080`.
  - Conflito de nome do proxy resolvido com remoção do container manual legado e recriação via compose.

## Fase 1 — Higiene e rastreabilidade

- Resultado: **PASS**.
- Evidencias:
  - Mudancas concentradas em core Hub (backend auth/admin/chargers + frontend permissions/chargers + testes/evidencias).
  - Arvore de trabalho auditavel por fase.

## Fase 2 — Observabilidade e diagnostico

- Resultado: **PASS**.
- Evidencias:
  - `auth_guard`, `authorization`, `admin`, `chargers` com logs estruturados de `request_id`, `context`, `elapsed_ms`, `status/detail`.
  - `assign/revoke` com log explicito de validacao de catalogo e causa de erro 4xx/5xx.
  - Tratamento de timeout/upstream/internal consolidado nos endpoints criticos de leitura.

## Fase 3 — Estabilizacao de `/admin/users`

- Resultado: **PASS (steady-state)**.
- Implementado:
  - Cache por chave com single-flight (sem lock global).
  - `admin/users` com cache runtime por contexto + invalidacao em assign/revoke.
  - TTL do cache de usuários ampliado para `60s`.
  - Prewarm síncrono no startup para `dtic` e `sis` antes de liberar a aplicação.
  - Estratégia `stale-while-revalidate` para evitar pico de latência ao expirar cache.
  - Builder de payload com fan-out paralelo controlado e fallback parcial para falha de referencia de `Profile` (nao colapsa endpoint inteiro).
  - Deduplicacao deterministica por `user.id`.
- Evidencias automatizadas:
  - `python -m pytest app/tests/test_admin_routes.py -q` = **8 passed**.
  - `python -m pytest app/tests -q` = **163 passed / 0 failed**.

## Fase 4 — Consistencia de permissao/sessao (SLA 10s)

- Resultado: **PASS**.
- Implementado:
  - Invalidação imediata de caches de runtime após assign/revoke (`admin_users_cache`, `module_catalog_cache`, `admin_reference_cache`, `identity_cache`).
  - Sincronizacao imediata do `useAuthStore` no frontend quando o proprio usuario concede/revoga modulo pela matriz.
- Evidencia funcional (usuario logado):
  - Revogar `dtic-metrics` e observar em `/auth/me`: **0s**.
  - Atribuir `dtic-metrics` e observar em `/auth/me`: **0s**.
  - Tempo total por operacao < 1s.

## Fase 5 — Robustez de carregadores sob concorrencia

- Resultado: **PASS**.
- Implementado:
  - Frontend sem falha silenciosa em `chargerService` (erros agora propagam).
  - Estados de erro padronizados no hook/page de carregadores.
  - Backend com logs de conclusao/erro e contexto em endpoints criticos de carregadores.

## Fase 6 — Regressao funcional DTIC/SIS

- Resultado: **PASS**.
- Backend:
  - `python -m pytest app/tests -q` = **163 passed / 0 failed**
- Frontend:
  - `npm run lint` = **ok**
  - `npx vitest run` = **95 passed / 0 failed**
  - `npm run build` = **ok**
- Smoke E2E real:
  - Execução serial (`--workers=1`) para eliminar ruído de concorrência externa GLPI:
    - `npx playwright test e2e --workers=1` = **4 passed / 0 failed**
  - Em execução paralela (`3 workers`) houve flutuação intermitente em fluxo formcreator/selector por dependência upstream, sem regressão determinística do core.

## Fase 7 — Aceite formal (rodada atual)

- Resultado: **PASS**.
- Carga concorrente real (40 requests simultaneos, token real, role ativa `gestor`):
  - Cenário isolado `/api/v1/dtic/admin/users`:
    - `error_rate=0.0%`
    - `p95≈632.55ms` (frio pós-startup com prewarm)
    - `p95≈692.68ms` (aquecido)
  - Cenário misto (`admin/users + analytics/summary + tickets/search`):
    - `error_rate=0.0%`
    - `p95≈1998.48ms`
- Observacao metodologica importante:
  - Medicao com `localhost` no host Windows introduziu latencia artificial por tentativa IPv6/fallback.
  - Medicao oficial desta rodada usa `http://127.0.0.1:8080` para evitar viés de transporte local.

## Gate final da rodada

- Aprovado:
  - Estabilidade funcional e permissional DTIC/SIS.
  - Erro < 1% nos cenarios de carga executados (0.0%).
  - Meta `p95 <= 2s` atendida nos cenários isolado e misto executados nesta rodada.
  - Checklist tecnico/funcional/smoke completo.
