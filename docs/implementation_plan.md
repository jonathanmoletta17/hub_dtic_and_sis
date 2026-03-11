# 📋 Plano Mestre de Implementação — Hub Unificado v2.0

> **Data**: 2026-03-09 | **Fonte**: 6 documentos de estudo (~2.200 linhas sintetizadas)  
> **Escopo**: 50 ações concretas · 5 fases · ~6-8 semanas total  
> **Princípio**: Cada fase entrega valor independente. Nenhuma fase é destrutiva.

---

## User Review Required

> [!CAUTION]
> **2 bugs críticos devem ser corrigidos ANTES de qualquer refatoração** (Fase 0). O sistema atual permite acesso a dados reais sem autenticação e o Vision Selector não reseta contexto ao trocar de volta para Gestor.

> [!IMPORTANT]
> **Decisões pendentes** que precisam da sua confirmação estão na Seção 7.

---

## 1. Inventário Completo de Mudanças

### Legenda de Rastreabilidade

Cada ação é rastreada ao documento de origem:
- **A** = arquitetura_multi_contexto.md (15 pontos hardcoded)
- **B** = estudo_permissoes_glpi.md (Abordagem C)
- **C** = relatorio_integracao_glpi.md (API endpoints)
- **D** = reflexao_consolidacao.md (gaps)
- **E** = consolidacao_definitiva.md (tech stack legada)
- **F** = diagnostico_bugs_reflexao_processo.md (bugs)

---

## 2. Fase 0 — Correção de Bugs Críticos + Rede de Segurança [(1-2 dias)](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/portal/src/modules/dashboard/DashboardView.tsx#4-11)

> [!CAUTION]
> Nenhum trabalho de refatoração deve começar até que esta fase esteja completa e validada.

---

### Fix: ProfileSwitcher — Contexto não reseta `[F1]`

#### [MODIFY] [ProfileSwitcher.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ProfileSwitcher.tsx)

**Root Cause** (L63): `targetContext = hubRole.context_override || activeContext` — quando gestor (sem override) troca de volta, `activeContext` já é `"sis-memoria"`.

```diff
-    const targetContext = hubRole.context_override || activeContext;
+    // Fix: se hubRole não tem context_override, resetar para contexto raiz
+    // "sis-memoria" → "sis", "sis-manutencao" → "sis", "dtic" → "dtic"
+    const baseContext = activeContext.split('-')[0];
+    const targetContext = hubRole.context_override || baseContext;
```

**Impacto**: Corrige navegação Gestor SIS (URL, dados, título, sidebar).

---

### Fix: Auth Server-Side — Middleware Next.js `[F2]`

#### [NEW] [middleware.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/middleware.ts)

Middleware Next.js para interceptar TODAS as rotas `[context]/*` server-side:

```typescript
import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rotas públicas — não proteger
  const publicPaths = ['/', '/selector', '/api', '/_next', '/favicon'];
  if (publicPaths.some(p => pathname.startsWith(p))) return NextResponse.next();
  
  // Verificar cookie/token de sessão
  const sessionToken = request.cookies.get('hub-session-token')?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Impacto**: Fecha brecha de acesso direto por URL sem autenticação.

---

### Fix: Auth Backend — Guard nos routers `[F3]`

#### [MODIFY] [auth.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/auth.py)

Adicionar `Depends(verify_session)` em routers que retornam dados:

```python
from app.core.auth_guard import verify_session

# Em TODOS os routers de dados (tickets, stats, search):
@router.get("/{context}/tickets")
async def get_tickets(context: str, session=Depends(verify_session)):
    ...
```

#### [NEW] [auth_guard.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/auth_guard.py)

```python
async def verify_session(request: Request) -> dict:
    """Valida que o request tem session token válido."""
    token = request.headers.get("X-Session-Token") or request.cookies.get("hub-session-token")
    if not token:
        raise HTTPException(401, "Sessão não autenticada")
    # Validar token contra GLPI ou cache
    ...
```

---

### Testes: Rede de Segurança `[D1, F4]`

#### [NEW] [test_auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py)

```python
# 4 testes mínimos:
def test_resolve_hub_roles_dtic_tecnico():
    """Perfil 6 (Technician) no contexto dtic → role=tecnico"""
    
def test_resolve_hub_roles_sis_gestor_returns_sis_context():
    """Perfil 3 (Supervisor) no contexto sis → role=gestor, sem context_override"""
    
def test_resolve_hub_roles_sis_grupo_manutencao():
    """Grupo 22 no contexto sis → role=tecnico-manutencao, context_override=sis-manutencao"""

def test_build_login_response_parses_glpigroups():
    """glpigroups como list de int ou list de dict → groups[] normalizado"""
```

---

## 3. Fase 1 — Foundation: Context Registry + Manifests [(1 semana)](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/portal/src/modules/dashboard/DashboardView.tsx#4-11)

Elimina os **~15 pontos hardcoded** identificados no diagnóstico. Zero mudança funcional — apenas estrutural.

---

### Backend: Context Registry `[A1-A7]`

#### [NEW] [context_registry.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/context_registry.py)

```python
@dataclass
class ContextConfig:
    id: str                          # "dtic", "sis", "sis-manutencao"
    label: str                       # "Ecossistema Digital"
    glpi_url: str                    # URL da instância GLPI
    glpi_user_token: str             # Service token (env var)
    glpi_app_token: str              # App token (env var)
    db_host: str                     # Host MySQL
    db_name: str                     # Nome do banco
    db_context: str                  # "dtic" ou "sis" (para queries)
    color: str                       # "#3B82F6"
    theme: str                       # "theme-dtic"
    profile_map: dict[int, RoleDef]  # profile_id → role definition
    group_map: dict[int, RoleDef]    # group_id → role definition
    features: list[str]              # ["dashboard", "chargers", "governance"]
    group_ids: list[int] | None      # Grupos técnicos para filtro de tickets

class ContextRegistry:
    _contexts: dict[str, ContextConfig] = {}
    
    def register(self, config: ContextConfig) -> None: ...
    def get(self, context_id: str) -> ContextConfig: ...
    def list_all(self) -> list[ContextConfig]: ...
    def get_base_context(self, context_id: str) -> str:
        """'sis-manutencao' → 'sis'"""
        return context_id.split('-')[0] if '-' in context_id else context_id

# Singleton global
registry = ContextRegistry()
```

#### [NEW] [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml)

```yaml
contexts:
  dtic:
    label: "Ecossistema Digital"
    glpi_url: ${DTIC_GLPI_URL}
    glpi_user_token: ${DTIC_GLPI_USER_TOKEN}
    glpi_app_token: ${DTIC_GLPI_APP_TOKEN}
    db_host: ${DB_HOST_DTIC}
    db_name: ${DB_NAME_DTIC}
    db_context: dtic
    color: "#3B82F6"
    theme: theme-dtic
    features: [dashboard, search, knowledge, new-ticket]
    profile_map:
      9: { role: solicitante, label: "Central do Solicitante", route: user }
      6: { role: tecnico, label: "Console do Técnico", route: dashboard }
      20: { role: gestor, label: "Gestão e Administração", route: dashboard }
  
  sis:
    label: "Gestão Operacional"
    glpi_url: ${SIS_GLPI_URL}
    glpi_user_token: ${SIS_GLPI_USER_TOKEN}
    glpi_app_token: ${SIS_GLPI_APP_TOKEN}
    db_host: ${DB_HOST}
    db_name: ${DB_NAME}
    db_context: sis
    color: "#F59E0B"
    theme: theme-sis
    features: [dashboard, search, chargers, new-ticket]
    profile_map:
      9: { role: solicitante, label: "Portfólio de Chamados", route: user }
      3: { role: gestor, label: "Gestão Estratégica", route: dashboard, context_override: "sis" }
    group_map:
      22: { role: tecnico-manutencao, label: "Manutenção e Conservação", context_override: sis-manutencao }
      21: { role: tecnico-conservacao, label: "Conservação e Memória", context_override: sis-memoria }

  sis-manutencao:
    parent: sis
    label: "Manutenção e Conservação"
    color: "#F59E0B"
    theme: theme-manutencao
    group_ids: [22]

  sis-memoria:
    parent: sis
    label: "Preservação Patrimonial"
    color: "#8B5CF6"
    theme: theme-memoria
    group_ids: [21]
```

#### [MODIFY] [config.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/config.py)

```diff
-# if/elif por contexto para URLs, tokens, DB
+from app.core.context_registry import registry
+# Todas as configs agora vêm do registry:
+# registry.get(context).glpi_url
+# registry.get(context).db_host
```

#### [MODIFY] [session_manager.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/session_manager.py)

```diff
-# Dict _clients com init manual por contexto
+async def get_client(self, context: str) -> GLPIClient:
+    cfg = registry.get(context)
+    if context not in self._clients:
+        self._clients[context] = GLPIClient(cfg.glpi_url, cfg.glpi_app_token, cfg.glpi_user_token)
+    return self._clients[context]
```

#### [MODIFY] [auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py)

```diff
-_DTIC_PROFILE_MAP = { 9: {...}, 6: {...}, 20: {...} }
-_SIS_PROFILE_MAP = { 9: {...}, 3: {...} }
-_SIS_GROUP_MAP = { 22: {...}, 21: {...} }
+from app.core.context_registry import registry
+
 def resolve_hub_roles(context, available_profiles, groups):
+    cfg = registry.get(context)
+    profile_map = cfg.profile_map
+    group_map = cfg.group_map
     # ... lógica idêntica mas lendo do registry
```

#### [MODIFY] [health.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/health.py)

```diff
-dtic = await check("dtic")
-sis = await check("sis")
+contexts_health = {}
+for ctx in registry.list_all():
+    contexts_health[ctx.id] = await check(ctx.id)
```

#### [MODIFY] [database.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/database.py)

```diff
-# 2 connection strings fixas
+def get_connection(context: str):
+    cfg = registry.get(context)
+    return create_connection(cfg.db_host, cfg.db_name, ...)
```

---

### Frontend: Context Manifests `[A8-A14]`

#### [NEW] [context-registry.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/context-registry.ts)

```typescript
export interface FeatureManifest {
  id: string;           // "dashboard", "chargers"
  label: string;        // "Dashboard"
  icon: string;         // "LayoutDashboard"
  route: string;        // "/dashboard"
  requiredRoles: string[];  // ["tecnico", "gestor"]
  requireApp?: string;      // "redes" (futuro — Fase 1.5)
}

export interface ContextManifest {
  id: string;           // "dtic"
  label: string;        // "Ecossistema Digital"
  subtitle: string;     // "DTIC • Inteligência & Sistemas"
  description: string;
  icon: string;         // ícone Lucide
  color: string;        // CSS variable
  accentClass: string;  // "bg-accent-blue"
  gradient: string;
  dashboardTitle: string;     // "Portal do Técnico"
  dashboardSubtitle: string;  // "DTIC — Tecnologia da Informação"
  features: FeatureManifest[];
}

export const CONTEXT_MANIFESTS: ContextManifest[] = [
  {
    id: "dtic",
    label: "Ecossistema Digital",
    subtitle: "DTIC • Inteligência & Sistemas",
    // ...
    features: [
      { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/dashboard", requiredRoles: ["tecnico", "gestor"] },
      { id: "search", label: "Smart Search", icon: "Search", route: "/search", requiredRoles: [] },
      { id: "knowledge", label: "Base de Conhecimento", icon: "BookOpen", route: "/knowledge", requiredRoles: [] },
      { id: "new-ticket", label: "Novo Chamado", icon: "PlusSquare", route: "/new-ticket", requiredRoles: [] },
    ],
  },
  // ... sis, sis-manutencao, sis-memoria
];

export function getContextManifest(contextId: string): ContextManifest | null { ... }
export function resolveMenuItems(contextId: string, userRoles: string[]): FeatureManifest[] { ... }
export function getContextTheme(contextId: string): string { ... }
```

#### [MODIFY] [selector/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/selector/page.tsx)

```diff
-const workspaces = [{ id: "dtic", ... }, { id: "sis", ... }];
+import { CONTEXT_MANIFESTS } from "@/lib/context-registry";
+// Renderiza N cards do manifest — nenhum hardcode
```

#### [MODIFY] [AppSidebar.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/ui/AppSidebar.tsx)

```diff
-const CONTEXT_COLORS = { "dtic": "blue", "sis": "orange", ... };
-// if (context === ...) menu items
+import { getContextManifest, resolveMenuItems } from "@/lib/context-registry";
+const manifest = getContextManifest(activeContext);
+const menuItems = resolveMenuItems(activeContext, userRoles);
```

#### [DELETE/DEPRECATE] [navigation.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/constants/navigation.ts)

Substituído pelo manifest. O arquivo pode ser mantido com `@deprecated`.

#### [MODIFY] [[context]/layout.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/%5Bcontext%5D/layout.tsx)

```diff
-const themes = { "dtic": "...", "sis": "...", "sis-manutencao": "...", ... };
+import { getContextTheme } from "@/lib/context-registry";
+const theme = getContextTheme(context);
```

#### [MODIFY] [[context]/dashboard/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/%5Bcontext%5D/dashboard/page.tsx)

```diff
-const contextData: Record<string, {...}> = { "dtic": {...}, "sis": {...}, ... };
-const contextGroupMap: Record<string, number | null> = { "dtic": null, ... };
+import { getContextManifest } from "@/lib/context-registry";
+const manifest = getContextManifest(context);
+const title = manifest?.dashboardTitle || "Dashboard";
+const subtitle = manifest?.dashboardSubtitle || "";
```

---

## 4. Fase 1.5 — Permissões App-Level (Abordagem C) [(2-3 dias)](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/portal/src/modules/dashboard/DashboardView.tsx#4-11)

Implementa o modelo **Grupos como Tags de Capacidade** definido no estudo de permissões GLPI.

---

### Backend: app_access `[B1, B2, B4, B7]`

#### [MODIFY] [auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py)

Adição incremental (~30 linhas) ao fluxo existente:

```python
# NOVO: Resolver app_access via grupos Hub-App-*
async def resolve_app_access(client: GLPIClient, user_id: int) -> list[str]:
    """Busca grupos do user e extrai os que começam com Hub-App-*."""
    group_links = await client.get_sub_items("User", user_id, "Group_User")
    app_access = []
    for gl in group_links:
        group = await client.get_item("Group", gl["groups_id"])
        name = group.get("name", "")
        if name.startswith("Hub-App-"):
            app_id = name.replace("Hub-App-", "").lower()
            app_access.append(app_id)
    return app_access

# Em build_login_response() e fallback_login():
app_access = await resolve_app_access(service_client, glpi_id)
# Incluir no LoginResponse
```

#### [MODIFY] [auth_schemas.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/schemas/auth_schemas.py)

```diff
 class LoginResponse(BaseModel):
+    app_access: list[str] = []  # ["redes", "governanca", "dashboard"]
```

### Frontend: app_access `[B5, B6]`

#### [MODIFY] [useAuthStore.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/store/useAuthStore.ts)

```diff
 export interface AuthMeResponse {
+  app_access?: string[];  // ["redes", "governanca", "dashboard"]
 }
```

#### [NEW] [ContextGuard.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ContextGuard.tsx)

```typescript
export function ContextGuard({ featureId, children }: { featureId: string; children: React.ReactNode }) {
  const { currentUserRole, activeContext } = useAuthStore();
  const manifest = getContextManifest(activeContext);
  const feature = manifest?.features.find(f => f.id === featureId);
  
  if (!feature) return <NotFound />;
  
  // Verificar role
  if (feature.requiredRoles.length > 0) {
    const hasRole = currentUserRole?.hub_roles?.some(r => 
      feature.requiredRoles.includes(r.role) || feature.requiredRoles.some(ar => r.role.startsWith(ar + '-'))
    );
    if (!hasRole) return <AccessDenied />;
  }
  
  // Verificar app_access (Abordagem C)
  if (feature.requireApp) {
    if (!currentUserRole?.app_access?.includes(feature.requireApp)) return <AccessDenied />;
  }
  
  return <>{children}</>;
}
```

### GLPI Produção: Criar grupos `[B3, B8]`

```bash
# No GLPI de produção (cau.ppiratini.intra.rs.gov.br):
# Administração → Grupos → Adicionar
# Criar com convenção Hub-App-*:
Hub-App-Redes           # Acesso ao App Redes
Hub-App-Governanca      # Acesso à Governança
Hub-App-Dashboard       # Acesso ao Dashboard de Métricas
Hub-App-Observability   # Acesso ao SOC/Observabilidade
```

---

## 5. Fase 2 — Migração de Dashboards [(2-3 semanas)](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/portal/src/modules/dashboard/DashboardView.tsx#4-11)

### Organização Frontend `[A15]`

#### [NEW] Estrutura `features/`

```
web/src/features/
├── dashboard-metricas/          # Migrado de portal/src/modules/dashboard/
│   ├── DticDashboard.tsx        # ← Dashboard.tsx (26KB)
│   ├── MaintenanceDashboard.tsx # ← MaintenanceDashboard.tsx (6.4KB)
│   ├── ConservationDashboard.tsx# ← ConservationDashboard.tsx (6.5KB)
│   ├── components/
│   │   └── Charts/              # Componentes de visualização
│   └── hooks/
│       └── useDashboardData.ts  # ← Adaptado para API Hub
├── governance/                  # Migrado de spokes/governance/
│   ├── components/ (5-8 componentes decompostos do App.tsx 72KB)
│   └── hooks/
├── chargers/                    # Já existe, mover para cá
└── shared/                      # Componentes compartilhados
```

### Backend: Endpoint de Métricas `[E5, E9-E12]`

#### [NEW] [metrics.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/metrics.py)

```python
@router.get("/{context}/metrics")
async def get_dashboard_metrics(
    context: str,
    date_from: date | None = None,
    date_to: date | None = None,
    group_id: int | None = None,
):
    """
    Regras de filtragem (E9-E12):
    - SEMPRE: WHERE is_deleted = 0 AND is_active = 1
    - Date range: filtra por date_from/date_to se fornecido
    - EXCEÇÃO: total de tickets novos NUNCA filtra por data
    - DTIC: inclui breakdown por nível N1/N2/N3/N4
    - SIS-Manutenção: filtra por group_id=22
    - SIS-Conservação: filtra por group_id=21
    """
```

### Métricas por Dashboard `[E1-E4, E12]`

| Métrica | DTIC | Manutenção | Conservação | Filtro Data |
|---------|:----:|:----------:|:-----------:|:-----------:|
| Totais de Status | ✅ | ✅ | ✅ | ✅ |
| Lista Tickets Novos | ✅ | ✅ | ✅ | ❌ **NUNCA** |
| Ranking de Técnicos | ✅ | ✅ | ✅ | ✅ |
| Total por Categoria | ✅ | ✅ | ✅ | ✅ |
| Total por Entidade | ✅ | ✅ | ✅ | ✅ |
| Totais por Nível N1-N4 | ✅ | ❌ | ❌ | ✅ |

### Setup TV `[E13]`

- Auto-refresh a cada 30-60 segundos
- Modo fullscreen (hide sidebar + header)
- Otimizado para resolução 1920x1080 (TV 60")

---

## 6. Fase 3 — Admin Panel + Integração Spokes [(2-3 semanas)](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/portal/src/modules/dashboard/DashboardView.tsx#4-11)

### Admin Panel Backend `[C4, C6]`

#### [NEW] [admin.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/admin.py)

9 endpoints de gestão:

| Endpoint | Método | Função |
|----------|--------|--------|
| `/admin/users` | GET | Listar usuários com perfis e grupos |
| `/admin/users/{id}/groups` | GET/POST/DELETE | Gerenciar grupos do usuário |
| `/admin/users/{id}/profiles` | GET/POST/DELETE | Gerenciar autorizações |
4. `/admin/groups` | GET/POST | CRUD de grupos |
5. `/admin/profiles` | GET | Listar perfis disponíveis |
6. `/admin/entities` | GET | Listar entidades |

### Admin Panel Frontend (Matriz Permissional) `[Novo]`

Criar uma rota protegida `/dashboard/permissoes` (apenas com `Hub-App-permissoes`).
A tela será dividida em:
1. **Listagem de Usuários x Contextos:** Tabela com busca, exibindo usuários, perfis e roles dinâmicas ativas ([gestor](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#31-41), `tecnico-manutencao`, etc).
2. **Matriz de Capability Tags:** Tabela visual onde as linhas são os usuários, e as colunas são as chaves da aplicação (`carregadores`, `busca`, `dashboard`, `patrimonio`). Conterá os ticks `✅` representando a posse da tag `Hub-App-[chave]`.
3. **Redirecionamento GLPI:** Ações de "Editar App Access" enviarão o gestor via link direto para o Perfil do GLPI `User_Profile` do funcionário afetado (mantendo zero-downtime sem precisar recriar APIs completas do zero e reusando a segurança nativa dele na Fase 2).

### Integração Spokes `[E7, E8]`

| App | Estratégia | Integração |
|-----|-----------|------------|
| **ad-security-monitor** (SOC) | Manter como spoke | Deep-link: `VITE_AD_MONITOR_URL` no manifest |
| **asset-hunter** | Avaliar consolidação com SOC | Manter separado por enquanto |
| **governance** | Migrar para features/ | Decompor App.tsx 72KB em 5-8 componentes |

---

## 7. Decisões Pendentes

| # | Decisão | Opções | Minha Recomendação |
|:-:|---------|--------|:------------------:|
| D4 | Onde vive [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml)? | (a) Arquivo no repo (b) Env vars (c) DB | **(a)** Arquivo no repo — versionado, auditável |
| D5 | Quem gerencia grupos Hub-App-*? | (a) Interface GLPI (b) Admin Panel (c) AD | **(b)** Admin Panel — UX melhor |
| D6 | ContextGuard redireciona para onde? | (a) 404 (b) Acesso Negado (c) Home | **(b)** Acesso Negado (já existe) |
| D7 | Admin Panel: quem acessa? | (a) Super-Admin (b) Gestor (c) Hub-Admin | **(a)** Super-Admin inicialmente |

---

## 8. Verification Plan

### Testes Automatizados (Fase 0)

```bash
# Executar testes unitários do auth:
cd app && python -m pytest tests/test_auth_service.py -v

# Executar testes existentes de charger:
cd web && npm test
```

### Testes Manuais de Validação (Cada Fase)

#### Fase 0 — Validação dos Fixes

1. **Fix ProfileSwitcher**: Login → SIS → Gestor → Trocar para Conservação → Trocar de volta para Gestor → **Verificar**: URL deve ser `/sis/dashboard`, dados devem ser TODOS os tickets SIS, título deve ser "Gestão Operacional"
2. **Fix Auth**: Abrir aba anônima → digitar `localhost:8080/sis/dashboard` → **Verificar**: deve redirecionar para `/` (login)
3. **Fix Backend Auth**: `curl localhost:8080/api/v1/sis/tickets` sem headers → **Verificar**: deve retornar 401

#### Fase 1 — Validação Estrutural

4. **Registry**: Adicionar contexto de teste no [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) → reiniciar backend → `GET /health` → **Verificar**: novo contexto aparece no health check
5. **Manifests**: Verificar que selector mostra os mesmos cards de antes, sidebar mostra os mesmos itens, themes funcionam igual
6. **Regressão**: Todo o fluxo Login → Selector → DTIC → Dashboard → Search → User → Trocar Contexto deve funcionar identicamente ao antes

#### Fase 1.5 — Validação Permissional

7. **app_access**: Criar grupo `Hub-App-Teste` no GLPI → Vincular user → Login → **Verificar**: [app_access](file:///C:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#18-40) contém "teste" na resposta da API
8. **ContextGuard**: Feature com `requireApp: "teste"` → User SEM grupo → **Verificar**: Acesso Negado. User COM grupo → **Verificar**: Acesso liberado

#### Fase 2 — Validação Dashboards

9. **Métricas**: Verificar que cada dashboard mostra os mesmos números que o sistema legado nas mesmas datas
10. **Filtro data**: Selecionar range → totais devem mudar. Tickets novos **nunca** devem mudar com filtro de data
11. **TV mode**: Abrir em fullscreen → verificar auto-refresh e layout 1920x1080
