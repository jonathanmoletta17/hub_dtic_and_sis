Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

HUB DTIC & SIS

Protocolo Operacional para o Antigravity

Prompts de Sessão + Gates de Evidência por Bloco

Março 2026  —  v1.0

| Como usar este documento1. Cada bloco tem: prompt de abertura de sessão, regras da sessão, checklist de evidências e template de relatório de saída.2. Uma sessão Antigravity = um bloco. Nunca dois blocos na mesma sessão.3. Cole apenas a seção do bloco relevante ao iniciar a sessão — não o documento inteiro.4. O bloco só fecha quando todas as evidências estiverem coladas e o relatório de saída gerado.5. O relatório de saída de cada bloco vira o contexto de entrada do próximo bloco. |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

Parte 1 — Regras Globais de Sessão

Estas regras valem para TODAS as sessões, independente do bloco. Cole este bloco no início de qualquer sessão Antigravity.

| REGRAS GLOBAIS — Cole no início de toda sessãoREGRA 1 — Evidência obrigatória: Você NÃO pode declarar que algo funciona sem executaro comando e colar o output real. Afirmações sem evidência são inválidas.REGRA 2 — Uma coisa de cada vez: Execute um passo, cole o resultado, aguarde confirmação.Nunca execute múltiplos passos e resuma os resultados.REGRA 3 — Falha é informação: Se um comando falhar, cole o erro completo.NÃO tente corrigir e re-executar sem antes apresentar o erro e propor o fix.REGRA 4 — Sem suposições: Se houver dúvida sobre um ID, path ou configuração,PERGUNTE ou execute um comando de leitura para confirmar. Nunca suponha.REGRA 5 — Correção pela raiz: Se um fix não funcionar na primeira tentativa,PARE. Apresente o diagnóstico atualizado antes de tentar novamente.REGRA 6 — Escopo fechado: Esta sessão cobre apenas o bloco declarado.Se identificar problemas em outros blocos, registre-os mas NÃO resolva agora.REGRA 7 — Gate de saída: A sessão só termina com o Relatório de Evidências gerado. |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Status de Item na Checklist

| Símbolo        | Significado                            | Quando Usar                                      |
| --------------- | -------------------------------------- | ------------------------------------------------ |
| ✅ CONFIRMADO   | Executado e funcionando                | Output real colado — sem erros                  |
| ❌ FALHOU       | Executado e retornou erro              | Erro real colado — fix proposto                 |
| ⚠️ BLOQUEADO  | Não pôde ser executado               | Motivo concreto descrito — dependência ausente |
| ⏭️ PULADO     | Fora do escopo desta sessão           | Registrado para próxima sessão                 |
| 🔄 EM PROGRESSO | Fix aplicado, aguardando revalidação | Re-execução pendente                           |

Template do Relatório de Evidências (gate de saída)

Este template deve ser preenchido pelo Antigravity ao final de cada sessão e salvo em docs/evidencias/BN_data.md

# Evidências — [B1|B2|...] [Nome do Bloco] — [YYYY-MM-DD]

## Status Geral

[ ] APROVADO — todos os itens obrigatórios confirmados
[ ] PARCIAL  — N de M itens confirmados, restantes bloqueados
[ ] REPROVADO — bloqueadores críticos impedem avanço

## Checklist de Evidências

- [X] Item 1 — ✅ CONFIRMADO
  OUTPUT: [colar aqui o output real]
- [ ] Item 2 — ❌ FALHOU
  ERRO: [colar aqui o erro real]
  FIX APLICADO: [descrever o que foi feito]
  STATUS PÓS-FIX: [re-executar e colar]

## Bugs Fechados Nesta Sessão

- [BUG-ID]: [descrição] — diff/evidência colada abaixo

## Gaps/Bugs que Permanecem Abertos

- [GAP-ID]: [motivo pelo qual não foi resolvido]

## Pré-requisitos que Este Bloco Deixa para o Próximo

- [O que o próximo bloco pode assumir como verdadeiro]

## Decisões Tomadas Nesta Sessão

- [Qualquer decisão arquitetural ou de configuração tomada]

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B1 — Infraestrutura & Deploy

| METADADOS DA SESSÃOBloco: B1 — Infraestrutura & DeployDuração estimada: 30–60 minPré-requisito: Nenhum — este é sempre o primeiro blocoDesbloqueador de: B2, B4 (nada funciona sem o backend UP)Critério mínimo para avançar: Backend responde HTTP 200 no /health |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Prompt de Abertura de Sessão — B1

Cole exatamente este texto para iniciar a sessão:

CONTEXTO
Estou no ciclo de revisão do Bloco B1 — Infraestrutura & Deploy
do projeto Hub DTIC & SIS (FastAPI backend + Next.js frontend + Nginx Proxy Manager).

Stack: Docker Compose, FastAPI porta 4012 (exposta via NPM na 8080),
Next.js porta 3000, dois bancos MySQL externos (GLPI DTIC e GLPI SIS).

REGRAS DESTA SESSÃO

- Nenhuma afirmação sem evidência: execute e cole o output real
- Uma ação por vez, aguardar confirmação antes do próximo passo
- Se algo falhar, colar o erro completo antes de propor fix
- Escopo: apenas B1 — não tocar em código de auth ou frontend

OBJETIVO
Validar que toda a infraestrutura está operacional e documentar o estado real.

TAREFA — execute nesta ordem exata:

1. docker compose ps
   → colar output completo
2. docker compose logs backend --tail 50
   → colar output completo
3. curl -s http://localhost:8080/health | python3 -m json.tool
   → colar output
4. curl -s http://localhost:3000 | head -5
   → colar output
5. docker compose exec backend python3 -c
   'from app.core.database import _engines; print(list(_engines.keys()))'
   → colar output
6. docker inspect glpi-universal-backend | grep -A3 'PortBindings'
   → confirmar bind em 0.0.0.0

CRITÉRIO DE CONCLUSÃO
Backend responde 200 em /health. Todos os containers em estado Up.
Ao final, gere o Relatório de Evidências do B1.

Se o Backend Estiver em CrashLoop (BUG-01)

Se o passo 2 mostrar NameError: name 'Depends' is not defined, use este prompt adicional:

CONTEXTO DO FIX — BUG-01
Arquivo: app/routers/items.py
Erro: NameError: name 'Depends' is not defined na linha 16

TAREFA:

1. cat app/routers/items.py | head -20
   → colar as primeiras 20 linhas
2. Identificar qual import está faltando (esperado: from fastapi import Depends)
3. Aplicar o fix mínimo — APENAS adicionar o import, nada mais
4. docker compose up backend --build -d
5. docker compose logs backend --tail 30
6. curl -s http://localhost:8080/health
   → confirmar 200 OK

NÃO faça nenhuma outra alteração além do import faltante.

Checklist de Evidências — B1

| # | Item                      | Comando                               | Evidência Necessária       | Obrig.            |
| - | ------------------------- | ------------------------------------- | ---------------------------- | ----------------- |
| 1 | Containers UP             | docker compose ps                     | Todos status = Up            | 🔴 SIM            |
| 2 | Backend sem CrashLoop     | docker compose logs backend --tail 50 | Application startup complete | 🔴 SIM            |
| 3 | Health endpoint           | curl localhost:8080/health            | HTTP 200 + JSON {status: ok} | 🔴 SIM            |
| 4 | Frontend responde         | curl localhost:3000                   | head -5                      | HTML com Next.js  |
| 5 | Pools de BD inicializados | python3 -c print(_engines.keys())     | ['dtic', 'sis']              | 🔴 SIM            |
| 6 | Bind correto (0.0.0.0)    | docker inspect                        | grep PortBindings            | 0.0.0.0:8080      |
| 7 | NPM roteando              | Browser → domínio configurado       | Sem 502/504                  | 🟡 SE disponível |

O que Este Bloco Desbloqueia

B2 pode ser iniciado assim que /health retornar 200

B4 pode ser iniciado assim que pools DTIC e SIS estiverem confirmados

| ⚠️  Lembre ao Antigravity se ele tentar avançar além do escopo'Esta sessão cobre apenas B1. Qualquer problema identificado em auth ou frontenddeve ser registrado no Relatório de Evidências como observação, mas não tratado agora.' |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B2 — Autenticação & Controle de Acesso

| METADADOS DA SESSÃOBloco: B2 — Autenticação & Controle de AcessoDuração estimada: 2–4h (múltiplas sub-sessões possíveis)Pré-requisito: B1 APROVADO — backend UP e pools confirmadosDesbloqueador de: B3, B6 (sidebar depende de app_access resolvido)Critério mínimo para avançar: login retorna hub_roles + app_access corretos |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Sequência Recomendada — Divida em Sub-sessões

| Sub-sessão | Objetivo                                                 | Duração | Gate de Saída                                          |
| ----------- | -------------------------------------------------------- | --------- | ------------------------------------------------------- |
| B2-A        | Diagnóstico — verificar estado real dos grupos no GLPI | 30 min    | IDs confirmados ou divergência documentada             |
| B2-B        | Criar grupos Hub-App-* no GLPI e atribuir ao usuário    | 45 min    | GET /diagnose-access retorna app_access preenchido      |
| B2-C        | Fix BUG-02 — ProfileSwitcher reset de contexto          | 45 min    | Troca de função → URL correta confirmada             |
| B2-D        | Fix BUG-03 — Auth guard no backend + middleware Next.js | 2–3h     | curl sem token → 401; /dashboard sem login → redirect |

Prompt B2-A — Diagnóstico de Grupos GLPI

CONTEXTO
Bloco B2 — sub-sessão A: Diagnóstico de grupos no GLPI.
Pré-condição: B1 aprovado, backend UP.

OBJETIVO
Confirmar o estado real dos grupos no GLPI antes de qualquer criação ou fix.

TAREFA — execute nesta ordem:

1. curl -s 'http://localhost:8080/api/v1/dtic/auth/diagnose-access?username=jonathan-moletta'
   → colar o JSON completo retornado
2. Analisar os campos: user_id, profiles, groups, hub_roles, app_access
   → listar explicitamente o que está presente e o que está ausente
3. Executar SQL direto no BD DTIC para confirmar grupos existentes:
   docker compose exec dtic-db mysql -u root -p${DB_PASS} glpi
   -e 'SELECT id, name FROM glpi_groups WHERE name LIKE "CC%" OR name LIKE "Hub%";'
   → colar o resultado completo
4. Confirmar IDs reais dos grupos CC-MANUTENCAO e CC-CONSERVACAO:
   -e 'SELECT id, name FROM glpi_groups WHERE name LIKE "CC-M%" OR name LIKE "CC-C%";'
   → colar resultado e comparar com contexts.yaml (esperado: 22 e 21)

CRITÉRIO DE CONCLUSÃO
Documento claro com: IDs reais confirmados, grupos Hub-App-* existentes ou ausentes,
campos hub_roles e app_access no diagnose-access.
Gerar Relatório de Evidências B2-A antes de encerrar.

Prompt B2-B — Criação dos Grupos Hub-App-*

CONTEXTO
Bloco B2 — sub-sessão B: Criação dos grupos Hub-App-* no GLPI.
Pré-condição: B2-A concluído. Evidências do diagnóstico em mãos.

SITUAÇÃO CONHECIDA
Os grupos Hub-App-busca, Hub-App-permissoes, Hub-App-carregadores
NÃO existem no GLPI. Sem eles, todos os módulos com requireApp ficam invisíveis.

TAREFA:

1. Via API REST do GLPI, criar os grupos (ou via interface admin — documentar qual método):
   POST /apirest.php/Group com {name: 'Hub-App-busca'}
   POST /apirest.php/Group com {name: 'Hub-App-permissoes'}
   POST /apirest.php/Group com {name: 'Hub-App-carregadores'}
   → colar o ID retornado de cada criação
2. Atribuir o usuário jonathan-moletta aos grupos criados:
   POST /apirest.php/Group_User com {groups_id: X, users_id: Y}
   → colar confirmação
3. Reexecutar diagnose-access:
   curl 'localhost:8080/api/v1/dtic/auth/diagnose-access?username=jonathan-moletta'
   → confirmar que app_access agora contém ['busca', 'permissoes', 'carregadores']
4. Se IDs de CC-MANUTENCAO/CONSERVACAO divergirem de 22/21:
   → atualizar contexts.yaml com os IDs reais
   → docker compose restart backend
   → reexecutar diagnose-access e confirmar hub_roles

CRITÉRIO DE CONCLUSÃO
GET /diagnose-access retorna:
  hub_roles: ['gestor']  (para jonathan-moletta como gestor)
  app_access: ['busca', 'permissoes', 'carregadores']

Prompt B2-C — Fix BUG-02 (ProfileSwitcher)

CONTEXTO
Bloco B2 — sub-sessão C: Fix do BUG-02 no ProfileSwitcher.
Arquivo: web/src/components/auth/ProfileSwitcher.tsx linha 63

BUG DOCUMENTADO
Código atual:
  const targetContext = hubRole.context_override || activeContext;
Problema: gestor SIS tem context_override=null → herda activeContext residual
Sintoma: badge mostra role correta mas URL/dados são do contexto anterior

TAREFA:

1. cat web/src/components/auth/ProfileSwitcher.tsx | head -80
   → colar as primeiras 80 linhas para confirmar o código atual
2. Confirmar a linha exata do bug (esperado: linha ~63)
3. Aplicar FIX — opção escolhida (escolha UMA e justifique):
   OPÇÃO A (frontend): activeContext.split('-')[0] como fallback
   const targetContext = hubRole.context_override || activeContext.split('-')[0];
   OPÇÃO B (backend): adicionar context_override explícito no _SIS_PROFILE_MAP
   3: {'role': 'gestor', 'context': 'sis', 'context_override': 'sis'}
4. Após aplicar o fix, descrever o teste manual a realizar:
   - Login como gestor SIS
   - Trocar para 'Conservação e Memória' (sis-memoria)
   - Trocar de volta para 'Gestão Estratégica'
   - Verificar: URL deve ser /sis/dashboard
   - Verificar: dados exibidos são de TODOS os tickets SIS (não apenas conservação)
5. Executar o teste e colar: URL atual após a troca + screenshot do network tab

CRITÉRIO DE CONCLUSÃO
Após troca de volta para Gestor SIS: URL = /sis/dashboard, dados = todos SIS.
NÃO fazer nenhuma outra alteração além da linha 63.

Prompt B2-D — Fix BUG-03 (Auth Guard)

CONTEXTO
Bloco B2 — sub-sessão D: Implementar proteção real de autenticação.
BUG-03: dados reais acessíveis sem autenticação.

DOIS FIXES INDEPENDENTES — faça um por vez:

FIX 1 — Backend: auth guard nos routers FastAPI

1. cat app/routers/db_read.py | head -30
   → confirmar se Depends(verify_session) está presente nos routers de dados
2. cat app/core/auth_middleware.py (ou similar)
   → verificar se verify_session/verify_user_token existe
3. Se não existir guard: criar função verify_user_token em app/core/security.py
4. Adicionar Depends(verify_user_token) em TODOS os routers que retornam dados
   (db_read.py, stats routers, analytics routers)
5. TESTAR: curl -s http://localhost:8080/api/v1/sis/db/tickets
   → deve retornar 401 ou 403, NÃO dados
   → colar o output

FIX 2 — Frontend: middleware Next.js
6. ls web/src/middleware.ts 2>&1
   → confirmar se existe (provavelmente não)
7. Criar web/src/middleware.ts com proteção de rotas [context]/*:

- Ler cookie/header de sessão
- Se ausente: redirect para /?session_expired=1
- Configurar matcher para excluir /_next, /favicon, /api/auth

8. TESTAR: abrir /sis/dashboard em aba anônima (sem cookies)
   → deve redirecionar para / imediatamente
   → colar o Network waterfall (status 307/308 → 200 no login)

CRITÉRIO DE CONCLUSÃO
curl sem token → 401 no backend
Browser sem login → redirect para / no frontend
Ambos testados e evidências coladas.

Checklist Consolidada — B2

| Sub | #  | Item                                       | Evidência Mínima                   | Obrig. |
| --- | -- | ------------------------------------------ | ------------------------------------ | ------ |
| A   | 1  | diagnose-access retorna JSON               | JSON completo colado                 | 🔴     |
| A   | 2  | IDs CC-MANUTENCAO/CONSERVACAO confirmados  | IDs reais documentados               | 🔴     |
| A   | 3  | Estado atual do app_access documentado     | Lista de grupos presentes/ausentes   | 🔴     |
| B   | 4  | Grupos Hub-App-* criados no GLPI           | ID retornado de cada POST            | 🔴     |
| B   | 5  | Usuário atribuído aos grupos             | Confirmação da atribuição        | 🔴     |
| B   | 6  | diagnose-access retorna app_access correto | JSON com app_access preenchido       | 🔴     |
| C   | 7  | Fix BUG-02 aplicado                        | Diff do arquivo colado               | 🔴     |
| C   | 8  | ProfileSwitcher testado manualmente        | URL correta após troca documentada  | 🔴     |
| D   | 9  | Auth guard backend ativo                   | curl sem token → 401 colado         | 🔴     |
| D   | 10 | Middleware Next.js criado e testado        | Redirect em aba anônima documentado | 🔴     |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B3 — Arquitetura Multi-Contexto

| METADADOS DA SESSÃOBloco: B3 — Arquitetura Multi-Contexto (ContextRegistry + Feature Manifests)Duração estimada: 3–5hPré-requisito: B2 APROVADO — auth funcionando, grupos Hub-App-* criadosDesbloqueador de: B6 (sidebar usa manifests), B4 (contexts.yaml lido pelo backend)Critério mínimo: contexts.yaml carregado + sidebar renderiza por role corretamente |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Prompt B3-A — Auditoria do Estado Atual

CONTEXTO
Bloco B3 — sub-sessão A: Auditoria do ContextRegistry e Feature Manifests atuais.
Pré-condição: B2 aprovado.

OBJETIVO
Mapear o que já existe antes de qualquer refatoração.

TAREFA — APENAS LEITURA, sem alterar nada:

1. cat app/config/contexts.yaml (ou find . -name contexts.yaml)
   → colar o conteúdo completo
2. find . -name 'context-registry.ts' | xargs cat
   → colar o conteúdo
3. grep -r 'context_override\|profile_map\|group_map' app/services/auth_service.py
   → colar todas as ocorrências
4. grep -r 'requireApp\|requireRole\|CONTEXT_MANIFESTS' web/src/ --include='*.ts' -l
   → listar todos os arquivos que usam esses termos
5. cat web/src/app/[context]/layout.tsx
   → colar o conteúdo

ANÁLISE ESPERADA AO FINAL:

- O que já está declarativo vs. o que ainda está hardcoded em if/elif
- Quais contextos estão no YAML vs. quais estão só no código Python
- Quais features já têm requireApp vs. quais não têm

NÃO alterar nada. Output: lista de gaps entre o estado atual e o desejado.

Prompt B3-B — Implementação/Completar ContextRegistry

CONTEXTO
Bloco B3 — sub-sessão B: Completar o ContextRegistry.
Pré-condição: B3-A concluído, gaps mapeados.

BASE DO contexts.yaml ESPERADO (completar se incompleto):

contexts:
  dtic:
    display_name: 'DTIC — TI Corporativa'
    db_pool: dtic
    profile_map:
      3: {role: gestor, context_override: dtic}
      4: {role: tecnico, context_override: dtic}
      6: {role: solicitante, context_override: dtic}
    features: [dashboard, smart-search, permissoes]
  sis:
    display_name: 'SIS — Gestão Estratégica'
    db_pool: sis
    profile_map:
      3: {role: gestor, context_override: sis}
    features: [dashboard, smart-search, permissoes]
  sis-manutencao:
    display_name: 'SIS — Manutenção'
    db_pool: sis
    group_map:
      22: {role: tecnico-manutencao, context_override: sis-manutencao}
    features: [dashboard]
  sis-memoria:
    display_name: 'SIS — Conservação e Memória'
    db_pool: sis
    group_map:
      21: {role: tecnico-conservacao, context_override: sis-memoria}
    features: [dashboard, carregadores]

TAREFA:

1. Comparar o YAML acima com o contexts.yaml atual (do B3-A)
2. Identificar diferenças — colar diff
3. Aplicar apenas as diferenças necessárias
4. docker compose restart backend
5. GET /api/v1/dtic/health — confirmar contexts listados
6. GET /diagnose-access?username=jonathan-moletta — confirmar hub_roles

CRITÉRIO: health endpoint lista todos os 4 contextos.

Prompt B3-C — Validação Visual da Sidebar

CONTEXTO
Bloco B3 — sub-sessão C: Validação visual do Feature Manifest na sidebar.

CENÁRIOS A TESTAR (execute cada um e documente o resultado):

CENÁRIO 1 — Gestor DTIC (jonathan-moletta):
  Login → selecionar contexto DTIC
  Esperado na sidebar: Dashboard, Smart Search, Gestão de Acessos
  NÃO esperado: Carregadores
  → Colar lista de itens visíveis na sidebar

CENÁRIO 2 — Gestor SIS:
  Login → selecionar SIS Gestão Estratégica
  Esperado: Dashboard, Smart Search, Gestão de Acessos
  → Colar lista de itens visíveis

CENÁRIO 3 — Técnico Manutenção SIS:
  Login conta com grupo CC-MANUTENCAO
  Esperado: apenas Dashboard
  → Colar lista de itens visíveis

CENÁRIO 4 — Solicitante:
  Login conta solicitante
  Esperado: apenas itens básicos sem requireRole/requireApp
  → Colar lista de itens visíveis

CENÁRIO 5 — Acesso direto sem permissão:
  Logar como solicitante e acessar /dtic/permissoes diretamente pela URL
  Esperado: redirect ou página de Acesso Negado
  → Colar URL final e conteúdo da página

CRITÉRIO: todos os 5 cenários com resultado documentado.

Checklist Consolidada — B3

| # | Item                                       | Evidência Mínima                              | Obrig. |
| - | ------------------------------------------ | ----------------------------------------------- | ------ |
| 1 | contexts.yaml auditado e gaps documentados | Lista de gaps colada (B3-A)                     | 🔴     |
| 2 | YAML completo com 4 contextos              | cat contexts.yaml colado após edição         | 🔴     |
| 3 | Backend lê YAML corretamente              | GET /health lista os 4 contextos                | 🔴     |
| 4 | Cenário Gestor DTIC — sidebar correta    | Lista de itens visíveis colada                 | 🔴     |
| 5 | Cenário Gestor SIS — sidebar correta     | Lista de itens visíveis colada                 | 🔴     |
| 6 | Cenário Solicitante — sidebar restrita   | Lista de itens colada (sem módulos avançados) | 🔴     |
| 7 | Acesso direto negado funciona              | URL/conteúdo da página de negação colados   | 🟡     |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B4 — Backend FastAPI — Rotas e Serviços

| METADADOS DA SESSÃOBloco: B4 — Backend FastAPI (rotas, serviços, CQRS)Duração estimada: 1–2hPré-requisito: B1 APROVADO (backend UP), B3 recomendado (contexts.yaml correto)Desbloqueador de: B5 (queries dependem das rotas), B7 (analytics usa esses endpoints)Critério mínimo: /aggregate e /stats respondendo com dados reais dos dois contextos |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

Prompt B4-A — Auditoria de Imports e Routers

CONTEXTO
Bloco B4 — sub-sessão A: Auditoria de imports e registro de routers.
Foco: garantir que todos os routers estão registrados e sem imports faltando.

TAREFA:

1. cat app/main.py
   → colar conteúdo completo
2. Para cada router listado no main.py, verificar imports:
   grep -n 'from fastapi import' app/routers/*.py
   → listar quais arquivos têm Depends, HTTPException, Request
3. grep -rn 'APIRouter' app/routers/ | grep -v '#'
   → listar todos os routers declarados
4. curl -s http://localhost:8080/openapi.json | python3 -c
   'import json,sys; d=json.load(sys.stdin); print(list(d["paths"].keys()))'
   → colar lista completa de rotas registradas
5. Identificar qualquer rota que deveria existir mas não aparece no openapi.json

CRITÉRIO: todas as rotas esperadas (tickets, aggregate, stats, analytics, auth)
aparecem no openapi.json sem erros.

Prompt B4-B — Validação dos Endpoints Principais

CONTEXTO
Bloco B4 — sub-sessão B: Validação funcional dos endpoints principais.
Pré-condição: B4-A aprovado, routers todos registrados.
Use um token válido obtido pelo login: TOKEN=$(curl -s -X POST localhost:8080/auth/login
-H 'Content-Type: application/json'
-d '{"username":"SEU_USER","password":"SUA_SENHA"}' | python3 -c
'import json,sys; print(json.load(sys.stdin)["token"])')

TAREFA — testar cada endpoint com o token:

1. curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/db/aggregate?table=glpi_tickets&group_by=status'
   → colar response (deve ser array com contagens por status)
2. curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/sis/db/aggregate?table=glpi_tickets&group_by=status'
   → colar response (dados do SIS)
3. curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/stats'
   → colar response (cards de totais: new, in_progress, pending, resolved, closed)
4. curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/db/tickets?limit=5&offset=0'
   → colar os 5 primeiros tickets (confirmar paginação funcional)
5. curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/metrics/v1/inconsistencies'
   → colar response (array de regras R01-Q2 com counts)

CRITÉRIO: todos os 5 endpoints retornam 200 com dados reais.

Checklist Consolidada — B4

| # | Item                                  | Evidência Mínima                     | Obrig. |
| - | ------------------------------------- | -------------------------------------- | ------ |
| 1 | Todos os imports corretos em routers/ | grep output colado — Depends presente | 🔴     |
| 2 | Rotas registradas no openapi.json     | Lista de paths colada                  | 🔴     |
| 3 | /aggregate DTIC funcional             | Response JSON com dados reais          | 🔴     |
| 4 | /aggregate SIS funcional              | Response JSON com dados SIS            | 🔴     |
| 5 | /stats retorna cards corretos         | JSON com new, in_progress, pending...  | 🔴     |
| 6 | /tickets paginação funcional        | 5 tickets com limit/offset             | 🟡     |
| 7 | /inconsistencies retorna regras       | Array com pelo menos R01 e Q2          | 🔴     |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B5 — Banco de Dados GLPI — Schema e Queries

| METADADOS DA SESSÃOBloco: B5 — Schema GLPI, Queries e Filtros de DepartamentoDuração estimada: 1–2hPré-requisito: B4 APROVADO — pools de BD confirmadosDesbloqueador de: B7 (analytics queries dependem deste mapeamento)Critério mínimo: filtros DTIC e SIS (Manutenção vs. Conservação) validados com contagens |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

Prompt B5-A — Validação do Schema e Contagens

CONTEXTO
Bloco B5 — Validação do schema GLPI e das queries de filtro departamental.

TAREFA:

1. Contagem geral por status (DTIC):
   docker compose exec dtic-db mysql -u root -p glpi -e
   'SELECT status, COUNT(*) as total FROM glpi_tickets
   WHERE entities_id != 0 AND is_deleted = 0 GROUP BY status ORDER BY status;'
   → colar resultado completo
2. Confirmar filter de Manutenção SIS (group_id=22):
   docker compose exec sis-db mysql -u root -p glpi -e
   'SELECT COUNT(*) as manutencao FROM glpi_tickets t
   WHERE t.entities_id != 0 AND t.is_deleted = 0
   AND t.id IN (SELECT tickets_id FROM glpi_groups_tickets WHERE groups_id = 22);'
   → colar resultado
3. Confirmar filter de Conservação SIS (group_id=21):
   (mesmo query com groups_id = 21)
   → colar resultado
4. Verificar que os dois filtros NÃO se sobrepõem:
   'SELECT COUNT(*) FROM glpi_tickets t
   WHERE t.id IN (SELECT tickets_id FROM glpi_groups_tickets WHERE groups_id IN (21,22))
   GROUP BY (SELECT groups_id FROM glpi_groups_tickets
   WHERE tickets_id = t.id LIMIT 1);'
   → confirmar que um ticket não aparece nos dois filtros
5. Validar regra R01 (triagem vencida):
   'SELECT COUNT(*) FROM glpi_tickets
   WHERE status = 1 AND date < NOW() - INTERVAL 2 HOUR
   AND is_deleted = 0;'
   → colar contagem (quantos tickets em triagem vencida agora)
6. Validar regra Q2 (zumbis > 15 dias sem atualização):
   'SELECT COUNT(*) FROM glpi_tickets
   WHERE status IN (1,2,3,4) AND date_mod < NOW() - INTERVAL 15 DAY
   AND is_deleted = 0;'
   → colar contagem

CRITÉRIO: todas as queries retornam sem erro, filtros DTIC e SIS isolados confirmados.

Checklist Consolidada — B5

| # | Item                                | Evidência Mínima                         | Obrig. |
| - | ----------------------------------- | ------------------------------------------ | ------ |
| 1 | Contagem por status DTIC            | Tabela status → total colada              | 🔴     |
| 2 | Filtro Manutenção (22) funcional  | Contagem isolada do grupo 22               | 🔴     |
| 3 | Filtro Conservação (21) funcional | Contagem isolada do grupo 21               | 🔴     |
| 4 | Filtros não se sobrepõem          | Confirmação de isolamento colada         | 🔴     |
| 5 | Regra R01 conta tickets reais       | Número de triagens vencidas agora         | 🟡     |
| 6 | Regra Q2 conta zumbis reais         | Número de tickets sem atualização > 15d | 🟡     |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B6 — Frontend Next.js — Estado e Componentes

| METADADOS DA SESSÃOBloco: B6 — Frontend Next.js (Zustand, sidebar, proteção de rotas)Duração estimada: 2–3hPré-requisito: B2 APROVADO (auth OK), B3 APROVADO (manifests corretos)Desbloqueador de: B7 (componentes de dashboard consomem endpoints)Critério mínimo: sidebar correta por role + middleware Next.js ativo |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Prompt B6-A — Auditoria do Estado Zustand

CONTEXTO
Bloco B6 — sub-sessão A: Auditoria do useAuthStore e persistência.

TAREFA — APENAS LEITURA:

1. cat web/src/store/useAuthStore.ts
   → colar conteúdo completo
2. Identificar:
   a) Campos que estão sendo persistidos no localStorage
   (procurar: persist, partialize, storage)
   b) Se isAuthenticated está na lista de campos persistidos
   c) Se _credentials (username/password) está persistido
   d) Se app_access: string[] existe na interface
3. grep -n 'isAuthenticated\|app_access\|_credentials' web/src/store/useAuthStore.ts
   → colar todas as linhas relevantes
4. grep -rn 'isAuthenticated' web/src/ --include='*.tsx' --include='*.ts' | head -20
   → listar onde isAuthenticated é consumido no frontend

ANÁLISE ESPERADA:

- isAuthenticated NÃO deveria estar persistido (vulnerabilidade BUG-03)
- app_access deveria estar no store (necessário para resolveMenuItems)
- _credentials NÃO deveria estar persistido (XSS risk)

Prompt B6-B — Correção da Persistência e Testes Visuais

CONTEXTO
Bloco B6 — sub-sessão B: Corrigir persistência indevida e validar sidebar.
Pré-condição: B6-A concluído, gaps identificados.

FIX 1 — Remover isAuthenticated da persistência:

1. Localizar o partialize do persist no useAuthStore.ts
2. Remover isAuthenticated da lista de campos persistidos
   (manter apenas: user, hub_roles, app_access, activeContext — não _credentials)
3. Rebuildar: cd web && npm run build | tail -20
   → confirmar sem erros de compilação

FIX 2 — Adicionar app_access ao store (se ausente):
4. Se app_access não existir na interface, adicionar:
   app_access: string[]  e inicializar como []
5. Garantir que o login popula app_access a partir da response do backend

VALIDAÇÃO VISUAL — Teste de Sidebar (6 cenários):
6. Login como jonathan-moletta → DTIC → listar itens sidebar exibidos
7. Login → SIS Gestão → listar itens
8. Sem login → acessar /sis/dashboard → confirmar redirect
9. Com login → acessar /sis/permissoes sem Hub-App-permissoes → confirmar bloqueio
10. Trocar de função SIS → Conservação → voltar → confirmar URL correta
11. Abrir DevTools → Application → Local Storage → confirmar isAuthenticated AUSENTE

Para cada cenário: colar o resultado observado.

Checklist Consolidada — B6

| # | Item                                      | Evidência Mínima                        | Obrig. |
| - | ----------------------------------------- | ----------------------------------------- | ------ |
| 1 | isAuthenticated NÃO persistido           | DevTools LocalStorage sem isAuthenticated | 🔴     |
| 2 | _credentials NÃO persistido              | DevTools LocalStorage sem _credentials    | 🟡     |
| 3 | app_access no store e populado pelo login | DevTools → state Zustand com app_access  | 🔴     |
| 4 | Sidebar Gestor DTIC correta               | Lista de itens colada (3 itens esperados) | 🔴     |
| 5 | Sidebar Gestor SIS correta                | Lista de itens colada                     | 🔴     |
| 6 | Redirect sem login ativo                  | Aba anônima → / confirmado              | 🔴     |
| 7 | Módulo bloqueado sem permissão          | URL /permissoes sem acesso → bloqueado   | 🔴     |
| 8 | ProfileSwitcher URL correta               | Troca de função → URL final correta    | 🔴     |
| 9 | Build sem erros                           | npm run build output colado               | 🟡     |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B7 — Motor Analítico — Dashboards e KPIs

| METADADOS DA SESSÃOBloco: B7 — Motor Analítico (métricas, tendências, heatmap, inconsistências)Duração estimada: 1–2hPré-requisito: B4 e B5 APROVADOS — endpoints e queries validadosDesbloqueador de: nenhum (bloco folha no grafo de dependências)Critério mínimo: todos os 6 endpoints de dashboard retornam dados reais |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Prompt B7 — Validação Completa do Motor Analítico

CONTEXTO
Bloco B7 — Validação do motor analítico completo.
Token: TOKEN=[use o token obtido em B4-B]

TAREFA — execute cada endpoint e cole o response:

1. CARDS DE TOTAIS (DTIC):
   curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/stats'
   → confirmar campos: new, in_progress, pending, resolved, closed
   → colar valores reais
2. SÉRIE TEMPORAL — 14 dias (DTIC):
   curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/analytics/dashboard-trends?days=14'
   → confirmar 14 objetos com {date, total_created, resolved}
   → colar os primeiros 3 e os últimos 3 objetos do array
3. TOP 5 CATEGORIAS (DTIC):
   curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/db/aggregate?table=glpi_tickets&group_by=itilcategories_id&limit=5'
   → colar o array completo (5 itens)
4. INCONSISTÊNCIAS (DTIC):
   curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/metrics/v1/inconsistencies'
   → colar o array de regras com counts
   → confirmar que R01 e Q2 aparecem (podem ter count=0 se dados limpos)
5. SLA RISK (DTIC):
   curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/metrics/v1/sla-risk'
   → colar lista de tickets em risco (Crítico ou Atenção)
6. HEATMAP (DTIC):
   curl -s -H 'Authorization: Bearer $TOKEN'
   'localhost:8080/api/v1/dtic/metrics/v1/heatmap'
   → confirmar estrutura: matriz dia×hora com valores numéricos
   → colar primeiras 3 linhas do response
7. VALIDAÇÃO CRUZADA — comparar cards vs. série temporal:
   O total_resolved dos últimos 7 dias na série
   deve ser <= o campo resolved dos cards.
   Calcular e documentar a comparação.

CRITÉRIO: todos os 6 endpoints retornam 200 com estrutura correta.
Inconsistência entre endpoints deve ser documentada como gap.

Checklist Consolidada — B7

| # | Item                                 | Evidência Mínima                                   | Obrig. |
| - | ------------------------------------ | ---------------------------------------------------- | ------ |
| 1 | /stats retorna campos corretos       | JSON com new/in_progress/pending/resolved/closed     | 🔴     |
| 2 | /dashboard-trends retorna 14 pontos  | Primeiros e últimos 3 objetos colados               | 🔴     |
| 3 | /aggregate top 5 categorias          | Array de 5 com itilcategories_id + count             | 🔴     |
| 4 | /inconsistencies retorna regras      | Array com pelo menos R01 e Q2                        | 🔴     |
| 5 | /sla-risk retorna tickets em risco   | Lista com tag Crítico ou Atenção (pode ser vazia) | 🟡     |
| 6 | /heatmap retorna matriz dia×hora    | Estrutura confirmada, primeiras linhas coladas       | 🟡     |
| 7 | Validação cruzada cards vs. série | Comparação documentada sem contradição           | 🟡     |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

B8 — Qualidade & Testes

| METADADOS DA SESSÃOBloco: B8 — Qualidade (testes, cobertura, gestão de bugs)Duração estimada: 4–6h (é o bloco mais longo)Pré-requisito: B2 APROVADO — fluxo de auth estável para escrever testesEste bloco é revisado em PARALELO com os outros, não apenas ao finalCritério mínimo: testes P1 criados e passando para resolve_hub_roles e ProfileSwitcher |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

Prompt B8-A — Auditoria de Cobertura Atual

CONTEXTO
Bloco B8 — sub-sessão A: Auditoria de testes existentes.

TAREFA — APENAS LEITURA:

1. find . -name 'test_*.py' -o -name '*_test.py' | head -20
   → listar todos os arquivos de teste Python
2. find . -name '*.test.ts' -o -name '*.spec.ts' | head -20
   → listar todos os arquivos de teste TypeScript
3. Para cada arquivo encontrado: cat [arquivo]
   → colar o conteúdo
4. Identificar:
   - Quais funções do auth_service.py têm testes
   - Quais componentes React têm testes
   - Total de testes existentes
5. Calcular cobertura atual do auth flow:
   cd app && python -m pytest --co -q 2>&1 | head -30
   → colar output

ANÁLISE ESPERADA: documento honesto de cobertura real.
Não estimar — contar os testes que existem de fato.

Prompt B8-B — Criar Testes P1 (auth_service)

CONTEXTO
Bloco B8 — sub-sessão B: Criar testes prioritários para auth_service.py.
Pré-condição: B8-A concluído, auth_service.py estável (B2 aprovado).

FUNÇÃO 1 — resolve_hub_roles():
Criar app/tests/test_auth_service.py com os seguintes cenários:

CENÁRIO A: Usuário com profile_id=3 no DTIC → deve retornar role='gestor', context='dtic'
CENÁRIO B: Usuário com group_id=22 no SIS → deve retornar role='tecnico-manutencao'
CENÁRIO C: Usuário com group_id=21 no SIS → deve retornar role='tecnico-conservacao'
CENÁRIO D: Usuário sem profile e sem grupo conhecido → deve retornar role='solicitante'
CENÁRIO E: Usuário com profile_id=3 + group_id=22 (gestor com grupo) → gestor tem precedência

FUNÇÃO 2 — resolve_app_access():
CENÁRIO F: Usuário com grupo 'Hub-App-busca' → app_access=['busca']
CENÁRIO G: Usuário com múltiplos Hub-App-* → app_access com todos
CENÁRIO H: Usuário sem grupos Hub-App-* → app_access=[]

Para cada cenário:

1. Criar o teste com mock do client GLPI
2. Executar: python -m pytest app/tests/test_auth_service.py -v
3. Colar o output completo do pytest
4. Todos os 8 cenários devem passar (verde)

CRITÉRIO: 8/8 testes passando. Output pytest colado.

Prompt B8-C — Criar Testes P1 (Frontend)

CONTEXTO
Bloco B8 — sub-sessão C: Testes do ProfileSwitcher e middleware.

TESTE 1 — ProfileSwitcher (correção BUG-02):
Criar web/src/components/auth/__tests__/ProfileSwitcher.test.tsx

CENÁRIO A — Troca gestor → conservacao → gestor:
  Estado inicial: activeContext='sis', role='gestor'
  Ação 1: selecionar role com context_override='sis-memoria'
  Estado esperado: activeContext='sis-memoria'
  Ação 2: selecionar role com context_override=null
  Estado esperado: activeContext='sis' (NÃO 'sis-memoria')
  → router.push deve ser chamado com '/sis/dashboard'

CENÁRIO B — Troca direto entre contextos diferentes:
  DTIC gestor → SIS gestor → URL deve ser /sis/dashboard

TESTE 2 — Proteção de rota (middleware):
  (se middleware.ts foi criado em B2-D)
  Testar que requisição sem cookie é redirecionada
  Testar que requisição com cookie válido passa

Executar: cd web && npx jest --testPathPattern=ProfileSwitcher -v
→ colar output completo

CRITÉRIO: todos os cenários passando. Output jest colado.

Dashboard de Bugs — Estado Atual

Use este dashboard para atualizar o status dos bugs a cada sessão de B8:

| ID     | Descrição                             | Bloco | Severidade  | Status    | Sessão que Fechou |
| ------ | --------------------------------------- | ----- | ----------- | --------- | ------------------ |
| BUG-01 | NameError Depends em items.py           | B1    | 🔴 CRÍTICA | ⬜ Aberto | —                 |
| BUG-02 | ProfileSwitcher L63 contexto            | B2    | 🔴 CRÍTICA | ⬜ Aberto | —                 |
| BUG-03 | Dados sem autenticação                | B2    | 🔴 CRÍTICA | ⬜ Aberto | —                 |
| GAP-01 | Grupos Hub-App-* ausentes GLPI          | B2    | 🔴 CRÍTICA | ⬜ Aberto | —                 |
| GAP-02 | IDs grupos SIS não verificados         | B2    | 🟡 ALTA     | ⬜ Aberto | —                 |
| GAP-03 | glpigroups formato não validado        | B2    | 🟡 ALTA     | ⬜ Aberto | —                 |
| GAP-04 | DTIC sem group_map no YAML              | B3    | 🟢 BAIXA    | ⬜ Aberto | —                 |
| GAP-05 | isAuthenticated persistido              | B6    | 🟡 ALTA     | ⬜ Aberto | —                 |
| GAP-06 | _credentials em memória Zustand        | B6    | 🟡 ALTA     | ⬜ Aberto | —                 |
| GAP-07 | middleware.ts inexistente               | B6    | 🔴 CRÍTICA | ⬜ Aberto | —                 |
| GAP-08 | Dashboards legados — tech desconhecida | B7    | 🟡 ALTA     | ⬜ Aberto | —                 |
| GAP-09 | Zero testes no auth flow                | B8    | 🔴 CRÍTICA | ⬜ Aberto | —                 |

| Instrução de uso do Dashboard de BugsAo final de cada sessão, atualize o Status e preencha a coluna 'Sessão que Fechou'.Copie este dashboard atualizado para o Relatório de Evidências do bloco correspondente.Um bug só pode ser marcado como fechado quando a evidência (output real) estiver colada.Use: ✅ Fechado | 🔄 Em progresso | ⬜ Aberto | ⏭️ Adiado |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Uso interno — confidencial	Página

Hub DTIC & SIS  |  Protocolo Operacional Antigravity  —  v1.0  |  Março 2026

Parte 3 — Fluxo de Controle Entre Sessões

Grafo de Dependências — Ordem Obrigatória

| Bloco | Pode iniciar quando...          | Bloqueia se...                      | Paralelizável com |
| ----- | ------------------------------- | ----------------------------------- | ------------------ |
| B1    | Sempre (é o primeiro)          | Containers não sobem               | —                 |
| B2    | B1 APROVADO                     | Backend não responde /health       | —                 |
| B3    | B2-B aprovado (grupos criados)  | app_access sempre vazio             | B4                 |
| B4    | B1 APROVADO                     | CrashLoop ativo                     | B3                 |
| B5    | B4 APROVADO (pools confirmados) | Pools de BD não inicializam        | —                 |
| B6    | B2 APROVADO + B3 APROVADO       | Auth não retorna app_access        | B7                 |
| B7    | B4 APROVADO + B5 APROVADO       | Endpoints não respondem            | B6                 |
| B8    | B2 APROVADO (mínimo)           | Auth instável para escrever testes | Todos (contínuo)  |

Template de Handoff Entre Sessões

Use este template ao encerrar uma sessão para iniciar a próxima com contexto completo:

HANDOFF — [BLOCO ANTERIOR] → [PRÓXIMO BLOCO]
Data: [YYYY-MM-DD]

ESTADO CONFIRMADO DO BLOCO ANTERIOR:

- [Item 1]: ✅ CONFIRMADO — [evidência resumida]
- [Item 2]: ✅ CONFIRMADO — [evidência resumida]
- [Item 3]: ⚠️ BLOQUEADO — [motivo]

O PRÓXIMO BLOCO PODE ASSUMIR COMO VERDADEIRO:

- [Fato 1 confirmado]
- [Fato 2 confirmado]

ATENÇÃO — O PRÓXIMO BLOCO NÃO PODE ASSUMIR:

- [Item bloqueado 1] — requer verificação

BUGS ABERTOS QUE IMPACTAM O PRÓXIMO BLOCO:

- [GAP-ID]: [descrição] — [impacto no próximo bloco]

CONFIGURAÇÕES CONFIRMADAS:

- Backend URL: localhost:8080
- Contextos: dtic, sis, sis-manutencao, sis-memoria
- IDs grupos SIS: CC-MANUTENCAO=[ID_REAL], CC-CONSERVACAO=[ID_REAL]

Quando Interromper e Reavaliar

| 🛑 PARE e reavalie se o Antigravity:→ Declarar que algo 'funciona' sem executar e colar o output→ Tentar resolver mais de um problema ao mesmo tempo→ Propor refatorações fora do escopo do bloco atual→ Repetir o mesmo fix que já falhou sem novo diagnóstico→ Usar linguagem ambígua como 'provavelmente', 'deve estar', 'normalmente'→ Pular um item da checklist sem justificativa explícitaNesses casos: interrompa com:'PARE. Você afirmou [X] sem evidência. Execute [comando Y] e cole o output antes de continuar.' |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

Progresso Geral — Tracker de Blocos

| Bloco | Nome                  | Status       | Data Início | Data Conclusão | Evidências em           |
| ----- | --------------------- | ------------ | ------------ | --------------- | ------------------------ |
| B1    | Infra & Deploy        | ⬜ Pendente  | —           | —              | docs/evidencias/B1_*.md  |
| B2-A  | Auth — Diagnóstico  | ⬜ Pendente  | —           | —              | docs/evidencias/B2A_*.md |
| B2-B  | Auth — Grupos GLPI   | ⬜ Pendente  | —           | —              | docs/evidencias/B2B_*.md |
| B2-C  | Auth — BUG-02 fix    | ⬜ Pendente  | —           | —              | docs/evidencias/B2C_*.md |
| B2-D  | Auth — BUG-03 fix    | ⬜ Pendente  | —           | —              | docs/evidencias/B2D_*.md |
| B3    | Arquitetura Multi-Ctx | ⬜ Pendente  | —           | —              | docs/evidencias/B3_*.md  |
| B4    | Backend FastAPI       | ⬜ Pendente  | —           | —              | docs/evidencias/B4_*.md  |
| B5    | GLPI Schema & Queries | ⬜ Pendente  | —           | —              | docs/evidencias/B5_*.md  |
| B6    | Frontend Next.js      | ⬜ Pendente  | —           | —              | docs/evidencias/B6_*.md  |
| B7    | Motor Analítico      | ⬜ Pendente  | —           | —              | docs/evidencias/B7_*.md  |
| B8    | Qualidade & Testes    | ⬜ Contínuo | —           | —              | docs/evidencias/B8_*.md  |

Uso interno — confidencial	Página
