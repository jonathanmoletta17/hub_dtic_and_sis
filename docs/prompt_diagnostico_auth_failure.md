# PROMPT — Diagnóstico: "Erro de comunicação com o servidor de autenticação" no Hub

> Template: P01 — Análise e Diagnóstico Técnico  
> Destino: antigravity / claude-opus  
> Data: 2026-03-09 | 19:54  
> Regra absoluta: **Nenhuma alteração antes do diagnóstico confirmado. Nenhum restart antes de coletar logs.**

---

## CONTEXTO DO SISTEMA

Sistema: **Hub unificado de atendimentos** (`tensor-aurora` / `GlobalGateway`)  
Finalidade: Central que agrega autenticação via GLPI REST e dashboards (DTIC, SIS, Carregadores)

### Stack técnica
- **Frontend**: React + TypeScript + Vite + Zustand — container `glpi-tensor-frontend`
- **Backend**: Python / FastAPI — container `glpi-universal-backend`
- **Proxy**: Nginx Proxy Manager (NPM) — container `npm` / `jc21/nginx`
- **Auth provider**: GLPI REST API (dois contextos: DTIC e SIS)
- **Orquestração**: Docker Compose — stack pai `tensor-aurora`

### Configuração atual do Nginx Proxy Manager (confirmada visualmente)

| Source (domínio local) | Destination | SSL | Status |
|---|---|---|---|
| `api.carregadores.local` | `http://glpi-universal-backend:8080` | HTTP Only | 🟢 Online |
| `carregadores.local` | `http://glpi-tensor-frontend:3000` | HTTP Only | 🟢 Online |

**Criados em:** 09/03/2026 às 22:39 e 22:43 (hoje)

---

## SINTOMA EXATO

O frontend **carrega completamente** (tela de login do GlobalGateway renderiza) mas ao tentar autenticar exibe:

> **"Erro de comunicação com o servidor de autenticação."**

- Usuário testado: `jonathan-moletta`
- O erro aparece imediatamente ao clicar em "ENTRAR NO GATEWAY"
- Não há redirect, não há loading prolongado — falha rápida

---

## O QUE FOI FEITO ANTES DO PROBLEMA

1. Criação dos grupos `Hub-App-*` no GLPI (DTIC e SIS) — IDs documentados
2. Inserção do usuário `jonathan-moletta` nesses grupos
3. Criação das duas rotas no Nginx Proxy Manager (hoje, 22:39–22:43)

---

## OBJETIVO

Mapear **todas** as definições responsáveis pelo comportamento de autenticação — desde a chamada do browser até o backend — identificando onde a comunicação falha e por quê.

A investigação deve cobrir o fluxo completo:

```
Browser (cliente)
    ↓ HTTP request para api.carregadores.local
NPM (Nginx Proxy Manager)
    ↓ proxy_pass para glpi-universal-backend:8080
Backend FastAPI
    ↓ chamada REST para GLPI
GLPI API
    ↓ retorno de sessão / grupos / perfis
Backend FastAPI
    ↓ monta payload de resposta
Frontend React
    ↓ salva no Zustand store
Hub carregado
```

**Qualquer ponto dessa cadeia pode estar quebrado.**

---

## TAREFA

### 1. Diagnóstico da resolução DNS do domínio local

O frontend faz chamadas para `api.carregadores.local` **a partir do browser do cliente** (não de dentro do container). Para isso funcionar, o hostname precisa estar resolvível na máquina do cliente.

**Verificar:**
```bash
# Na máquina host (onde o browser roda):
cat /etc/hosts | grep carregadores
# Windows:
type C:\Windows\System32\drivers\etc\hosts | findstr carregadores

# Testar resolução:
nslookup api.carregadores.local
ping api.carregadores.local
```

**Perguntas críticas:**
- `api.carregadores.local` está mapeado no `/etc/hosts` ou DNS local para o IP da máquina que roda o Docker?
- `carregadores.local` também está mapeado?
- Se não estiverem, o browser não consegue chegar ao NPM — a requisição de auth nunca sai do cliente.

---

### 2. Diagnóstico de qual URL o frontend usa para chamar o backend

O Vite injeta variáveis de ambiente em build time. A URL da API é definida por uma variável como `VITE_API_URL` ou `VITE_BACKEND_URL`.

**Verificar no container frontend:**
```bash
docker exec glpi-tensor-frontend env | grep -iE "(VITE|API|BACKEND|URL|HOST)"
docker exec glpi-tensor-frontend cat /app/.env 2>/dev/null || true
docker exec glpi-tensor-frontend cat /app/.env.local 2>/dev/null || true
docker exec glpi-tensor-frontend cat /app/.env.production 2>/dev/null || true

# Se for build estático (Nginx servindo dist/):
docker exec glpi-tensor-frontend find /app -name "*.js" | xargs grep -l "api.carregadores" 2>/dev/null | head -5
docker exec glpi-tensor-frontend find /usr/share/nginx -name "*.js" 2>/dev/null | xargs grep -l "carregadores" 2>/dev/null | head -5
```

**Perguntas críticas:**
- Para qual URL o frontend está apontando a chamada de autenticação?
- Essa URL é resolvível do browser (não do container)?
- O build foi feito com a URL correta ou com placeholder/localhost?

---

### 3. Diagnóstico da chamada de autenticação via DevTools do browser

**Instrução para coletar no browser (F12 → Network):**

Antes de clicar em "ENTRAR NO GATEWAY":
1. Abrir DevTools → aba Network
2. Marcar "Preserve log"
3. Tentar login
4. Filtrar por `auth` ou `login`
5. Capturar:
   - URL exata da requisição
   - Método HTTP
   - Status code retornado (ou se foi bloqueado antes de chegar)
   - Mensagem de erro (na aba Console também)

**O que o status code revela:**
| Status | Diagnóstico provável |
|---|---|
| Sem request (0 / blocked) | DNS não resolve ou CORS pré-flight bloqueado |
| `ERR_NAME_NOT_RESOLVED` | `api.carregadores.local` não está no hosts/DNS |
| `ERR_CONNECTION_REFUSED` | NPM não está escutando na porta esperada |
| `401 / 403` | Backend alcançado mas GLPI rejeita credenciais |
| `502 Bad Gateway` | NPM alcança o backend mas backend não responde |
| `404` | Rota de auth não existe no backend |
| `CORS error` | Backend não tem o domínio `carregadores.local` na whitelist |

---

### 4. Diagnóstico do backend FastAPI

```bash
# Status e logs do backend
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.RestartCount}}"
docker logs glpi-universal-backend --tail=150
docker logs glpi-universal-backend --tail=50 --since="2026-03-09T19:00:00"

# Backend está respondendo internamente?
docker exec glpi-universal-backend curl -s http://localhost:8080/health -w "\nHTTP_CODE:%{http_code}\n"
docker exec glpi-universal-backend curl -s http://localhost:8080/docs -o /dev/null -w "%{http_code}"

# Porta real que o backend escuta
docker exec glpi-universal-backend ss -tlnp 2>/dev/null || docker exec glpi-universal-backend netstat -tlnp
```

**Verificar configuração de CORS no backend:**
```bash
docker exec glpi-universal-backend grep -r "CORSMiddleware\|allow_origins\|CORS" /app --include="*.py" -l
docker exec glpi-universal-backend grep -rA5 "allow_origins" /app --include="*.py"
```

**Perguntas críticas:**
- O backend está escutando em `:8080` como o NPM espera?
- O CORS permite requisições vindas de `http://carregadores.local`?
- Há erros nos logs do backend relacionados à conexão com o GLPI?

---

### 5. Diagnóstico da rede Docker

```bash
# Listar todas as redes
docker network ls

# Inspecionar a rede da stack tensor-aurora
docker network inspect tensor-aurora_default 2>/dev/null || \
docker network inspect $(docker network ls --filter name=tensor --format "{{.Name}}") 

# Verificar se NPM, backend e frontend estão na mesma rede
docker inspect npm --format='{{json .NetworkSettings.Networks}}' 2>/dev/null | python3 -m json.tool
docker inspect glpi-universal-backend --format='{{json .NetworkSettings.Networks}}' | python3 -m json.tool
docker inspect glpi-tensor-frontend --format='{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# NPM consegue falar com o backend?
docker exec <npm_container_name> curl -s http://glpi-universal-backend:8080/health -w "\nHTTP:%{http_code}\n"
```

**Ponto crítico:** O NPM resolve `glpi-universal-backend` via DNS interno do Docker. Para isso, NPM e backend precisam estar **na mesma rede Docker**. Se o NPM está em rede separada, o proxy_pass falha com 502/503.

---

### 6. Diagnóstico do docker-compose.yml

```bash
# Localizar o compose file
find / -name "docker-compose*.yml" -not -path "*/proc/*" 2>/dev/null | grep -i tensor

# Exibir o conteúdo
cat <caminho>/docker-compose.yml
```

**O que verificar no compose:**
- Os 3 serviços (npm, backend, frontend) estão declarados na **mesma network**?
- O backend expõe a porta `8080` ou usa porta diferente internamente?
- Existe algum `healthcheck` configurado?
- Variáveis de ambiente do frontend — qual URL de API está definida?

---

### 7. Diagnóstico do GLPI — conexão do backend

```bash
# Backend consegue falar com o GLPI?
docker exec glpi-universal-backend env | grep -iE "(GLPI|URL|HOST|TOKEN)"

# Testar conectividade do backend com o GLPI
docker exec glpi-universal-backend curl -s <URL_GLPI>/apirest.php/initSession \
  -H "Content-Type: application/json" \
  -H "Authorization: user_token <TOKEN>" \
  -w "\nHTTP:%{http_code}\n" | tail -5
```

---

### 8. Hipóteses ordenadas por probabilidade

Com base nos sintomas (frontend carrega, auth falha imediatamente, erro genérico "comunicação"), as causas mais prováveis são:

| # | Hipótese | Probabilidade | Como confirmar |
|---|---|---|---|
| H1 | `api.carregadores.local` não está no `/etc/hosts` do cliente | **MUITO ALTA** | `nslookup api.carregadores.local` na máquina host |
| H2 | CORS bloqueia requisição do browser (`carregadores.local` → `api.carregadores.local`) | **ALTA** | DevTools → Console → mensagem de CORS error |
| H3 | NPM e backend estão em redes Docker diferentes | **ALTA** | `docker network inspect` dos dois containers |
| H4 | Frontend foi buildado com URL de API errada (localhost ou placeholder) | **MÉDIA** | `docker exec grep` nas variáveis de ambiente |
| H5 | Backend não está escutando na porta 8080 | **MÉDIA** | `docker exec ss -tlnp` no backend |
| H6 | Sessão do backend com GLPI expirou/corrompeu após operações de grupo | **BAIXA** | Logs do backend pós 19:00 |

---

## FORMATO DE SAÍDA ESPERADO

```
=== DIAGNÓSTICO TENSOR-AURORA — 2026-03-09 ===

1. RESOLUÇÃO DNS
   api.carregadores.local → [IP ou NÃO RESOLVE]
   carregadores.local → [IP ou NÃO RESOLVE]

2. URL DE API NO FRONTEND
   Variável configurada: [valor]
   Resolvível do browser: [SIM/NÃO]

3. CHAMADA DE AUTH (DevTools)
   URL da requisição: [valor]
   Status: [código ou tipo de erro]
   Erro no console: [mensagem]

4. BACKEND
   Porta escutando: [porta]
   Health check: [HTTP code]
   CORS allow_origins: [lista]
   Logs relevantes: [últimas ocorrências de erro]

5. REDE DOCKER
   Redes: [lista]
   NPM na mesma rede do backend: [SIM/NÃO]
   Resolução interna glpi-universal-backend: [SIM/NÃO]

6. CAUSA RAIZ
   [Descrição técnica da causa confirmada]

7. PLANO DE CORREÇÃO (ordem obrigatória)
   Passo 1 — [sem risco de impacto]
   Passo 2 — ...
   Validação: [como confirmar que funcionou]
```

---

## CONTEXTO HISTÓRICO IMPORTANTE

Este problema faz parte de um padrão recorrente neste projeto: **conflitos de rede Docker, resolução DNS de domínios locais e inconsistência de portas** são as causas mais frequentes de falha após mudanças de configuração. Cada vez que algo "para de funcionar do nada", a causa real tem sido uma dessas três categorias.

Por isso, este diagnóstico deve ser **exaustivo** — não apenas identificar a causa imediata, mas mapear todas as definições que regem o comportamento de rede e roteamento desta stack, de forma que possamos:

1. Corrigir o problema atual
2. Documentar as definições corretas
3. Prevenir regressões futuras

---

## INFORMAÇÕES COMPLEMENTARES

- **Repositório**: `jonathanmoletta17/hub_dtic_and_sis`
- **Porta NPM**: `8443:443` (conforme Docker) — mas as rotas no NPM estão como HTTP Only
- **Criação das rotas NPM**: hoje às 22:39 e 22:43 (recente — possível causa)
- **Usuário de teste**: `jonathan-moletta` (com todos os grupos Hub-App-* atribuídos em DTIC e SIS)

---

*Gerado via PROMPT_LIBRARY — P01 Análise/Diagnóstico | hub_dtic_and_sis | 2026-03-09*
