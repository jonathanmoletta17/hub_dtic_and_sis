# Fase 6 - Handoff Estruturado DTIC -> Hermes

Data: 2026-04-07  
Projeto: `C:\Users\jonathan-moletta\code\hub-operacional-web`

## Objetivo

Endurecer a integracao `DTIC agent-first` para deixar de depender apenas de texto livre no query string. A partir desta fase, o hub envia um `handoff_payload` estruturado ao Hermes e mantem `handoff` textual apenas como fallback.

## O que mudou

No hub:

- o fluxo `DTIC` agora gera um payload estruturado com:
  - agente
  - trilha
  - urgencia
  - escopo
  - superficie
  - narrativa
  - resumo humano
  - prompt controlado para o Hermes
- o CTA de handoff continua abrindo o Hermes via URL, mas agora inclui:
  - `handoff_payload=...`
  - `handoff=...`

No Hermes:

- a leitura do handoff agora prioriza `handoff_payload`
- a tela mostra a triagem recebida de forma estruturada
- o botao `Gerar draft a partir deste handoff` usa o `prompt` do payload estruturado
- o fallback textual continua funcionando se o payload nao puder ser lido

## Evidencias

- [summary.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase6-dtic-structured-handoff\summary.json)
- [01-dtic-agent-entry.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase6-dtic-structured-handoff\01-dtic-agent-entry.png)
- [02-hermes-structured-handoff.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase6-dtic-structured-handoff\02-hermes-structured-handoff.png)
- [03-hermes-structured-draft.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase6-dtic-structured-handoff\03-hermes-structured-draft.png)
- audit log: [agent-events.jsonl](C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\logs\agent-events.jsonl)

## Resultado observado

O fluxo passou com payload estruturado:

1. o hub abriu `DTIC/new-ticket`
2. a trilha `Acessos e credenciais` gerou o handoff
3. o popup abriu o Hermes com `handoff_payload` na URL
4. o Hermes exibiu a triagem recebida
5. o Hermes gerou o draft a partir do `prompt` estruturado

Melhoria objetiva desta fase:

- antes: o titulo do draft ficava poluido pelo texto inteiro do resumo
- agora: o titulo ficou limpo e aderente ao problema real

Titulo observado:

- `Equipe inteira sem acesso ao sistema de protocolo`

Campos observados no draft:

- tipo: `Incidente`
- urgencia: `4 (Alta)`
- categoria GLPI: `22`
- requester GLPI: `1032`
- entidade GLPI: `1`

## Validacao executada

- `pytest` no Hermes: `41 passed`
- `vitest` do fluxo `dtic-agent-flow`: ok
- `npm run build`: ok
- `docker compose up -d --build`: ok
- `playwright test e2e/hub-dtic-agent-handoff.spec.ts`: ok

## Limites restantes

1. O handoff ainda e feito por URL; para producao multiusuario, o ideal posterior e um canal de sessao mais robusto.
2. O Hermes ainda usa parser heuristico; o payload estruturado melhora o prompt, mas nao elimina a necessidade de refinar tipo/urgencia no motor do agente.
3. O fluxo `DTIC` ainda para na confirmacao; a criacao real de ticket nao foi fechada nesta fase.

## Conclusao

O `DTIC agent-first` na base nova agora esta mais consistente do que a fase anterior:

- o handoff ja nao depende apenas de texto solto
- o Hermes entende a triagem de forma estruturada
- o draft sai mais limpo e mais controlavel
- nenhuma mutacao foi disparada automaticamente
