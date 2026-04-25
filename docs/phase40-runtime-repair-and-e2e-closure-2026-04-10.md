# Phase 40 - Runtime Repair And E2E Closure - 2026-04-10

## Objetivo

Fechar a validacao consolidada do hub com:

- Hermes web e API ativos
- credenciais de smoke aplicadas apenas na sessao atual
- Playwright full `6/6` verde

## Evidencia

### Ambiente

- `Get-NetTCPConnection` confirmou `8501` e `8502` em escuta apos iniciar `hermes`
- `http://localhost:8501/` respondeu `200`
- `http://localhost:8502/health` respondeu `200`
- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`
  - `PASS`
  - `hermes.url` e `hermes.api` saudaveis

### Correcao DTIC

- arquivo: `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- acao:
  - limpeza de markdown residual no texto do agente
  - normalizacao de `Chamado aberto: **#123**.` para `Chamado aberto: #123.`
- efeito:
  - `e2e\hub-dtic-agent-submit-clean.spec.ts` voltou a passar no runtime real

### Correcao SIS

- arquivo: `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\core\glpi_client.py`
- acao:
  - `create_item()` passou a retry em `httpx.TransportError`
- causa observada em log:
  - `Server disconnected without sending a response.`
  - o upstream `SIS` derrubou o primeiro `POST /PluginFormcreatorFormAnswer`
- efeito:
  - o submit do FormCreator ficou resiliente ao disconnect transitivo
  - `e2e\hub-sis-followup-attachment-clean.spec.ts` voltou a passar

## Validacao final

Com `SMOKE_USERNAME=jonathan-moletta` e `SMOKE_PASSWORD=JNMolett@#2025!!!` apenas na sessao atual:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright
```

Resultado:

- `web lint`: ok
- `web vitest`: `24 arquivos / 94 testes`
- `web build`: ok
- `backend pytest`: `9/9`
- `doctor`: `PASS`
- `Playwright`: `6/6`

## Conclusao

O bloqueio era misto:

1. ambiente incompleto (`Hermes` fora do ar e sem `SMOKE_*` na sessao)
2. bug real de rendering no `DTIC/new-ticket`
3. flake real de upstream no submit `SIS`

Depois da correcao do runtime e do endurecimento pontual, a validacao consolidada fechou verde.
