# PROMPT — Execução das Correções: Auditoria Arquitetural tensor-aurora
**Base:** `auditoria_2026-03-11_tensor-aurora.md`  
**Data:** 2026-03-11

> **Regra absoluta:** Cada gap é corrigido, validado e confirmado antes do próximo.  
> **Escopo rígido:** Apenas os 9 gaps desta sessão (Gap-01 a Gap-09). Gap-10 é backlog — não tocar.  
> **Proteção:** Nenhum arquivo de zona protegida (`auth_service.py`, `useAuthStore.ts`, `httpClient.ts`, `context-registry.ts`) é alterado sem plano pré-aprovado.

---

## BASELINE INVIOLÁVEL

Executar **antes de qualquer alteração**. Registrar o resultado exato.

```bash
python -m pytest app/tests/ -v --tb=short -q 2>&1
```

```
BASELINE REGISTRADO:
  N testes passando: ___
  N testes falhando: ___ (se houver, PARAR e reportar antes de continuar)
```

Se qualquer teste já estiver falhando antes de começar → **PARAR**. Não avançar.

---

## PRÉ-LEITURA OBRIGATÓRIA

Ler na íntegra antes de escrever qualquer linha. Confirmar conteúdo real vs. auditoria.

```
[ ] app/main.py                          → CORS config (linha 72 e vizinhas)
[ ] app/core/auth_guard.py               → verify_session + bloco except (L111-114)
[ ] app/routers/db_read.py               → declaração do APIRouter
[ ] app/routers/lookups.py               → declaração do APIRouter + decoradores
[ ] app/routers/knowledge.py             → declaração do APIRouter + decoradores
[ ] app/routers/search.py                → declaração do APIRouter
[ ] app/routers/events.py                → L30, L64-65 (excepts)
[ ] app/routers/orchestrator.py          → declaração do APIRouter
[ ] app/routers/items.py                 → declaração do APIRouter
[ ] app/services/charger_service.py      → L189 (except: pass)
[ ] app/services/kpis_service.py         → L38 (datetime.now), L63 (bare except)
[ ] web/src/lib/api/chargerService.ts    → L215,226,234,242,279 (.catch)
```

Confirmar para cada arquivo:
- O arquivo existe com esse nome exato?
- O trecho citado na auditoria está na linha indicada?
- Há alguma mudança desde a auditoria que altere o diagnóstico?

---

## GAP-03 — CORS (executar PRIMEIRO, bloqueia os outros em produção)

**Evidência:** `app/main.py:72` — `allow_origins=["*"]` com `allow_credentials=True`

**Por que primeiro:** `allow_credentials=True` + `allow_origins=["*"]` é bloqueado por browsers modernos e cria risco de CSRF. É a correção mais simples e de maior impacto imediato.

### Investigação antes de corrigir

```bash
# Qual é a origem real do frontend em produção e desenvolvimento?
grep -rn "FRONTEND_URL\|ALLOWED_ORIGIN\|CORS_ORIGIN" app/config.py app/.env* 2>/dev/null
grep -rn "localhost:3000\|localhost:3001\|hub\." app/config.py app/main.py

# O frontend roda em qual porta em desenvolvimento?
grep -n "port\|PORT" web/package.json web/next.config.* 2>/dev/null | head -5
```

### Correção

```python
# app/main.py — substituição cirúrgica apenas na linha do allow_origins
# ANTES:
allow_origins=["*"],

# DEPOIS — ajustar com as origens reais identificadas na investigação:
allow_origins=[
    "http://localhost:3000",    # desenvolvimento local
    "http://localhost:3001",    # desenvolvimento alternativo (se identificado)
    # adicionar origem de produção se encontrada na investigação
],
```

**Atenção:** se `allow_origins` vier de variável de ambiente (`settings.CORS_ORIGINS`), usar a variável.
Não hardcodar origem de produção se já existir mecanismo de configuração.

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
# Resultado deve ser idêntico ao baseline
```

```
[ ] app/main.py salvo
[ ] Servidor reinicia sem erro de importação
[ ] Login via frontend ainda funciona (CORS não bloqueou origem legítima)
[ ] Testes: idêntico ao baseline ✅
```

---

## GAP-01 — 8 ROUTERS SEM AUTENTICAÇÃO

**Evidência:** 8 routers sem `dependencies=[Depends(verify_session)]` no `APIRouter`.

**Routers afetados** (confirmar na pré-leitura):
`db_read`, `lookups`, `knowledge`, `search`, `events`, `orchestrator`, `items` + verificar se há outros.

### Investigação antes de corrigir

```bash
# Verificar TODOS os routers — não apenas os 8 citados
grep -rn "APIRouter(" app/routers/ | grep -v "dependencies"

# Confirmar quais já têm Depends e quais não têm:
grep -rn "Depends(verify_session)\|dependencies=\[" app/routers/

# Verificar import de verify_session em cada router afetado:
grep -n "verify_session\|auth_guard" app/routers/db_read.py
grep -n "verify_session\|auth_guard" app/routers/lookups.py
grep -n "verify_session\|auth_guard" app/routers/knowledge.py
grep -n "verify_session\|auth_guard" app/routers/search.py
grep -n "verify_session\|auth_guard" app/routers/events.py
grep -n "verify_session\|auth_guard" app/routers/orchestrator.py
grep -n "verify_session\|auth_guard" app/routers/items.py

# Confirmar a assinatura exata de verify_session:
grep -n "^def verify_session\|^async def verify_session" app/core/auth_guard.py
```

### Correção — padrão a aplicar em cada router

```python
# Padrão atual (sem proteção):
router = APIRouter(prefix="/...", tags=["..."])

# Padrão corrigido:
from app.core.auth_guard import verify_session  # adicionar se não existir
from fastapi import Depends

router = APIRouter(
    prefix="/...",
    tags=["..."],
    dependencies=[Depends(verify_session)],
)
```

**Aplicar em cada um dos 8 routers, um por vez.**

**Exceção explícita:** o router `domain_auth.py` (login) **não** deve receber este Depends — é o endpoint público. Confirmar que ele não está na lista.

**Se um endpoint dentro de um router protegido precisar ser público** (ex: health check, docs):
```python
# Sobrescrever no endpoint específico, não no router:
@router.get("/health", dependencies=[])  # remove herança do router
async def health():
    return {"status": "ok"}
```

### Validação após cada router corrigido

```bash
python -m pytest app/tests/ -v --tb=short -q
# Verificar: nenhum teste quebrou
```

```
[ ] db_read.py      → Depends adicionado + testes passando ✅
[ ] lookups.py      → Depends adicionado + testes passando ✅
[ ] knowledge.py    → Depends adicionado + testes passando ✅
[ ] search.py       → Depends adicionado + testes passando ✅
[ ] events.py       → Depends adicionado + testes passando ✅
[ ] orchestrator.py → Depends adicionado + testes passando ✅
[ ] items.py        → Depends adicionado + testes passando ✅
[ ] domain_auth.py  → NÃO modificado (endpoint público) ✅
```

---

## GAP-02 — FALLBACK SILENCIOSO EM auth_guard.py

**Evidência:** `app/core/auth_guard.py:111-114` — `except Exception` aceita qualquer token quando GLPI falha, incluindo tokens inválidos.

**Risco:** um atacante pode forçar erro de conectividade GLPI para contornar autenticação.

### Leitura obrigatória do bloco completo

```bash
# Ler as linhas 100-130 do auth_guard.py para entender o contexto completo
sed -n '100,130p' app/core/auth_guard.py
```

Antes de alterar, documentar:
- O que está no `try` antes do `except`?
- Que tipos de exceção podem ser levantados?
- Existe algum log antes do `except`?

### Correção — estreitar o except sem remover o fallback

```python
# ANTES:
except Exception as e:
    return {"session_token": token, "validated": True, "source": "fallback"}

# DEPOIS — importar os tipos de exceção corretos no topo do arquivo:
import httpx
import asyncio

# e substituir o except:
except (httpx.ConnectError, httpx.TimeoutException, asyncio.TimeoutError) as e:
    _log.warning(
        "GLPI indisponível durante verificação de sessão (fallback ativado): %s",
        type(e).__name__,
    )
    return {"session_token": token, "validated": True, "source": "fallback"}
```

**Verificar antes de aplicar:**
- O projeto usa `httpx` ou `requests`? Ajustar os tipos de exceção correspondentes.
- Existe `_log` declarado no arquivo? Se não, usar o logger correto do arquivo.

```bash
grep -n "^import\|^from\|_log\|logger\|logging" app/core/auth_guard.py | head -20
```

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
```

```
[ ] auth_guard.py salvo
[ ] Importações de httpx/asyncio adicionadas se necessário
[ ] Logger usado é o correto para o arquivo
[ ] Testes: idêntico ao baseline ✅
[ ] Testar mentalmente: token inválido + GLPI online → rejeitado ✅
[ ] Testar mentalmente: token válido + GLPI timeout → aceito via fallback ✅
[ ] Testar mentalmente: token inválido + GLPI timeout → REJEITADO (não mais aceito) ✅
    [este é o comportamento que Gap-02 corrige]
```

---

## GAP-04 — except: pass em charger_service.py:189

**Evidência:** `app/services/charger_service.py:189` — `except: pass` silencia erro de parse de `end_date`.

### Leitura do contexto

```bash
sed -n '182,200p' app/services/charger_service.py
```

Identificar:
- Qual é o logger usado neste arquivo?
- `end_date` vem de onde? (parâmetro de request, banco, calculado?)

### Correção

```python
# ANTES:
except: pass

# DEPOIS — estreitar e logar:
except ValueError as e:
    logger.warning(  # ajustar para o nome do logger do arquivo
        "end_date inválido ignorado: %r — %s",
        end_date,
        e,
    )
```

```bash
# Confirmar nome do logger no arquivo:
grep -n "^logger\|^_log\|= logging\|getLogger" app/services/charger_service.py | head -5
```

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
```

---

## GAP-05 — except: pass em events.py:30 e 64-65

**Evidência:** `app/routers/events.py:30` e `L64-65` — exceções do SSE stream descartadas.

### Leitura do contexto de ambas as linhas

```bash
sed -n '24,40p' app/routers/events.py
echo "---"
sed -n '58,72p' app/routers/events.py
```

### Correção

```python
# L30 — erro de inicialização de conexão ao banco no SSE
except Exception as e:
    _log.warning("Erro ao inicializar stream SSE: %s — %s", type(e).__name__, e)
    # manter o comportamento original após o log (yield erro? fechar stream? continuar?)
    # NÃO alterar o fluxo de controle — apenas adicionar o log

# L64-65 — erro durante streaming
except Exception as e:
    _log.warning("Erro durante SSE stream: %s — %s", type(e).__name__, e)
    # manter o comportamento original
```

**Confirmar o nome do logger em events.py antes de aplicar:**
```bash
grep -n "^logger\|^_log\|= logging\|getLogger" app/routers/events.py | head -5
```

**Não alterar o fluxo de controle** — apenas adicionar o log. Se o except atualmente ignora e continua, manter o continue. Se fecha o gerador, manter o fechamento.

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
```

---

## GAP-06 — bare except em kpis_service.py:63

**Evidência:** `app/services/kpis_service.py:63` — `except:` captura `SystemExit` e `KeyboardInterrupt`.

### Leitura do contexto

```bash
sed -n '57,70p' app/services/kpis_service.py
```

Identificar:
- O que está no `try`?
- Qual é o tipo de valor sendo parseado?
- O fallback `_get_period_range("current_month")` é sempre seguro?

### Correção

```python
# ANTES:
except:
    return _get_period_range("current_month")

# DEPOIS — estreitar para exceções de parse de valor:
except (ValueError, AttributeError, TypeError):
    return _get_period_range("current_month")
```

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
```

---

## GAP-07 — datetime naive em kpis_service.py:38

**Evidência:** `app/services/kpis_service.py:38` — `datetime.now()` sem timezone.
`charger_service.py` já tem `_now_local()` implementado corretamente.

### Investigação — reutilizar o que já existe

```bash
# Confirmar a assinatura de _now_local em charger_service.py:
grep -n "_now_local\|ZoneInfo\|America/Sao_Paulo" app/services/charger_service.py | head -10

# Verificar se _now_local é uma função privada do charger ou pode ser importada:
grep -n "^def _now_local\|^def now_local" app/services/charger_service.py
```

Se `_now_local` for privada (prefixo `_`), **não importar de charger_service**.
Em vez disso, replicar a implementação no kpis_service ou mover para um utilitário compartilhado.

### Opção A — se puder reutilizar de um utilitário existente

```bash
# Verificar se existe app/core/utils/time_utils.py com função similar:
grep -n "now_local\|ZoneInfo\|datetime.now" app/core/utils/time_utils.py 2>/dev/null
```

Se existir → importar de lá.

### Opção B — se não houver utilitário compartilhado (adicionar no topo do kpis_service.py)

```python
# Adicionar imports no topo de kpis_service.py (após imports existentes):
from zoneinfo import ZoneInfo
_TZ = ZoneInfo("America/Sao_Paulo")

# Substituir na linha 38:
# ANTES:
now = datetime.now()

# DEPOIS:
now = datetime.now(tz=_TZ)
```

**Verificar se existem outras chamadas `datetime.now()` no mesmo arquivo:**
```bash
grep -n "datetime.now()" app/services/kpis_service.py
```
Aplicar a mesma correção em todas as ocorrências encontradas.

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
```

---

## GAP-08 — response_model ausente em lookups.py e knowledge.py

**Evidência:** Múltiplos endpoints retornam `dict` bruto sem `response_model`.

**Escopo desta correção:**
`lookups.py:47,85,125` e `knowledge.py:67,129,157,181`

### Investigação — verificar schemas existentes antes de criar novos

```bash
# Já existe algum schema para lookups ou knowledge?
find app/schemas -name "*.py" | xargs grep -l "lookup\|knowledge\|Location\|Knowledge" 2>/dev/null

# Qual é o formato real retornado por cada endpoint?
sed -n '40,60p' app/routers/lookups.py
sed -n '78,95p' app/routers/lookups.py
sed -n '118,135p' app/routers/lookups.py
```

### Correção — criar schemas mínimos se não existirem

**Regra:** não criar schemas complexos agora. O objetivo é tipar o `dict` bruto
minimamente para ativar a validação automática do FastAPI e a documentação Swagger.

```python
# Exemplo para um endpoint de lookup (ajustar para o formato real encontrado):
# app/schemas/lookup_schemas.py  ← criar se não existir

from pydantic import BaseModel
from typing import Any

class LookupResponse(BaseModel):
    context: str
    # adicionar apenas os campos que o endpoint realmente retorna
    # não inventar campos — ler o return do endpoint

# No router — adicionar response_model ao decorador:
@router.get("/locations", response_model=LookupResponse)
async def get_locations(...):
    ...
```

**Se o endpoint retorna uma lista:**
```python
@router.get("/items", response_model=list[LookupResponse])
```

**Aplicar em cada um dos 7 endpoints citados, um por vez.**

### Validação

```bash
python -m pytest app/tests/ -v --tb=short -q
```

```
[ ] lookups.py L47   → response_model adicionado ✅
[ ] lookups.py L85   → response_model adicionado ✅
[ ] lookups.py L125  → response_model adicionado ✅
[ ] knowledge.py L67  → response_model adicionado ✅
[ ] knowledge.py L129 → response_model adicionado ✅
[ ] knowledge.py L157 → response_model adicionado ✅
[ ] knowledge.py L181 → response_model adicionado ✅
[ ] /docs do FastAPI mostra schemas nos endpoints corrigidos ✅
```

---

## GAP-09 — .catch(() => false) sem log em chargerService.ts

**Evidência:** `web/src/lib/api/chargerService.ts:215,226,234,242,279`
Erros de ações críticas (assign, remove, reactivate) descartados silenciosamente.

### Leitura do contexto

```bash
# Ler as linhas afetadas
sed -n '210,285p' web/src/lib/api/chargerService.ts
```

Identificar:
- Qual ação cada linha representa? (assign, remove, reactivate, outras?)
- Há um logger/console já usado em outros pontos do arquivo?

### Correção

```typescript
// ANTES:
.then(() => true).catch(() => false)

// DEPOIS — adicionar contexto no log:
.then(() => true)
.catch((err) => {
  console.error('[chargerService] Falha em [nome da ação]:', err)
  return false
})
```

Substituir `[nome da ação]` pelo nome real da operação em cada linha:
- L215: `[operação identificada na leitura]`
- L226: `[operação identificada na leitura]`
- L234: `[operação identificada na leitura]`
- L242: `[operação identificada na leitura]`
- L279: `[operação identificada na leitura]`

**Não alterar o valor de retorno (`false`) nem o fluxo de controle.**
Esta é uma mudança puramente de observabilidade.

### Validação

```
[ ] chargerService.ts salvo
[ ] TypeScript compila sem erros: cd web && npx tsc --noEmit
[ ] Dashboard de carregadores carrega normalmente no browser
[ ] Console do browser não mostra erros vermelhos novos
```

---

## GATE DE VALIDAÇÃO FINAL

Executar na ordem após TODAS as correções.

### 1. Testes (inviolável)

```bash
python -m pytest app/tests/ -v --tb=short -q 2>&1
```

**Critério:** resultado igual ou superior ao baseline.
Qualquer falha nova = regressão introduzida. Identificar qual correção causou e reverter.

### 2. TypeScript

```bash
cd web && npx tsc --noEmit 2>&1
```

Deve compilar sem erros.

### 3. Smoke test de autenticação

```
[ ] Login com credenciais válidas → funciona ✅
[ ] Login com credenciais inválidas → retorna erro claro (não 500) ✅
[ ] Request sem token para /db/tickets → retorna 401/403 (não 200) ✅  ← Gap-01 verifica
[ ] Request sem token para /tickets/search → retorna 401/403 ✅
[ ] Request sem token para /knowledge → retorna 401/403 ✅
```

### 4. Verificação de CORS

```
[ ] Frontend em localhost:3000 consegue fazer login ✅
[ ] Nenhuma mensagem de CORS bloqueado no console do browser ✅
```

---

## FORMATO DE ENTREGA

```
════════════════════════════════════════════════════
  EXECUÇÃO: CORREÇÕES DA AUDITORIA tensor-aurora
════════════════════════════════════════════════════

BASELINE
  Testes antes: [N passando]
  Estado inicial: [funcionando / problemas]

Gap-03 CORS
  Origens configuradas: [lista]
  Resultado: ✅ / ⚠️ [observação]

Gap-01 Routers sem auth
  Routers corrigidos: [lista]
  Routers já protegidos (não alterados): [lista]
  Resultado: ✅ / ⚠️ [observação]

Gap-02 Fallback auth_guard
  Exceções estreitadas para: [lista de tipos]
  Logger usado: [nome]
  Resultado: ✅ / ⚠️ [observação]

Gap-04 charger except pass
  Logger usado: [nome]
  Resultado: ✅

Gap-05 events except pass
  Logger usado em L30: [nome]
  Logger usado em L64: [nome]
  Resultado: ✅

Gap-06 kpis bare except
  Tipos estreitados para: [lista]
  Resultado: ✅

Gap-07 datetime naive kpis
  Solução: [importou de utilitário X | replicou _now_local]
  Outras ocorrências corrigidas: [lista de linhas]
  Resultado: ✅

Gap-08 response_model
  Schemas criados: [lista ou "reaproveitados de X"]
  Endpoints atualizados: [lista]
  Resultado: ✅

Gap-09 catch frontend
  Linhas corrigidas: [215, 226, 234, 242, 279]
  Resultado: ✅

ESTADO FINAL
  Testes após: [N passando — deve ser ≥ baseline]
  TypeScript: ✅ sem erros
  Smoke test: ✅ completo
  Regressões: ZERO
  Gap-10: mantido no backlog — não tocado ✅
════════════════════════════════════════════════════
```

---

## AVISOS FINAIS

```
⚠️ Gap-10 (field_validator nos schemas) → NÃO executar nesta sessão
   É backlog técnico e pode alterar comportamento de validação em produção
   Requer sessão dedicada com mapeamento de todos os campos críticos

⚠️ Gap-02 → NÃO remover o fallback, apenas estreitar o except
   O fallback existe para garantir disponibilidade quando o GLPI estiver offline
   Remover quebraria o acesso de usuários em caso de instabilidade do GLPI

⚠️ Gap-01 → Confirmar que domain_auth.py NÃO recebe Depends
   O endpoint de login é o único endpoint público intencional do sistema

⚠️ Gap-08 → Não inventar campos nos schemas
   Os campos devem ser derivados do que o endpoint realmente retorna (leitura do código)
```

---

*Gerado via PROMPT_LIBRARY — Execução de Auditoria | hub_dtic_and_sis | 2026-03-11*
