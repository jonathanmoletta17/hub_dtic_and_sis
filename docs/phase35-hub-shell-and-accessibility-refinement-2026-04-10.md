# Phase 35 - Hub Shell And Accessibility Refinement - 2026-04-10

## Objetivo

Fechar a `Frente B` do contrato visual do hub:

- dar mais estrutura ao shell
- melhorar o bloco institucional, navegacao e perfil
- aproveitar a rodada para corrigir o debito de acessibilidade dos inputs do login

## Arquivos alterados

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\premium-input.tsx`

## O que mudou

## 1. Sidebar ganhou estrutura visual real

O shell deixou de ser apenas um trilho com logo no topo e botoes abaixo.

Em `AppSidebar.tsx`:

- o bloco institucional foi encapsulado em uma superficie propria
- o brasao passou a viver em um container com borda e elevacao coerentes
- o contexto ativo agora aparece como microidentidade dentro do bloco superior
- a navegacao ganhou icones estabilizados em containers proprios
- o item ativo ficou mais legivel e mais claramente selecionado

## 2. Perfil e controle do shell ficaram mais coerentes

Em `UserProfileMenu.tsx`:

- o gatilho do perfil ganhou melhor hierarquia
- o dropdown ficou mais espacoso e menos apertado
- a troca de funcao e o bloco de acoes passaram a seguir a mesma linguagem do sidebar

Em `OperationalShell.tsx`:

- o header mobile ganhou contraste melhor
- o card de indisponibilidade do MVP ficou mais legivel
- o container lateral mobile deixou de depender de sombra hardcoded

## 3. Login agora expõe labels acessiveis de verdade

Em `premium-input.tsx`:

- cada input agora recebe `id`
- o `label` passou a usar `htmlFor`
- o login voltou a ser localizavel por `getByLabel(...)` nos smokes e automacoes

Isso elimina o debito que vinha aparecendo desde as rodadas anteriores de frontend review.

## Evidencia visual

Capturas reais apos rebuild:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase35-shell-refinement-check\dtic_dashboard-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase35-shell-refinement-check\dtic_dashboard-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase35-shell-refinement-check\dtic_user-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase35-shell-refinement-check\dtic_user-dark.png`

Essas capturas confirmam:

- sidebar com bloco institucional mais organizado
- navegacao menos crua
- perfil melhor encaixado no trilho
- shell mais coeso tanto no light quanto no dark

## Validacao executada

### Sanidade local

- `npm run lint`
- smoke Playwright com `getByLabel("Usuario de rede")` e `getByLabel("Senha de rede")`

Resultado:

- labels acessiveis funcionando

### Runtime publicado

- `docker compose up -d --build`
- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`

Resultado:

- `doctor runtime`: `PASS`

## Conclusao

Esta fase fecha o refinamento do shell e resolve o debito de acessibilidade do login sem tocar nas zonas protegidas.

Com isso:

- `Frente B` fica concluida
- a navegacao canonica do hub passa a parecer parte do mesmo produto do resto da aplicacao
- a proxima frente pode focar no `DTIC/new-ticket` sem carregar mais essa divida lateral
