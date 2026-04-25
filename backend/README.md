# Backend

Nucleo FastAPI minimo para:

- autenticacao
- leitura CQRS de tickets
- workflow de tickets

Routers ativos:

- `health`
- `domain_auth`
- `db_read`
- `ticket_workflow`

## Testes

Suite local versionada em `backend/tests` cobrindo:

- contrato do endpoint raiz
- health `healthy` e `degraded`
- shutdown do lifespan
- parsing de `Settings`
- resolucao de contexto para GLPI e banco

Comando:

```powershell
python -m pytest tests -q
```
