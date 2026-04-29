# Adaptacao do hub-operacional-web para Portal Autoatendimento

Data: 2026-04-08
Status: direcionador tecnico local

## 1. Pergunta respondida

Este repo ja pode servir como base do Portal de Autoatendimento?

Resposta: sim.

Ele ainda nao e o portal final do spec, mas ja resolve o nucleo mais caro e arriscado do produto: autenticacao operacional, contexto, leitura de tickets, detalhe e abertura real.

## 2. O que ja esta implementado aqui

### Backend

Ponto de entrada:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\main.py`

Configuracao real:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\config.py`

Rotas canonicas:

- `health`
- `domain_auth`
- `lookups`
- `domain_formcreator`
- `db_read`
- `ticket_workflow`

### Frontend

Rotas canonicas:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\ticket\[id]\page.tsx`

Entrada DTIC agent-first:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`

Camada de leitura de tickets:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\ticketService.ts`

## 3. O que esta provado

Pelos documentos de validacao do repo, ja foi provado localmente:

- login e selector
- DTIC handoff para Hermes
- criacao real de ticket no DTIC com cleanup
- criacao real de ticket no SIS com cleanup
- follow-up e anexo no SIS
- lint, build, vitest, pytest e E2E

Evidencias:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase14-control-plane-runtime-revalidation-2026-04-08.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase15-backend-pytest-bootstrap-2026-04-08.md`

## 4. O que falta para bater o spec do portal

- experiencia visual de portal unificado estilo Google
- login Microsoft 365
- terceiro GLPI de Protocolo
- agente local para AD, rede e monitoramento
- webhook WhatsApp
- URLs publicas e topologia Cloudflare
- decisao final sobre Firebase

## 5. Menor caminho tecnico

### Passo 1

Criar uma fachada de portal por cima do fluxo atual.

Isso significa:

- manter o runtime e contratos internos
- criar nomenclatura de produto nova no frontend
- expor o hub como portal sem quebrar `dtic` e `sis`

Estado atual deste passo:

- rota de fachada criada em `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx`
- catalogo de servicos do portal criado em `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\portal-contexts.ts`
- entrada do portal adicionada no selector atual
- validacao local concluida com `npm run lint` e `npm run build`

### Passo 2

Adicionar uma camada de mapeamento de contexto:

- `ti` aponta para `dtic`
- `manutencao` aponta para `sis`
- `protocolo` fica placeholder ate existir a terceira instancia

### Passo 3

Plugar integracoes externas uma por vez, como adaptadores:

- Microsoft login
- Protocolo
- agente local
- monitoramento
- WhatsApp

### Passo 4

Somente depois decidir se Firebase entra como runtime principal ou como edge.

## 6. Regra operacional

Nao reescrever o produto por causa do documento.

O documento deve orientar a evolucao do que ja funciona.
O repo validado continua sendo o dono do nucleo operacional.
