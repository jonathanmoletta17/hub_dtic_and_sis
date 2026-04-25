# Auth/session governance - Hub Operacional

Data: 2026-04-25

## Decisao operacional

O Hub interativo opera com credenciais reais do usuario GLPI.

- Entrada: usuario e senha de rede enviados ao `initSession` GLPI via Basic Auth.
- Sessao: o GLPI devolve um `session_token`.
- Chamadas seguintes: o Hub usa o `session_token` do usuario real no header `Session-Token`.
- Auditoria: leituras e acoes autenticadas preservam a identidade e as permissoes do usuario.

`user_token` de conta tecnica nao e requisito operacional do Hub interativo.

## Tokens existentes

`session_token`

- Gerado dinamicamente pelo GLPI depois de login real com usuario/senha.
- Necessario para manter a sessao sem reenviar senha em cada request.
- Escopo: usuario real autenticado.
- Uso atual: `/auth/me`, diagnostico, lookups, FormCreator, DB read, workflow de tickets, SSE.

`user_token`

- Segredo fixo de uma conta tecnica GLPI.
- Permite abrir sessao sem credencial do operador.
- Risco: auditoria e permissoes passam a refletir a conta tecnica, nao o usuario real.
- Status atual: opcional/legado. Nao participa do login, diagnostico, health padrao ou telas.

## Mapa de runtime

Backend auth:

- `backend/app/services/auth_service.py`
- Login usa `GLPIClient.init_session_basic(username, password)`.
- Resolucao de `app_access` usa a sessao real do usuario para ler grupos.
- `fetch_session_identity` exige `session_token` real.

Diagnostico:

- `backend/app/routers/domain_auth.py`
- `/api/v1/{context}/auth/diagnose-access` usa `Depends(verify_session)`.
- Nao aceita username arbitrario.
- Nao abre sessao tecnica.

Health:

- `backend/app/routers/health.py`
- `/health` valida configuracao minima de URL/App-Token por contexto.
- Nao executa `initSession` com `user_token`.
- `service_session_status` retorna `disabled` por desenho.

SSE:

- `backend/app/routers/events.py`
- `/api/v1/{context}/events/stream` exige sessao real via `verify_session`.
- Mantem canal vivo sem criar ou alterar dados no GLPI.

Conta tecnica legado:

- O `SessionManager` legado foi removido.
- `GLPIClient.init_session()` ainda existe apenas como primitivo explicito para clientes criados com `allow_service_session=True`.
- Clientes normais bloqueiam sessao tecnica por padrao.

## Testes e validacao

Validacao segura padrao:

- `cd backend && .venv/bin/pytest -q -s tests`
- `cd web && npm run lint`
- `cd web && npm exec vitest run`
- `cd web && npm run build`
- Prova E2E read-only com login real: login, selector, telas, leituras, SSE e logout.

Smokes destrutivos:

- Arquivos em `web/e2e/*clean.spec.ts`.
- Criam tickets/anexos/form answers reais e depois tentam limpar.
- Exigem `ALLOW_GLPI_MUTATION_SMOKE=true`.
- Nao fazem parte da validacao padrao nem devem ser usados para diagnostico read-only.

## Implicacoes de remover user_token do caminho padrao

O que continua funcionando:

- Login real DTIC/SIS.
- `/auth/me`.
- `/auth/diagnose-access`.
- Telas protegidas.
- Lookups e FormCreator autenticados.
- Leituras de banco CQRS.
- Workflows autenticados que recebem `session_token` do usuario.
- SSE autenticado.

O que muda:

- `/health` nao degrada mais por token tecnico invalido.
- Backend nao exige `DTIC_GLPI_USER_TOKEN`/`SIS_GLPI_USER_TOKEN` para subir.
- Fallback de login por conta tecnica nao existe.
- Operacoes sem usuario logado precisam de desenho proprio, auditoria explicita e opt-in separado.

## Pendencias deliberadas

- Se houver necessidade de jobs de sistema, criar um canal separado de service account com escopo, auditoria e endpoint de health proprio, sem misturar com login do usuario.
- Smokes destrutivos continuam isolados por `ALLOW_GLPI_MUTATION_SMOKE=true` porque criam e limpam dados reais.
