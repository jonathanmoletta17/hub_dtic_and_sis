# Architecture Rules

## Objetivo

Congelar as zonas protegidas e o escopo canonico do `hub-operacional-web` para permitir limpeza progressiva sem regressao funcional.

Raiz canonica:

- `/home/jonathan/projects/work/hub-operacional-web`

Caminhos Windows em documentos antigos sao legado/historico de host e nao definem a raiz atual de codigo-fonte.

## Produto canonico atual

O produto canonico desta base e somente o nucleo operacional de tickets para `DTIC` e `SIS`.

Fluxos protegidos:

- login
- selector
- dashboard
- meus chamados
- detalhe do ticket
- `DTIC` agent-first com chat inline integrado ao Hermes externo
- `SIS` com `FormCreator`, followup e anexo

## Zonas protegidas

Nao alterar sem plano explicito e validacao de regressao:

- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/context-registry.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/store/useAuthStore.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/api/httpClient.ts`
- `/home/jonathan/projects/work/hub-operacional-web/backend/app/services/auth_service.py`
- `/home/jonathan/projects/work/hub-operacional-web/backend/app/core/contexts.yaml`

## Regras de mudanca

1. Nao remover entradas existentes de `context-registry.ts` sem mapa de referencias e plano de substituicao.
2. Nao alterar contrato HTTP do backend atual.
3. Nao abrir o menu do MVP para modulos fora do nucleo enquanto eles nao forem revalidados nesta base nova.
4. Nao alterar o auth padrao `user_password_session` ou reintroduzir dependencia runtime normal de `user_token` sem plano explicito.
5. Nao criar settings locais de Claude/Cursor/MCP/CLI sem necessidade comprovada no proprio repo.
6. Toda limpeza fisica de legado deve vir depois de:
   - classificacao funcional
   - busca de referencias
   - build
   - smoke do MVP

## Regras de consolidacao

- O que esta validado em `docs/archive/phase-reports/` permanece como evidencia historica de baseline funcional.
- A fonte normativa atual fica em `README.md`, `BOOTSTRAP.md`, `AGENTS.md`, este arquivo e `docs/README.md`.
- Modulos herdados mas fora do MVP podem permanecer escondidos, desde que:
  - nao sejam expostos na navegacao
  - nao sejam dependencias do runtime validado
  - estejam documentados como divida tecnica explicita
- Artefatos gerados podem ser removidos a qualquer momento:
  - `__pycache__`
  - `*.pyc`
  - `.next`
  - `node_modules`
  - `output`
  - relatórios de build e runtime temporarios
