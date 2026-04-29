# Phase 18 - Hermes Corpus Lab - 2026-04-08

## Objetivo

Executar um laboratorio de classificacao com casos DTIC realistas e historicamente propensos a categorizacao ruim, incluindo submissao real de um subconjunto no GLPI, para medir o estado operacional do Hermes apos a fase `Semantic v1`.

## Escopo

- Corpus versionado no repo Hermes externo:
  - `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\dtic_semantic_lab_corpus.json`
- Runner do laboratorio:
  - `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\run_semantic_corpus_lab.py`
- Evidencias geradas no hub:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\summary.json`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\failed-cases.json`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\submissions.json`

## Comando executado

```powershell
python C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\run_semantic_corpus_lab.py --output-dir C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab
```

Runtime usado no laboratorio:

- `OLLAMA_ENABLED=true`
- `SEMANTIC_SHADOW_MODE=true`
- `SEMANTIC_CLASSIFIER_ENABLED=false`
- `SEMANTIC_MODEL=qwen3-dtic:latest`
- `OLLAMA_MODEL=qwen3-dtic:latest`

## Resultado consolidado

- casos no corpus: `20`
- casos aprovados: `10`
- casos falhos: `10`
- shadow semantico com sucesso: `0`
- shadow semantico com erro: `20`
- divergencias heuristica vs semantico registradas: `0`
- tentativas de submissao real: `6`
- tickets reais criados e limpos: `5`

## Leitura do resultado

- O caminho heuristico oficial continua funcional e seguro para abertura real.
- O corpus mostrou que ainda existe um bloco claro de subcobertura semantica e lexical em hardware, rede, sistemas fora do dicionario e pedidos de perfil.
- O shadow semantico nao foi a fonte das decisoes deste laboratorio, porque todas as chamadas ao modelo local falharam por timeout de leitura no budget configurado para proteger a UX do popup.
- Portanto, a foto atual do Hermes e: runtime confiavel para abrir tickets reais, mas ainda predominantemente heuristico em producao.

## Casos aprovados mais relevantes

- `access-sei-request`: `request`, cat `22`, sem clarificacao.
- `access-vague`: segurou corretamente em clarificacao.
- `collective-protocol-outage`: `incident`, cat `22`, urgencia `4`, sem virar `request`.
- `email-login-failure`: `incident`, cat `2`, sem clarificacao.
- `email-password-reset`: `request`, cat `24`, sem clarificacao.
- `hw-notebook-no-boot-urgent`: `incident`, cat `34`, sem categoria nula.

## Casos falhos confirmados

- `new-user-protocol`
  - acertou intencao e categoria, mas segurou em clarificacao por `medium_intent_confidence`
- `printer-blank-output`
  - acertou categoria `14`, mas nao reconheceu `imprime em branco` como sintoma suficiente
- `vpn-home-failure`
  - virou categoria `34` por contaminacao do sinal `notebook`, quando o esperado era rede/VPN `51`
- `network-point-room-204`
  - caiu em rede generica `51` em vez de ponto de rede `54`
- `mouse-stopped-working`
  - acertou categoria `34`, mas nao extraiu `parou de funcionar` como sintoma
- `siafem-access-request`
  - acertou categoria `22`, mas segurou por falta de reconhecimento do sistema `SIAFEM`
- `siafem-login-failure`
  - classificou como `incident`, mas ficou sem categoria por nao reconhecer `SIAFEM`
- `notebook-blue-screen`
  - acertou categoria `34`, mas nao extraiu `tela azul` como sintoma
- `outlook-not-sending`
  - acertou categoria `2`, mas nao extraiu `nao envia email` como sintoma suficiente
- `sei-profile-signing`
  - acertou categoria `22`, mas nao reconheceu `perfil para assinar processo` como `action_kind`

## Submissoes reais no GLPI

Casos enviados com sucesso e limpos ao final:

- `hw-notebook-no-boot-urgent`
- `access-sei-request`
- `collective-protocol-outage`
- `email-login-failure`
- `email-password-reset`

Observacoes:

- todos os tickets enviados continham `marker` de laboratorio no titulo/conteudo
- todos foram encontrados no GLPI apos criacao
- todos foram removidos com sucesso no cleanup
- o caso `new-user-protocol` nao foi enviado porque o draft corretamente permaneceu em clarificacao

## Diagnostico operacional

O laboratorio confirma quatro fatos:

- o guardrail mais critico esta funcionando: outage coletivo nao voltou a virar `request`
- o problema dominante atual nao e mais estabilidade; e cobertura semantica insuficiente para casos reais fora do dicionario principal
- a camada shadow semantica ainda nao esta operacionalmente disponivel no budget de timeout atual
- a decisao oficial do Hermes continua adequada em `shadow mode`, porque ainda seria arriscado promover o classificador semantico

## Proxima rodada recomendada

- ampliar o dicionario de sistemas com `SIAFEM` e equivalentes
- enriquecer sinais de sintoma com `imprime em branco`, `tela azul`, `nao envia email`, `nao ativa`, `parou de funcionar`
- priorizar `ponto de rede` sobre `rede` generica
- reconhecer `perfil para assinar` como `action_kind` valido de acesso/perfil
- recalibrar a banda media para provisionamento claro de usuario novo em sistema conhecido
- tratar timeout do shadow semantico como risco separado de infraestrutura/model serving, nao como qualidade de classificacao

## Evidencia complementar

A validacao oficial do hub permaneceu verde apos o laboratorio:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright
```

Resultado:

- `web vitest`: `94/94`
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `playwright full e2e`: `5/5`
