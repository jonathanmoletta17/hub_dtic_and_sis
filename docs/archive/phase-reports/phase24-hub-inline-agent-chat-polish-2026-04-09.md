# Phase 24 - Hub Inline Agent Chat Polish - 2026-04-09

## Objetivo

Refinar a nova superficie inline do `DTIC/new-ticket` para ficar mais limpa, mais orientada a conversa e mais aderente ao shell visual do hub, sem mexer no contrato tecnico validado com o Hermes.

## Ajustes aplicados

- Header mais curto e mais direto, com foco em conversa e sem linguagem de bastidor.
- Chips de inicio rapido para ajudar a primeira mensagem e melhorar a qualidade do relato.
- Composer com dica de teclado (`Enter` envia, `Shift + Enter` quebra linha).
- Painel lateral refeito para mostrar etapas da triagem, contexto ativo e resumo do chamado de forma menos poluida.
- `Iniciar nova conversa` agora reinicia uma sessao nova de verdade, em vez de reutilizar o estado anterior.
- `NEXT_PUBLIC_DTIC_AGENT_API_URL` documentado em `.env.example`.

## Arquivos principais

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\.env.example`

## Validacao

- `npm run lint`: ok
- `npm exec vitest run`: `94 passed`
- `npm run build`: ok
- `powershell -ExecutionPolicy Bypass -File scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`: `6/6` specs ok

## Estado resultante

- O chat inline do `DTIC` segue ponta a ponta validado.
- A experiencia ficou mais guiada, mais limpa e menos parecida com uma tela de triagem manual.
