# PROMPT — Auditoria Completa: Matriz Permissional do Hub

> Template: P01 + P02 — Diagnóstico + Planejamento  
> Destino: antigravity  
> Escopo: Todas as camadas de permissão do Hub — GLPI, backend, frontend, UX  
> Regra absoluta: Mapear tudo antes de propor qualquer alteração.

---

## CONTEXTO

O Hub (`tensor-aurora`) possui uma matriz permissional distribuída em múltiplas camadas:

```
GLPI (perfis + grupos)
    ↓
Backend FastAPI (contexts.yaml + auth_service.py)
    ↓
Frontend React (Zustand store + ContextGuard + AppSidebar)
    ↓
UX (tela de permissões — Hub-App-permissoes)
```

Ao longo do desenvolvimento, essa matriz foi construída incrementalmente.
Hoje existe uma combinação de:
- Perfis GLPI com IDs numéricos fixos mapeados no `contexts.yaml`
- Grupos GLPI com prefixo `Hub-App-*` para controle de visibilidade de módulos
- Roles semânticos (`solicitante`, `tecnico`, `gestor`) usados no frontend
- Lógica de permissão em alguns componentes ainda usando `profile_id` numérico (bug conhecido)
- Uma tela de gestão de permissões (`Hub-App-permissoes`) cuja UX precisa de revisão

O objetivo desta tarefa é produzir um **mapeamento completo e auditado** de toda a matriz,
identificar inconsistências, propor correções e redesenhar a UX da tela de permissões.

---

## OBJETIVO

Ao final desta tarefa, ter:

1. Mapa completo de todas as regras de permissão — onde vivem, como funcionam, quem afetam
2. Diagnóstico de inconsistências entre camadas
3. Plano de onde cada usuário precisa ser configurado para ter o acesso correto
4. Diagnóstico e proposta de redesign da UX da tela de permissões
5. Checklist de testes para validar a matriz de ponta a ponta

---

## FASE 1 — INVENTÁRIO COMPLETO DA MATRIZ

### 1.1 — Camada GLPI: Perfis

Mapear todos os perfis GLPI relevantes para o Hub em ambos os contextos:

```
Para cada perfil:
  - ID numérico no GLPI
  - Nome do perfil
  - Contexto (DTIC / SIS / ambos)
  - Role semântico mapeado no contexts.yaml
  - Permissões GLPI nativas associadas
```

Verificar `contexts.yaml` e cruzar com os perfis reais existentes no GLPI.
Identificar se há perfis no GLPI sem mapeamento no Hub ou vice-versa.

### 1.2 — Camada GLPI: Grupos Hub-App-*

Mapear todos os grupos com prefixo `Hub-App-` em ambas as instâncias:

**DTIC (IDs confirmados):**
- `Hub-App-busca` → ID 109
- `Hub-App-dtic-infra` → ID 114
- `Hub-App-dtic-kpi` → ID 113
- `Hub-App-dtic-metrics` → ID 112
- `Hub-App-permissoes` → ID 110

**SIS (IDs confirmados):**
- `Hub-App-busca` → ID 102
- `Hub-App-carregadores` → ID 104
- `Hub-App-permissoes` → ID 103
- `Hub-App-sis-dashboard` → ID 105

Para cada grupo:
- Qual módulo ele desbloqueia
- Quais usuários estão atribuídos atualmente
- Se há usuários que deveriam estar mas não estão

### 1.3 — Camada Backend: contexts.yaml

Extrair e documentar o mapeamento completo atual:

```
Para cada contexto (DTIC / SIS):
  profile_map:
    [id] → [role] → [label] → [route]
  group_map:
    [id] → [role] → [context_override]
```

Identificar:
- Perfis mapeados que não existem no GLPI real
- IDs de grupos no `group_map` que divergem dos IDs reais do GLPI (IDs 22 e 21 para SIS — verificar)
- Perfis/grupos no GLPI sem mapeamento no `contexts.yaml`

### 1.4 — Camada Backend: auth_service.py

Documentar os dois mecanismos de resolução:

**Mecanismo 1 — resolve_hub_roles** (L64-122):
- Como perfis → roles semânticos
- Como grupos → roles semânticos com context_override
- O que acontece quando nenhum perfil/grupo bate (fallback)

**Mecanismo 2 — resolve_app_access** (L22-43):
- Como os grupos `Hub-App-*` são buscados via API GLPI
- Como o payload de `app_access[]` é montado
- O que retorna quando o usuário não tem nenhum grupo `Hub-App-*`

### 1.5 — Camada Frontend: ContextGuard + AppSidebar

Para cada módulo registrado no `context-registry.ts`:

```
Módulo: [nome]
  featureId / requireApp: [valor]
  requiredRoles: [lista]
  Visível para: [roles que satisfazem a condição]
  Oculto para: [roles que não satisfazem]
```

Identificar se há módulos com `requireApp` sem o grupo `Hub-App-*` correspondente criado no GLPI.

### 1.6 — Lógica de permissão no frontend por componente

Busca global nos arquivos `.tsx` e `.ts` por:
- `profile_id`, `profileId`, `PROFILE_ID` — usos de ID numérico para decisão de permissão
- `canViewAll`, `canEdit`, `canManage` ou similar — flags de permissão derivadas
- Comparações diretas com valores numéricos de perfil

Para cada ocorrência:
- Arquivo e linha
- O que a lógica decide
- Se usa `hub_role.role` (correto) ou `profile_id` numérico (frágil)

**Bug conhecido:** `knowledge/page.tsx` usa `TECHNICIAN_PROFILE_ID = 6` e `MANAGER_PROFILE_ID = 20`
— esse é o padrão a ser erradicado. Identificar todas as outras ocorrências do mesmo padrão.

---

## FASE 2 — DIAGNÓSTICO DE INCONSISTÊNCIAS

Com o inventário da Fase 1, identificar todos os pontos onde a matriz está inconsistente.

### 2.1 — Matriz de diagnóstico

Para cada inconsistência encontrada, registrar:

```
INCONSISTÊNCIA [n]
  Camada(s): [onde ocorre]
  Descrição: [o que está errado]
  Sintoma visível: [o que o usuário experimenta]
  Severidade: CRÍTICA | ALTA | MÉDIA | BAIXA
  Causa raiz: [por que acontece]
  Correção proposta: [o que precisa mudar]
  Arquivos afetados: [lista]
```

### 2.2 — Mapa de usuário → acesso esperado vs. acesso real

Para os perfis de usuário relevantes, construir a tabela:

| Usuário/Role | Módulos esperados | Módulos reais | Status |
|---|---|---|---|
| solicitante DTIC | ... | ... | ✅ / ⚠️ / ❌ |
| tecnico DTIC | ... | ... | ... |
| gestor DTIC | ... | ... | ... |
| solicitante SIS | ... | ... | ... |
| tecnico-manutencao SIS | ... | ... | ... |
| gestor SIS | ... | ... | ... |

### 2.3 — Checklist de pré-requisitos por usuário

Para cada role, documentar exatamente o que precisa estar configurado no GLPI
para o acesso funcionar corretamente:

```
ROLE: tecnico DTIC
  ✓ Perfil GLPI: ID 6 (Technician) atribuído na entidade correta
  ✓ Grupos Hub-App-* necessários: Hub-App-busca (ID 109)
  ✗ NÃO precisa de: Hub-App-permissoes, Hub-App-dtic-kpi
  Observação: [qualquer ressalva]
```

---

## FASE 3 — AUDITORIA DA UX: TELA DE PERMISSÕES

A tela acessada via `Hub-App-permissoes` é a interface de gestão da matriz.
Ela precisa de diagnóstico e redesign.

### 3.1 — Estado atual da tela

Mapear o que a tela exibe e permite fazer hoje:
- Quais informações são exibidas
- Quais ações são disponíveis
- Como os dados são carregados (API? direto do GLPI? store?)
- Quais componentes compõem a tela (`components/`, `page.tsx`)

### 3.2 — Problemas de UX identificados

Para cada problema, descrever:
- O que o usuário experimenta hoje
- O que deveria acontecer
- Impacto na usabilidade

### 3.3 — Proposta de redesign da tela de permissões

A tela deve comunicar claramente a matriz completa e permitir gestão intuitiva.
Propor uma estrutura que responda visualmente às seguintes perguntas:

**Visão por usuário:**
> "Para este usuário, quais módulos ele pode ver e qual é o seu role?"

**Visão por módulo:**
> "Para este módulo, quais usuários têm acesso?"

**Visão por role:**
> "Quais usuários têm role gestor? Quais são técnicos?"

**Checklist de configuração:**
> "O usuário X está corretamente configurado? O que está faltando?"

Proposta de estrutura visual da tela:

```
[CABEÇALHO]
Gestão de Acessos — [Contexto]

[ABAS OU SEÇÕES]
  Usuários          → lista de usuários + role atual + módulos atribuídos + status (✅ / ⚠️)
  Módulos           → lista de módulos + quem tem acesso + grupo Hub-App-* correspondente
  Roles             → visão por role com usuários em cada nível
  Diagnóstico       → alertas automáticos de configuração incompleta ou inconsistente

[AÇÕES]
  Por usuário: Atribuir grupo | Remover grupo | Ver detalhes
  Por módulo: Gerenciar membros do grupo Hub-App-*
```

### 3.4 — Fonte de dados para a tela de permissões

Identificar e propor:
- Quais dados a tela precisa para funcionar (usuários, grupos, roles, módulos)
- Quais endpoints do backend já existem e podem ser reaproveitados
- Quais endpoints precisariam ser criados
- Se há necessidade de chamar a API REST do GLPI diretamente para listar membros dos grupos

---

## FASE 4 — PLANO DE CORREÇÃO E IMPLEMENTAÇÃO

### 4.1 — Correções imediatas (sem risco, alta prioridade)

Listar ações que podem ser executadas agora sem impacto em produção:
- Atualização de IDs no `contexts.yaml` se houver divergência
- Criação de grupos `Hub-App-*` faltantes
- Atribuição de usuários a grupos corretos

### 4.2 — Correções de código (requerem deploy)

Para cada correção de código, especificar:
```
CORREÇÃO [n]
  Arquivo: [caminho]
  Linha(s): [números]
  Antes: [trecho atual]
  Depois: [trecho proposto]
  Justificativa: [por que essa mudança]
  Teste de regressão: [como validar que não quebrou nada]
```

### 4.3 — Redesign da tela de permissões

Propor as fases de implementação do redesign:
```
FASE A — Dados (endpoints e queries necessários)
FASE B — Componentes base (tabelas, cards, badges de status)
FASE C — Visões (Usuários / Módulos / Roles / Diagnóstico)
FASE D — Ações (atribuição/remoção de grupos via GLPI API)
```

---

## FASE 5 — CHECKLIST DE TESTES END-TO-END

Construir um checklist completo para validar a matriz após todas as correções:

```
TESTES DE ACESSO POR ROLE

[ ] solicitante DTIC: vê apenas módulos sem requireApp + módulos dos grupos que possui
[ ] tecnico DTIC: canViewAll=true na KB | vê módulos técnicos | não vê gestão de permissões
[ ] gestor DTIC: acesso completo | vê Hub-App-permissoes | canViewAll=true na KB
[ ] gestor DTIC (Profile ID 4 / Super-Admin): mesmo acesso que gestor — bug corrigido

[ ] solicitante SIS: acesso básico
[ ] tecnico-manutencao SIS: context_override sis-manutencao ativo
[ ] tecnico-conservacao SIS: context_override sis-memoria ativo
[ ] gestor SIS: acesso completo ao contexto SIS

TESTES DE BORDA

[ ] Usuário sem nenhum grupo Hub-App-*: sidebar sem módulos satélite (não crash)
[ ] Usuário com grupo Hub-App-* mas perfil não mapeado: fallback para solicitante
[ ] Token expirado: redirect para login (não tela em branco)
[ ] Troca de contexto DTIC → SIS: roles e módulos recarregados corretamente

TESTES DA TELA DE PERMISSÕES

[ ] Gestor consegue visualizar todos os usuários e seus roles
[ ] Diagnóstico automático identifica usuários com configuração incompleta
[ ] Ações de atribuição de grupo refletem imediatamente na sidebar do usuário afetado
```

---

## FORMATO DE ENTREGA

```
1. INVENTÁRIO COMPLETO
   [Fases 1.1 a 1.6 — tabelas e mapas]

2. DIAGNÓSTICO DE INCONSISTÊNCIAS
   [Lista numerada com severidade e correção proposta]

3. CHECKLIST DE CONFIGURAÇÃO POR ROLE
   [O que cada tipo de usuário precisa ter no GLPI]

4. DIAGNÓSTICO E PROPOSTA DE REDESIGN DA TELA DE PERMISSÕES
   [Estado atual + problemas + proposta estruturada]

5. PLANO DE CORREÇÃO
   [Imediatas + código + redesign faseado]

6. CHECKLIST DE TESTES E2E
   [Pronto para execução]

7. REGISTROS PARA A KNOWLEDGE BASE
   Gerar ao final:
   - 1 SOLUTION por correção confirmada
   - 1 ADR para decisões arquiteturais tomadas
   - 1 PATTERN para padrões de falha recorrentes identificados
```

---

## CRITÉRIOS

- Toda inconsistência deve ter causa raiz identificada — não apenas sintoma descrito
- O checklist de configuração deve ser executável por alguém sem contexto do código
- A proposta de redesign da tela deve ser implementável com os dados já disponíveis no backend
- Nenhuma correção de código sem teste de regressão proposto
- A fonte de verdade de permissão no frontend é sempre `hub_role.role` — nunca `profile_id` numérico

---

*Gerado via PROMPT_LIBRARY — P01+P02 Diagnóstico+Planejamento | hub_dtic_and_sis | 2026-03-10*
