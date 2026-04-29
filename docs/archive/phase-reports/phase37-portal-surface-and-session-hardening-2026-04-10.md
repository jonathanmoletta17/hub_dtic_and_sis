# Phase 37 - Portal Surface And Session Hardening - 2026-04-10

## Objetivo

Executar a `Frente E` do contrato visual do hub:

- reposicionar `portal` como produto de servico, nao memorial tecnico
- endurecer `portal/meus-chamados` para funcionar com sessoes ja em cache
- remover a exposicao de erro tecnico de sessao como estado normal da superficie
- revalidar o fluxo real do portal no runtime publicado

## Arquivos alterados

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\meus-chamados\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\portal-contexts.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-portal-facade.spec.ts`

## O que mudou

## 1. O portal deixou de falar como bastidor do projeto

Antes, o hero e os blocos laterais ainda usavam linguagem de transicao:

- `nucleo comprovado`
- `dependencias ainda abertas`
- referencias a contexto interno, IDs e candidaturas de dominio

Agora, a superficie passou a falar como produto de servico:

- `Portal de Servicos`
- `Escolha o servico e siga direto para o atendimento`
- blocos com foco em:
  - o que ja pode ser feito agora
  - o que ainda esta em implantacao

Tambem foram limpas as descricoes dos servicos em `portal-contexts.ts`, removendo:

- `agent-first`
- `candidato a base`
- referencias a contexto canonico interno
- detalhes de integracao que nao pertencem ao usuario final

## 2. `portal/meus-chamados` agora reutiliza a sessao em cache

Antes, a tela consolidada tentava:

1. `session token` persistido
2. credenciais em memoria

e ignorava completamente a sessao ja cacheada em `contextSessions`.

Consequencia:

- apos recarga ou navegao parcial, o usuario podia cair em:
  - `Sem sessao ativa para 'dtic'`
  - `Sem sessao ativa para 'sis'`

Agora, a ordem ficou:

1. sessao ja carregada em memoria local da tela
2. sessao cacheada no store com `session_token`
3. `session token` persistido
4. re-login com credenciais

Resultado:

- o consolidado consegue abrir com os tokens ja aquecidos do portal
- a superficie deixa de depender de reautenticacao desnecessaria

## 3. Falha parcial virou estado controlado

Quando um servico nao responde, a tela nao despeja mais mensagem tecnica crua.

Agora:

- a mensagem principal e `Consulta parcial`
- os servicos afetados aparecem por nome
- a tela continua exibindo o que conseguiu carregar

## 4. A listagem consolidada ganhou estrutura de produto

`portal/meus-chamados` recebeu:

- titulo e subtitulo mais diretos
- cards de resumo:
  - `Total`
  - `Em andamento`
  - `Finalizados`
- filtros com linguagem operacional
- empty state mais orientativo

## 5. O E2E do portal foi alinhado ao contrato atual

O spec antigo esperava chamadas `auth/me` para `DTIC` e `SIS`.

Com a nova ordem de reuso de sessao, isso nao e mais obrigatorio.

O teste agora valida o que interessa:

- respostas `db/tickets` dos dois contextos
- heading da pagina
- ausencia de `Sem sessao ativa`
- ausencia de `Consulta parcial` no fluxo com `DTIC + SIS` aquecidos

## Evidencia visual

### Antes

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-before\portal-before-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-before\portal-meus-chamados-before.png`

### Depois

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-after\portal-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-after\portal-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-after\portal-meus-chamados-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-after\portal-meus-chamados-dark.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-after\summary.json`

## Validacao executada

### Build e runtime

- `npm run lint`
- `npm run build`
- `docker compose up -d --build`
- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`

### Smoke visual local

- captura real de `portal`
- captura real de `portal/meus-chamados`
- verificacao de sessao consolidada no runtime

### Validacao padrao completa

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado final:

- `web lint`: ok
- `web vitest`: `24 arquivos / 94 testes` ok
- `web build`: ok
- `backend pytest`: `9 testes` ok
- `doctor runtime`: `PASS`
- `Playwright full e2e`: `6/6`

## Conclusao

Esta fase fecha a `Frente E` principal do hub:

- o `portal` deixou de parecer pagina de transicao tecnica
- `portal/meus-chamados` deixou de quebrar por sessao ja disponivel em cache
- a cobertura E2E voltou a refletir o contrato real da superficie

O backlog principal do hub agora fica concentrado na guarda visual canonica:

- Storybook no `web`
- stories das superficies canonicas
- baseline visual local para evitar regressao de frontend por percepcao tardia
