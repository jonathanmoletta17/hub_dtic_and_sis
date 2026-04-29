# Phase 16 - Hermes Semantic Lab - 2026-04-08

## Objetivo

Avaliar o Hermes como agente de abertura de tickets para `DTIC`, confrontando o runtime atual com o diagnostico de transicao de heuristica rigida para interpretacao semantica.

O laboratorio foi executado sem alterar contratos do hub e sem introduzir persistencia nova. O foco foi:

- revisar arquitetura atual do agente
- testar o comportamento real do parser e do runtime
- validar ponta a ponta no hub
- fechar um diagnostico direto com plano cirurgico

## Escopo e ambiente

Repositorios inspecionados:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`
- `C:\Users\jonathan-moletta\code\hub-operacional-web`

Observacoes de contexto:

- nao foi encontrado repositorio local chamado `cerebro` em `C:\Users\jonathan-moletta\code`
- nao havia recurso MCP registrado com esse nome nesta sessao
- `OLLAMA_ENABLED=false` no Hermes local
- `OLLAMA_MODEL=llama3.2` no `.env`, mas esse modelo nao esta instalado no Ollama local

## Evidencias executadas

### 1. Suite do Hermes

Comando:

```powershell
python -m pytest -q
```

Resultado:

- `46 passed`

### 2. Suite oficial do hub

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1 -SkipDockerBuild -RunFullPlaywright
```

Resultado:

- `web lint`: ok
- `web vitest`: `94/94`
- `next build`: ok
- `backend pytest`: `9/9`
- `doctor runtime`: `PASS`
- `playwright full e2e`: `5/5`

### 3. Probes de runtime do Hermes

Artefatos:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase16-dtic-agent-service-session-smoke\runtime-probes\summary.json`

Casos validados:

- `Preciso de acesso ao SEI` abriu confirmacao como `Solicitacao`
- `Nao sei o que aconteceu com meu acesso` entrou em clarificacao

### 4. Mutacao real DTIC via hub -> Hermes -> GLPI -> hub

Artefatos:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase16-dtic-agent-service-session-smoke\summary.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase16-dtic-agent-service-session-smoke\05-hub-detail.txt`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\logs\agent-events.jsonl`

Resultado:

- ticket real criado e limpo no GLPI
- detalhe apareceu no hub
- o audit do Hermes registrou `draft_prepared`, `ticket_submit_started` e `ticket_submit_succeeded`

## Diagnostico direto

### Finding 1 - O tie-break atual ainda produz classificacao errada em outage real

Severidade: alta

O parser ainda pode classificar incidente coletivo como `request` por empate numerico favorecendo request em `_infer_type_with_confidence`.

Evidencia:

- `Estamos todos sem acesso ao sistema de protocolo` foi classificado como `request`
- isso ocorreu no probe local e no runtime real do hub
- o audit mostrou tickets reais `13607` e `13608` com `type=request`

Arquivos relevantes:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py` linhas 240-260
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\logs\agent-events.jsonl`

Leitura:

- o regex de request para `acesso ... sistema` pontua a favor de request
- o regex de incident para `sem acesso` pontua a favor de incident
- no empate, a implementacao usa `request_score >= incident_score`
- o incidente coletivo vira requisicao por desenho matematico, nao por semantica

### Finding 2 - Nao existe Dual Threshold real no runtime

Severidade: alta

O desenho atual continua binario:

- clarifica por regras lexicalizadas antes do LLM
- ou aceita diretamente
- nao existe faixa intermediaria de desambiguacao com pergunta ativa orientada por confianca

Arquivos relevantes:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py` linhas 72-94
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py` linhas 306-339

Leitura:

- `build()` consulta `_clarification_reason()` antes de qualquer chamada ao LLM
- a confianca atual so serve para decidir `request` vs fallback `incident`
- nao existe banda amarela modelada como estado operacional

### Finding 3 - O LLM hoje nao e a fonte primaria de entendimento

Severidade: alta

O runtime local validado opera com `OLLAMA_ENABLED=false`, entao a classificacao real ainda e heuristica.

Mesmo quando o LLM foi ligado no laboratorio com `qwen3-dtic:latest`, o resultado final mudou pouco porque:

- a clarificacao ja tinha sido decidida antes do LLM
- a categoria continuou caindo no `keyword_category_map`
- o prompt do `llm.py` pede `itilcategories_id` so se houver `>80% de certeza`, o que faz o modelo devolver `0` na maior parte dos casos

Arquivos relevantes:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\.env`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\llm.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py` linhas 82-91

### Finding 4 - Slot-filling ainda nao existe como contrato explicito

Severidade: media

O Hermes ja sabe bloquear mensagens vagas, mas ainda nao modela slots minimos por dominio.

Exemplo:

- categoria `22` pode ser aceita sem explicitar qual sistema, qual mensagem de erro ou qual acao exata e necessaria
- a clarificacao atual pergunta genericamente por `sistema ou equipamento` e `impacto`, mas nao nasce de um schema por categoria

Arquivos relevantes:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py` linhas 166-189
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py` linhas 192-216

### Finding 5 - O carregamento de configuracao depende do entrypoint Streamlit

Severidade: media

`Settings.from_env()` usa `os.getenv`, mas quem carrega `.env` e `streamlit_app._load_dotenv_file()`.

Impacto:

- scripts, testes ou reutilizacao por biblioteca podem operar com config incompleta se nao passarem antes pelo entrypoint
- isso contaminou o laboratorio inicial quando o `keyword_category_map` apareceu vazio fora do boot do Streamlit

Arquivos relevantes:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\streamlit_app.py` linhas 20-31
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\config.py`

## O que o texto enviado acertou

Confirmado:

- o agente ainda tem teto heuristico no runtime real
- o threshold rigido gera injustica de classificacao
- substring e map estatico continuam dominando a categoria
- a arquitetura atual nao possui loop de clarificacao por bandas de confianca
- `request` vs `incident` precisa de guideline semantica mais forte

Parcialmente confirmado:

- o caso `Nao sei o que aconteceu com meu acesso` ja nao passa direto; hoje ele clarifica
- essa mitigacao existe, mas continua sendo lexical e nao semanticamente orquestrada

## O que o laboratorio mostrou alem do texto

### 1. O problema mais perigoso hoje nao e mais o caso vago

O caso mais perigoso agora e o falso positivo operacional:

- outage coletivo com `sem acesso`
- classificado como `request`
- ticket real ja foi aberto assim no fluxo integrado

### 2. O LLM local tem potencial, mas o contrato atual nao o aproveita

No laboratorio com `qwen3-dtic:latest`, o modelo acertou bem a intencao:

- `Preciso de acesso ao SEI` -> `request`
- `Nao consigo entrar no email desde hoje cedo` -> `incident`
- `Estamos todos sem acesso ao sistema de protocolo` -> `incident`

Mas quase sempre retornou `itilcategories_id=0`, o que confirma que o prompt atual nao esta estruturado para mapeamento operacional de categoria.

### 3. A transicao semantica nao exige jogar fora as regras

O codigo atual ja tem bons guardrails:

- bloqueio de submit sem requester/entity/category
- audit log util
- clarificacao ja existe como estado operacional

O problema e de arquitetura de decisao, nao de ausencia total de controle.

## Plano cirurgico recomendado

### Fase A - Corrigir os erros de classificacao sem quebrar estabilidade

1. Introduzir um objeto de decisao explicito no parser:
   - `intent`
   - `intent_confidence`
   - `category_confidence`
   - `needs_clarification`
   - `missing_slots`

2. Remover o tie-break pro-request:
   - empate nao deve favorecer `request`
   - outage e `sem acesso` coletivo devem pesar mais para `incident`

3. Substituir o threshold unico por banda dupla:
   - baixa confianca -> fallback controlado
   - confianca media -> `needs_clarification`
   - confianca alta -> confirmacao

### Fase B - Formalizar slot-filling minimo por superficie/categoria

Comecar por `DTIC` / acessos:

- sistema alvo
- tipo de acao: criar perfil, liberar acesso, resetar senha, investigar erro
- mensagem de erro ou sintoma
- escopo do impacto: uma pessoa, equipe, area inteira

Enquanto slots obrigatorios estiverem vazios, o agente nao deve abrir confirmacao final.

### Fase C - Reposicionar o LLM como classificador semantico

No `llm.py`:

- separar um prompt de classificacao semantica de um prompt de reescrita
- usar exemplos few-shot de `request` vs `incident`
- pedir retorno estruturado com:
  - `intent`
  - `intent_confidence`
  - `suspected_category`
  - `category_confidence`
  - `missing_slots`
  - `clarifying_question`

As regras Python devem virar guardrails de maquina de estados, nao classificador principal.

### Fase D - Shadow evaluation antes de virar default

Montar um corpus pequeno e versionado com exemplos reais:

- acessos
- email
- SEI
- office
- impressora
- outage coletivo
- relato vago

Para cada exemplo, comparar:

- heuristica atual
- LLM semantico
- decisao final do orchestrator

## Conclusao objetiva

O Hermes esta estavel o suficiente para abrir tickets reais, mas ainda nao esta pronto como agente semantico robusto para abertura operacional em larga escala.

Estado atual:

- bom como agente heuristico com guardrails
- insuficiente como classificador semantico
- ainda vulneravel a erro serio de `incident` -> `request`
- sem slot-filling explicito por dominio

Proximo passo recomendado:

- implementar primeiro a `Dual-Threshold Architecture` com `needs_clarification`
- depois introduzir slot-filling minimo
- so entao promover o LLM a classificador principal de intencao e categoria
