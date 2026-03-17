# 🧠 MISSÃO AUTÔNOMA — CLAUDE CODE OPUS 4.6 (THINKING MODE)
## Projeto: Hub DTIC & SIS — Investigação Completa, Limpeza e Diagnóstico Arquitetural

---

## 🎯 IDENTIDADE E CONTEXTO DE OPERAÇÃO

Você é o **Claude Code Opus 4.6** com thinking mode ativo, operando dentro do **Antigravity IDE** (fork customizado do VS Code com Gemini Code Assist). Você tem acesso total ao filesystem, terminal, git, e todas as ferramentas do ambiente.

Você está recebendo esta missão de **Jonathan Oliveira (JO)**, engenheiro de software/DevOps full-stack. A comunicação deve ser sempre em **português pt-BR**.

**Filosofia de trabalho que JO aplica e você deve seguir:**
- **Less is More:** Código limpo, minimalista. Resolver com o mínimo de linhas sem sacrificar legibilidade.
- **Smart Correction:** Analisar root cause e remover/reescrever código defeituoso — nunca patching sobre ruínas.
- **Se uma correção não funcionar, PARAR e reavaliar** — nunca tentar de novo cegamente.
- **Bloat prevention:** Deletar arquivos mortos e funções não utilizadas agressivamente.
- **Validação contínua:** Verificar tudo após cada mudança. Garantir que não criou regressões.

---

## 📋 MISSÃO EM 3 FASES (EXECUTAR NESTA ORDEM)

```
FASE 1 → Limpeza e Organização do Repositório
FASE 2 → Investigação Arquitetural Completa
FASE 3 → Diagnóstico do Problema de Roteamento/Redirect
```

**NÃO pule fases. NÃO comece a fase 2 sem concluir a fase 1.**
**Após cada fase, produza um relatório em markdown antes de prosseguir.**

---

## 🗂️ FASE 1 — LIMPEZA E ORGANIZAÇÃO DO REPOSITÓRIO

### Objetivo
Eliminar tudo que não agrega valor real ao projeto. O repositório acumulou scripts de teste, arquivos temporários, configs duplicadas e código morto. Isso está poluindo o contexto e dificultando o diagnóstico.

### 1.1 — Mapeamento Inicial (READ-ONLY, não modificar ainda)

Execute primeiro, apenas leia:

```bash
# Estrutura geral do projeto
find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/__pycache__/*' -not -path '*/.next/*' | sort

# Arquivos de teste e scripts que podem ser obsoletos
find . -name "test_*.py" -o -name "*_test.py" -o -name "*.test.ts" -o -name "*.spec.ts" | grep -v node_modules

# Scripts avulsos na raiz
find . -maxdepth 2 -name "*.sh" -o -name "*.py" | grep -v node_modules | grep -v ".venv"

# Arquivos de configuração duplicados ou suspeitos
find . -name "*.env*" -o -name "*.config.*" | grep -v node_modules

# Arquivos grandes ou binários que não deveriam estar no repo
find . -size +500k -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*'

# Git status para ver o que está dirty
git status
git log --oneline -20
```

### 1.2 — Critérios de Remoção (aplicar com julgamento)

**DELETAR sem hesitar:**
- Scripts de teste que foram usados durante desenvolvimento e não têm mais propósito (`test_conexao.py`, `teste_rapido.sh`, `debug_auth.py`, etc.)
- Arquivos `.bak`, `.old`, `.tmp`, `.orig`
- Arquivos `*.log` commitados por acidente
- Configs de ambiente duplicadas (`.env.example.old`, `.env.backup`, etc.)
- Notebooks Jupyter (`.ipynb`) de exploração sem valor documentado
- Scripts de migração one-off já executados
- Arquivos de relatório/output gerados por ferramentas que não deveriam estar no repo

**AVALIAR antes de deletar:**
- Scripts de setup/seed que podem ainda ser necessários
- Testes de integração que testam funcionalidades reais (verificar se o teste está passando ou quebrando)
- Configs de Docker/Nginx que podem ter variantes legítimas

**NUNCA deletar:**
- Qualquer arquivo com lógica de negócio real
- Migrations de banco de dados (mesmo antigas)
- Testes de unidade com cobertura real de funcionalidades

### 1.3 — Organização de Estrutura

Após a limpeza, verifique se a estrutura respeita os padrões do projeto:

**Estrutura esperada (ajuste conforme o que encontrar):**
```
hub_dtic_and_sis/
├── frontend/               ← Next.js 14 + TypeScript
│   ├── app/               ← App Router (Next.js 13+)
│   ├── components/        ← Componentes reutilizáveis
│   ├── hooks/             ← Custom hooks
│   ├── store/             ← Zustand stores
│   ├── lib/               ← Utilities
│   └── types/             ← TypeScript types
├── backend/                ← FastAPI + Python
│   ├── routers/           ← Endpoints por domínio
│   ├── core/              ← Auth, security, config
│   ├── models/            ← Pydantic models
│   ├── services/          ← Business logic
│   └── tests/             ← Testes reais com pytest
├── .gemini/               ← Configs do Gemini CLI (se existir)
├── docker-compose.yml
├── GEMINI.md              ← Contexto do projeto (criar/atualizar)
└── README.md
```

### 1.4 — Relatório da Fase 1

Ao concluir, escreva `RELATORIO_FASE1.md` com:
- Lista de tudo que foi deletado + justificativa
- Lista de tudo que foi movido/reorganizado
- Número de arquivos antes → depois
- Alertas: qualquer coisa que você ficou em dúvida e NÃO deletou (para JO decidir)

---

## 🔬 FASE 2 — INVESTIGAÇÃO ARQUITETURAL COMPLETA

### Objetivo
Construir um mapa mental completo do projeto como ele está HOJE. Não como deveria ser — como realmente está. Toda inconsistência deve ser documentada.

### 2.1 — Mapeamento do Frontend (Next.js)

```bash
# Versão do Next.js e configuração
cat frontend/package.json | grep -E '"next"|"react"|"typescript"'
cat frontend/next.config.* 2>/dev/null || cat next.config.* 2>/dev/null

# Estrutura do App Router
find ./frontend/app -type f | sort 2>/dev/null || find ./app -type f | sort

# Middleware (CRÍTICO — relacionado ao problema de redirect)
find . -name "middleware.ts" -o -name "middleware.js" | grep -v node_modules
cat middleware.ts 2>/dev/null || cat frontend/middleware.ts 2>/dev/null

# Rotas e layouts
find . -name "layout.tsx" -o -name "page.tsx" | grep -v node_modules | sort

# Context providers
grep -r "createContext\|useContext\|Provider" --include="*.tsx" --include="*.ts" \
  -l | grep -v node_modules

# Zustand stores
find . -name "*.store.ts" -o -name "store.ts" -o -name "*Store.ts" | grep -v node_modules

# ProfileSwitcher (componente conhecido com bug)
find . -name "ProfileSwitcher*" | grep -v node_modules
grep -r "ProfileSwitcher\|context_override\|contextOverride" \
  --include="*.tsx" --include="*.ts" -l | grep -v node_modules

# Auth e redirecionamentos
grep -r "redirect\|useRouter\|router.push\|router.replace" \
  --include="*.tsx" --include="*.ts" -l | grep -v node_modules
```

**Documente:**
- Qual versão do Next.js está sendo usada (App Router ou Pages Router?)
- Existe middleware.ts? O que ele faz?
- Como funciona o sistema de rotas atualmente?
- Onde estão os redirects definidos?
- Como o ProfileSwitcher funciona (ou deveria funcionar)?
- Quais Zustand stores existem e o que eles gerenciam?

### 2.2 — Mapeamento do Backend (FastAPI)

```bash
# Versão e dependências
cat backend/requirements.txt 2>/dev/null || cat requirements.txt

# Entry point
cat backend/main.py 2>/dev/null || cat main.py 2>/dev/null

# Routers registrados
grep -r "include_router\|APIRouter" --include="*.py" | grep -v __pycache__

# Sistema de autenticação
find . -name "*.py" | xargs grep -l "JWT\|oauth2\|bearer\|token" 2>/dev/null | grep -v __pycache__

# Auth guards e dependências de segurança
grep -r "Depends\|Security\|HTTPBearer\|OAuth2" --include="*.py" | grep -v __pycache__

# CORS configuration (relacionado ao problema de redirect cross-origin)
grep -r "CORSMiddleware\|allow_origins\|allow_credentials" --include="*.py" | grep -v __pycache__

# Endpoints de auth
grep -r "@router.post\|@app.post\|@router.get" --include="*.py" | grep -i "auth\|login\|token" | grep -v __pycache__

# Variáveis de ambiente esperadas
grep -r "os.getenv\|settings\.\|env(" --include="*.py" | grep -v __pycache__ | grep -v ".pyc"
```

**Documente:**
- Quais routers existem e quais endpoints expõem?
- Como funciona o sistema de auth (JWT? OAuth? Session-based?)
- Existem auth guards nos endpoints que deveriam estar protegidos?
- A config de CORS está correta para o frontend?
- Quais variáveis de ambiente são necessárias?

### 2.3 — Mapeamento da Infra (Docker + Nginx)

```bash
# Docker compose
cat docker-compose.yml 2>/dev/null || cat docker-compose.yaml 2>/dev/null

# Dockerfiles
find . -name "Dockerfile*" | grep -v node_modules

# Nginx configs (local + Nginx Proxy Manager)
find . -name "nginx.conf" -o -name "*.conf" | grep -v node_modules
cat nginx.conf 2>/dev/null

# Variáveis de ambiente
cat .env 2>/dev/null || echo "Sem .env na raiz"
cat .env.local 2>/dev/null || echo "Sem .env.local"
cat frontend/.env* 2>/dev/null || echo "Sem .env no frontend"
cat backend/.env* 2>/dev/null || echo "Sem .env no backend"

# Portas em uso
grep -r "3000\|8000\|8080\|80\|443" docker-compose.yml 2>/dev/null
```

**Documente:**
- Quais serviços estão no docker-compose?
- Como estão mapeadas as portas?
- Existe Nginx Proxy Manager configurado? Com quais rotas?
- As variáveis de ambiente estão completas e consistentes?

### 2.4 — Análise de Git History (Quando Quebrou?)

```bash
# Últimos 30 commits com arquivos modificados
git log --oneline --stat -30

# Commits que mexeram em arquivos de roteamento/auth/middleware
git log --oneline -- "**middleware*" "**auth*" "**router*" "**redirect*" -20

# O que mudou no último commit antes de quebrar
git diff HEAD~1 HEAD -- . ':(exclude)node_modules' ':(exclude).next'

# Quando foi a última vez que funcionou (verificar com JO qual commit era)
git log --oneline --graph --all -20
```

**Documente:**
- Linha do tempo dos últimos commits
- Quais arquivos foram tocados nos commits mais recentes?
- Há alguma mudança óbvia que possa ter causado o problema?

### 2.5 — Relatório da Fase 2

Escreva `RELATORIO_FASE2_ARQUITETURA.md` com:
- Diagrama textual da arquitetura atual (ASCII art ou mermaid)
- Lista de todos os endpoints do backend com seus métodos
- Lista de todas as rotas do frontend com seus componentes
- Mapa de autenticação: como o fluxo de login funciona end-to-end
- Lista de TODAS as inconsistências encontradas
- Lista de TODO o código morto/unused que não foi deletado na Fase 1

---

## 🚨 FASE 3 — DIAGNÓSTICO DO PROBLEMA DE ROTEAMENTO/REDIRECT

### Contexto do Problema (o que JO sabe)

> "Mais uma vez quebramos funcionamentos sem nem saber como. Apenas estava funcionando, parou, e sem explicação nenhuma. Parece que é um erro arquitetural e também relacionado a redirecionamento."

**Bugs conhecidos do histórico do projeto:**
1. **ProfileSwitcher context reset** — ao trocar de perfil, o contexto não é resetado corretamente
2. **Next.js middleware ausente** — ausência ou erro no `middleware.ts` causando falha nos guards de rota
3. **FastAPI auth guard gap** — endpoints que deveriam ser protegidos não estão
4. **context_override pattern** — relacionado a hub roles e troca de contexto

### 3.1 — Verificações Específicas do Problema de Redirect

```bash
# VERIFICAÇÃO 1: Existe middleware.ts?
find . -name "middleware.ts" | grep -v node_modules
# Se não existir → este pode ser o problema raiz

# VERIFICAÇÃO 2: next.config tem redirects hardcoded?
grep -A 20 "redirects\|rewrites" next.config.* 2>/dev/null

# VERIFICAÇÃO 3: Rotas protegidas têm guard?
# Procurar por páginas que deveriam verificar auth mas não verificam
grep -r "useSession\|getServerSession\|getToken\|useAuthStore\|isAuthenticated" \
  --include="*.tsx" --include="*.ts" -l | grep -v node_modules

# VERIFICAÇÃO 4: Há loops de redirect possíveis?
grep -rn "redirect\|router.push" --include="*.tsx" --include="*.ts" | \
  grep -v node_modules | grep -v ".next"

# VERIFICAÇÃO 5: A URL base do backend está configurada corretamente?
grep -rn "API_URL\|BACKEND_URL\|BASE_URL\|localhost:8000\|localhost:3000" \
  --include="*.ts" --include="*.tsx" --include="*.env*" | grep -v node_modules

# VERIFICAÇÃO 6: CORS no backend aceita o frontend?
grep -A 10 "CORSMiddleware" backend/**/*.py 2>/dev/null || \
grep -rn "CORSMiddleware" --include="*.py"

# VERIFICAÇÃO 7: Cookies/headers de auth estão sendo enviados?
grep -rn "credentials.*include\|withCredentials\|Authorization.*Bearer" \
  --include="*.ts" --include="*.tsx" | grep -v node_modules

# VERIFICAÇÃO 8: ProfileSwitcher — onde está e o que faz?
find . -name "ProfileSwitcher*" | grep -v node_modules
cat $(find . -name "ProfileSwitcher*" | grep -v node_modules | head -1) 2>/dev/null

# VERIFICAÇÃO 9: Zustand store de auth — como persiste?
find . -name "authStore*" -o -name "auth.store*" -o -name "useAuth*" | grep -v node_modules
```

### 3.2 — Reproduzir o Problema (se serviços estiverem rodando)

```bash
# Verificar se os serviços estão up
docker ps 2>/dev/null || echo "Docker não rodando ou sem containers"

# Tentar curl nos endpoints principais
curl -s http://localhost:8000/docs 2>/dev/null | head -20 || echo "Backend não respondendo"
curl -s http://localhost:3000 2>/dev/null | head -5 || echo "Frontend não respondendo"

# Testar endpoint de auth diretamente
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' 2>/dev/null | python3 -m json.tool 2>/dev/null

# Ver logs dos containers
docker logs $(docker ps -q --filter "name=frontend") 2>/dev/null | tail -30
docker logs $(docker ps -q --filter "name=backend") 2>/dev/null | tail -30
```

### 3.3 — Análise de Root Cause

Com base em tudo coletado nas verificações acima, responda:

1. **O middleware.ts existe e está configurado corretamente?**
   - Se não existe: criar é a correção prioritária
   - Se existe mas está errado: documentar o erro específico

2. **O fluxo de autenticação está completo?**
   - Frontend envia token corretamente?
   - Backend valida corretamente?
   - O token está sendo armazenado onde? (localStorage, cookie, Zustand?)

3. **Os redirects estão causando loops?**
   - `/login` redireciona para `/dashboard` que requer auth que redireciona para `/login`?

4. **A config do Nginx/Proxy está roteando corretamente?**
   - `/api/*` → backend?
   - `/*` → frontend?

5. **O ProfileSwitcher está resetando o estado corretamente?**

### 3.4 — Relatório Final de Diagnóstico

Escreva `RELATORIO_FASE3_DIAGNOSTICO.md` com:

```markdown
# Diagnóstico — Hub DTIC & SIS

## Root Cause Identificado
[Descrição clara do problema raiz]

## Evidências
[Código específico, linha por linha, que comprova o problema]

## Problemas Secundários Encontrados
[Lista de outros problemas que não são o root cause mas devem ser corrigidos]

## Plano de Correção (Priorizado)
### Correção 1 (Crítica — sem isso nada funciona):
- O que fazer
- Por que
- Qual arquivo modificar
- Código proposto

### Correção 2 (Alta — causa instabilidade):
...

### Correção 3 (Média — melhoria arquitetural):
...

## O que NÃO fazer
[Armadilhas, patches que parecem resolver mas criam novos problemas]

## Arquivos que PRECISAM ser criados/recriados do zero
[Lista com justificativa]
```

---

## ⚙️ REGRAS DE OPERAÇÃO DURANTE A MISSÃO

### Regras Absolutas
1. **Não modifique código de negócio na Fase 1** — apenas limpe arquivos sem valor
2. **Não faça correções nas Fases 1 e 2** — apenas investigue e documente
3. **Na Fase 3, proponha as correções no relatório primeiro** — não aplique sem validação de JO (a menos que seja algo trivialmente seguro como criar um arquivo que não existe)
4. **Antes de deletar qualquer arquivo**, verifique se há imports que apontam para ele
5. **Se encontrar código que parece crítico mas está morto**, documente e marque como candidato a remoção — não delete

### Comunicação de Progresso
- Ao iniciar cada fase, anuncie: `▶️ INICIANDO FASE [N]: [descrição]`
- Ao completar cada verificação importante, resuma em 1-2 linhas o que encontrou
- Ao encontrar algo suspeito: `⚠️ ATENÇÃO: [descrição do problema]`
- Ao completar cada fase: `✅ FASE [N] CONCLUÍDA — relatório salvo em [arquivo]`

### Se Encontrar Ambiguidade
Se durante a investigação você encontrar algo que não tem resposta clara (ex: "este arquivo deveria estar aqui ou não?"), **documente a dúvida explicitamente** no relatório e **não tome decisão unilateral**.

### Sobre o Antigravity IDE
Você está rodando no Antigravity (VS Code fork com Gemini Code Assist). Você tem:
- Terminal completo com sudo
- Acesso ao git
- Acesso ao Docker (se instalado)
- Capacidade de ler/escrever todos os arquivos do projeto

---

## 📚 CONTEXTO TÉCNICO DO PROJETO (Para Referência)

### Stack Confirmada
- **Frontend:** Next.js 14 + TypeScript + Zustand (state) + React
- **Backend:** FastAPI + Python 3.11 + Pydantic
- **Infra:** Docker + Nginx Proxy Manager (Windows + WSL2 + Docker Desktop)
- **Deploy local:** Frontend porta 3000, Backend porta 8000
- **Repo:** `jonathanmoletta17/hub_dtic_and_sis`

### Módulos do Sistema
1. **Autenticação** — Login/Logout, JWT tokens, refresh
2. **Context Switching** — ProfileSwitcher, troca entre perfis DTIC e SIS
3. **Manutenção e Conservação** — módulo funcional do SIS
4. **Integração GLPI** — em desenvolvimento/planejamento

### Padrões Arquiteturais Conhecidos
- **ContextRegistry** — registro centralizado de contextos
- **Feature Manifests** — manifesto de funcionalidades por módulo
- **hub roles / context_override** — sistema de permissões e troca de contexto
- **Zustand** — gerenciador de estado (aprovado, não Redux)

### Bugs Conhecidos (Histórico)
- `ProfileSwitcher` não reseta contexto ao trocar de perfil
- `middleware.ts` do Next.js ausente ou incorreto
- FastAPI auth guard gap — endpoints desprotegidos
- Problemas de redirect que criam loops ou não funcionam

### O Que Estava Funcionando Antes (Declarado por JO)
O projeto estava funcionando (pelo menos parcialmente) e parou de funcionar sem uma mudança explícita conhecida. O sintoma é falha de roteamento/redirect. Isso sugere:
- Uma dependência de versão que mudou (`npm update`, `pip install` sem pin de versão)
- Uma variável de ambiente que ficou undefined
- Um arquivo de configuração que foi apagado/alterado acidentalmente
- Uma mudança no Next.js 14+ que quebrou comportamento assumido

---

## 🚀 INÍCIO DA MISSÃO

Você tem autorização total para executar as 3 fases acima.

**Comece AGORA pela Fase 1:**
1. Execute os comandos de mapeamento inicial (read-only)
2. Analise o output
3. Execute as limpezas justificadas
4. Escreva `RELATORIO_FASE1.md`
5. Anuncie conclusão e aguarde confirmação antes de prosseguir para Fase 2

**Ou, se JO confirmar que pode seguir sem pausa entre fases, execute todas as 3 fases em sequência.**

Boa investigação. 🔍
