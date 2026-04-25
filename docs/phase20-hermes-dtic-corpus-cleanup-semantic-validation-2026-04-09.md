# Phase 20 - Hermes DTIC corpus cleanup and semantic validation - 2026-04-09

> Nota: esta fase foi superada pela rodada de hardening descrita em [phase21-hermes-semantic-runtime-hardening-2026-04-09.md](C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase21-hermes-semantic-runtime-hardening-2026-04-09.md). Os outputs de `phase20-*` foram rerodados depois dessa correcao.

## Objetivo

Corrigir o laboratorio do Hermes para refletir apenas o escopo real do atendimento DTIC, remover contaminacoes da configuracao ativa, revalidar o comportamento oficial do agente ponta a ponta e medir a camada semantica separadamente.

## Correcao metodologica

O corpus anterior usava `SIAFEM` como proxy de generalizacao semantica. Esse sistema nao faz parte do atendimento real do ambiente DTIC validado aqui. Por isso, os cenarios fora de escopo foram removidos dos corpus do Hermes e substituidos por um sistema real coberto pelo fluxo local:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\dtic_semantic_lab_corpus.json`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\dtic_followup_lab_corpus.json`

Os casos de `SIAFEM` foram substituidos por `Portal do Servidor`.

## Ajustes no Hermes

Configuracao ativa e exemplo:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\.env`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\.env.example`

Mudancas:

- remocao de `usuario:35` do `KEYWORD_CATEGORY_MAP`
- inclusao de `vpn:51`
- prioridade explicita para `ponto de rede:54` antes de `rede:51`

Motor de decisao:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\decision_engine.py`

Mudancas:

- `Portal do Servidor` passa a reforcar a familia `22`
- `VPN` passa a vencer conflito com `notebook` quando o relato e claramente de rede remota
- novos sintomas mapeados: `nao ativa` e `parou de funcionar`
- incidentes com sintoma claro e alvo operacional identificado recebem confianca suficiente para nao cair em clarificacao desnecessaria

Regressoes cobertas:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_parser.py`

Resultado:

- `python -m pytest -q`
- `63 passed`

## Validacao do caminho oficial

### Corpus oficial heuristico

Com a configuracao ativa corrigida e o corpus limpo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\summary.json`
- `20/20` casos aprovados
- `6/6` submisssoes reais com cleanup
- tickets de laboratorio: `13643`, `13644`, `13645`, `13646`, `13647`, `13648`

As evidencias de submissao e limpeza ficaram em:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\submissions.json`

### Follow-up oficial

Reexecucao do laboratorio de turno 2:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase19-hermes-followup-lab\summary.json`
- `10/10` casos aprovados
- `4/4` submisssoes reais com cleanup
- tickets de laboratorio: `13649`, `13650`, `13651`, `13652`

Importante: essa rodada deixou de ser um teste de memoria conversacional. Depois dos ajustes, todos os `10` casos ja resolvem no turno 1, entao o corpus atual de `phase19` nao pressiona mais a limitacao de contexto do chat.

## Validacao da camada semantica

### Shadow mode oficial

Com `qwen3-dtic:latest` em shadow mode e timeout oficial de `4s`:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-shadow-corpus-lab\summary.json`
- `20/20` casos seguiram corretos no caminho oficial
- `20/20` chamadas semanticas falharam por timeout

Erro dominante:

- `HTTPConnectionPool(host='localhost', port=11434): Read timed out. (read timeout=4)`

Conclusao: o shadow mode atual preserva a UX do Hermes, mas nao gera evidencia util de semantica neste host por causa do timeout agressivo.

### Probes diretos do modelo

Com timeout manual de `30s`, o mesmo modelo respondeu corretamente aos probes:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-shadow-corpus-lab\llm-direct-probes.json`

Resultado:

- `4/4` respostas validas
- acerto bom em `request` vs `incident`
- clarificacao correta para `acesso vago`
- resposta operacional boa para `Outlook nao envia email`

### Corpus com semantica primaria

Para medir qualidade e parse sem o cap de `4s`:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase20-hermes-semantic-primary-corpus-lab\summary.json`

Resultado:

- `20/20` casos aprovados
- `13` respostas semanticas parseadas com sucesso
- `7` erros por `LLM nao retornou JSON valido.`
- `2` disagreements, ambos apenas em `missing_slots`
- nenhum disagreement em `intent` ou `category_candidate`

Leitura operacional:

- a qualidade semantica ja e util
- a robustez de parsing ainda nao e suficiente para promocao
- o gargalo real hoje nao e classificacao errada; e latencia no shadow e JSON invalido quando o modelo responde fora do schema

## Validacao integrada do produto

Com o Hermes reiniciado em `http://localhost:8501` e o hub validado ponta a ponta:

- `powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright`

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `next build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `Playwright`: `6/6`

Specs validadas:

- `hub-dtic-agent-handoff.spec.ts`
- `hub-dtic-agent-submit-clean.spec.ts`
- `hub-mvp.spec.ts`
- `hub-portal-facade.spec.ts`
- `hub-sis-followup-attachment-clean.spec.ts`
- `hub-sis-submit-clean.spec.ts`

## Conclusao

O Hermes oficial ficou operacionalmente consistente para o escopo DTIC usado neste ambiente:

- corpus oficial limpo e aderente ao atendimento real
- zero regressao em `request` vs `incident`
- zero falha de categorizacao no corpus oficial atualizado
- abertura real e cleanup confirmados no GLPI
- hub integrado validado ponta a ponta

A camada semantica mostrou potencial, mas nao esta pronta para ser promovida:

- em shadow mode, o timeout de `4s` inviabiliza a coleta
- em modo semantico primario, o modelo acerta quando responde, mas ainda quebra o contrato JSON em `7/20` casos

Estado final desta fase:

- heuristica oficial: pronta para operacao no escopo validado
- semantica: promissora, mas ainda em laboratorio
- memoria conversacional: nao reavaliada nesta fase porque o corpus de follow-up deixou de exigir turno 2
