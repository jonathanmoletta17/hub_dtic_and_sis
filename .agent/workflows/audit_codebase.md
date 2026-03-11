---
description: Auditoria técnica completa de codebase — 8 fases, evidência obrigatória (arquivo:linha → trecho), gaps acumulativos numerados. Nenhuma fase altera código.
---

# /audit_codebase — Metodologia de Auditoria Técnica

## Regra de Ouro: Evidência Obrigatória

**Toda afirmação DEVE ter evidência direta do código.** Inferência é proibida.

| ✅ VÁLIDO | ❌ INVÁLIDO |
|---|---|
| `auth.py:47` → `session_timeout = None` | "provavelmente não tem timeout" |
| `tickets.py:89` → `except Exception: pass` | "pode haver erros ignorados" |

**Formato:** `` `arquivo:linha` → `trecho` — interpretação ``

---

## Gaps

Numerados sequencialmente em todas as fases (Gap-01, Gap-02...).
Severidade: **Alta** (segurança/dados) | **Média** (robustez/contrato) | **Baixa** (qualidade)

---

## Fase 0 — Inventário

```bash
find app/ -type f -name "*.py" | sort
find web/src -type f -name "*.ts" -o -name "*.tsx" | sort
grep -rn "@router\." app/routers/ --include="*.py" | grep -E "@router\.(get|post|put|patch|delete)"
grep -rn "app\.include_router" app/main.py
grep -rn "Depends(" app/ --include="*.py" | grep -v "test"
grep -rn "class .*BaseModel" app/schemas/ --include="*.py"
grep -rn "os\.environ\|os\.getenv\|settings\." app/ --include="*.py" | grep -v test | sort -u
```

---

## Fase 1 — Fluxo de Entrada (Requests)

```bash
grep -rn "Request\b" app/routers/ --include="*.py" | grep -v "BaseModel\|schema\|Schema"
grep -rn "Optional\[" app/schemas/ --include="*.py"
grep -rn "= None" app/schemas/ --include="*.py"
grep -rn "@validator\|@field_validator\|model_validator" app/schemas/ --include="*.py"
grep -rn "axios\.\|fetch(\|api\." web/src/ --include="*.ts" --include="*.tsx" | grep -E "post|put|patch" | head -30
grep -rn "class .*Request\|class .*Body\|class .*Schema" app/schemas/ --include="*.py"
```

---

## Fase 2 — Camada de Serviços

```bash
grep -rn "glpi\.\|client\.\|httpx\.\|requests\." app/services/ --include="*.py" | grep -v "#"
grep -rn "except.*pass\|except.*:\s*$" app/services/ --include="*.py"
grep -rn "lru_cache\|TTLCache\|ttl\|cache_clear\|@cached" app/services/ --include="*.py"
grep -rn "CACHE_TTL\|cache_ttl\|TTL" app/ --include="*.py"
grep -rn "time\.sleep\|\.join()\|open(" app/services/ --include="*.py" | grep -v "#\|test\|\.venv"
grep -rn "def " app/services/ --include="*.py" | grep -v "async def" | head -20
grep -rn "timeout=" app/services/ --include="*.py"
grep -rn "httpx\.AsyncClient\|requests\.get\|requests\.post" app/services/ --include="*.py" | grep -v "timeout"
```

---

## Fase 3 — Autenticação e Autorização

```bash
grep -rn "@router\." app/routers/ --include="*.py" -A 2 | grep -E "get|post|put|delete"
grep -rn "get_current_user\|verify_token\|oauth2_scheme\|token_required" app/ --include="*.py"
grep -rn "SECRET_KEY\|JWT_SECRET\|API_KEY\|password" app/ --include="*.py" | grep -v "test\|#\|\.venv"
grep -rn "algorithm\|HS256\|RS256" app/ --include="*.py"
grep -rn "expire\|expir" app/ --include="*.py" | grep -i "token\|jwt\|session"
grep -rn "profile\|role\|permission\|is_admin\|is_gestor" app/ --include="*.py" | grep -v "test\|#\|\.venv"
grep -rn "PrivateRoute\|RequireAuth\|isAuthenticated\|useAuth" web/src/ --include="*.tsx" --include="*.ts"
grep -rn "navigate\|redirect" web/src/ --include="*.tsx" | grep -i "login\|auth\|403\|401"
```

---

## Fase 4 — Fluxo de Saída (Responses)

```bash
grep -rn "return {" app/routers/ --include="*.py"
grep -rn "JSONResponse\|Response(" app/routers/ --include="*.py" | grep -v "response_model"
grep -rn "password\|secret\|token\|hash" app/schemas/ --include="*.py" | grep -v "Optional\|#"
grep -rn "class .*Response\|class .*Out" app/schemas/ --include="*.py" -A 20 | grep -E "password|secret|token"
grep -rn "status_code=" app/routers/ --include="*.py"
grep -rn "HTTPException" app/routers/ --include="*.py" | grep "detail="
grep -rn "\.catch\|catch(err\|catch (e\|onError" web/src/ --include="*.ts" --include="*.tsx" | grep -v "test\|#"
grep -rn "error\.response\|error\.status\|err\.status" web/src/ --include="*.ts" --include="*.tsx"
```

---

## Fase 5 — Contratos Inter-componentes

```bash
grep -rn "class Ticket\|class User\|class .*Schema" app/schemas/ --include="*.py" -A 30
grep -rn "interface Ticket\|type Ticket\|interface User\|type User" web/src/ --include="*.ts" --include="*.tsx" -A 20
grep -rn "\"status\":\|\"profile_id\":\|\"entity_id\":" web/src/ --include="*.ts" --include="*.tsx" | grep -v "test\|#"
grep -rn "[0-9]\{2,\}" web/src/ --include="*.ts" --include="*.tsx" | grep -v "test\|#\|className\|px\|ms\|rem" | head -20
```

---

## Fase 6 — Segurança

```bash
grep -rn "f\".*{" app/ --include="*.py" | grep -E "query|sql|filter\|WHERE" | grep -v "test\|#"
grep -rn "execute\|raw\|text(" app/ --include="*.py" | grep -v "test\|#\|\.venv"
grep -rn "CORSMiddleware\|allow_origins\|allow_credentials" app/ --include="*.py"
grep -rn "password\s*=\s*['\"].\|secret\s*=\s*['\"].\|api_key\s*=\s*['\"]." app/ --include="*.py" | grep -v "test\|env\|getenv\|os\.\|#"
grep -rn "logger\.\|print(\|logging\." app/ --include="*.py" | grep -iE "password|token|secret|cpf|email" | grep -v "test\|#"
```

---

## Fase 7 — Robustez e Resiliência

```bash
grep -rn "glpi\.\|httpx\.\|requests\." app/services/ --include="*.py" -B 2 -A 5 | grep -v "try:\|except\|fallback"
grep -rn "os\.environ\[" app/ --include="*.py" | grep -v "test\|#"
grep -rn "os\.getenv(" app/ --include="*.py" | grep -v ", " | grep -v "test\|#"
grep -rn "open(\|json\.load\|json\.loads" app/ --include="*.py" | grep -v "try:\|with open\|test\|#" | head -20
grep -rn "while True\|while 1" app/ --include="*.py" | grep -v "test\|#"
grep -rn "datetime\.now()\b" app/ --include="*.py" | grep -v "utcnow\|timezone\|tz\|test\|#"
grep -rn "datetime\.utcnow()" app/ --include="*.py"
```

---

## Fase 8 — Síntese e Relatório Final

### Tabela de gaps (consolidar todas as fases)

```
| ID     | Fase | Severidade | Arquivo:Linha | Descrição | Recomendação |
|--------|------|------------|---------------|-----------|--------------|
| Gap-01 | ...  | Alta       | ...           | ...       | ...          |
```

### Sumário executivo

1. **Total por severidade:** Alta X | Média X | Baixa X
2. **Top 3 riscos** com evidência (`arquivo:linha` → `trecho`)
3. **Cobertura de auth:** X de Y rotas protegidas
4. **Contratos:** X validados, Y com discrepância

### Roadmap

```
Prioridade 1 (Alta — antes do deploy): Gap-XX → ação concreta
Prioridade 2 (Média — próximo sprint): Gap-XX → ação concreta
Prioridade 3 (Baixa — backlog):        Gap-XX → ação concreta
```

### Checklist de completude

- [ ] Todo gap tem ID único, arquivo:linha e trecho
- [ ] Nenhuma afirmação sem evidência direta
- [ ] Todas as fases executadas (ou omissão justificada)
- [ ] Nenhum código foi alterado

---

## Uso

- **Fases seletivas:** "execute apenas Fase 3 e Fase 6"
- **Output:** salvar em `docs/auditoria_<data>_<escopo>.md`
- **Regra absoluta:** Nenhuma fase altera código. Correções vão como recomendação no Gap.
