# HERMES.md - hub-operacional-web

Leia `C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md` primeiro.

## Papel deste repo

Este repo e consumidor do Hermes no fluxo `DTIC` agent-first. Ele nao versiona o runtime Hermes.

## Arquivos chave da integracao

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\runtime.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase5-validation-2026-04-07.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase6-validation-2026-04-07.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase7-validation-2026-04-07.md`

## Contrato observado

- o hub monta `handoff_payload` estruturado e `handoff` textual fallback
- o CTA abre `NEXT_PUBLIC_DTIC_AGENT_URL`
- o Hermes esperado localmente responde em `http://localhost:8501`

## Regras

- Nao mover configuracao nativa do Hermes para dentro deste repo.
- Nao criar `config.yaml`, memorias ou sessoes do Hermes neste repo sem mudanca explicita de ownership.
- Se a integracao falhar, validar primeiro `runtime.ts`, `DticAgentEntry.tsx`, compose do hub e disponibilidade do Hermes externo.
