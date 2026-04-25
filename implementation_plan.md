# Implementation Plan - Portal Autoatendimento sobre hub-operacional-web

Data: 2026-04-08
Status: aprovado para execucao incremental
Repositorio: `C:\Users\jonathan-moletta\code\hub-operacional-web`

## 1. Objetivo

Evoluir o `hub-operacional-web` para servir como base do Portal de Autoatendimento, reaproveitando o nucleo operacional ja validado e evitando reescrita greenfield do fluxo de tickets.

## 2. Baseline provado

Base funcional ja validada neste repo:

- login
- selector
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket` agent-first com handoff
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`
- follow-up e anexo no SIS

Evidencias principais:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase14-control-plane-runtime-revalidation-2026-04-08.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase15-backend-pytest-bootstrap-2026-04-08.md`

## 3. Principios de execucao

- Nao reescrever o nucleo funcional ja validado.
- Nao tocar primeiro nas zonas protegidas:
  - `web/src/lib/context-registry.ts`
  - `web/src/store/useAuthStore.ts`
  - `web/src/lib/api/httpClient.ts`
  - `backend/app/services/auth_service.py`
  - `backend/app/core/contexts.yaml`
- Introduzir uma fachada de portal por cima do nucleo atual antes de alterar contratos internos.
- Tratar integracoes externas como adaptadores plugaveis:
  - Microsoft/Azure
  - terceiro GLPI
  - agente local
  - monitoramento
  - WhatsApp
  - Cloudflare
- So considerar Firebase como runtime principal depois que o fluxo omnichannel estiver comprovado.

## 4. Estrategia tecnica

### Fase 1 - Fachada de portal sobre o nucleo atual

- Criar uma linguagem de produto "portal de autoatendimento" no frontend, sem quebrar `dtic` e `sis` internamente.
- Preservar o comportamento atual de login, selector e tickets.
- Modelar o mapeamento conceitual inicial:
  - `dtic` -> `ti`
  - `sis` -> candidato a `manutencao`
- Tratar `protocolo` como contexto futuro, nao como dependencia para iniciar a adaptacao visual e estrutural.

### Fase 2 - Camada de adaptacao de contexto

- Introduzir aliases ou uma camada de apresentacao que exponha os contextos do portal sem renomear imediatamente os IDs internos.
- Centralizar o mapeamento portal -> contexto canonico.
- Somente depois disso avaliar mudancas em `context-registry.ts` e `contexts.yaml`.

### Fase 3 - Autenticacao e canais externos

- Adicionar suporte a Microsoft 365 como metodo de entrada adicional.
- Preservar o login atual por credencial de rede enquanto o login Microsoft nao estiver operacional.
- Definir o backend como broker de identidade e roteamento, evitando duplicar regra de negocio entre canais.

### Fase 4 - Omnichannel e automacao

- Integrar terceiro GLPI de Protocolo quando a instancia real estiver confirmada.
- Integrar agente local para diagnostico, AD e monitoramento.
- Integrar webhook WhatsApp como canal adicional do mesmo nucleo.

### Fase 5 - Topologia de deploy

- Fechar o papel de Firebase e Cloudflare somente apos os adaptadores principais existirem.
- Validar se Firebase sera:
  - edge/orquestrador fino na frente do hub
  - ou runtime principal com migracao gradual do backend

## 5. Dependencias externas ainda abertas

- URLs publicas Cloudflare
- Azure app registration do portal
- projeto Firebase alvo
- terceiro GLPI de Protocolo
- dados de monitoramento
- dados do WhatsApp Business

Referencia de inventario:

- `C:\Users\jonathan-moletta\code\docs\infra\portal-autoatendimento\secao-9.3-inventario.csv`

## 6. Criterio de pronto por etapa

### Etapa 1 pronta

- o repo passa a ter documentacao e backlog locais do portal
- a estrategia de reuso fica explicita
- nenhuma zona protegida e alterada sem regressao planejada

### Etapa 2 pronta

- existe uma fachada de portal navegavel sobre o nucleo atual
- o fluxo atual de tickets continua validado

### Etapa 3 pronta

- login Microsoft entra sem quebrar o login atual
- o contexto do portal continua apontando para o backend canonico

### Etapa 4 pronta

- terceiro GLPI, agente local e WhatsApp operam como adaptadores do mesmo nucleo

### Etapa 5 pronta

- topologia final de deploy esta decidida e validada com smoke real
