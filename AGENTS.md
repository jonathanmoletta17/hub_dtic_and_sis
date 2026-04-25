# AGENTS.md - hub-operacional-web

If `BOOTSTRAP.md` exists, read it first.

## Repo alvo

Este repositorio e o produto canonico do hub operacional para `DTIC` e `SIS`.

Escopo funcional protegido:

- login
- selector
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket` agent-first com handoff para Hermes
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`

## Regras de operacao

- Use evidencia de arquivo, comando, health ou teste.
- Nao trate `cli-control-3ui` como destino de patch a partir deste repo.
- Nao invente MCPs, hooks, settings locais de CLI ou skills se o repo nao provar essa necessidade.
- Prefira editar docs e scripts locais antes de criar novas camadas de persistencia.

## Zonas protegidas

Nao altere sem plano explicito e regressao:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\context-registry.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\store\useAuthStore.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\httpClient.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\services\auth_service.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\core\contexts.yaml`

## Validacao padrao

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`
- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1`

## Fronteira com outros sistemas

- Hermes e externo a este repo.
- Knowledge base/RAG e externa a este repo.
- Control plane e externo a este repo.

Este repositorio deve expor contexto de projeto, bootstrap e validacao propria. Ele nao deve espelhar estado nativo desses outros runtimes.
