# Deferred Legacy Debt

## Objetivo

Registrar o que ainda veio do legado para dentro do `hub-operacional-web`, mas nao faz parte do nucleo canonico atual.

## Estado atual

O runtime canonico esta limitado ao nucleo operacional de tickets para `DTIC` e `SIS`.

Ja foram removidos fisicamente:

- modulos legados de frontend fora do MVP, como `chargers`, `permissions`, `knowledge`, `analytics`, `inventory` e `search`
- services e contratos frontend ligados a esses dominios
- schemas backend herdados sem uso no MVP
- endpoints herdados `db/aggregate`, `db/query` e `db/kpis`
- services backend `kpis_service.py` e `query_engine_service.py`
- utilitarios herdados em `app/core/utils` quando confirmados sem referencias

## Divida controlada restante

Frontend:

- declaracoes residuais em `web/src/lib/config/features.json`
- labels e temas associados em `web/src/lib/config/`
- zona protegida `web/src/lib/context-registry.ts`

Backend:

- eventuais schemas herdados ainda devem ser avaliados por referencia real antes de remocao
- o contrato HTTP atual nao deve ser reduzido sem teste de regressao

Documentacao:

- relatorios historicos, memoria de trabalho e estudos laterais foram movidos para `docs/archive/`
- referencias visuais reutilizaveis foram movidas para `docs/reference/`
- arquivos em `docs/archive/` nao sao fonte normativa para operacao atual

## Regras para novo enxugamento

1. Provar ausencia de uso com busca de referencias, imports, rotas e testes.
2. Nao alterar zonas protegidas sem plano explicito.
3. Manter `user_password_session` como auth padrao.
4. Nao reintroduzir dependencia runtime normal de `user_token`.
5. Rodar validacao proporcional ao escopo alterado.

## Artefatos livres para limpeza

Podem ser removidos quando aparecerem no workspace local:

- `__pycache__`
- `*.pyc`
- `.pytest_cache`
- `.next`
- `node_modules`
- `output`
- `logs`
- relatorios temporarios de build e runtime
