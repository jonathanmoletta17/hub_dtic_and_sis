# Auditoria Técnica — tensor-aurora
**Data:** 2026-03-11 | **Escopo:** `app/` + `web/src/` | **Fases executadas:** 0–8

---

## Sumário Executivo

| Severidade | Total |
|---|---|
| 🔴 Alta | 3 |
| 🟡 Média | 5 |
| 🔵 Baixa | 2 |
| **Total** | **10** |

**Top 3 riscos:**
1. **8 routers sem autenticação** — qualquer request não autenticado acessa `/db/query`, `/db/kpis`, `/tickets/search`, `/knowledge/*`, `/lookups/*`, `/events/stream`, `/orchestrate`, `/{itemtype}` sem validação de sessão.
2. **Degradação graciosa silenciosa** — `auth_guard.py:111-114` aceita qualquer token quando GLPI está indisponível, tornando a autenticação contornável por falha de infraestrutura.
3. **`except: pass` silenciando erros** — `events.py:30` e `charger_service.py:189` descartam exceções sem log, impossibilitando diagnóstico de falhas em produção.

---

## Tabela Consolidada de Gaps

| ID | Fase | Sev. | Arquivo:Linha | Evidência | Recomendação |
|---|---|---|---|---|---|
| Gap-01 | 3 | 🔴 Alta | `app/routers/db_read.py:20` | `# Na Fase 1, ao refatorar... adicionar: dependencies=[Depends(verify_session)]` — comentário indica proteção pendente | Adicionar `dependencies=[Depends(verify_session)]` ao `APIRouter` de `db_read`, `lookups`, `knowledge`, `search`, `events`, `orchestrator`, `items` |
| Gap-02 | 3 | 🔴 Alta | `app/core/auth_guard.py:111-114` | `except Exception as e: ... return {"session_token": token, "validated": True, "source": "fallback"}` — qualquer exceção (incluindo timeout de rede) aceita o token como válido | Remover degradação graciosa ou limitar a exceções específicas de conectividade (`httpx.ConnectError`, `asyncio.TimeoutError`) |
| Gap-03 | 1 | 🔴 Alta | `app/main.py:72` | `allow_origins=["*"]` — CORS aberto para qualquer origem com `allow_credentials=True` | Restringir `allow_origins` para domínios específicos (ex: `["https://hub.dtic.local"]`); `allow_credentials=True` com `allow_origins=["*"]` é inválido em browsers modernos e perigoso |
| Gap-04 | 2 | 🟡 Média | `app/services/charger_service.py:189` | `except: pass` — erro de parse de `end_date` ignorado sem log | Substituir por `except ValueError: logger.warning("end_date inválido: %s", end_date)` |
| Gap-05 | 2 | 🟡 Média | `app/routers/events.py:30` e `64-65` | `except Exception: pass` (linha 30) e `except Exception as e: pass` (linha 64) — erros de DB no SSE stream descartados | Logar com `_log.warning(...)` para diagnóstico; linha 30 pode silenciar erro de conexão ao banco na inicialização |
| Gap-06 | 2 | 🟡 Média | `app/services/kpis_service.py:63` | `except: return _get_period_range("current_month")` — bare `except:` captura `SystemExit`, `KeyboardInterrupt` etc. | Substituir por `except (ValueError, AttributeError):` |
| Gap-07 | 7 | 🟡 Média | `app/services/kpis_service.py:38` | `now = datetime.now()` — datetime naive (sem timezone) | Substituir por `datetime.now(tz=ZoneInfo("America/Sao_Paulo"))` alinhando com `charger_service.py:_now_local()` |
| Gap-08 | 4 | 🟡 Média | `app/routers/lookups.py:47,85,125` · `knowledge.py:67,129,157,181` | `return {"context": context, "locations": data}` — múltiplos endpoints retornam dicts brutos sem `response_model` | Definir `response_model=` nos decoradores ou criar schemas de resposta para documentação e validação automática |
| Gap-09 | 4 | 🔵 Baixa | `web/src/lib/api/chargerService.ts:215,226,234,242,279` | `.then(() => true).catch(() => false)` — erros de ações críticas (assign, remove, reactivate) descartados sem log | Adicionar `.catch(err => { console.error(..., err); return false; })` para rastreabilidade |
| Gap-10 | 1 | 🔵 Baixa | `app/schemas/` (todos) | Nenhuma ocorrência de `@validator`, `@field_validator` ou `model_validator` — schemas sem validação de regras de negócio | Validar campos críticos: `urgency` (1-6), `type` (1-2), horários no formato `HH:MM`, `reason` não vazio quando `is_offline=true` |

---

## Roadmap Priorizado

### Prioridade 1 — Antes do próximo deploy

**Gap-01:** Adicionar `Depends(verify_session)` nos 8 routers desprotegidos.
```python
# app/routers/db_read.py (e demais)
router = APIRouter(prefix="...", dependencies=[Depends(verify_session)])
```

**Gap-02:** Restringir o fallback do `auth_guard.py` a exceções de conectividade.
```python
except (httpx.ConnectError, asyncio.TimeoutError) as e:
    _log.warning("GLPI indisponível (fallback): %s", e)
    return {"session_token": token, "validated": True, "source": "fallback"}
```

**Gap-03:** Fixar CORS para origens específicas.
```python
allow_origins=["https://app.dtic.local", "http://localhost:3000"]
```

---

### Prioridade 2 — Próximo sprint

**Gap-04:** `charger_service.py:189` — trocar `except: pass` por log com context.

**Gap-05:** `events.py:30,64` — logar exceções do SSE stream.

**Gap-06:** `kpis_service.py:63` — estreitar o `except:` bare.

**Gap-07:** `kpis_service.py:38` — `datetime.now()` → `_now_local()` já definido no `charger_service.py`.

---

### Prioridade 3 — Backlog técnico

**Gap-08:** Adicionar `response_model` nos endpoints de `lookups` e `knowledge`.

**Gap-09:** Adicionar log nos `.catch(() => false)` do `chargerService.ts`.

**Gap-10:** Adicionar `@field_validator` nos schemas críticos de criação/atualização.

---

## Checklist de Completude

- [x] Todo gap tem ID único, arquivo:linha e trecho de código
- [x] Nenhuma afirmação foi feita sem evidência direta
- [x] Todas as 8 fases foram executadas
- [x] Nenhum código foi alterado durante a auditoria
