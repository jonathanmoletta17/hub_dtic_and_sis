# Phase 21 - Hermes semantic runtime hardening - 2026-04-09

## Objetivo

Endurecer a camada semantica do Hermes sem mudar o contrato publico do hub:

- eliminar respostas em branco do `qwen3-dtic:latest`
- tornar o shadow mode utilizavel no runtime real
- medir novamente corpus, follow-up e integracao do produto

## Causa raiz encontrada

O problema dos `JSON invalido` nao estava no schema do parser. O modelo estava gastando o budget inteiro no campo `message.thinking` e retornando `message.content` vazio quando o payload ia sem controle de raciocinio.

Evidencia capturada em:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-primary-corpus-lab\llm-raw-invalid-samples.json`

Sintoma observado:

- `done_reason: length`
- `message.content: ""`
- `message.thinking` preenchido com raciocinio longo

## Mudancas implementadas no Hermes

Arquivos alterados:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\llm.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\config.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_llm.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_config.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\.env.example`

Mudancas:

- envio de `think: false` no payload do Ollama
- reducao de `num_predict` para `220`
- timeout dedicado para shadow mode via `SEMANTIC_SHADOW_TIMEOUT_SECONDS`
- cap padrao do shadow ajustado para `6s`
- cobertura automatizada para garantir payload `no-think`

Resultado unitario:

- `python -m pytest -q`
- `64 passed`

## Medicao de latencia

Depois do `no-think`, o `qwen3-dtic:latest` passou a responder em janela compativel com uso interativo:

- `Preciso de acesso ao SEI`: `3.42s`
- `Meu notebook nao liga e preciso trabalhar com urgencia`: `3.64s`
- `Nao sei o que aconteceu com meu acesso`: `4.26s`
- `Outlook nao envia email`: `4.09s`
- `Erro 500 ao assinar processo no SEI`: `5.24s`

Leitura objetiva:

- o cap antigo de `4s` era curto demais
- `6s` cobre o pior caso medido nesta rodada sem estourar a UX do fluxo local

## Corpus semantico revalidado

### Shadow mode

Com heuristica oficial preservada e semantica apenas em shadow:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-shadow-corpus-lab\summary.json`

Resultado:

- `20/20` casos aprovados
- `20/20` respostas semanticas validas
- `0` erros de LLM
- `4` disagreements
- `6/6` submisssoes reais com cleanup

Os disagreements restantes ficaram concentrados em nuance:

- `email-login-failure`: semantica pede slot adicional onde a heuristica ja considera suficiente
- `vpn-home-failure`: semantica tende a puxar para hardware, heuristica segura em rede `51`
- `sei-error-500-sign`: semantica pede `action_kind`
- `portal-servidor-login-failure`: semantica pede `action_kind`

### Semantica primaria em laboratorio

Com `SEMANTIC_CLASSIFIER_ENABLED=true`:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-primary-corpus-lab\summary.json`

Resultado:

- `20/20` casos aprovados
- `20/20` respostas semanticas validas
- `0` erros de LLM
- `4` disagreements
- `6/6` submisssoes reais com cleanup

Importante: o sucesso desta rodada vem do desenho correto do pipeline atual, nao de um LLM “sozinho”. A semantica passou a contribuir de forma consistente, mas os guardrails heuristico-estruturais continuam protegendo os casos ambíguos.

## Follow-up semantico

Laboratorio de follow-up com semantica primaria:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-primary-followup-lab\summary.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-primary-followup-lab\transcripts.json`

Resultado:

- `10/10` casos aprovados
- `10/10` resolvidos
- `0` falhas de LLM no turno 1
- `0` falhas de LLM no turno 2
- `4/4` submisssoes reais com cleanup

## Integracao do produto

Hermes reiniciado em `http://localhost:8501` com:

- `OLLAMA_ENABLED=true`
- `SEMANTIC_SHADOW_MODE=true`
- `SEMANTIC_CLASSIFIER_ENABLED=false`
- `SEMANTIC_MODEL=qwen3-dtic:latest`

Validacao integrada:

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `next build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `Playwright`: `6/6`

## Conclusao operacional

Depois do hardening de runtime:

- o caminho oficial heuristico continua verde e protegido
- o shadow semantico finalmente ficou observavel e util
- a semantica primaria de laboratorio deixou de falhar por parse
- o modelo ainda diverge da heuristica em `4` casos, mas sem derrubar o resultado final do corpus DTIC atual

Estado recomendado apos esta fase:

- manter heuristica como decisao oficial no produto
- manter semantica em shadow no runtime local
- usar os `4` disagreements restantes como backlog de calibracao para eventual promocao futura
