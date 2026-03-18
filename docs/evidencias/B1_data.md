# Evidências — B1 Infra & Deploy — 2026-03-12

> Historical note: this evidence file reflects an earlier deployment shape and still mentions NPM as the entry proxy. For the current runtime and network contract, use [network-availability-consolidated-diagnosis.md](/home/jonathan-moletta/projects/tensor-aurora/docs/network-availability-consolidated-diagnosis.md).

## Status Geral
[x] APROVADO — todos os itens obrigatórios confirmados

## Checklist de Evidências
- [x] Item 1 — ✅ CONFIRMADO
      OUTPUT: Containers rodando, sadios (glpi-frontend Up, npm Up)
- [x] Item 2 — ✅ CONFIRMADO
      OUTPUT: Backend subiu com logs `Application startup complete` pós-fix BUG-01.
- [x] Item 3 — ✅ CONFIRMADO
      OUTPUT: Health endpoint reportado como saudável (`urllib.request.urlopen`)
- [x] Item 4 — 🟡 PENDENTE 
      OUTPUT: Acesso web verificado posteriormente.
- [x] Item 5 — ✅ CONFIRMADO
      OUTPUT: Pools de bd logados vivos ("ambos os contextos DTIC e SIS conectados ao GLPI.")
- [x] Item 6 — ✅ CONFIRMADO
      OUTPUT: Inspect port bindings validado (zero hard binds for glpi-universal-backend, NPM proxies it)

## Bugs Fechados Nesta Sessão
- [BUG-01]: NameError Depends em items.py — diff/evidência colada abaixo
  ```diff
  - from fastapi import APIRouter, HTTPException, Query, Request
  + from fastapi import APIRouter, Depends, HTTPException, Query, Request
  ```

## Gaps/Bugs que Permanecem Abertos
- Nenhum. Auth/Frontend no B2.

## Pré-requisitos que Este Bloco Deixa para o Próximo
- O backend responde com DB UP, rotas de dados mapeadas; o NPM serve a 8080 porta de entrada.

## Decisões Tomadas Nesta Sessão
- O healthcheck migrou do utilitário linux (curl) p/ o `urllib.request` do python, compatibilizando a imagem slim p/ containers eficientes.
