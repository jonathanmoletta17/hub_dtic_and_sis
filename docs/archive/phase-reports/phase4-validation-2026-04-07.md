# Phase 4 Validation — 2026-04-07

## Escopo

Fechar o detalhe real do ticket `SIS` na base extraida com:

- envio de `followup`
- upload de `anexo`
- download autenticado do anexo
- limpeza completa dos artefatos de teste ao final

Base validada:

- frontend: `C:\Users\jonathan-moletta\code\hub-operacional-web\web`
- backend: `C:\Users\jonathan-moletta\code\hub-operacional-web\backend`
- gateway: [http://localhost:18080](http://localhost:18080)

## Mudancas implementadas

### Backend

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\schemas\tickets.py`
  - adicionados `TicketAttachment` e `TicketAttachmentUploadResponse`
  - `TicketWorkflowDetailResponse` agora inclui `attachments`

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\services\ticket_workflow_service.py`
  - detalhe do ticket agora resolve anexos reais via `Document_Item` + `Document`
  - adicionados:
    - `upload_attachments(...)`
    - `download_attachment(...)`
  - adicionada validacao de extensao, MIME e tamanho
  - upload usa o client GLPI ja existente:
    - `upload_document(...)`
    - `link_document_to_item(...)`

- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\routers\ticket_workflow.py`
  - adicionadas rotas:
    - `POST /api/v1/{context}/tickets/{ticket_id}/attachments`
    - `GET /api/v1/{context}/tickets/{ticket_id}/attachments/{document_id}/download`

### Frontend

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\contracts\ticket-detail.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\models\ticket-detail.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\mappers\ticket-detail.ts`
  - contrato e mapper agora suportam anexos no detalhe do ticket

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\ticketWorkflowService.ts`
  - adicionado upload multipart de anexos do ticket
  - adicionado download autenticado do anexo

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\useTicketDetail.ts`
  - hook agora expoe `attachments`
  - adicionado `handleUploadAttachments`
  - adicionado `handleDownloadAttachment`

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketAttachments.tsx`
  - novo componente de listagem e download de anexos

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\ticket\[id]\page.tsx`
  - paperclip deixou de ser placeholder
  - detalhe agora mostra anexos reais e permite upload/download

### Testes

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\mappers\ticket-detail.test.ts`
  - atualizado para cobrir `attachments`

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-sis-followup-attachment-clean.spec.ts`
  - smoke real com:
    - criacao de ticket
    - followup
    - upload de anexo
    - download autenticado
    - cleanup total

## Validacao tecnica

- `python -m compileall app`: ok
- `npm exec vitest run src/lib/api/mappers/ticket-detail.test.ts`: ok
- `npm run build`: ok
- `docker compose up -d --build`: ok
- `docker compose ps`: backend, frontend e proxy `healthy`

## Validacao real

Artefatos finais:

- resumo:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase4-sis-followup-attachment-clean\summary.json`
- revisao antes do submit:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase4-sis-followup-attachment-clean\01-review-before-submit.png`
- detalhe antes do followup:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase4-sis-followup-attachment-clean\02-detail-before-followup.png`
- detalhe com followup:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase4-sis-followup-attachment-clean\03-detail-with-followup.png`
- detalhe com anexo:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase4-sis-followup-attachment-clean\04-detail-with-attachment.png`

Resumo final do smoke real:

- `marker`: `CODEX-HUB-SIS-FOLLOWUP-ATTACH-20260408005351`
- `ticketId`: `8072`
- `formAnswerId`: `5431`
- `attachmentId`: `5668`
- `attachmentRelationId`: `7288`
- `detailVisible`: `true`
- `followupVisible`: `true`
- `attachmentVisible`: `true`
- `downloadValidated`: `true`

Cleanup confirmado:

- `ticketDeleted`: `true`
- `formAnswerDeleted`: `true`
- `relationDeleted`: `true`
- `documentDeleted`: `true`
- `postDeleteMatches`: `[]`

## Estado objetivo

O projeto novo em `C:\Users\jonathan-moletta\code\hub-operacional-web` agora sustenta no `SIS`:

- criacao real por FormCreator
- listagem real em `Meus Chamados`
- detalhe real do ticket
- `followup` real
- `anexo` real com download autenticado
- cleanup controlado de ticket, form answer, relation e document

O fluxo operacional do `SIS` na base extraida ficou fechado para:

- abrir chamado
- abrir detalhe
- acompanhar
- anexar

Sem depender mais do repo legado para essas capacidades.
