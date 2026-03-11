# 🔴 Diagnóstico Profundo — Bugs Críticos & Reflexão de Processo

> **Data**: 2026-03-09 | **Severidade**: CRÍTICA  
> **Contexto**: Dois bugs funcionais graves descobertos pelo USUÁRIO que passaram despercebidos por múltiplas auditorias AI-assistidas

---

## 1. Bug 1 — "Trocar Função" Não Reseta Contexto

### O que acontece

```
1. ✅ Login → Selector → SIS → "Gestão Estratégica" (Gestor)
   URL: /sis/dashboard → Dados: TODOS os tickets SIS
   
2. ✅ Trocar Função → "Conservação e Memória"
   URL: /sis-memoria/dashboard → Dados: só conservação ✅
   
3. 🔴 Trocar Função → "Gestão Estratégica" (de volta)
   URL: /sis-memoria/dashboard ← ERRADO! Deveria ser /sis/dashboard
   Dados: só conservação ← ERRADO! Deveria ser TODOS
   Título: "Preservação Patrimonial" ← ERRADO! Deveria ser "Gestão Operacional"
   Badge: "GESTÃO ESTRATÉGICA" ← CORRETO (ilusório — parece que funcionou)
```

### Root Cause (Código-Fonte)

**Arquivo**: [ProfileSwitcher.tsx:63](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ProfileSwitcher.tsx#L62-L68)

```typescript
// LINHA 63 — O BUG ESTÁ AQUI
const targetContext = hubRole.context_override || activeContext;
//                    ^^^^^^^^^^^^^^^^^^^^^^^^    ^^^^^^^^^^^^^
//                    Gestor: null (sem override)  O que sobrou: "sis-memoria"!
```

**Cadeia de falha**:
1. Usuário estava em `sis/dashboard` com `activeContext = "sis"`
2. Trocou para "Conservação" → `context_override = "sis-memoria"` → [setActiveContext("sis-memoria", ...)](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/store/useAuthStore.ts#110-121) ✅
3. Agora `activeContext = "sis-memoria"` no store
4. Trocou de volta para "Gestão Estratégica" → `context_override = null` → `targetContext = null || "sis-memoria"` = **`"sis-memoria"`** 🔴
5. `router.push("/sis-memoria/dashboard")` — navega para contexto ERRADO
6. Dashboard recebe `context = "sis-memoria"` → filtra por `group_id = 21` (conservação) → dados ERRADOS

**O bug é que "Gestão Estratégica" (gestor SIS) não tem `context_override` definido no `_SIS_GROUP_MAP` do backend, porque vem de um PERFIL, não de um GRUPO. O `activeContext` nunca reverte para "sis".**

**Gravidade**: Ilusoriamente funcional — o badge mostra "GESTÃO ESTRATÉGICA" ✅ mas URL, dados, título e sidebar estão todos errados. O usuário só percebe se olhar os dados com cuidado.

### Fix Necessário

```typescript
// ProfileSwitcher.tsx — fix
const targetContext = hubRole.context_override || 
  activeContext.split('-')[0]; // "sis-memoria" → "sis" (reset para contexto raiz)
```

Ou melhor ainda:
```typescript
// auth_service.py — Adicionar context_base ao HubRole gestor
_SIS_PROFILE_MAP = {
    3: {"role": "gestor", ..., "context_override": "sis"},  // ← EXPLICITA!
}
```

---

## 2. Bug 2 — Acesso a Dados Reais Sem Autenticação

### O que acontece

Um usuário que nunca fez login pode acessar `localhost:8080/sis/dashboard` e ver dados reais de tickets — GLPI-6912, GLPI-6902, etc.

### Root Cause (Código-Fonte)

**Camada 1 — Frontend**: [ProtectedRoute.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ProtectedRoute.tsx)

```typescript
// ProtectedRoute verifica APENAS estado do Zustand (client-side)
if (!isAuthenticated) {       // ← Vem do localStorage persistido!
  router.push("/");
  return;
}
```

**Problemas**:
- `isAuthenticated` é **persistido no localStorage** pelo Zustand persist
- Se o usuário fechou o browser sem fazer logout, `isAuthenticated = true` persiste
- **Não há middleware Next.js** (`middleware.ts` não existe) — zero proteção server-side
- O browser pode ser manipulado para setar `isAuthenticated = true` no localStorage

**Camada 2 — Backend**: Os endpoints de dados (`fetchStats`, `fetchTickets`) usam o **service token** do backend, não o token do usuário:

```typescript
// ticketService.ts
fetchStats(context, groupId)  // ← Chama /api/v1/{context}/stats
fetchTickets(context, {...})  // ← Chama /api/v1/{context}/tickets
```

Esses endpoints no FastAPI usam a sessão de serviço (user_token do .env), **não validam se quem chamou é um usuário autenticado**. Qualquer request HTTP para `localhost:8080/api/v1/sis/tickets` retorna dados reais.

### Fix Necessário

1. **Middleware Next.js**: Criar `middleware.ts` que intercepta TODAS as rotas `[context]/*` e valida cookie/token server-side
2. **Backend auth guard**: Adicionar `Depends(verify_user_token)` em TODOS os routers que retornam dados
3. **Invalidar sessions**: Não persistir `isAuthenticated` — sempre revalidar no load

---

## 3. 🪞 Reflexão Honesta — Por Que Os Diagnósticos Falharam

> *"Temos essas inconsistências vivas e o pior de tudo, não foi identificado por você nos diversos diagnósticos."*

Isso é uma falha grave e vou ser honesto sobre por que aconteceu.

### Falha 1: Auditorias Leram Código, Não Executaram

Todas as auditorias anteriores (auditoria técnica, arquitetura, permissões) foram feitas por **análise estática** — lendo código-fonte. Nenhuma delas:
- Simulou um fluxo de usuário real (login → selector → troca de função → volta)
- Fez request HTTP direto para endpoints sem auth
- Testou edge cases de estado (o que acontece quando `context_override` é null?)

**Ler código identifica problemas ESTRUTURAIS. Bugs COMPORTAMENTAIS só aparecem executando.**

### Falha 2: Foco na Macro-Arquitetura, Negligência no Micro-Comportamento

Passamos semanas analisando:
- ContextRegistry, Feature Manifests, YAML declarativo (arquitetura)
- Bitmasks GLPI, Groups como Tags, Search API (integração)
- Monólito vs Turborepo vs Multi-Zones (decisões estratégicas)

Enquanto isso, **o código que já estava rodando em produção tinha bugs fundamentais** de:
- Gerenciamento de estado (Zustand `activeContext` nunca reseta)
- Autenticação (zero proteção server-side)

**Planejamos o futuro sem validar o presente.**

### Falha 3: Confiança Excessiva em Guards Client-Side

O [ProtectedRoute.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ProtectedRoute.tsx) dá uma **ilusão de segurança** que fez todos (humano e AI) assumirem que a autenticação estava "resolvida". Na realidade:
- É um wrapper React client-side
- Depende de estado persistido em localStorage
- Não tem equivalente server-side (middleware)
- O backend não valida auth nos endpoints de dados

### Falha 4: Ausência de Testes Automatizados

Se houvesse UM teste que simulasse:
```
1. Sem login → acessa /sis/dashboard → espera redirect para /
2. Com login → troca para conservação → volta para gestor → verifica URL = /sis/dashboard
```
...esses bugs teriam sido pegos na primeira vez.

### Falha 5: Enviesamento por Complexidade

Focamos nas partes "interessantes" e complexas (API GLPI, arquitetura extensível) e negligenciamos as partes "simples" (troca de estado, proteção de rota). Ironicamente, **os bugs estavam nas partes "simples"** — exatamente onde ninguém olhou com cuidado.

---

## 4. Ações Corretivas Imediatas

### Prioridade 1 — Antes de QUALQUER refatoração

| # | Ação | Tipo | Esforço |
|:-:|------|:----:|:-------:|
| 1 | **Fix ProfileSwitcher** — garantir que gestor reseta para contexto raiz | Bug fix | ~30 min |
| 2 | **Fix ProtectedRoute** — adicionar middleware Next.js server-side | Bug fix | ~2h |
| 3 | **Fix Backend auth** — adicionar auth guard nos routers de dados | Bug fix | ~2h |
| 4 | **Testes E2E** — 3 fluxos mínimos (login, troca de função, acesso sem auth) | Prevenção | ~4h |

### Prioridade 2 — Mudança de Processo

| # | Mudança | Implementação |
|:-:|---------|---------------|
| 5 | **Toda auditoria de código DEVE incluir testes de fluxo real** (browser ou curl) — nunca apenas leitura estática | Regra de workflow |
| 6 | **Checklist de validação pré-refatoração**: auth funciona? dados filtram corretamente? estado reseta? Antes de planejar o futuro, validar que o presente funciona | Checklist obrigatório |

---

## 5. Resposta Direta

> *"Não faço a menor ideia de como vamos implementar tudo isso... se vamos terminar melhor do que começamos."*

A resposta honesta é: **aprendemos que precisamos de uma base sólida ANTES de empilhar funcionalidades**. Os dois bugs mostram que:

1. O código atual tem **buracos no alicerce** (auth, state management)
2. Nossos diagnósticos foram **superficiais no que importa** (comportamento real)
3. A ausência de testes permite que bugs sobrevivam indefinidamente

**Proposta**: Antes de tocar em ContextRegistry, Feature Manifests ou migração de dashboards — **corrigir os 4 itens da Prioridade 1**. É no máximo 1 dia de trabalho e nos dá uma base confiável.

Só depois disso, com confiança de que o básico funciona, avançamos para o roadmap de 5 fases.
