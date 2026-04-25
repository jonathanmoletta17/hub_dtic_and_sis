# Phase 36 - DTIC Chat Surface Refinement - 2026-04-10

## Objetivo

Executar a `Frente D` do contrato visual do hub em `DTIC/new-ticket`, mantendo o fluxo agent-first e os contratos atuais da API conversacional.

Objetivos:

- remover a sensacao de canvas vazio no estado inicial
- reduzir excesso de elementos no topo
- integrar melhor entrada, conversa e composer
- manter os seletores usados pelos testes reais

## Arquivos alterados

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`

## O que mudou

## 1. O estado inicial deixou de parecer scaffold

Antes:

- canvas enorme e quase vazio
- pequena bolha isolada
- composer solto no rodape

Agora:

- entrada guiada com bloco de abertura central
- headline direta
- contexto curto
- respostas iniciais sugeridas em chips operacionais
- primeira mensagem do atendimento integrada a uma coluna de apoio

## 2. O topo ficou mais limpo

O header do chat foi simplificado:

- mantido `DTIC` + `Abrir chamado`
- solicitante passou para subtitulo curto
- removido o excesso de pills redundantes
- mantidos apenas status e `Nova conversa`

## 3. O atendimento ganhou starters reais

Foram adicionados prompts iniciais de uso rapido:

- `Sem acesso a sistema`
- `Erro no email`
- `Notebook com problema`
- `Solicitar equipamento`

Esses prompts disparam a conversa diretamente e ajudam a reduzir o vazio do estado inicial sem obrigar o usuario a interpretar a tela.

## 4. A conversa ficou mais centrada e mais clara

Quando a interacao comeca:

- as mensagens passam a usar uma coluna central mais controlada
- o estado inicial desaparece
- o composer continua no mesmo lugar e preserva o fluxo

## 5. O painel lateral de revisao ficou mais objetivo

O aside de revisao foi mantido, mas:

- o titulo passou a ser `Revisao`
- `Tipo` e `Urgencia` foram agrupados
- a estrutura ficou mais compacta

O fluxo funcional continua o mesmo:

- conversa
- clarificacao
- draft pronto
- confirmacao
- abertura real

## Evidencia visual

Capturas reais do runtime:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase36-dtic-chat-surface-check\dtic_new_ticket-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase36-dtic-chat-surface-check\dtic_new_ticket-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase36-dtic-chat-surface-check\dtic_new_ticket-after-prompt-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase36-dtic-chat-surface-check\dtic_new_ticket-after-prompt-dark.png`

Essas capturas comprovam:

- estado inicial mais denso e menos morto
- melhor encaixe entre header, conteudo e composer
- conversa natural preservada apos o primeiro prompt

## Validacao executada

### Build local

- `npm run lint`
- `npm run build`

### Runtime publicado

- `docker compose up -d --build`

### Validacao padrao completa

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `24 arquivos / 94 testes` ok
- `web build`: ok
- `backend pytest`: `9 testes` ok
- `doctor runtime`: `PASS`
- `Playwright full e2e`: `6/6`

Os casos que protegem o fluxo agent-first do DTIC continuaram verdes:

- `hub-dtic-agent-handoff.spec.ts`
- `hub-dtic-agent-submit-clean.spec.ts`
- `hub-mvp.spec.ts`

## Contratos preservados

Nao foram alterados:

- API de sessao do Hermes
- contrato de draft/submissao
- placeholder do composer
- CTA `Enviar mensagem`
- CTA `Abrir chamado`
- heading `Abrir chamado`

Esses pontos foram mantidos para nao quebrar a validacao operacional e os testes ponta a ponta.

## Conclusao

Esta fase fecha uma primeira rodada real da `Frente D`:

- `DTIC/new-ticket` deixou de parecer tela provisoria
- a entrada ficou mais premium e mais utilizavel
- a conversa e o envio real permaneceram estaveis

O que ainda sobra para a proxima rodada de UX e mais fino:

- microcopy adicional do atendimento
- calibracao dos starters para maior aderencia ao catalogo real
- eventual refinamento do painel de revisao quando houver draft complexo
