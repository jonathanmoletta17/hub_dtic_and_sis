# Web

Frontend Next.js extraido do nucleo operacional do hub legado.

Fluxos ativos nesta base:

- gateway de login
- selector de contexto
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/ticket/[id]`
- `DTIC/new-ticket` chat inline agent-first
- `SIS/dashboard`
- `SIS/user`
- `SIS/ticket/[id]`
- `SIS/new-ticket` com FormCreator

Runtime canonico:

- proxy: `http://localhost:18080`
- frontend direto: `http://127.0.0.1:18082`
- Hermes API externa para `DTIC/new-ticket`: `http://localhost:8502`
