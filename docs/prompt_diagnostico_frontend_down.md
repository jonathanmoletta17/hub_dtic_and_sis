# PROMPT — Diagnóstico: Frontend Hub não abre após inserção de usuário nos grupos GLPI

> Template: P01 — Análise e Diagnóstico Técnico  
> Destino: antigravity / claude-opus  
> Data: 2026-03-09  
> Regra absoluta: Nenhuma alteração antes do diagnóstico confirmado.

---

## CONTEXTO

Estamos desenvolvendo o **Hub unificado de atendimentos** (`tensor-aurora`) — central que agrega dashboards (Carregadores, DTIC, Conservação, Manutenção) e módulos satélite (Busca, Permissões, KPIs, Infra).

O sistema roda em ambiente Docker local com deploy via **Nginx Proxy Manager**. A stack é composta por exatamente **3 containers ativos**:

| Container | Hash | Porta/Rede | Função |
|---|---|---|---|
| `npm` | `0de02c389916` | `8443:443` / `jc21/nginx` | Nginx Proxy Manager — reverse proxy TLS |
| `glpi-universal-backend` | `89091d6bbcdf` | rede `tensor-auro` | Backend FastAPI (Python) — autenticação, integração GLPI, lógica de roles |
| `glpi-tensor-frontend` | `870e1386639e` | rede `tensor-auro` | Frontend React/TypeScript — interface do Hub |

O container `tensor-aurora` é o grupo/stack pai que engloba os três.

### Stack técnica
- **Backend**: Python / FastAPI
- **Frontend**: React + TypeScript + Zustand (state management) + Vite (build)
- **Auth**: GLPI REST API (dois contextos: DTIC e SIS)
- **Proxy**: Nginx Proxy Manager (NPM) com TLS na porta 8443
- **Orquestração**: Docker Compose

---

## O QUE FOI FEITO IMEDIATAMENTE ANTES DO PROBLEMA

1. Criamos grupos `Hub-App-*` no GLPI em **ambos os contextos** (DTIC e SIS):

   **DTIC (CAU):**
   - `Hub-App-busca` — ID 109
   - `Hub-App-dtic-infra` — ID 114
   - `Hub-App-dtic-kpi` — ID 113
   - `Hub-App-dtic-metrics` — ID 112
   - `Hub-App-permissoes` — ID 110

   **SIS:**
   - `Hub-App-busca` — ID 102
   - `Hub-App-carregadores` — ID 104
   - `Hub-App-permissoes` — ID 103
   - `Hub-App-sis-dashboard` — ID 105

2. Inserimos o usuário `jonathan-moletta` nesses grupos em ambas as instâncias GLPI.

3. **Após essas ações**, o frontend parou de abrir completamente.

---

## SINTOMA

- A URL do Hub (via Nginx Proxy Manager, porta 8443) não carrega — frontend inacessível.
- Não foi feita nenhuma alteração em código, `docker-compose.yml`, configuração do NPM ou variáveis de ambiente.
- Os 3 containers aparecem como ativos no Docker (sem crash evidente na listagem).
- O problema surgiu **imediatamente após** as operações no GLPI (criação de grupos + inserção de usuário).

---

## OBJETIVO

Identificar a causa raiz completa da inacessibilidade do frontend **antes de qualquer alteração** em código, configuração ou containers.

A investigação deve cobrir **todas as camadas** da stack:

```
Browser → NPM (Nginx) → glpi-tensor-frontend → glpi-universal-backend → GLPI REST API
```

---

## TAREFA

Realize um diagnóstico técnico completo e estruturado cobrindo obrigatoriamente:

### 1. Análise de estado dos containers
- Verificar status real de cada container (não apenas "ativo" — verificar health, restart count, uptime)
- Identificar se algum container está em crash loop ou com uptime suspeito
- Capturar logs recentes dos 3 containers (últimas 100 linhas de cada)
- Verificar se existe algum container que deveria estar rodando mas não está

**Comandos sugeridos para coleta:**
```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs glpi-tensor-frontend --tail=100
docker logs glpi-universal-backend --tail=100
docker logs <container_npm> --tail=100
docker inspect glpi-tensor-frontend --format='{{.State.Health}}'
```

### 2. Diagnóstico da camada de rede (Nginx Proxy Manager)
- Verificar se o NPM está roteando corretamente para o frontend
- Verificar se o certificado TLS ainda está válido
- Verificar se houve alguma mudança automática de configuração no NPM
- Testar conectividade direta com o frontend (bypassando o NPM)

**Comandos sugeridos:**
```bash
# Testar frontend diretamente (sem NPM)
docker exec <npm_container> curl -s http://glpi-tensor-frontend:<PORTA_INTERNA> -o /dev/null -w "%{http_code}"

# Verificar rede Docker
docker network inspect tensor-aurora_default
docker network ls
```

### 3. Diagnóstico do build/runtime do frontend
- Verificar se o processo do frontend (Vite dev server ou servidor de arquivos estáticos) está rodando dentro do container
- Verificar se houve algum erro de build ou inicialização
- Identificar em qual porta o frontend escuta internamente
- Verificar variáveis de ambiente do container (especialmente URLs de API)

**Comandos sugeridos:**
```bash
docker exec glpi-tensor-frontend ps aux
docker exec glpi-tensor-frontend netstat -tlnp 2>/dev/null || docker exec glpi-tensor-frontend ss -tlnp
docker inspect glpi-tensor-frontend --format='{{range .Config.Env}}{{println .}}{{end}}'
```

### 4. Diagnóstico do backend
- Verificar se o backend FastAPI está respondendo
- Testar o endpoint de health/status
- Verificar se a conexão com o GLPI ainda funciona após as mudanças
- Verificar se há erros relacionados à nova estrutura de grupos

**Comandos sugeridos:**
```bash
docker exec glpi-universal-backend curl -s http://localhost:<PORTA>/health
docker logs glpi-universal-backend --tail=100 | grep -E "(ERROR|WARN|Exception|glpigroups)"
```

### 5. Análise de correlação temporal
- A operação de inserção de usuário em grupos no GLPI pode ter disparado algum evento?
- Houve alguma operação que possa ter afetado a sessão ativa do backend com o GLPI?
- O GLPI tem algum mecanismo de invalidação de sessão que pode ter causado reconexão com erro?

### 6. Hipóteses ordenadas por probabilidade
Liste todas as causas possíveis em ordem de probabilidade, indicando para cada uma:
- O que causaria exatamente esse sintoma
- Como confirmar ou descartar
- Risco de impacto caso seja essa a causa

---

## FORMATO DE SAÍDA ESPERADO

```
1. ESTADO DOS CONTAINERS
   - Status real de cada container
   - Logs relevantes encontrados

2. DIAGNÓSTICO POR CAMADA
   - NPM / Nginx: [status]
   - Frontend container: [status]
   - Backend container: [status]
   - Conectividade entre containers: [status]

3. HIPÓTESES (ordenadas por probabilidade)
   - H1: [mais provável] — como confirmar
   - H2: ...
   - H3: ...

4. CAUSA RAIZ IDENTIFICADA (após coleta de evidências)
   - Descrição técnica
   - Por que a ação no GLPI pode ter causado isso (ou coincidência)

5. PLANO DE CORREÇÃO
   - Passo 1 (sem risco)
   - Passo 2 ...
   - Validação final

6. VEREDICTO
   - O que precisa ser feito para o frontend voltar a funcionar
```

---

## CRITÉRIOS DE QUALIDADE

- Nenhuma reinicialização de container antes de coletar os logs (logs são perdidos no restart)
- Nenhuma alteração de configuração antes do diagnóstico confirmado
- Toda hipótese deve ser verificável com um comando concreto
- A causa raiz deve explicar especificamente **por que** parou após as operações no GLPI
- Se a causa for coincidência temporal (não relacionada ao GLPI), isso também deve ser evidenciado

---

## INFORMAÇÕES ADICIONAIS DO PROJETO

### Arquitetura de autorização (contexto relevante)
O sistema usa dois mecanismos de permissão paralelos:
1. `resolve_hub_roles` — traduz perfis/grupos GLPI → roles funcionais via `contexts.yaml`
2. `resolve_app_access` — busca grupos `Hub-App-*` no GLPI para decidir quais módulos exibir

Os grupos criados no GLPI alimentam o mecanismo 2. O mecanismo 1 depende de IDs numéricos fixos no `contexts.yaml` (SIS: grupos 22 e 21 para técnicos de manutenção e conservação).

### Contextos
- **DTIC**: `cau.piratini.intra.rs.gov.br` — perfis 9 (solicitante), 6 (técnico), 20 (gestor)
- **SIS**: `cau.piratini.intra.rs.gov.br/sis` — perfis 9 (solicitante), 3 (gestor); grupos 22 e 21 (técnicos)

### Repositório
`jonathanmoletta17/hub_dtic_and_sis`

---

*Gerado via PROMPT_LIBRARY — P01 Análise/Diagnóstico | hub_dtic_and_sis | 2026-03-09*
