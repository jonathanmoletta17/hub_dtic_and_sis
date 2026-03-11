# AUDITORIA ARQUITETURAL — hub_dtic_and_sis
## Metodologia Completa para Execução pelo Antigravity

> **Versão:** 1.0 | **Data:** 2026-03-11  
> **Natureza:** Auditoria baseada exclusivamente em evidências de código  
> **Regra absoluta:** Separar observação factual de interpretação — nunca assumir comportamentos sem verificação  
> **Output final:** Documento consolidado de estado arquitetural com gaps, riscos e roadmap

---

## PRINCÍPIOS METODOLÓGICOS

Antes de iniciar qualquer fase, internalizar estas regras:

```
1. EVIDÊNCIA ANTES DE CONCLUSÃO
   Toda afirmação deve citar o arquivo, linha e trecho de código que a sustenta.
   "O sistema faz X" só é válido se houver: arquivo.py:linha → trecho de código.

2. SEPARAÇÃO DE CAMADAS DE ANÁLISE
   Nível 1 — O que o código FAZ (factual, verificável)
   Nível 2 — O que o código DEVERIA fazer (arquitetural, comparativo)
   Nível 3 — O que isso IMPLICA (risco, regressão, inconsistência)
   Nunca pular do Nível 1 para o 3 sem o 2.

3. ZERO ALTERAÇÕES DURANTE A AUDITORIA
   Esta é uma fase de leitura e diagnóstico.
   Nenhum arquivo é modificado. Nenhum código é "corrigido" incidentalmente.
   Descobertas são documentadas para resolução posterior.

4. VERIFICAÇÃO POR GREP, NÃO POR MEMÓRIA
   Para cada afirmação sobre o código, executar o grep correspondente.
   Nunca confiar em leituras anteriores — arquivos mudam entre sessões.
```

---

## MAPA GERAL DAS FASES

```
FASE 0 — Inventário Estrutural         (fundação de tudo)
FASE 1 — Fluxo de Autenticação         (contrato mais crítico)
FASE 2 — Modelo CQRS                   (coração arquitetural)
FASE 3 — Fluxo de Tickets              (criação + listagem + busca)
FASE 4 — GLPIClient                    (dependência central)
FASE 5 — Contratos Backend↔Frontend   (consistência de tipos)
FASE 6 — Segurança e Guards            (autenticação e autorização)
FASE 7 — Robustez e Tratamento de Erro (resiliência operacional)
FASE 8 — Síntese e Roadmap             (consolidação final)
```

Cada fase produz um bloco de documentação. A Fase 8 consolida tudo.
As fases são sequenciais — cada uma depende das anteriores.

---

---

# FASE 0 — INVENTÁRIO ESTRUTURAL

## Objetivo
Fotografar o estado real do repositório antes de qualquer análise profunda.
Identificar o que existe, onde está, e se a estrutura corresponde à arquitetura declarada.

## Escopo

```
/app
  ├── routers/        ← endpoints HTTP
  ├── services/       ← lógica de negócio
  ├── core/           ← infraestrutura (GLPIClient, config, registry)
  ├── schemas/        ← modelos Pydantic
  ├── tests/          ← testes existentes
  └── main.py         ← entry point

/web
  ├── src/app/        ← páginas Next.js (App Router)
  ├── src/components/ ← componentes React
  ├── src/modules/    ← módulos de domínio
  ├── src/lib/api/    ← camada de integração HTTP
  ├── src/store/      ← estado global (Zustand)
  ├── src/types/      ← tipos TypeScript
  └── src/middleware.ts ← middleware de rota
```

## Metodologia

### 0.1 — Mapeamento de estrutura

```bash
# Estrutura do backend
find app/ -name "*.py" | sort | head -100
find app/ -name "*.py" | wc -l

# Estrutura do frontend
find web/src -name "*.ts" -o -name "*.tsx" | sort | head -100
find web/src -name "*.ts" -o -name "*.tsx" | wc -l

# Arquivos de configuração
ls -la app/core/
cat app/core/contexts.yaml    # se existir
cat app/config.py             # ou equivalente
cat web/src/middleware.ts
```

### 0.2 — Mapeamento de routers

```bash
# Quais routers existem?
ls app/routers/

# Quais prefixos cada router usa?
grep -n "prefix=" app/routers/*.py
grep -n "router.include_router\|app.include_router" app/main.py

# Quais endpoints cada router declara?
grep -n "@router\.\(get\|post\|put\|delete\|patch\)" app/routers/*.py
```

### 0.3 — Mapeamento de services

```bash
# Quais services existem?
ls app/services/

# Quais funções cada service exporta?
grep -n "^def \|^async def \|^class " app/services/*.py

# Quais services são importados por quais routers?
grep -rn "from app.services" app/routers/
```

### 0.4 — Mapeamento do frontend

```bash
# Quais páginas existem?
find web/src/app -name "page.tsx" | sort

# Quais hooks de API existem?
ls web/src/lib/api/
grep -n "^export function\|^export async function\|^export const" web/src/lib/api/*.ts

# Quais stores existem?
ls web/src/store/
grep -n "^export\|interface\|type " web/src/store/*.ts
```

### 0.5 — Mapeamento de testes

```bash
# Quais testes existem?
find app/tests -name "*.py" | sort
find web/src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | sort

# Quantos testes passam hoje?
python -m pytest app/tests/ -v --tb=no -q 2>&1
```

## Evidências a coletar

```
[ ] Lista completa de routers com prefixos e métodos HTTP
[ ] Lista completa de services com suas funções públicas
[ ] Lista completa de páginas Next.js e sua estrutura de rotas
[ ] Lista completa de funções de API no frontend
[ ] Lista de stores Zustand e seus campos
[ ] Número de testes existentes e resultado atual
[ ] Versões de dependências críticas (FastAPI, Next.js, Pydantic)
```

## Formato de documentação da Fase 0

```
INVENTÁRIO ESTRUTURAL
═══════════════════════════════════════

BACKEND (app/)
  Routers: [lista com prefixo e qtd de endpoints]
  Services: [lista com qtd de funções]
  Schemas: [lista de modelos Pydantic]
  Testes: [N arquivos, M testes, K passando]

FRONTEND (web/)
  Páginas: [lista de rotas]
  API layer: [lista de arquivos e funções]
  Stores: [lista com campos principais]
  Tipos: [lista de arquivos de tipos]

CONFIGURAÇÃO
  contexts.yaml: [existe? campos?]
  .env variáveis críticas: [lista sem valores]
  middleware.ts: [rotas protegidas declaradas]

GAPS INICIAIS IDENTIFICADOS
  [qualquer coisa que já pareça inconsistente na estrutura]
```

---

---

# FASE 1 — FLUXO DE AUTENTICAÇÃO

## Objetivo
Auditar completamente o fluxo de autenticação do ponto de entrada (LoginPage)
até a resposta final, verificando consistência entre todos os componentes.

## Escopo
```
web/src/app/page.tsx                    ← entrada do usuário
web/src/lib/api/glpiService.ts          ← função apiLogin()
web/src/store/useAuthStore.ts           ← estado persistido
web/src/middleware.ts                   ← proteção de rotas
app/routers/domain_auth.py             ← endpoint /login
app/services/auth_service.py           ← perform_login()
app/core/glpi_client.py                ← integração GLPI
app/core/contexts.yaml                 ← mapeamento de contextos
app/schemas/auth_schemas.py            ← contratos de dados
```

## Metodologia

### 1.1 — Leitura completa de cada arquivo

Ler na íntegra, na ordem abaixo. Registrar descobertas antes de avançar.

```
[ ] web/src/app/page.tsx
    → Como credenciais são capturadas?
    → Como handleSubmit funciona?
    → O fallback DTIC→SIS está implementado? Como exatamente?
    → O que acontece com erro 401? Com erro 500? Com timeout?

[ ] web/src/lib/api/glpiService.ts → função apiLogin()
    → Qual é o endpoint chamado? /login, /auth, outro?
    → Quais headers são enviados?
    → O contexto ("dtic"/"sis") é passado na URL, header, ou body?
    → Como erros HTTP são tratados? (401, 500, network error)

[ ] web/src/store/useAuthStore.ts
    → Quais campos são armazenados após login bem-sucedido?
    → Quais campos são omitidos do persist (localStorage)?
    → Como o logout limpa o estado?
    → Existe expiração de sessão implementada?

[ ] web/src/middleware.ts
    → Quais rotas são protegidas?
    → Como a proteção é verificada? (cookie? localStorage? header?)
    → O que acontece com rotas não autenticadas?

[ ] app/routers/domain_auth.py → endpoint POST /login
    → Qual é o schema de request? Pydantic model?
    → Qual é o schema de response? Pydantic model?
    → Existe rate limiting?
    → Existe logging de tentativas de login?

[ ] app/services/auth_service.py → perform_login()
    → Qual é a sequência exata de operações?
    → O fallback com service token está implementado como descrito?
    → Como perfis GLPI são extraídos e mapeados para hub_roles?
    → O que é retornado em caso de falha total?

[ ] app/core/glpi_client.py → função de login
    → Como Basic Auth é construído?
    → Como o service token fallback funciona?
    → Existe timeout configurado nas chamadas GLPI?
    → Sessões GLPI são gerenciadas? (initSession/killSession)

[ ] app/core/contexts.yaml
    → Quais contextos estão definidos?
    → Qual é o mapeamento profile_map/group_map?
    → Os IDs aqui batem com os IDs confirmados no GLPI real?
```

### 1.2 — Verificações de consistência

```bash
# Verificar o campo de contexto: onde é definido e como flui
grep -rn '"context"\|context=' web/src/lib/api/glpiService.ts
grep -rn "context" app/routers/domain_auth.py
grep -rn "context" app/services/auth_service.py

# Verificar o contrato de resposta: o que o backend retorna vs o que o frontend espera
grep -n "session_token\|hub_roles\|app_access\|active_hub_role" app/schemas/auth_schemas.py
grep -n "session_token\|hub_roles\|app_access\|active_hub_role" web/src/store/useAuthStore.ts

# Verificar o fluxo de token: como o session_token chega ao httpClient
grep -rn "session.token\|Session-Token\|Authorization" web/src/lib/api/
grep -rn "session.token\|Session-Token" app/routers/

# Verificar o middleware: qual chave ele lê para verificar autenticação
grep -n "cookie\|localStorage\|session\|token" web/src/middleware.ts
```

### 1.3 — Mapeamento do contrato backend↔frontend

Construir a tabela de contrato exata:

```bash
# Schema de request (o que o frontend envia)
grep -A 20 "class LoginRequest\|class AuthRequest" app/schemas/auth_schemas.py

# Schema de response (o que o backend retorna)
grep -A 30 "class LoginResponse\|class AuthResponse" app/schemas/auth_schemas.py

# O que o frontend armazena (AuthMeResponse ou equivalente)
grep -A 30 "interface Auth\|type Auth" web/src/store/useAuthStore.ts
```

## Evidências a coletar

```
[ ] Fluxo completo linha-a-linha: LoginPage → apiLogin() → POST /login
    → perform_login() → GLPIClient → resposta → useAuthStore
[ ] Contrato de request: campos enviados pelo frontend
[ ] Contrato de response: campos retornados pelo backend
[ ] Campos armazenados no useAuthStore após login
[ ] Campos que o middleware verifica para proteger rotas
[ ] Comportamento em cada cenário de falha: 401, 500, offline, credenciais inválidas
[ ] Mapeamento contexts.yaml → hub_roles semânticos
[ ] Tratamento do fallback DTIC→SIS: onde exatamente acontece, como
```

## Formato de documentação da Fase 1

```
AUDITORIA: FLUXO DE AUTENTICAÇÃO
═══════════════════════════════════════

FLUXO VERIFICADO (evidências)
  1. LoginPage captura credenciais em: [arquivo:linha]
  2. handleSubmit chama apiLogin() com: [campos exatos]
  3. apiLogin() faz POST para: [URL exata, com contexto como X]
  4. Headers enviados: [lista]
  5. perform_login() executa: [sequência de operações]
  6. GLPIClient tenta: [Tentativa 1 → Tentativa 2 → falha]
  7. Resposta retornada: [campos exatos do LoginResponse]
  8. useAuthStore armazena: [campos armazenados vs omitidos do persist]
  9. middleware protege rotas verificando: [chave exata]

FALLBACK DTIC→SIS
  Implementado em: [arquivo:linha]
  Condição: [exatamente quando ativa]
  Comportamento: [o que muda no segundo request]

CONTRATO BACKEND↔FRONTEND
  Request:  [tabela: campo → tipo → obrigatório]
  Response: [tabela: campo → tipo → armazenado?]
  Divergências encontradas: [lista ou "nenhuma"]

CENÁRIOS DE FALHA
  401 (credenciais inválidas): [comportamento frontend + backend]
  500 (erro interno): [comportamento]
  Timeout/offline: [comportamento]
  Fallback esgotado (DTIC e SIS falham): [comportamento]

GAPS E INCONSISTÊNCIAS
  [lista numerada de problemas encontrados com severidade]

RISCOS IDENTIFICADOS
  🔴 Crítico: [lista]
  🟡 Médio: [lista]
  🟢 Baixo: [lista]
```

---

---

# FASE 2 — MODELO CQRS

## Objetivo
Verificar se o modelo CQRS (escrita via API GLPI, leitura via MySQL direto)
está corretamente implementado e se as fronteiras entre os dois caminhos
são claras e consistentes.

## Escopo
```
app/routers/db_read.py                 ← rotas de leitura (MySQL direto)
app/routers/domain_*.py                ← rotas de escrita (via API GLPI)
app/services/ticket_list_service.py   ← leitura de tickets via MySQL
app/services/search_service.py        ← busca via MySQL
app/services/auth_service.py          ← escrita via API (login)
app/core/glpi_client.py               ← cliente de escrita
app/core/db.py (ou equivalente)       ← conexão MySQL direta
```

## Metodologia

### 2.1 — Identificar todos os pontos de leitura vs escrita

```bash
# Quais routers fazem leitura via MySQL?
grep -rn "mysql\|pymysql\|sqlalchemy\|execute\|cursor\|db\." app/routers/
grep -rn "mysql\|pymysql\|sqlalchemy\|execute\|cursor" app/services/

# Quais routers fazem escrita via API GLPI?
grep -rn "glpi_client\|GLPIClient\|create_item\|update_item\|delete_item" app/routers/
grep -rn "glpi_client\|GLPIClient\|create_item\|update_item" app/services/

# Existe algum router que mistura os dois? (violação CQRS)
grep -rn "glpi_client" app/services/ticket_list_service.py
grep -rn "execute\|cursor\|db\." app/services/auth_service.py
```

### 2.2 — Verificar a camada de banco de dados

```bash
# Como a conexão MySQL é gerenciada?
find app/ -name "db.py" -o -name "database.py" -o -name "mysql*.py"
cat app/core/db.py   # ou arquivo equivalente encontrado

# Connection pooling está configurado?
grep -rn "pool_size\|max_overflow\|pool_pre_ping\|create_engine" app/

# Credenciais de banco: como são injetadas?
grep -rn "DB_HOST\|DB_USER\|DB_PASS\|MYSQL_" app/config.py
grep -rn "DB_HOST\|DB_USER\|DB_PASS\|MYSQL_" app/core/
```

### 2.3 — Verificar queries SQL críticas

```bash
# Localizar todas as queries SQL no codebase
grep -rn "SELECT\|INSERT\|UPDATE\|DELETE" app/services/ | grep -v ".pyc"
grep -rn "SQL_\|QUERY_\|sql =" app/services/

# Existe parametrização? (proteção contra SQL injection)
grep -rn "execute(" app/services/
# Verificar: execute(query, params) ou execute(f"... {var}...") ?

# Existe LIKE % sem índice?
grep -rn "LIKE" app/services/
```

### 2.4 — Verificar consistência dos contextos no CQRS

```bash
# Como o contexto (dtic/sis) determina qual banco é consultado?
grep -rn "context\|dtic\|sis" app/services/ticket_list_service.py
grep -rn "context\|dtic\|sis" app/core/db.py

# Existe uma função que mapeia context → credenciais de banco?
grep -rn "def.*context\|context.*db\|context.*host" app/core/
```

## Evidências a coletar

```
[ ] Lista completa de operações de LEITURA com arquivo e linha
[ ] Lista completa de operações de ESCRITA com arquivo e linha
[ ] Qualquer mistura (leitura em router de escrita ou vice-versa)
[ ] Como a conexão MySQL é criada e gerenciada por contexto
[ ] Se há connection pooling configurado
[ ] Se queries SQL estão parametrizadas (proteção injection)
[ ] Como o contexto determina qual banco GLPI é consultado
[ ] Existência de queries com LIKE sem índice (performance)
```

## Formato de documentação da Fase 2

```
AUDITORIA: MODELO CQRS
═══════════════════════════════════════

MAPA CQRS VERIFICADO
  Operações de LEITURA (MySQL):
    [arquivo:endpoint] → [service:função] → [query resumida]
    ...

  Operações de ESCRITA (API GLPI):
    [arquivo:endpoint] → [service:função] → [GLPIClient:método]
    ...

  Violações CQRS (mistura de caminhos):
    [lista ou "nenhuma encontrada"]

CAMADA DE BANCO
  Driver: [pymysql / SQLAlchemy / outro]
  Connection pooling: [configurado? parâmetros?]
  Mapeamento context→banco: [como funciona]
  Parametrização SQL: [todas parametrizadas? exceções?]

GAPS E RISCOS
  SQL Injection: [risco presente? onde?]
  Queries sem índice: [lista]
  Connection leaks: [risco identificado?]
```

---

---

# FASE 3 — FLUXO DE TICKETS

## Objetivo
Auditar os três sub-fluxos de tickets: criação (escrita), listagem (leitura) e busca (leitura),
verificando consistência de contratos e ausência de regressões.

## Escopo
```
CRIAÇÃO:
  web/src/app/[context]/new-ticket/page.tsx
  web/src/modules/tickets/components/wizard/ReviewStep.tsx
  web/src/lib/api/formService.ts → submitFormAnswers()
  app/routers/domain_formcreator.py → POST /forms/{form_id}/submit
  app/core/glpi_client.py → create_item("PluginFormcreatorFormAnswer")

LISTAGEM:
  web/src/lib/api/ticketService.ts → fetchTickets()
  app/routers/db_read.py → GET /{context}/db/tickets
  app/services/ticket_list_service.py

BUSCA:
  web/src/lib/api/ticketService.ts → searchTicketsDirect()
  app/routers/search.py → GET /{context}/tickets/search
  app/services/search_service.py
```

## Metodologia

### 3.1 — Criação de ticket: traçar o payload completo

```bash
# No frontend: qual é o formato do payload enviado?
grep -n "q_\|formcreator_field\|submitFormAnswers" web/src/lib/api/formService.ts
grep -n "payload\|body\|answers" web/src/modules/tickets/components/wizard/ReviewStep.tsx

# No backend: como o payload é transformado?
grep -A 30 "def.*submit\|async def.*submit" app/routers/domain_formcreator.py
grep -n "formcreator_field_\|requesttypes_id" app/routers/domain_formcreator.py

# Verificar a transformação q_<id> → formcreator_field_<id>
grep -n "q_\|formcreator_field" app/routers/domain_formcreator.py

# Como o GLPIClient cria o FormAnswer?
grep -A 20 "PluginFormcreatorFormAnswer\|create_item" app/core/glpi_client.py
```

### 3.2 — Listagem: verificar a query SQL de tickets

```bash
# Qual é a query de listagem?
grep -A 30 "def.*ticket\|SELECT" app/services/ticket_list_service.py

# Quais campos são retornados?
grep -n "SELECT\|FROM\|JOIN\|WHERE" app/services/ticket_list_service.py

# O que o frontend espera receber?
grep -n "interface Ticket\|type Ticket" web/src/types/
grep -n "fetchTickets\|Ticket\b" web/src/lib/api/ticketService.ts

# Há correspondência entre campos SQL e campos TypeScript?
# Documentar a tabela de mapeamento
```

### 3.3 — Busca: verificar a query de busca

```bash
# Qual é a query de busca?
grep -A 30 "def.*search\|LIKE\|MATCH" app/services/search_service.py

# LIKE sem índice?
grep -n "LIKE" app/services/search_service.py

# MATCH AGAINST (full-text) — índice configurado?
grep -n "MATCH\|AGAINST\|FULLTEXT" app/services/search_service.py

# Proteção contra busca vazia ou muito curta?
grep -n "len(\|len >\|min_length" app/services/search_service.py
grep -n "minLength\|min_length\|len(" web/src/lib/api/ticketService.ts
```

### 3.4 — Verificar tratamento de erros nos três fluxos

```bash
# Criação: o que acontece se o GLPI rejeitar o FormAnswer?
grep -n "except\|raise\|HTTPException\|status_code" app/routers/domain_formcreator.py

# Listagem: o que acontece se a query MySQL falhar?
grep -n "except\|raise\|try" app/services/ticket_list_service.py

# Busca: o que acontece com busca por string injetável?
grep -n "escape\|sanitize\|%s\|:param" app/services/search_service.py
```

## Evidências a coletar

```
[ ] Payload completo de criação: formato frontend → transformação backend → GLPI
[ ] O campo requesttypes_id = 1 é adicionado onde e por quê
[ ] Query SQL de listagem com todos os campos retornados
[ ] Correspondência entre campos SQL e tipos TypeScript de Ticket
[ ] Query SQL de busca e proteção contra injection
[ ] Tratamento de erros em cada um dos três fluxos
[ ] Como o contexto (DTIC/SIS) afeta cada um dos três fluxos
```

## Formato de documentação da Fase 3

```
AUDITORIA: FLUXO DE TICKETS
═══════════════════════════════════════

CRIAÇÃO
  Payload frontend (q_<id> format): [campos identificados]
  Transformação backend: [lógica exata de q_<id> → formcreator_field_<id>]
  Campo automático: requesttypes_id=1 adicionado em [arquivo:linha]
  GLPIClient: create_item com [campos]
  Tratamento de erro se GLPI rejeitar: [comportamento]

LISTAGEM
  Endpoint: [URL completa com parâmetros]
  Query SQL: [resumo dos JOINs e campos]
  Campos retornados: [lista]
  Campos esperados pelo frontend: [lista]
  Divergências campo SQL↔TypeScript: [lista ou "nenhuma"]

BUSCA
  Endpoint: [URL com parâmetros aceitos]
  Técnica de busca: [LIKE | MATCH AGAINST | combinada]
  Proteção SQL injection: [verificada em arquivo:linha]
  Proteção busca vazia: [existe em arquivo:linha | ausente]

GAPS E RISCOS
  [lista com severidade]
```

---

---

# FASE 4 — GLPICLIENT (DEPENDÊNCIA CENTRAL)

## Objetivo
Auditar o GLPIClient como componente crítico de infraestrutura.
Verificar gerenciamento de sessões, resiliência, e se é usado corretamente.

## Escopo
```
app/core/glpi_client.py    ← implementação completa
app/main.py                ← como é instanciado
app/services/auth_service.py   ← uso em auth
app/routers/domain_formcreator.py  ← uso em criação de ticket
app/routers/admin.py       ← uso em administração
```

## Metodologia

### 4.1 — Leitura completa do GLPIClient

```bash
# Leitura completa
cat app/core/glpi_client.py

# Verificar padrão de instanciação
grep -rn "GLPIClient\(\|glpi_client\s*=" app/
grep -rn "GLPIClient" app/main.py
# É singleton? É instanciado por request? É injetado via dependency?
```

### 4.2 — Gerenciamento de sessões GLPI

```bash
# initSession e killSession
grep -n "initSession\|killSession\|getFullSession" app/core/glpi_client.py

# Sessions são reutilizadas ou criadas por request?
grep -n "session_token\|app-token\|user-token" app/core/glpi_client.py

# Existe cleanup de sessões expiradas?
grep -n "expire\|ttl\|timeout\|cleanup" app/core/glpi_client.py
```

### 4.3 — Resiliência e tratamento de erros

```bash
# Timeouts configurados?
grep -n "timeout\|connect_timeout" app/core/glpi_client.py

# Retry logic?
grep -n "retry\|tenacity\|backoff\|sleep" app/core/glpi_client.py

# O que acontece quando o GLPI está offline?
grep -n "except\|ConnectionError\|Timeout\|HTTPError" app/core/glpi_client.py

# Erros do GLPI são logados?
grep -n "logger\|logging\|print" app/core/glpi_client.py
```

### 4.4 — Verificar uso correto em cada router

```bash
# Todos os routers que usam GLPIClient:
grep -rn "glpi_client\." app/routers/

# Algum router usa diretamente sem passar pelo service?
# (violação da separação de camadas)
grep -rn "glpi_client\." app/routers/ | grep -v "service"
```

## Evidências a coletar

```
[ ] Como GLPIClient é instanciado e onde (singleton/por request/injetado)
[ ] Fluxo de sessão GLPI: quando initSession é chamado, quando killSession
[ ] Timeout configurado para chamadas ao GLPI
[ ] Comportamento quando GLPI está offline
[ ] Se existe retry logic e como funciona
[ ] Se routers acessam GLPIClient diretamente (violação de camada)
```

## Formato de documentação da Fase 4

```
AUDITORIA: GLPICLIENT
═══════════════════════════════════════

INSTANCIAÇÃO
  Padrão: [singleton | por request | injetado via Depends]
  Localizado em: [arquivo:linha]
  Contexto (DTIC/SIS) determina: [URL base? credenciais? ambos?]

GERENCIAMENTO DE SESSÕES
  initSession: chamado quando? [evidência]
  killSession: chamado quando? [evidência]
  Reutilização de sessão: [existe? como?]
  Expiração/cleanup: [implementado? como?]

RESILIÊNCIA
  Timeout: [configurado? valor?]
  Retry logic: [existe? biblioteca?]
  Comportamento offline: [exceção propagada? mensagem?]
  Logging de erros: [existe? nível?]

VIOLAÇÕES DE CAMADA
  Routers que acessam GLPIClient diretamente: [lista ou "nenhum"]

GAPS E RISCOS
  [lista com severidade]
```

---

---

# FASE 5 — CONTRATOS BACKEND↔FRONTEND

## Objetivo
Verificar se todos os contratos de dados entre backend e frontend são consistentes.
Uma divergência de campo gera erro silencioso em runtime.

## Escopo
```
app/schemas/auth_schemas.py       ← schemas de autenticação
app/schemas/*.py                  ← todos os schemas Pydantic
web/src/types/                    ← tipos TypeScript
web/src/store/useAuthStore.ts     ← estado de autenticação
web/src/lib/api/*.ts              ← funções de API (tipos inferidos)
```

## Metodologia

### 5.1 — Extrair todos os schemas Pydantic

```bash
# Listar todos os schemas
find app/schemas -name "*.py" | sort
grep -rn "class.*BaseModel\|class.*Schema" app/schemas/
grep -rn "class.*BaseModel\|class.*Schema" app/routers/

# Para cada schema, extrair campos:
grep -A 20 "class LoginResponse\|class AuthMeResponse\|class HubRole" app/schemas/auth_schemas.py
grep -A 20 "class.*Response\|class.*Request" app/routers/admin.py
```

### 5.2 — Extrair todos os tipos TypeScript correspondentes

```bash
# Tipos de autenticação
grep -A 20 "interface AuthMe\|type AuthMe\|interface HubRole\|type HubRole" web/src/store/useAuthStore.ts
grep -A 20 "interface.*Response\|type.*Response" web/src/lib/api/

# Todos os tipos definidos
find web/src/types -name "*.ts" -exec cat {} \;
```

### 5.3 — Construir tabela de correspondência para cada contrato

Para cada par Backend Schema ↔ Frontend Type:

```
Campo Backend (Pydantic) | Tipo Python | Campo Frontend (TS) | Tipo TS | Match?
─────────────────────────────────────────────────────────────────────────────
session_token            | str         | session_token        | string  | ✅
hub_roles                | List[HubRole]| hub_roles           | HubRole[]| ✅
app_access               | List[str]   | app_access           | string[]| ✅
...
```

### 5.4 — Verificar transformações de naming

```bash
# O backend usa snake_case e o frontend camelCase?
# Existe conversão automática (ex: Pydantic alias, ou httpClient transform)?
grep -n "alias\|by_alias\|model_config" app/schemas/
grep -n "camelCase\|snake_case\|transform" web/src/lib/api/httpClient.ts
grep -n "camelCase\|snake_case\|transform" web/src/lib/api/glpiService.ts
```

## Evidências a coletar

```
[ ] Tabela completa de contratos para cada endpoint auditado nas Fases 1-3
[ ] Divergências de nome de campo (snake_case vs camelCase)
[ ] Divergências de tipo (str vs number, array vs objeto)
[ ] Campos presentes no backend mas ausentes no tipo TypeScript
[ ] Campos esperados pelo frontend mas não retornados pelo backend
[ ] Se existe transformação automática de naming e onde
```

## Formato de documentação da Fase 5

```
AUDITORIA: CONTRATOS BACKEND↔FRONTEND
═══════════════════════════════════════

CONTRATO: Auth (LoginResponse ↔ AuthMeResponse)
  [tabela de campos]
  Divergências: [lista ou "nenhuma"]

CONTRATO: Admin (AdminUserResponse ↔ AdminUser)
  [tabela de campos]
  Divergências: [lista ou "nenhuma"]

CONTRATO: Ticket (TicketRow ↔ Ticket TypeScript)
  [tabela de campos]
  Divergências: [lista ou "nenhuma"]

TRANSFORMAÇÃO DE NAMING
  Backend → Frontend: [automática via X | manual em Y | nenhuma]
  Campos divergentes por naming: [lista]

RISCOS
  [campos divergentes que podem causar undefined silencioso em runtime]
```

---

---

# FASE 6 — SEGURANÇA E GUARDS

## Objetivo
Verificar se a autenticação e autorização estão implementadas de forma consistente
em todos os endpoints e rotas do frontend.

## Escopo
```
web/src/middleware.ts                 ← proteção de rotas Next.js
web/src/components/ContextGuard.tsx  ← guard por role no frontend
app/core/auth_guard.py (ou equiv.)  ← dependência FastAPI de auth
app/routers/*.py                    ← verificar se cada router usa o guard
```

## Metodologia

### 6.1 — Frontend: verificar proteção de rotas

```bash
# Quais rotas o middleware protege?
cat web/src/middleware.ts
grep -n "matcher\|protected\|redirect\|auth" web/src/middleware.ts

# Rotas que existem em /app mas NÃO estão no matcher do middleware:
find web/src/app -name "page.tsx" | sed 's|web/src/app||' | sed 's|/page.tsx||'
# Comparar com o matcher do middleware
```

### 6.2 — Frontend: verificar ContextGuard por role

```bash
# Como ContextGuard funciona?
cat web/src/components/ContextGuard.tsx

# Quais páginas usam ContextGuard?
grep -rn "ContextGuard\|hub_role\|admin-hub\|gestor" web/src/app/

# A página /permissoes exige admin-hub?
grep -rn "admin-hub\|ContextGuard" web/src/app/\[context\]/permissoes/
```

### 6.3 — Backend: verificar guards em cada router

```bash
# Qual é a dependência de autenticação?
grep -n "Depends\|Security\|auth_guard\|get_current" app/routers/*.py

# Todos os endpoints protegidos usam a dependência?
grep -n "@router\.\(get\|post\|put\|delete\)" app/routers/*.py | grep -v "Depends"
# Endpoints sem Depends podem estar desprotegidos

# Endpoint de login não deve ter guard (é público):
grep -n "Depends" app/routers/domain_auth.py

# Endpoints de admin exigem role maior?
grep -n "admin-hub\|_require_admin\|_require_gestor" app/routers/admin.py
```

### 6.4 — Verificar consistência de roles

```bash
# Roles definidos no backend
grep -rn '"admin-hub"\|"gestor"\|"tecnico"\|"solicitante"' app/

# Roles verificados no frontend
grep -rn '"admin-hub"\|"gestor"\|"tecnico"\|"solicitante"' web/src/

# Hierarquia de roles implementada?
grep -n "ROLE_HIERARCHY\|hierarquia\|inherits" app/services/auth_service.py
```

## Evidências a coletar

```
[ ] Lista de rotas Next.js com status de proteção (middleware cobre? guard de role?)
[ ] Lista de endpoints FastAPI com status de proteção (Depends presente?)
[ ] Endpoints públicos intencionais vs possivelmente esquecidos
[ ] Consistência de roles entre backend e frontend
[ ] Hierarquia de roles implementada no backend
[ ] admin-hub sendo verificado nos endpoints de administração
```

## Formato de documentação da Fase 6

```
AUDITORIA: SEGURANÇA E GUARDS
═══════════════════════════════════════

ROTAS FRONTEND
  [tabela: rota | middleware protege? | ContextGuard? | role exigida]
  Rotas descobertas (sem proteção): [lista]

ENDPOINTS BACKEND
  [tabela: router | endpoint | Depends auth? | role exigida?]
  Endpoints sem proteção: [lista — verificar se intencional]

CONSISTÊNCIA DE ROLES
  Roles no backend: [lista]
  Roles no frontend: [lista]
  Divergências: [lista ou "nenhuma"]
  Hierarquia implementada: [sim/não — onde]

GAPS E RISCOS
  🔴 Endpoints desprotegidos inadvertidamente: [lista]
  🟡 Roles inconsistentes: [lista]
```

---

---

# FASE 7 — ROBUSTEZ E TRATAMENTO DE ERROS

## Objetivo
Verificar se o sistema lida de forma adequada com falhas — GLPI offline,
banco de dados indisponível, dados corrompidos, inputs inválidos.

## Escopo
```
app/core/glpi_client.py     ← falhas de comunicação com GLPI
app/services/*.py           ← exceções de banco e negócio
app/routers/*.py            ← HTTPException e status codes
web/src/lib/api/*.ts        ← tratamento de erros HTTP no frontend
web/src/components/         ← Error Boundaries e estados de erro na UI
```

## Metodologia

### 7.1 — Backend: verificar tratamento de exceções

```bash
# Todas as chamadas ao GLPIClient têm try/except?
grep -rn "glpi_client\." app/services/ | grep -v "try\|except"
# Verificar manualmente se estão dentro de blocos try

# Todas as queries SQL têm try/except?
grep -rn "execute\|cursor" app/services/ | grep -v "try\|except"

# HTTPException é usada de forma consistente?
grep -rn "HTTPException\|raise HTTP\|status_code=" app/routers/
# Verificar se status codes são semanticamente corretos (401 vs 403, 404 vs 422)

# Logging de erros existe?
grep -rn "logger\.\(error\|exception\|warning\)" app/
```

### 7.2 — Frontend: verificar tratamento de erros HTTP

```bash
# Como erros são tratados nas funções de API?
grep -n "catch\|error\|throw\|reject" web/src/lib/api/*.ts

# SWR: existe onError handler?
grep -rn "onError\|errorRetryCount\|shouldRetryOnError" web/src/

# Error Boundaries existem?
grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError" web/src/

# Estados de erro são mostrados ao usuário?
grep -rn "error &&\|isError\|hasError\|errorMessage" web/src/
```

### 7.3 — Cenários específicos de falha

```bash
# GLPI offline: o que acontece com login?
# (verificar no perform_login — existe timeout? mensagem clara?)
grep -n "timeout\|offline\|ConnectionError" app/services/auth_service.py

# Banco MySQL indisponível: o que acontece com listagem de tickets?
grep -n "except\|OperationalError\|DatabaseError" app/services/ticket_list_service.py

# Input inválido no criador de ticket:
grep -n "validator\|@validator\|field_validator" app/schemas/
grep -n "required\|minLength\|validation" web/src/modules/tickets/
```

## Evidências a coletar

```
[ ] Mapa de try/except nos services (cobre todas as operações críticas?)
[ ] Status codes HTTP usados e se são semanticamente corretos
[ ] Tratamento de erros no frontend (catch, onError, Error Boundary)
[ ] Comportamento com GLPI offline (login, criação de ticket)
[ ] Comportamento com MySQL indisponível (listagem, busca)
[ ] Validação de inputs em formulários (frontend + backend)
```

## Formato de documentação da Fase 7

```
AUDITORIA: ROBUSTEZ E TRATAMENTO DE ERROS
═══════════════════════════════════════

COBERTURA DE EXCEÇÕES (BACKEND)
  Services com try/except: [lista]
  Services sem cobertura: [lista]
  Status codes usados: [mapa endpoint → código]
  Inconsistências de status code: [lista]

COBERTURA DE ERROS (FRONTEND)
  Funções de API com catch: [lista]
  SWR onError configurado: [sim/não]
  Error Boundaries: [existem? onde?]
  Erros exibidos ao usuário: [sim/não — forma]

CENÁRIOS DE FALHA
  GLPI offline → login: [comportamento]
  GLPI offline → criar ticket: [comportamento]
  MySQL indisponível → listar tickets: [comportamento]
  Input inválido → criar ticket: [validação frontend? backend?]

GAPS E RISCOS
  🔴 Falhas silenciosas (sem feedback ao usuário): [lista]
  🟡 Mensagens de erro não acionáveis: [lista]
```

---

---

# FASE 8 — SÍNTESE E ROADMAP

## Objetivo
Consolidar todas as descobertas das fases anteriores em um único documento
estruturado, com classificação de riscos e roadmap de resolução priorizado.

## Metodologia

### 8.1 — Consolidação de gaps

Reunir todos os gaps identificados nas Fases 0-7 e classificar:

```
🔴 CRÍTICO   — quebra funcionalidade, expõe dado, causa perda de dados
🟡 MÉDIO     — degrada qualidade, inconsistência arquitetural, risco latente
🟢 BAIXO     — polimento, débito técnico, melhoria de qualidade
📋 DÉBITO    — correto hoje mas precisa evolução planejada
```

### 8.2 — Matriz de impacto vs esforço

Para cada gap classificado:

```
IMPACTO: [alto | médio | baixo] × ESFORÇO: [alto | médio | baixo]
→ Prioridade de resolução
```

### 8.3 — Roadmap por fases

```
FASE IMEDIATA (pode resolver na próxima sessão)
  → gaps 🔴 de baixo esforço

FASE CURTO PRAZO (1-3 sessões)
  → gaps 🔴 de médio/alto esforço
  → gaps 🟡 de baixo esforço

FASE MÉDIO PRAZO (planejado)
  → gaps 🟡 de médio/alto esforço
  → débitos técnicos

FASE LONGO PRAZO
  → gaps 🟢
  → melhorias de arquitetura estrutural
```

## Formato do documento final de síntese

```
═══════════════════════════════════════════════════════════
  RELATÓRIO DE AUDITORIA ARQUITETURAL — hub_dtic_and_sis
  Data: [data]
═══════════════════════════════════════════════════════════

1. RESUMO EXECUTIVO
   [3-5 parágrafos descrevendo o estado geral do sistema]
   [pontos fortes identificados]
   [áreas críticas de atenção]

2. ESTADO POR COMPONENTE
   [uma linha por componente: ✅ robusto | ⚠️ atenção | ❌ crítico]

3. GAPS IDENTIFICADOS (total: N)
   🔴 Críticos (K):  [lista numerada com localização]
   🟡 Médios (M):    [lista numerada com localização]
   🟢 Baixos (P):    [lista numerada com localização]
   📋 Débitos (Q):   [lista numerada]

4. CONTRATOS VERIFICADOS
   [tabela: contrato | status | divergências]

5. SEGURANÇA
   [tabela: endpoint/rota | proteção | status]

6. ROADMAP PRIORIZADO
   IMEDIATO:      [lista]
   CURTO PRAZO:   [lista]
   MÉDIO PRAZO:   [lista]
   LONGO PRAZO:   [lista]

7. ARQUIVOS DE MAIOR RISCO
   [top 5 arquivos mais críticos e por quê]

8. RECOMENDAÇÕES FINAIS
   [máximo 5 recomendações acionáveis e específicas]
═══════════════════════════════════════════════════════════
```

---

---

# INSTRUÇÕES DE EXECUÇÃO PARA O ANTIGRAVITY

## Sequência obrigatória

```
ANTES DE COMEÇAR:
[ ] Ler ARCHITECTURE_RULES.md na íntegra (se existir)
[ ] Executar: python -m pytest app/tests/ -v --tb=no -q
    Registrar o baseline de testes
[ ] Confirmar que NENHUMA alteração será feita durante a auditoria

EXECUTAR EM ORDEM:
[ ] FASE 0 — Inventário Estrutural
[ ] FASE 1 — Autenticação
[ ] FASE 2 — CQRS
[ ] FASE 3 — Tickets
[ ] FASE 4 — GLPIClient
[ ] FASE 5 — Contratos
[ ] FASE 6 — Segurança
[ ] FASE 7 — Robustez
[ ] FASE 8 — Síntese

APÓS CADA FASE:
[ ] Documento parcial da fase entregue no formato especificado
[ ] Gaps numerados acumulativamente (Gap-1, Gap-2, ... Gap-N)
[ ] Confirmar que nenhum arquivo foi alterado (git diff deve estar limpo)
```

## Regras de evidência

```
VÁLIDO:   "auth_service.py:83 — perform_login() não tem timeout configurado"
INVÁLIDO: "o sistema provavelmente não tem timeout"

VÁLIDO:   "useAuthStore.ts:41-53 — AuthMeResponse declara os campos X, Y, Z"
INVÁLIDO: "o frontend deve estar esperando esses campos"

VÁLIDO:   "grep -rn 'Depends' app/routers/admin.py → não encontrado nas linhas 45, 67, 89"
INVÁLIDO: "o endpoint de admin parece não estar protegido"
```

## Formato de numeração de gaps

```
Gap-01 [🔴 Crítico] [Fase 1] Descrição curta
  Evidência: arquivo.py:linha → trecho de código
  Impacto: o que pode quebrar
  Esforço estimado: [baixo | médio | alto]
```

## Critério de conclusão da auditoria

```
[ ] Todas as 8 fases documentadas no formato especificado
[ ] Todos os gaps numerados, classificados e localizados
[ ] Relatório de síntese (Fase 8) completo
[ ] Roadmap priorizado produzido
[ ] Baseline de testes confirmado intacto (pytest ainda passa igual)
[ ] Nenhum arquivo do repositório foi alterado
```

---

*Metodologia gerada para execução pelo Antigravity | hub_dtic_and_sis | 2026-03-11*
