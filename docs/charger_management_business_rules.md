# Regras de Negocio - Charger Management v2

Data: 2026-03-19
Escopo: `app/routers/charger_management.py` + `app/services/charger_management_service.py`

## 1. Tempo de atuacao e tempo ocioso

1. Cada carregador possui regras de expediente individuais (`charger_time_rules`), com:
- `business_start`
- `business_end`
- `effective_from`
- `effective_to`
- `idle_threshold_minutes`

2. Regras de tempo nao podem se sobrepor para o mesmo carregador. Tentativa de overlap retorna `409`.

3. O sistema calcula automaticamente:
- `planned_minutes`: soma das janelas planejadas no periodo.
- `acting_minutes`: soma das janelas reais (`actual_start_at`/`actual_end_at`) para alocacoes `active|completed`.
- `idle_minutes`: `scheduled_minutes - acting_minutes` (minimo zero).

4. Conflito de escala em alocacao e bloqueado quando existe intersecao:
- novo `planned_start_at < planned_end_at_existente`
- novo `planned_end_at > planned_start_at_existente`
- status existente em `planned|active`

## 2. CRUD de carregadores

1. Operacoes implementadas:
- Criar carregador
- Listar carregadores
- Atualizar carregador
- Excluir carregador (soft delete)

2. Exclusao e bloqueada se houver alocacoes `planned|active`.

3. Inativacao exige:
- `reason_code` (lista controlada)
- `inactivated_at`
- opcional `expected_return_at`
- `reason_text` obrigatorio quando `reason_code = other`

4. Inativacao e bloqueada se houver alocacao futura `planned|active`.

## 3. Atribuicao e desatribuicao

1. Criacao de alocacao:
- status inicial `planned`
- valida disponibilidade do carregador
- valida conflito temporal

2. Inicio da execucao:
- muda status para `active`
- define `actual_start_at` quando ausente
- valida conflito em tempo real antes de iniciar

3. Finalizacao:
- muda status para `completed`
- define `actual_end_at`

4. Cancelamento:
- muda status para `canceled`
- define `actual_end_at`

## 4. Fluxo de vida do ticket (GLPI)

1. Endpoint de solucao:
- cria `ITILSolution` no GLPI
- atualiza ticket para status `5` (solucionado)
- cria notificacao `ticket.awaiting_user_approval`

2. Regra aplicada: "solucao adicionada -> ticket solucionado -> aguardando aprovacao do usuario".

## 5. Permissoes

1. Controle por cabecalhos GLPI:
- `X-GLPI-User-Id`
- `X-GLPI-Role`

2. Papeis de gestao (`gestor`, `admin`):
- CRUD de carregadores
- regras de tempo
- relatorios
- leitura de auditoria/notificacoes

3. Papeis operacionais (`gestor`, `admin`, `operador`, `tecnico`):
- atribuicao/desatribuicao
- inicio/fim/cancelamento de alocacao
- envio de solucao de ticket

## 6. Auditoria e notificacoes

1. Toda mutacao relevante gera evento em `charger_audit_trail` com:
- ator
- papel
- acao
- before/after
- request_id

2. Eventos geram notificacoes em `charger_notifications` para consumo de UI/integração.
