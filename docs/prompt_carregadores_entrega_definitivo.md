# PROMPT — Estabilização do Dashboard de Carregadores: Entrega Hoje

> Destino: antigravity  
> Base: Relatório técnico "Comprehensive Technical Audit: Charger Dashboard"  
> Objetivo master: corrigir deficiências documentadas, zero adições, zero regressões  
> Escopo rígido: CORRIGIR e ESTABILIZAR apenas — nada de novo  
> Critério de encerramento: smoke test completo passando, testes unitários intactos

---

## REGRA ABSOLUTA DESTA SESSÃO

```
❌ Não criar nenhuma feature nova
❌ Não criar nenhum endpoint novo
❌ Não instalar nenhuma dependência sem verificar requirements.txt antes
❌ Não alterar assinatura de calculate_business_minutes (quebra testes)
❌ Não alterar SWR TTLs (15000ms/30000ms) — decisão de produto, não bug
❌ Não criar materialized views — escopo de sessão dedicada futura
❌ Não escrever testes E2E — fora de escopo hoje
✅ Cada correção é validada e testada ANTES de avançar para a próxima
✅ Em dúvida: documentar como débito técnico e manter o que funciona
```

---

## LEITURA OBRIGATÓRIA ANTES DE QUALQUER LINHA DE CÓDIGO

Ler na íntegra. Registrar o conteúdo relevante. Nunca reconstruir de memória.

```
[ ] app/core/utils/time_utils.py
    → função: calculate_business_minutes(start_dt, end_dt, schedule_start, schedule_end, work_on_weekends)
    → verificar todos os pontos onde datetime.now() é chamado
    → verificar imports: existe pytz? zoneinfo? qualquer referência a timezone?

[ ] app/services/charger_service.py
    → identificar as 4 queries: Meta, Avail, Alloc, Pending
    → localizar SQL_RANKING_LOGS — copiar a query completa
    → confirmar que @lru_cache existe APENAS no parsing de ITIL Categories
    → confirmar que NÃO existe nenhum outro cache

[ ] app/tests/test_time_utils.py
    → listar todos os testes existentes com seus nomes
    → este é o baseline — nenhum deles pode quebrar

[ ] data/charger_settings.json
    → o arquivo existe? Se sim, qual é o schema exato?
    → onde no código ele é lido? (localizar a função de load)
    → o que acontece hoje se o arquivo não existir?

[ ] web/src/hooks/useChargerData.ts
    → confirmar refreshInterval: 15000 para Kanban
    → confirmar refreshInterval: 30000 para Ranking
    → quais endpoints são consumidos?
```

---

## BASELINE INVIOLÁVEL

Executar antes de qualquer alteração. Registrar o resultado exato.

```bash
python -m pytest app/tests/test_time_utils.py -v 2>&1
```

**Registrar:**
```
BASELINE:
  N testes passando: [número]
  Nomes dos testes: [lista]
  Algum teste já falhando: [sim — PARAR E REPORTAR | não — prosseguir]
```

Se qualquer teste já estiver falhando **antes** das correções → parar, reportar,
não avançar. Não corrigir os testes agora — entender por que falham primeiro.

---

## CORREÇÃO A — Cache TTL no backend (N+1 Polling)

### Problema documentado
`charger_service.py` executa 4 queries SQL brutas a cada request.
Com SWR polling a cada 15s, múltiplos usuários simultâneos geram
explosão de conexões no banco de produção GLPI.

O relatório confirma: apenas ITIL Categories usa `@lru_cache`.
As 4 queries do Kanban (Meta, Avail, Alloc, Pending) e o Ranking
não têm nenhuma forma de cache.

### Investigação antes de implementar

```
[ ] Verificar requirements.txt:
    → cachetools está listado? → pode usar TTLCache
    → fastapi-cache está listado? → pode usar @cache decorator
    → nada de cache? → usar functools + time (stdlib, zero dependência nova)

[ ] As 4 queries recebem parâmetros variáveis por request?
    (ex: context="dtic" ou "sis" como parâmetro)
    → se sim: a chave do cache deve incluir o context
    → se não: cache simples sem chave

[ ] SQL_RANKING_LOGS recebe quais parâmetros?
    → o cache do ranking precisa incluir todos eles na chave
```

### Implementação com stdlib (fallback seguro se não houver dependência de cache)

Criar `app/core/utils/cache_utils.py` — arquivo novo, não modifica nada existente:

```python
"""
cache_utils.py — TTL cache mínimo para o dashboard de carregadores.
Usa apenas stdlib (functools + time). Zero dependência nova.
Propósito: reduzir N+1 queries do Kanban/Ranking.
"""
import time
from functools import wraps
from typing import Any

_cache_store: dict[str, tuple[Any, float]] = {}


def ttl_cache(ttl_seconds: int):
    """
    Decorator de cache com TTL.
    A chave inclui o nome da função + todos os argumentos.
    Thread-safety: suficiente para FastAPI com workers únicos.
    Para multi-worker, substituir por Redis no futuro.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{func.__module__}.{func.__name__}:{args}:{sorted(kwargs.items())}"
            now = time.monotonic()
            if key in _cache_store:
                value, expires_at = _cache_store[key]
                if now < expires_at:
                    return value
            result = func(*args, **kwargs)
            _cache_store[key] = (result, now + ttl_seconds)
            return result
        return wrapper
    return decorator
```

### Aplicar nas funções de query em charger_service.py

```python
# Adicionar import no topo do charger_service.py:
from app.core.utils.cache_utils import ttl_cache

# Aplicar nos métodos de query:
@ttl_cache(ttl_seconds=10)   # menor que o SWR de 15s → garante compartilhamento
def get_kanban_state(self, context: str):   # ← ajustar para o nome real do método
    ...

@ttl_cache(ttl_seconds=25)   # menor que o SWR de 30s → dados frescos no poll
def get_ranking_data(self, context: str):   # ← ajustar para o nome real do método
    ...
```

**Atenção:** se os métodos forem de classe (self como primeiro arg),
`self` vai entrar na chave do cache. Isso é correto se a instância for singleton.
Se não for singleton, extrair a lógica para função pura antes de decorar.
Verificar o padrão de instanciação antes de aplicar.

### Validação desta correção

```bash
python -m pytest app/tests/test_time_utils.py -v
# Deve passar com o mesmo resultado do baseline
```

```
[ ] Abrir o dashboard em dois tabs simultâneos
[ ] Aguardar 1 ciclo de polling (15s)
[ ] Verificar nos logs do FastAPI: quantas queries SQL foram executadas?
    → Esperado: 4 queries (1 ciclo), não 8 (2 ciclos independentes)
[ ] O Kanban mostra os mesmos dados nos dois tabs? ✅
[ ] Trocar para aba Ranking → dados aparecem? ✅
```

---

## CORREÇÃO B — Resiliência do SQL_RANKING_LOGS (LIKE %)

### Problema documentado
```sql
-- Query atual (confirmada pelo relatório):
WHERE new_value LIKE CONCAT('%(', it.items_id, ')%')
```
Força full table scan em `glpi_logs`. Sem índice possível neste padrão.
Impacto: latência significativa — SLA p95 < 200ms não garantido.

### Investigação antes de qualquer mudança

```
[ ] Copiar a query SQL_RANKING_LOGS completa do código
[ ] Executar diretamente no MySQL de produção (via GLPI ou cliente SQL):
    EXPLAIN SELECT ... [a query atual]
    → Registrar o plano de execução: usa índice? Full scan? Quantas rows?

[ ] Inspecionar 5-10 linhas reais da coluna afetada em glpi_logs:
    SELECT new_value FROM glpi_logs WHERE linked_action = 15 LIMIT 10;
    → Qual é o formato exato? "(123)" no final? No meio? Com texto antes?
    → O padrão é 100% consistente? Ou há variações de formato?

[ ] Verificar se linked_action = 15 já filtra suficientemente:
    SELECT COUNT(*) FROM glpi_logs WHERE linked_action = 15;
    → Se retornar < 10.000 linhas: o LIKE já é tolerável nesse subset
    → Se retornar > 100.000 linhas: a otimização é crítica
```

### Decisão baseada na investigação

**Caminho 1 — Se linked_action=15 retornar volume baixo (< 10k linhas):**
```
→ Verificar se existe índice em (linked_action) em glpi_logs
→ Se não existir, verificar se é possível criar:
   EXPLAIN CREATE INDEX idx_linked_action ON glpi_logs(linked_action);
→ Com índice em linked_action, o LIKE no subset pequeno é aceitável
→ Documentar como débito técnico de baixa prioridade e seguir em frente
```

**Caminho 2 — Se linked_action=15 retornar volume alto (> 100k linhas):**
```
→ Verificar o formato exato de new_value:
   Se sempre termina com "(ID)": usar LIKE '%( ID)' em vez de LIKE '%( ID)%'
   (âncora no final é marginalmente mais eficiente)
   Se houver campo items_id diretamente em outra coluna de glpi_logs:
   Usar WHERE items_id = it.items_id (sem LIKE — usa índice)
→ Se não houver alternativa segura: documentar como débito técnico e manter o LIKE
```

**Caminho 3 — Não conseguiu confirmar o formato dos dados:**
```
→ NÃO alterar a query
→ Documentar: "SQL_RANKING_LOGS mantido como débito técnico consciente.
   Otimização requer análise de dados de produção. Risco: latência alta,
   não risco de incorreção. Resolver em sessão dedicada com acesso ao DB."
```

### Validação se a query foi alterada

```
[ ] Executar EXPLAIN na nova query → confirma uso de índice? ✅
[ ] Comparar resultados: query antiga vs nova para 5 carregadores reais
    → Os rankings retornam exatamente os mesmos minutos?
    → Qualquer diferença = query nova está errada → REVERTER imediatamente
[ ] python -m pytest app/tests/test_time_utils.py -v → baseline intacto ✅
```

---

## CORREÇÃO C — Timezone em time_utils.py

### Problema documentado
```python
# Código atual (inferido do relatório):
end_time = solvedate if solvedate else datetime.now()
```
`datetime.now()` retorna tempo naive sem timezone.
No RS (America/Sao_Paulo), horário de verão (outubro/novembro)
pode causar desvio de ±1 hora nos cálculos de minutos de serviço.

### Investigação antes de implementar

```
[ ] Localizar TODOS os pontos onde datetime.now() é chamado em time_utils.py
[ ] Verificar os datetimes que chegam do GLPI (start_dt, solvedate):
    → São naive (sem tz) ou têm tzinfo?
    → Executar: print(type(solvedate), solvedate.tzinfo) em debug
[ ] Verificar Python do servidor:
    import sys; print(sys.version)   → deve ser 3.9+ para usar zoneinfo nativo
    import zoneinfo; print("ok")     → confirmar disponibilidade
[ ] Verificar se pytz já está no requirements.txt
    → Se sim: usar pytz.timezone("America/Sao_Paulo")
    → Se não: usar zoneinfo (stdlib 3.9+), zero dependência nova
```

### Implementação mínima — não muda a assinatura de calculate_business_minutes

```python
# Adicionar no topo de time_utils.py (após imports existentes):
from zoneinfo import ZoneInfo   # stdlib Python 3.9+

_TZ = ZoneInfo("America/Sao_Paulo")


def _now_local() -> datetime:
    """Retorna datetime atual com timezone São Paulo. Substitui datetime.now()."""
    return datetime.now(tz=_TZ)


def _ensure_tz(dt: datetime) -> datetime:
    """
    Garante que dt tem timezone.
    Se naive (vindo do GLPI sem tz), assume São Paulo.
    Se já tem tz, retorna sem alterar.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=_TZ)
    return dt
```

Substituir no corpo das funções existentes:
```python
# ANTES:
end_time = solvedate if solvedate else datetime.now()

# DEPOIS:
end_time = _ensure_tz(solvedate) if solvedate else _now_local()
start_dt = _ensure_tz(start_dt)
```

**Regra crítica:** se `start_dt` e `end_time` precisarem ser comparados,
ambos devem ter tz ou ambos devem ser naive. Misturar causa `TypeError`.
`_ensure_tz` resolve isso — aplicar nos dois lados antes de qualquer comparação.

### Validação desta correção

```bash
python -m pytest app/tests/test_time_utils.py -v
# Resultado deve ser IDÊNTICO ao baseline — mesma quantidade, mesmos nomes, todos passando
```

```
[ ] Comparar valores de 5 carregadores reais antes e depois:
    → Os minutos de serviço mudaram?
    → Se mudaram: a diferença é de exatamente 60min? → indica correção de DST ✅
    → Se a diferença for aleatória → algo está errado → REVERTER
[ ] Carregador com ticket aberto há menos de 1 hora → tempo aparece correto? ✅
[ ] Carregador disponível → mostra 0 minutos ou campo vazio? ✅
```

---

## CORREÇÃO D — Resiliência do charger_settings.json

### Problema documentado
`data/charger_settings.json` armazena overrides globais de expediente.
O relatório confirma que existe fallback hardcoded ("08:00"/"18:00"),
mas não documenta o que acontece se o arquivo não existir em runtime.

### Investigação

```
[ ] Localizar a função que lê charger_settings.json
[ ] O que acontece hoje se o arquivo não existir?
    → FileNotFoundError não capturado? → crash do endpoint
    → json.JSONDecodeError não capturado? → crash por arquivo corrompido
    → Já tem try/except? → qual é o fallback?
[ ] Qual é o schema exato do JSON? (registrar os campos)
```

### Implementação — apenas se a investigação confirmar que falta o try/except

```python
# Envolver o load existente com tratamento defensivo:
import json
from pathlib import Path

SETTINGS_PATH = Path("data/charger_settings.json")
_SETTINGS_DEFAULTS = {
    "business_start": "08:00",
    "business_end": "18:00",
    "work_on_weekends": False
}

def load_charger_settings() -> dict:
    try:
        if not SETTINGS_PATH.exists():
            logger.warning(
                f"charger_settings.json ausente em {SETTINGS_PATH}. "
                "Usando expediente padrão 08:00-18:00."
            )
            return _SETTINGS_DEFAULTS.copy()

        with open(SETTINGS_PATH) as f:
            data = json.load(f)

        # Garantir que campos obrigatórios existem
        return {**_SETTINGS_DEFAULTS, **data}

    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"Erro ao ler charger_settings.json: {e}. Usando padrão.")
        return _SETTINGS_DEFAULTS.copy()
```

**Se já existe try/except funcionando → não alterar. Apenas documentar.**

### Validação

```
[ ] Renomear data/charger_settings.json → data/charger_settings.json.bak
[ ] Reiniciar o servidor (ou recarregar o módulo)
[ ] Abrir o dashboard → carrega sem erro 500? ✅
[ ] O expediente exibido é 08:00-18:00? ✅
[ ] Log mostra warning (não erro crítico)? ✅
[ ] Restaurar: mv data/charger_settings.json.bak data/charger_settings.json
[ ] Dashboard ainda funciona com o arquivo restaurado? ✅
```

---

## CORREÇÃO E — Validação dos endpoints de schedule e offline

### Verificar apenas — não reescrever

```
[ ] PUT /api/v1/{context}/chargers/{charger_id}/schedule
    → Payload: ScheduleUpdate(business_start, business_end)
    → "25:00" é aceito sem erro? → deve retornar 422 (Pydantic)
    → "abc" é aceito? → deve retornar 422
    → Se não houver validação de formato HH:MM:
       Adicionar validator no schema Pydantic (não no router):

       from pydantic import validator
       import re

       class ScheduleUpdate(BaseModel):
           business_start: str
           business_end: str

           @validator('business_start', 'business_end')
           def validate_time_format(cls, v):
               if not re.match(r'^([01]\d|2[0-3]):[0-5]\d$', v):
                   raise ValueError(f"Formato inválido '{v}'. Esperado HH:MM (00:00-23:59)")
               return v

[ ] PUT /api/v1/{context}/chargers/{charger_id}/offline
    → Payload: OfflineUpdate(is_offline, reason, expected_return)
    → is_offline recebe string "true"? → Pydantic deve converter ou rejeitar
    → Se is_offline for Optional[bool], verificar o comportamento com None
```

---

## GATE DE VALIDAÇÃO FINAL

Executar após TODAS as correções. Na ordem abaixo.

### 1. Testes unitários (inviolável)

```bash
python -m pytest app/tests/test_time_utils.py -v
```

**Critério de sucesso:** resultado idêntico ao baseline.  
Qualquer falha = regressão introduzida = identificar qual correção causou e reverter.

### 2. Smoke test completo do dashboard

```
[ ] Abrir o dashboard de carregadores no browser
[ ] Console do browser: zero erros vermelhos ✅
[ ] Kanban renderiza com 3 colunas:
    → "Disponíveis" com lista de carregadores ✅
    → "Ocupados" com carregadores e tempo de serviço calculado ✅
    → "Offline" (se houver carregadores offline) ✅
[ ] Ranking carrega com dados ✅
[ ] Aguardar 15s → Kanban atualiza automaticamente ✅
[ ] Aguardar 30s → Ranking atualiza ✅
[ ] Network tab: requests para /kanban e /ranking retornam 200 ✅
[ ] Carregador ocupado: o tempo de serviço faz sentido calendário? ✅
    (ex: carregador alocado há 2h dentro do expediente → ~120 min)
[ ] Testar com contexto SIS e DTIC (se ambos têm carregadores) ✅
```

### 3. Verificação anti-regressão por correção

```
[ ] Correção A (cache): dois tabs abertos → dados consistentes entre eles ✅
[ ] Correção B (SQL): rankings numericamente iguais ao estado anterior ✅
    (se a query foi alterada — se foi mantida como débito, marcar como N/A)
[ ] Correção C (timezone): tempos de serviço de carregadores reais fazem sentido ✅
[ ] Correção D (settings): remover JSON → app não crasha, mostra 08:00-18:00 ✅
[ ] Correção E (validação): POST com HH:MM inválido → retorna 422 ✅
```

---

## FORMATO DE ENTREGA OBRIGATÓRIO

```
════════════════════════════════════════════════════
  ESTABILIZAÇÃO DO DASHBOARD DE CARREGADORES
════════════════════════════════════════════════════

BASELINE
  Testes antes das correções: [N passando — lista]
  Estado do dashboard antes: [funcionando / problemas observados]

CORREÇÃO A — Cache TTL
  Dependência usada: [stdlib / cachetools / outra]
  TTL Kanban: [Xs] | TTL Ranking: [Xs]
  Métodos decorados: [lista]
  Redução de queries confirmada: [✅ / não verificável]

CORREÇÃO B — SQL LIKE %
  Volume de linked_action=15: [N linhas]
  Decisão: [query otimizada para X | mantida como débito técnico]
  Motivo: [justificativa]
  Rankings comparados: [idênticos ✅ / N/A — query mantida]

CORREÇÃO C — Timezone
  Python version: [X.Y.Z]
  zoneinfo disponível: [✅ / ❌ — usado pytz]
  Datetimes GLPI eram naive: [✅ / já tinham tz]
  Diferença em valores reais: [nenhuma / X min — esperado por DST]

CORREÇÃO D — charger_settings.json
  Comportamento anterior sem arquivo: [crash / fallback silencioso]
  Implementação: [try/except adicionado / já existia]

CORREÇÃO E — Validação de endpoints
  Schedule: validação HH:MM [adicionada / já existia]
  Offline: is_offline bool [✅ Pydantic cobre / ajuste necessário]

ESTADO FINAL
  Testes após correções: [N passando — deve ser = baseline]
  Smoke test: ✅ completo
  Regressões: ZERO
  Dashboard: ✅ PRONTO PARA ENTREGA
════════════════════════════════════════════════════
```

---

## DÉBITOS TÉCNICOS — NÃO RESOLVER HOJE

Documentar no relatório de entrega, não corrigir agora:

```
[ ] SQL_RANKING_LOGS LIKE % → otimização requer sessão dedicada com
    acesso ao DB de produção para análise de volume e índices disponíveis
[ ] Materialized views → eliminariam completamente o N+1, mas requerem
    migração de schema coordenada com DBA
[ ] Testes E2E → cobertura de UI requer Playwright + ambiente de staging
    com GLPI real mockado
[ ] Cache multi-worker → a implementação de cache atual (dict em memória)
    não é compartilhada entre workers FastAPI. Para deploy com múltiplos
    workers, substituir por Redis
```

---

*Gerado via PROMPT_LIBRARY — Entrega Dashboard Carregadores | hub_dtic_and_sis | 2026-03-11*
