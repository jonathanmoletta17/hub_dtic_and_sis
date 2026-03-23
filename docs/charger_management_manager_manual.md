# Manual Operacional - Gestores

Data: 2026-03-19
Publico: Gestores e administradores SIS

## 1. Pre-requisitos

1. Toda chamada deve enviar:
- `X-GLPI-User-Id`
- `X-GLPI-Role` (`gestor` ou `admin`)

2. Contextos suportados:
- `sis`
- `sis-manutencao`
- `sis-memoria`

3. Tela web inicial disponivel em:
- `/{context}/gestao-carregadores-v2`

## 2. Ciclo operacional recomendado

1. Cadastre o carregador:
- `POST /api/v2/{context}/charger-management/chargers`

2. Cadastre o expediente individual:
- `POST /api/v2/{context}/charger-management/chargers/{charger_id}/time-rules`

3. Crie atribuicoes planejadas:
- `POST /api/v2/{context}/charger-management/assignments`

4. Durante execucao:
- iniciar: `POST /assignments/{id}/start`
- finalizar: `POST /assignments/{id}/finish`
- cancelar: `POST /assignments/{id}/cancel`

5. Para indisponibilidade:
- `POST /chargers/{id}/inactivation`
- retorno: `POST /chargers/{id}/reactivation`

6. Para fechamento tecnico de ticket:
- `POST /tickets/{ticket_id}/solution`

## 3. Relatorios e monitoramento

1. Relatorio gerencial:
- `GET /reports?start_at=...&end_at=...`
- filtros: `charger_id`, `assignment_status`

2. Notificacoes:
- `GET /notifications?only_pending=true`

3. Auditoria:
- `GET /audit?entity_type=...&entity_id=...`

## 4. Erros comuns

1. `409 Schedule conflict`:
- existe sobreposicao de alocacao para o carregador no periodo.

2. `409 Cannot inactivate charger with active/planned future assignments`:
- cancele ou conclua alocacoes antes da inativacao.

3. `403 Access denied for role`:
- papel do header nao possui permissao para a operacao.

## 5. Boas praticas

1. Definir horarios reais com antecedencia em `time-rules`.
2. Evitar alocacao sem janela de inicio/fim precisa.
3. Validar relatorios diariamente para identificar tempo ocioso elevado.
4. Usar trilha de auditoria como fonte oficial de responsabilizacao.
