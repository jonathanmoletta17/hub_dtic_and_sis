# 🏛️ Análise Arquitetural — Plataforma Multi-Contexto Extensível

> **Objective**: Definir a arquitetura que permita expandir N contextos departamentais (DTIC, SIS-Manutenção, SIS-Conservação, Governança, Observabilidade, futuros) de forma **desacoplada**, com features exclusivas por contexto, dentro de uma experiência unificada.

---

## 📸 Inventário de Aplicações

Antes de decidir, vamos mapear **o que existe e o que precisa ser absorvido**:

| # | Aplicação | Contexto | Status | Fonte |
|---|-----------|----------|--------|-------|
| 1 | **Central de Chamados (Kanban)** | Todas | ✅ No Hub | [dashboard/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/%5Bcontext%5D/dashboard/page.tsx) |
| 2 | **Gestão de Carregadores** | SIS only | ✅ No Hub | [gestao-carregadores/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/%5Bcontext%5D/gestao-carregadores/page.tsx) |
| 3 | **Dashboard DTIC** (Métricas, Inconsistências, Ranking, Heatmap, Trends) | DTIC | 🔄 Legado (porta 4003) | Screenshot 1 |
| 4 | **Dashboard Manutenção** (Obras, Carga Oficinas, Ranking) | SIS-Manutenção | 🔄 Legado (porta 4010) | Screenshot 2 |
| 5 | **Dashboard Conservação** (Torre Logística, Categorias, Entidades) | SIS-Conservação | 🔄 Legado (porta 4010) | Screenshot 3 |
| 6 | **Governança DTIC** (Normas, KPIs, RACI, POPs) | DTIC | 🔄 Legado (porta 4010) | Screenshot 4 |
| 7 | **Observability** (SOC Console, Rede, Ativos, Identidades) | DTIC | 🔄 Legado (porta 5175) | Screenshot 5 |
| 8 | **Base de Conhecimento** | DTIC | ✅ No Hub | `knowledge/page.tsx` |
| 9 | **Smart Search** | Todas | ✅ No Hub | `search/page.tsx` |
| 10 | **Formulário Dinâmico (FormCreator)** | Todas | ✅ No Hub | `new-ticket/page.tsx` |
| 11 | **Futuro Depto X** | N/A | 🔮 Previsto | — |

---

## 🔍 Diagnóstico: Pontos de Acoplamento Estático no Código Atual

O código atual tem **~15 pontos hardcoded** que impedem a adição de contextos sem modificar código existente:

### Backend

| Arquivo | Ponto de Acoplamento | Impacto |
|---------|---------------------|---------|
| [config.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/config.py) | `if context == "dtic" ... elif context == "sis"` + env vars fixas | Adicionar contexto = editar config |
| [session_manager.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/session_manager.py) | Dict `_clients` com init manual por contexto | Mesmo acoplamento |
| [auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py) | `_DTIC_PROFILE_MAP`, `_SIS_PROFILE_MAP`, `_SIS_GROUP_MAP` | Roles hardcoded por contexto |
| [health.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/health.py) | `dtic = ... sis = ...` explícito | Health check quebra com 3º contexto |
| [database.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/database.py) | 2 connection strings fixas (`GLPI_*_DB_*`) | DB config por contexto é if/elif |

### Frontend

| Arquivo | Ponto de Acoplamento | Impacto |
|---------|---------------------|---------|
| [selector/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/selector/page.tsx) | Array `workspaces = [{id: "dtic"}, {id: "sis"}]` (2 cards hardcoded) | Novo contexto = editar página |
| [navigation.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/constants/navigation.ts) | `if (context === "dtic")`, `if (context.startsWith("sis"))` | Menu por if/else |
| [AppSidebar.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/ui/AppSidebar.tsx) | `CONTEXT_COLORS` com 4 entries fixas | Cores hardcoded |
| [dashboard/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/%5Bcontext%5D/dashboard/page.tsx) | `contextData`, `contextGroupMap` fixos | Metadata hardcoded |
| [[context]/layout.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/%5Bcontext%5D/layout.tsx) | `themes` dict com 4 entries | Temas hardcoded |

---

## 🧭 Opções Arquiteturais Avaliadas

### Opção A — Monólito Extensível (Plugin Architecture Interna)

**O que é**: Um único Next.js app e um único FastAPI, mas com sistema de **registry de contextos** e **feature flags** que definem dinamicamente quais módulos estão ativos para cada contexto.

```
tensor-aurora/
├── app/                          # Backend (FastAPI)
│   ├── core/
│   │   └── context_registry.py   # NEW: Registry de contextos via YAML/JSON
│   ├── contexts/                 # NEW: Features isoladas por contexto
│   │   ├── shared/               # Módulos compartilhados (tickets, search, auth)
│   │   ├── dtic/                 # Módulos exclusivos DTIC
│   │   │   ├── routers/
│   │   │   ├── services/
│   │   │   └── manifest.yaml     # Metadata: nome, cor, features, db_config
│   │   ├── sis/                  # SIS comum
│   │   └── sis_manutencao/       # SIS-Manutenção
│   └── routers/                  # Routers compartilhados
├── web/
│   ├── src/
│   │   ├── contexts/             # NEW: Features isoladas por contexto
│   │   │   ├── shared/           # Components compartilhados
│   │   │   ├── dtic/             # Pages/components exclusivos DTIC
│   │   │   │   ├── pages/
│   │   │   │   └── manifest.ts   # Menu items, cores, metadata
│   │   │   └── sis/
│   │   └── lib/
│   │       └── context-registry.ts  # Resolver dinâmico de manifests
```

**Prós**:
- ✅ Menor complexidade infraestrutural (1 Docker container backend, 1 frontend)
- ✅ Compartilhamento de código trivial (imports diretos)
- ✅ Deploy único simples
- ✅ Tipo seguro — tudo compila junto
- ✅ Refactoring mais fácil (IDE encontra todas as referências)
- ✅ **Compatível com a estrutura atual** — evolução incremental

**Contras**:
- ⚠️ Acoplamento em tempo de build — mudança num contexto rebuilda tudo
- ⚠️ Bundle do frontend cresce com cada contexto adicionado
- ⚠️ Todos os contextos precisam usar a mesma versão de Next.js

---

### Opção B — Turborepo Monorepo com Internal Packages

**O que é**: Um monorepo Turborepo com um app principal (shell/gateway), pacotes compartilhados (`@hub/ui`, `@hub/api`, `@hub/types`, `@hub/auth`), e apps satélites opcionais para contextos que precisam de independência total.

```
casa-civil-hub/                   # Root Turborepo
├── turbo.json
├── packages/
│   ├── ui/                       # @hub/ui — Design system + componentes Glass/Aurora
│   ├── api/                      # @hub/api — Wrapper HTTP, SWR hooks, types
│   ├── auth/                     # @hub/auth — useAuthStore, ProtectedRoute
│   ├── types/                    # @hub/types — Gerados via OpenAPI (auto-sync)
│   ├── config/                   # @hub/config — ESLint, TSConfig, Tailwind preset
│   └── context-registry/         # @hub/context-registry — Manifests e resolvers
├── apps/
│   ├── gateway/                  # Next.js App — Shell, login, selector, routing
│   ├── dtic/                     # Next.js App — Features DTIC (dashboard, governança, obs.)
│   ├── sis/                      # Next.js App — Features SIS (carregadores, dashboards)
│   └── backend/                  # FastAPI — Backend unificado (ou separados por contexto)
```

**Prós**:
- ✅ **Independência de deploy** — cada app pode ser deployado separadamente
- ✅ Builds incrementais com cache Turborepo (muda `dtic/` → só rebuilda `dtic/`)
- ✅ Times diferentes podem trabalhar em apps diferentes sem conflitos
- ✅ Bundle size otimizado — cada app carrega só o que precisa
- ✅ Permite versões diferentes de dependências entre apps

**Contras**:
- ⚠️ **Complexidade significativamente maior** de infraestrutura (múltiplos containers, proxy routing)
- ⚠️ Duplicação de boilerplate entre apps (configs, providers, layouts)
- ⚠️ Navegação entre apps = page reload (ou Multi-Zones com complexidade extra)
- ⚠️ Compartilhamento de state (auth) entre apps requer sync (localStorage, cookies)
- ⚠️ **Over-engineering para uma equipe de 1-2 devs**

---

### Opção C — Hybrid (Multi-Zones Next.js)

**O que é**: Usar o recurso nativo `Multi-Zones` do Next.js para compor múltiplos Next.js apps como se fossem uma aplicação única, com rewrite rules no nível do proxy (Nginx).

**Prós**:
- ✅ Recurso **nativo do Next.js**, mantido pela Vercel
- ✅ Cada zona é independente, mas o usuário não percebe transição

**Contras**:
- ⚠️ Cada zona é um Next.js separado — mesma complexidade da Opção B
- ⚠️ Requer proxy reverso avançado (rewrite rules complexas)
- ⚠️ Auth sync entre zonas é o mesmo problema da Opção B

---

## 🏆 Recomendação: **Opção A — Monólito Extensível com Plugin Architecture**

### Justificativa

| Fator | Análise |
|-------|---------|
| **Tamanho da equipe** | 1-2 desenvolvedores — Turborepo/Multi-Zones é overhead brutal em setup, CI/CD, debugging |
| **Complexidade real** | As aplicações compartilham 80% da infra (auth, GLPI, DB, design system). A diferença é **quais telas existem** em cada contexto |
| **Natureza do problema** | Não é "cada contexto é um produto diferente". É "cada contexto é uma **visão customizada** do mesmo ecossistema GLPI" |
| **Velocidade de entrega** | Precisa entregar dashboards legados + governança + observabilidade. Montar infra de monorepo atrasa 2-4 semanas sem dar funcionalidade nova |
| **Escala prevista** | ~5-8 contextos máximo (DTIC, 3× SIS, Governança, Observabilidade, 1-2 futuros). Não é 50 micro-frontends |
| **Futuro** | Se algum dia precisar migrar para monorepo, o sistema de manifests/registry já estará organizado — a migração será extrair pastas |

---

## 🏗️ Arquitetura Proposta em Detalhe

### Princípio Central: **Context-as-Config, Feature-as-Module**

Cada contexto não é código — é **configuração**. Features são módulos isolados que se **registram** para contextos via manifest.

### Backend — Context Registry

```python
# app/core/context_registry.py  (NEW)
"""
Registry centralizado de contextos GLPI.
Substitui todos os if/elif espalhados pelo código.
"""

@dataclass
class ContextConfig:
    id: str                           # "dtic", "sis", "sis-manutencao"
    label: str                        # "Ecossistema Digital"  
    glpi_url: str                     # URL da instância GLPI
    glpi_user_token: str              # Service token
    glpi_app_token: str               # App token
    db_url: str                       # Connection string MySQL
    db_context: str                   # Contexto para normalização ("dtic" ou "sis")
    color: str                        # Cor primária (#3B82F6)
    theme: str                        # Theme CSS class
    profile_map: dict[int, RoleDef]   # Mapeamento profile_id → role
    group_map: dict[int, RoleDef]     # Mapeamento group_id → role  
    features: list[str]               # ["dashboard", "chargers", "governance"]
    group_ids: list[int] | None       # Grupos técnicos para filtro de tickets

class ContextRegistry:
    """Single Source of Truth para todos os contextos."""
    _contexts: dict[str, ContextConfig]

    def register(self, config: ContextConfig): ...
    def get(self, context_id: str) -> ContextConfig: ...
    def list_all(self) -> list[ContextConfig]: ...
    def resolve_db(self, context_id: str) -> str: ...
    # health.py chama: registry.list_all() em vez de hardcoded
    # auth_service.py chama: registry.get(ctx).profile_map
    # config.py carrega de YAML/env vars em vez de if/elif
```

```yaml
# contexts.yaml  (carregado na inicialização)
contexts:
  dtic:
    label: "Ecossistema Digital"
    glpi_url: ${DTIC_GLPI_URL}
    db_context: dtic
    color: "#3B82F6"
    theme: theme-dtic
    features: [dashboard, search, knowledge, governance, observability, new-ticket]
    profile_map:
      9: { role: solicitante, label: "Central do Solicitante", route: user }
      6: { role: tecnico, label: "Console do Técnico", route: dashboard }
      20: { role: gestor, label: "Gestão e Administração", route: dashboard }
  
  sis-manutencao:
    label: "Manutenção e Conservação"
    db_context: sis
    color: "#F59E0B"
    theme: theme-manutencao
    features: [dashboard, search, chargers, new-ticket]
    group_ids: [22]
    ...
```

### Frontend — Feature Modules com Manifest

```typescript
// src/lib/context-registry.ts  (NEW)

export interface ContextManifest {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  icon: string;               // Nome do ícone Lucide
  color: string;             // CSS variable ou classe
  accentClass: string;       
  gradient: string;
  features: FeatureManifest[];
}

export interface FeatureManifest {
  id: string;                 // "dashboard", "chargers", "governance"
  label: string;              // "Dashboard de Métricas"
  icon: string;               // "LayoutDashboard"
  route: string;              // "/dashboard"
  matchPath: string;          // "/dashboard"
  requiredRoles: string[];    // ["tecnico", "gestor"]
  requireContext?: string;    // "sis" (limita a contextos específicos)
}

// Registrado DECLARATIVAMENTE — sem if/else
export const CONTEXT_MANIFESTS: ContextManifest[] = [
  {
    id: "dtic",
    label: "Ecossistema Digital",
    subtitle: "DTIC • Inteligência & Sistemas",
    features: [
      { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/dashboard", requiredRoles: ["tecnico", "gestor"] },
      { id: "governance", label: "Governança", icon: "Shield", route: "/governance", requiredRoles: ["gestor"] },
      { id: "observability", label: "Observabilidade", icon: "Activity", route: "/observability", requiredRoles: ["tecnico", "gestor"] },
      { id: "knowledge", label: "Base de Conhecimento", icon: "BookOpen", route: "/knowledge", requiredRoles: [] },
      // ... features compartilhadas adicionadas automaticamente
    ],
  },
  // ...mais contextos
];

// Funções que substituem os if/else atuais:
export function getContextManifest(contextId: string): ContextManifest | null;
export function resolveMenuItems(contextId: string, userRoles: string[]): NavItem[];
export function getContextTheme(contextId: string): string;
export function getContextColors(contextId: string): { color: string; accent: string };
```

### Estrutura de Features no Frontend

```
web/src/
├── app/
│   ├── [context]/
│   │   ├── layout.tsx                   # Lê manifest do context, aplica theme
│   │   ├── dashboard/page.tsx           # SHARED — Kanban de tickets
│   │   ├── search/page.tsx              # SHARED
│   │   ├── new-ticket/page.tsx          # SHARED
│   │   ├── user/page.tsx                # SHARED
│   │   │
│   │   ├── gestao-carregadores/page.tsx # SIS-ONLY (manifest declara)
│   │   ├── governance/page.tsx          # DTIC-ONLY (manifest declara)
│   │   ├── observability/page.tsx       # DTIC-ONLY (manifest declara)
│   │   └── metricas/page.tsx            # PER-CONTEXT (exibe widgets diferentes)
│   │
│   └── selector/page.tsx               # Lê CONTEXT_MANIFESTS[], renderiza N cards
│
├── features/                            # NEW — Módulos de feature isolados
│   ├── dashboard-metricas/              # Dashboard legado DTIC
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   ├── chargers/                        # Gestão de Carregadores (já existe)
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   ├── governance/                      # Governança (normas, KPIs, RACI)
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   ├── observability/                   # SOC, Rede, Ativos
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   └── shared/                          # Módulos compartilhados
│       ├── ticket-kanban/
│       ├── search-engine/
│       └── auth/
```

### Proteção de Rota via Manifest

```tsx
// [context]/governance/page.tsx
import { ContextGuard } from "@/features/shared/auth/ContextGuard";
import { GovernancePage } from "@/features/governance";

export default function Page() {
  return (
    <ContextGuard featureId="governance">
      <GovernancePage />
    </ContextGuard>
  );
}

// ContextGuard verifica:
// 1. O contexto atual tem "governance" no manifest.features?
// 2. O usuário tem um dos requiredRoles?
// Se não → redirect ou 404
```

---

## 🔄 Fluxo de Adição de Novo Contexto

Com essa arquitetura, adicionar o **"Departamento X"** requer:

### Backend (3 passos)
1. Adicionar entrada no `contexts.yaml` (URL GLPI, tokens, DB, profile_map)
2. Rodar `docker-compose up` (sem rebuild se DB externa for acessível)
3. *Opcionalmente* criar `app/contexts/dept_x/` se tiver lógica exclusiva

### Frontend (2 passos)
1. Adicionar entrada no `CONTEXT_MANIFESTS[]` (id, label, cores, features)
2. O selector, sidebar, layout, theme — **tudo se adapta automaticamente**

### Nenhuma mudança necessária em:
- ❌ [selector/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/selector/page.tsx) (renderiza N cards do manifest)
- ❌ [AppSidebar.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/ui/AppSidebar.tsx) (resolve menu do manifest)
- ❌ `[context]/layout.tsx` (aplica theme do manifest)
- ❌ [navigation.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/constants/navigation.ts) (deprecated — substituído por manifest)
- ❌ [health.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/health.py) (itera `registry.list_all()`)
- ❌ [auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py) (usa `registry.get(ctx).profile_map`)

---

## 📊 Comparativo Final

| Critério | Monólito Atual | **Opção A (Recomendada)** | Opção B (Turborepo) |
|----------|:-:|:-:|:-:|
| Adicionar contexto sem editar código | ❌ ~15 arquivos | ✅ 1-2 configs | ✅ 1 config + app |
| Complexidade de infra | ⭐ | ⭐ | ⭐⭐⭐⭐ |
| Velocidade de entrega | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ (setup lento) |
| Independência de deploy | ❌ | ❌ | ✅ |
| Bundle size otimizado | ❌ | ⚠️ (tree-shaking) | ✅ |
| Preparado para team scaling | ❌ | ⚠️ | ✅ |
| Adequado para equipe 1-2 devs | ✅ | ✅ | ❌ |
| Migração futura p/ monorepo | — | ✅ (features já isoladas) | — |

---

## 🗺️ Roadmap de Implementação

### Fase 1 — Foundation (1-2 semanas)
- [ ] Criar `ContextRegistry` no backend (substituir if/elif no config.py, health.py, auth_service.py)
- [ ] Criar `contexts.yaml` como fonte de verdade
- [ ] Criar `context-registry.ts` no frontend
- [ ] Criar `CONTEXT_MANIFESTS` declarativo
- [ ] Refatorar [selector/page.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/app/selector/page.tsx) para renderizar do manifest
- [ ] Refatorar [AppSidebar.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/ui/AppSidebar.tsx) e [navigation.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/constants/navigation.ts) para usar manifest
- [ ] Refatorar `[context]/layout.tsx` para resolver theme do manifest

### Fase 2 — Feature Migration (2-4 semanas)  
- [ ] Organizar `features/` no frontend (mover chargers, auth, kanban)
- [ ] Migrar Dashboard DTIC legado → `features/dashboard-metricas/`
- [ ] Migrar Dashboard Manutenção legado → mesma feature com widgets por contexto
- [ ] Migrar Dashboard Conservação legado → mesma feature com widgets por contexto
- [ ] Criar **ContextGuard** component para proteção de rota por feature

### Fase 3 — Novos Módulos (4-8 semanas)
- [ ] Migrar Governança → `features/governance/`
- [ ] Migrar Observabilidade → `features/observability/`
- [ ] Criar backend routes para novos módulos (se necessário)
- [ ] Testar adição de contexto "Departamento X" de ponta a ponta

### Fase 4 — Opcional: Monorepo (Futuro, se necessário)
- [ ] Se a equipe crescer para 3+ devs ou surgir necessidade de deploy independente
- [ ] As `features/` já estarão isoladas → extrair para `packages/` é mecânico
- [ ] Configurar Turborepo com cache remoto
