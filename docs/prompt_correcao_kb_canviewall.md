# PROMPT — Correção Estrutural: Permissão na Base de Conhecimento (canViewAll)

> Template: P01 — Análise e Diagnóstico + Correção  
> Destino: antigravity  
> Escopo: `knowledge/page.tsx` + `useAuthStore.ts` + camada de permissão da KB  
> Regra absoluta: Mapear todos os pontos afetados antes de alterar qualquer linha.

---

## CONTEXTO

O Hub usa dois mecanismos de permissão paralelos:
1. `hub_role.role` — string semântica (`"gestor"`, `"tecnico"`, `"solicitante"`) derivada do `contexts.yaml`
2. `active_profile.id` — ID numérico do perfil GLPI (ex: 4, 6, 20)

O módulo de Base de Conhecimento (`knowledge/page.tsx`) usa **exclusivamente o mecanismo 2**
para decidir se o usuário pode ver todos os artigos ou apenas FAQs.

Isso criou um bug estrutural: após a adição do Profile ID 4 (Super-Admin) ao `contexts.yaml`
com `role: gestor`, usuários Super-Admin passaram a ver apenas FAQs porque `4 !== 6` e `4 !== 20`.

---

## CAUSA RAIZ CONFIRMADA

```typescript
// knowledge/page.tsx — linhas 39-40
const TECHNICIAN_PROFILE_ID = 6;
const MANAGER_PROFILE_ID = 20;

// linha 328
const canViewAll = profileId === TECHNICIAN_PROFILE_ID || profileId === MANAGER_PROFILE_ID;

// linha 364 — resultado: FAQs apenas quando canViewAll = false
const params = !canViewAll ? { is_faq: true } : undefined;
```

**Por que é estruturalmente frágil:**
Qualquer novo perfil GLPI adicionado ao `contexts.yaml` no futuro (novo ID numérico)
quebrará silenciosamente a visibilidade da KB sem nenhum erro visível.
O mecanismo correto de permissão do Hub é o `hub_role.role` — imune a mudanças de IDs.

---

## OBJETIVO

Corrigir a lógica de `canViewAll` para usar `hub_role.role` em vez de `active_profile.id`,
alinhando a KB ao padrão de permissão já usado no restante do Hub.

---

## TAREFA

### ETAPA 1 — Mapeamento completo antes de qualquer alteração

**1.1 — Rastrear como `profileId` chega ao componente da KB**

Identificar:
- De qual campo do store Zustand o `profileId` é lido em `knowledge/page.tsx`
- O caminho completo: `login response → useAuthStore → seletor → knowledge/page.tsx`
- Se `active_profile.id` e `hub_role.role` são atualizados juntos ou em momentos diferentes

**1.2 — Rastrear onde `hub_role.role` está disponível no store**

Identificar o campo exato no `useAuthStore` que contém o role semântico do usuário ativo.
Exemplo esperado: `currentUserRole.active_hub_role.role` ou `currentUserRole.roles.hub_role`
— confirmar o campo real no código.

**1.3 — Busca global por `TECHNICIAN_PROFILE_ID` e `MANAGER_PROFILE_ID`**

Verificar se essas constantes ou a lógica `canViewAll` por ID são usadas em outros arquivos
além de `knowledge/page.tsx`. Se sim, listar todos os pontos — a correção deve ser consistente.

**1.4 — Verificar o payload de `/auth/me`**

Confirmar que a resposta do endpoint `/api/v1/dtic/auth/me` (e `/api/v1/sis/auth/me`)
retorna o `hub_role.role` populado para um usuário com Profile ID 4 (Super-Admin).
Se o backend não retorna `hub_role.role` nesse endpoint, a correção de frontend
precisará ser precedida por uma correção no backend.

---

### ETAPA 2 — Correção estrutural

**2.1 — Substituir a lógica de `canViewAll`**

A lógica deve deixar de usar ID numérico e passar a usar o role semântico:

```typescript
// ANTES (frágil — quebra com qualquer novo ID de perfil)
const TECHNICIAN_PROFILE_ID = 6;
const MANAGER_PROFILE_ID = 20;
const canViewAll = profileId === TECHNICIAN_PROFILE_ID || profileId === MANAGER_PROFILE_ID;

// DEPOIS (robusto — agnóstico a IDs do GLPI)
const canViewAll = hubRole === "gestor" || hubRole === "tecnico";
```

Onde `hubRole` é lido do campo correto do store Zustand identificado na Etapa 1.2.

**2.2 — Remover as constantes hardcoded**

Remover `TECHNICIAN_PROFILE_ID` e `MANAGER_PROFILE_ID` de `knowledge/page.tsx`.
Se existirem em outros arquivos (verificado na Etapa 1.3), avaliar caso a caso:
- Se usadas apenas para lógica de permissão → remover e substituir pelo role semântico
- Se usadas para outro propósito → manter mas documentar o risco

**2.3 — Verificar consistência dos filtros downstream**

Após a correção de `canViewAll`, verificar que os dois filtros que dependem dele
se comportam corretamente:

```typescript
// linha 364 — categorias
const params = !canViewAll ? { is_faq: true } : undefined;

// linha 380 — artigos
is_faq: !canViewAll ? true : (faqOnly ? true : undefined),
```

Testar mentalmente os 3 cenários:
- `hubRole = "solicitante"` → `canViewAll = false` → `is_faq: true` ✓
- `hubRole = "tecnico"` → `canViewAll = true` → sem filtro → todos os artigos ✓
- `hubRole = "gestor"` (qualquer ID de perfil) → `canViewAll = true` → todos os artigos ✓

---

### ETAPA 3 — Validação

**3.1 — Casos de teste a executar após a correção**

| Usuário | Profile ID | hub_role | Resultado esperado |
|---|---|---|---|
| Solicitante | 9 | solicitante | Apenas FAQs |
| Técnico | 6 | tecnico | Todos os artigos |
| Gestor TI | 20 | gestor | Todos os artigos |
| Super-Admin | 4 | gestor | Todos os artigos ✓ (estava quebrado) |
| Qualquer perfil futuro mapeado como gestor | qualquer ID | gestor | Todos os artigos |

**3.2 — Regressão**

Confirmar que a correção não afeta:
- O filtro manual de FAQ (`faqOnly`) que o usuário pode ativar
- A busca por texto dentro da KB
- A contagem de artigos exibida no header da página

---

## FORMATO DE ENTREGA

```
1. MAPEAMENTO
   Campo do store que contém hub_role: [caminho exato]
   Campo do store que contém profileId: [caminho exato]
   Outros arquivos com a mesma lógica: [lista ou "nenhum"]
   hub_role retornado pelo /auth/me para Profile 4: [sim/não + valor]

2. CORREÇÃO APLICADA
   Arquivo: knowledge/page.tsx
   Linhas alteradas: [lista]
   Diff ou trecho antes/depois

3. VALIDAÇÃO
   Resultado de cada caso de teste da Etapa 3.1
   Confirmação de que os filtros downstream se comportam corretamente

4. REGISTROS PARA A KNOWLEDGE BASE
   - 1 registro SOLUTION (correção validada)
   - 1 registro ADR (decisão de usar hub_role.role como fonte de verdade de permissão)
```

---

## CRITÉRIOS

- A correção NÃO deve adicionar novos IDs numéricos à lista — isso perpetua o problema
- A fonte de verdade de permissão no Hub é o `hub_role.role` — toda nova lógica de permissão
  no frontend deve seguir esse padrão
- Se o backend não retorna `hub_role.role` corretamente para todos os perfis, corrigir o
  backend ANTES de aplicar a correção no frontend
- Após a correção, nenhum novo perfil adicionado ao `contexts.yaml` deve quebrar a KB

---

## NOTA PARA DOCUMENTAÇÃO

Esta correção deve gerar dois registros na Knowledge Base:

**SOLUTION:** "KB: canViewAll corrigido para usar hub_role.role em vez de profile_id numérico"
- Causa raiz: TECHNICIAN_PROFILE_ID e MANAGER_PROFILE_ID hardcoded não contemplavam Profile ID 4
- Solução: substituição por verificação semântica `hubRole === "gestor" || hubRole === "tecnico"`
- Prevenção: toda lógica de permissão no frontend deve usar hub_role.role, nunca active_profile.id

**ADR:** "Fonte de verdade de permissão no frontend: hub_role.role"
- Contexto: KB usava profile_id numérico; profiles mudam com evolução do contexts.yaml
- Decisão: hub_role.role é a única fonte de verdade de permissão no frontend Hub
- Alternativas rejeitadas: lista de IDs numéricos (frágil), lookup dinâmico ao GLPI (latência)
- Consequências: qualquer novo perfil no contexts.yaml é automaticamente suportado

---

*Gerado via PROMPT_LIBRARY — P01 Análise/Correção | hub_dtic_and_sis | 2026-03-10*
