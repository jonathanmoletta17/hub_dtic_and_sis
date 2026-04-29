# Backend

Nucleo FastAPI minimo para:

- autenticacao
- leitura CQRS de tickets
- workflow de tickets
- lookups
- FormCreator
- eventos SSE autenticados

Routers ativos:

- `health`
- `domain_auth`
- `lookups`
- `domain_formcreator`
- `db_read`
- `ticket_workflow`
- `events`

Auth padrao:

- `user_password_session`
- health com `service_session_status=disabled`
- sem dependencia runtime normal de `user_token`

## Testes

Suite local versionada em `backend/tests` cobrindo:

- contrato do endpoint raiz
- health `healthy` e `degraded`
- shutdown do lifespan
- parsing de `Settings`
- resolucao de contexto para GLPI e banco

Comando:

```bash
.venv/bin/python -m compileall app tests
.venv/bin/pytest -q -s tests
```
