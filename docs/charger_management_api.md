# API de Integracao - Charger Management v2

Base URL: `/api/v2/{context}/charger-management`

## Headers obrigatorios

- `X-GLPI-User-Id: <id>`
- `X-GLPI-Role: <gestor|admin|operador|tecnico>`
- opcional: `X-GLPI-User-Name`, `X-Request-ID`

## Endpoints

### Carregadores

- `POST /chargers`
- `GET /chargers?include_deleted=false`
- `PUT /chargers/{charger_id}`
- `DELETE /chargers/{charger_id}`
- `POST /chargers/{charger_id}/inactivation`
- `POST /chargers/{charger_id}/reactivation`

### Regras de tempo

- `POST /chargers/{charger_id}/time-rules`
- `GET /chargers/{charger_id}/time-rules`

### Atribuicoes

- `POST /assignments`
- `POST /assignments/{assignment_id}/start`
- `POST /assignments/{assignment_id}/finish`
- `POST /assignments/{assignment_id}/cancel`

### Workflow GLPI

- `POST /tickets/{ticket_id}/solution`

### Relatorios e controle

- `GET /reports?start_at=<iso>&end_at=<iso>&charger_id=<id>&assignment_status=<status>`
- `GET /notifications?only_pending=true&limit=100`
- `GET /audit?entity_type=<entity>&entity_id=<id>&limit=200`

## Padrao de erros

- `400`: payload invalido, contexto nao suportado, periodo invalido
- `403`: papel sem permissao
- `404`: recurso nao encontrado
- `409`: conflito de regra de negocio (sobreposicao, inativacao com alocacao ativa)
- `502`: falha de sincronizacao com GLPI

## Contrato OpenAPI

Os contratos completos de request/response ficam no Swagger do backend:
- `/docs` (Swagger UI)
- `/openapi.json` (especificacao)
