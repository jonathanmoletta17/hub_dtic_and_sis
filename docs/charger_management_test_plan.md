# Plano de Testes - Charger Management v2

## Suite criada

- Arquivo: `app/tests/test_charger_management_service.py`
- Escopo coberto:
1. CRUD de carregadores
2. Regras de tempo e bloqueio de sobreposicao
3. Conflito de atribuicao
4. Ciclo de vida de atribuicao (start/finish/cancel)
5. Regras de inativacao
6. Relatorios com calculo de atuacao e ociosidade
7. Fluxo GLPI de solucao (status 5 + notificacao)
8. Auditoria e notificacoes

## Meta de cobertura

- Meta definida: **>= 80%** do modulo `charger_management`.

## Execucao recomendada

```bash
pytest -q app/tests/test_charger_management_service.py --cov=app.services.charger_management_service --cov=app.services.charger_management_store --cov-report=term-missing
```

## Criticos para regressao

1. Validacao de conflito de agenda (`409`).
2. Inativacao com atribuicoes futuras bloqueada (`409`).
3. Atualizacao GLPI para status `5` apos envio de solucao.
4. Persistencia de auditoria para toda mutacao.
