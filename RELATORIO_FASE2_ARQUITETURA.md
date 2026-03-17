# ▶️ RELATÓRIO FASE 2 — Investigação Arquitetural Completa

## 1. Frontend (Next.js)

**Versão:** Next.js `16.1.6`, React `19.2.3`, TypeScript `^5`
**Router:** App Router (`web/src/app/`)
**State Manager:** Zustand `5.0.11` (com middleware `persist → localStorage`)
**Styling:** TailwindCSS `^4` (via PostCSS)
**Build Mode Docker:** `npx next dev` (modo desenvolvimento, não produção)

### Rotas e Componentes

| Rota | Componente | Proteção |
|---|---|---|
| `/` | `app/page.tsx` | Nenhuma (login page) |
| `/selector` | `app/selector/page.tsx` | Middleware cookie check |
| `/[context]/dashboard` | `app/[context]/dashboard/page.tsx` | Middleware + ProtectedRoute |
| `/[context]/user` | `app/[context]/user/page.tsx` | Middleware + ProtectedRoute |
| `/[context]/user/profile` | `app/[context]/user/profile/page.tsx` | Middleware + ProtectedRoute |
| `/[context]/gestao-carregadores` | Charger management | Middleware + ContextGuard |
| `/[context]/knowledge` | Knowledge base | Middleware + ContextGuard |
| `/[context]/search` | Search | Middleware + ProtectedRoute |
| `/[context]/new-ticket` | New ticket wizard | Middleware + ProtectedRoute |
| `/[context]/ticket/[id]` | Ticket detail | Middleware + ProtectedRoute |
| `/[context]/permissoes` | Permissions matrix | Middleware + ProtectedRoute |

### Middleware (`web/src/middleware.ts`)
- **Matcher:** Tudo exceto `/`, `/_next/*`, `/api/auth/*`, `/favicon.ico`
- **Lógica:** Procura cookie `sessionToken`, `X-Session-Token`, ou `Session-Token`
- **Se ausente:** Redireciona para `/?session_expired=1` (307)
- ⚠️ **PROBLEMA CRÍTICO:** O login NUNCA seta esse cookie → bloqueio total

### Zustand Stores
| Store | Arquivo | Persiste? |
|---|---|---|
| `useAuthStore` | `store/useAuthStore.ts` | Sim (localStorage, exceto `_credentials`) |
| `useDraftStore` | `store/useDraftStore.ts` | — |
| `useWizardStore` | `store/useWizardStore.ts` | — |

### Auth Guards do Frontend
| Componente | Arquivo | Mecanismo |
|---|---|---|
| `ProtectedRoute` | `components/auth/ProtectedRoute.tsx` | Client-side: React `useEffect` verifica Zustand |
| `ContextGuard` | `components/auth/ContextGuard.tsx` | Client-side: Verifica `hub_roles` contra `ContextManifest` |

---

## 2. Backend (FastAPI)

**Framework:** FastAPI `0.115.x` com Uvicorn
**Porta interna:** `8080` (definido no Dockerfile)
**Auth:** GLPI Session-based (não JWT)
**Guard:** `verify_session()` em `app/core/auth_guard.py`

### Endpoints (Routers Registrados)

| Router | Prefixo | Auth Guard? |
|---|---|---|
| `health` | `/health` | Não |
| `domain_auth` | `/api/v1/{context}/auth` | Não (login/logout) |
| `domain_formcreator` | `/api/v1/{context}/domain/formcreator` | Não |
| `lookups` | `/api/v1/{context}/lookups` | **Sim** |
| `search` | `/api/v1/{context}/tickets` | **Sim** |
| `db_read` | `/api/v1/{context}/db` | **Sim** |
| `orchestrator` | `/api/v1/{context}/orchestrate` | **Sim** |
| `chargers` | `/api/v1/{context}/chargers` | **Sim** |
| `events` | `/api/v1/{context}/events` | **Sim** |
| `knowledge` | `/api/v1/{context}/knowledge` | **Sim** |
| `admin` | `/api/v1/{context}/admin` | **Sim** |
| `items` (catch-all) | `/api/v1/{context}/{itemtype}` | **Sim** |

### CORS Configuration (`app/main.py` L72-78)
```python
allow_origins=["http://localhost:3000"]  # ⚠️ APENAS localhost:3000
allow_credentials=True
```
- ⚠️ **PROBLEMA:** Não inclui `http://carregadores.local:8080` nem `http://carregadores.local:3000`. Requests CORS do navegador serão bloqueados.

---

## 3. Infraestrutura (Docker + NPM)

### Docker Compose Services
| Service | Container | Porta Host | Porta Interna | Rede |
|---|---|---|---|---|
| `nginx-proxy-manager` | `npm` | 8080, 81, 8443 | 80, 81, 443 | `npm-rede` + `apps-rede` |
| `glpi-backend` | `glpi-universal-backend` | Nenhuma | 8080 | `apps-rede` |
| `glpi-frontend` | `glpi-tensor-frontend` | Nenhuma | 3000 | `apps-rede` |

### NPM Proxy Hosts (Confirmado via screenshots)
| Domínio | Destino | Status |
|---|---|---|
| `api.carregadores.local` | `http://glpi-universal-backend:8080` | ✅ Online |
| `carregadores.local` | `http://glpi-tensor-frontend:3000` | ✅ Online |

### Fluxo de Rede
```
Browser (Windows)
  ↓ http://carregadores.local:8080
WSL2 (port 8080 → NPM container port 80)
  ↓ NPM: Host header = "carregadores.local" → glpi-tensor-frontend:3000
  ↓ NPM: Host header = "api.carregadores.local" → glpi-universal-backend:8080
```

---

## 4. Inconsistências Encontradas

| # | Tipo | Descrição | Severidade |
|---|---|---|---|
| 1 | **Bloqueio Total** | `middleware.ts` exige cookie `sessionToken`, login nunca o grava | 🔴 Crítico |
| 2 | **CORS** | Backend só aceita `localhost:3000`, mas frontend acessa via `carregadores.local:8080` | 🔴 Crítico |
| 3 | **Segurança** | Zustand armazena `_credentials` (senha em texto puro) na memória do browser | 🟡 Alto |
| 4 | **Redundância** | Login duplo: primeiro no `page.tsx`, segundo no `selector/page.tsx` | 🟡 Médio |
| 5 | **SSR** | `API_BASE` no `httpClient.ts` usava URL externa para SSR (corrigido nesta sessão) | ✅ Corrigido |
| 6 | **Docker** | Frontend Dockerfile expõe `PORT=3001` mas CMD usa `-p 3000` | 🟡 Baixo |
| 7 | **Docs** | `docs/` contém ~50 prompts e auditorias misturadas sem organização | 🟡 Baixo |

---

## ✅ FASE 2 CONCLUÍDA
