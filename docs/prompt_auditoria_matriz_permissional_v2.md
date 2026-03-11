# PROMPT — Auditoria Completa: Matriz Permissional do Hub (v2)

> Template: P01 + P02 — Diagnóstico + Planejamento  
> Destino: antigravity  
> Escopo: Todas as camadas de permissão — GLPI, backend, frontend, UX  
> Versão: 2.0 — revisada com decisões e diagnósticos consolidados em 2026-03-10  
> Regra absoluta: Mapear tudo antes de propor qualquer alteração.

---

## CONTEXTO E ESTADO DO PROJETO

O Hub (`tensor-aurora`) possui uma matriz permissional distribuída em 4 camadas:

```
CAMADA 1 — GLPI (perfis + grupos Hub-App-*)
    ↓
CAMADA 2 — Backend FastAPI (contexts.yaml + auth_service.py)
    ↓
CAMADA 3 — Frontend React (Zustand store + ContextGuard + AppSidebar)
    ↓
CAMADA 4 — UX (tela de permissões — Hub-App-permissoes)
```

### O que já é conhecido e confirmado

As informações abaixo foram validadas antes desta tarefa e devem ser usadas como base —
não precisam ser re-investigadas, apenas cruzadas com o estado real do código.

**Grupos Hub-App-* criados e confirmados:**

| Grupo | Contexto | ID GLPI | Módulo que desbloqueia |
|---|---|---|---|
| Hub-App-busca | DTIC | 109 | Busca avançada |
| Hub-App-dtic-infra | DTIC | 114 | Infraestrutura DTIC |
| Hub-App-dtic-kpi | DTIC | 113 | KPIs DTIC |
| Hub-App-dtic-metrics | DTIC | 112 | Métricas DTIC |
| Hub-App-permissoes | DTIC | 110 | Gestão de acessos |
| Hub-App-busca | SIS | 102 | Busca avançada |
| Hub-App-carregadores | SIS | 104 | Dashboard de carregadores |
| Hub-App-permissoes | SIS | 103 | Gestão de acessos |
| Hub-App-sis-dashboard | SIS | 105 | Dashboard SIS |

**Roles semânticos confirmados:**

| Role | Contexto | Origem | Descrição |
|---|---|---|---|
| `solicitante` | DTIC + SIS | profile_map | Usuário final — abre chamados |
| `tecnico` | DTIC | profile_map | Técnico de TI — atende chamados |
| `gestor` | DTIC | profile_map | Gestor de TI — visão completa + admin |
| `tecnico-manutencao` | SIS | group_map | Técnico de manutenção predial |
| `tecnico-conservacao` | SIS | group_map | Técnico de conservação |
| `gestor` | SIS | profile_map | Gestor SIS — visão completa + admin |

**Padrão de falha documentado — "Silent Hardcode Drift":**

> Lógica de permissão hardcoded no frontend (`profile_id === NÚMERO`) diverge silenciosamente
> de `contexts.yaml` quando novos perfis são adicionados. A feature some sem erro no console.
> Já causou 3 regressões confirmadas. Toda lógica de permissão no frontend deve usar
> `hub_role.role` (string semântica) — nunca `profile_id` numérico.

**Regras de permissão confirmadas para a Base de Conhecimento (DTIC only):**

```
canViewAll        = hubRole === "gestor" || hubRole === "tecnico"
canManageArticles = hubRole === "gestor" || hubRole === "tecnico"
```

A KB não existe no contexto SIS. Nenhuma referência a roles SIS deve aparecer em `knowledge/page.tsx`.

**Incidents abertos conhecidos:**

- `auth_guard.py` (L51): valida apenas presença do token, não integridade contra GLPI
- IDs 22 e 21 no `group_map` SIS do `contexts.yaml`: divergência com IDs reais não confirmada

---

## OBJETIVO

Ao final desta tarefa, ter:

1. Inventário completo e cruzado de todas as regras de permissão
2. Diagnóstico de todas as inconsistências entre camadas — com causa raiz
3. Checklist operacional: o que cada usuário precisa ter configurado no GLPI
4. Diagnóstico + proposta de redesign da tela de permissões
5. Checklist de testes E2E para validar a matriz de ponta a ponta
6. Plano de correção priorizado

---

## FASE 1 — INVENTÁRIO COMPLETO DA MATRIZ

### 1.1 — Camada GLPI: Perfis

Extrair todos os perfis GLPI relevantes em ambas as instâncias (DTIC e SIS).
Para cada perfil:

```
ID numérico | Nome do perfil | Contexto | Role semântico em contexts.yaml | Observação
```

Cruzar com `contexts.yaml` e identificar:
- Perfis no GLPI sem mapeamento no Hub
- Perfis no `contexts.yaml` sem correspondência no GLPI real
- O mapeamento do Profile ID 4 (Super-Admin) → confirmar se `role: gestor` está presente

### 1.2 — Camada GLPI: Grupos Hub-App-*

Para cada grupo da tabela confirmada acima:
- Listar todos os usuários atualmente atribuídos
- Identificar usuários que deveriam estar no grupo mas não estão
- Confirmar que IDs reais no GLPI batem com os IDs da tabela

**Atenção especial — IDs SIS a verificar:**
O `group_map` do `contexts.yaml` referencia grupos SIS com IDs 22 e 21
para os roles `tecnico-manutencao` e `tecnico-conservacao`.
Esses IDs precisam ser cruzados com os IDs reais dos grupos no GLPI SIS.
Se divergirem, o `context_override` nunca ativa — os técnicos SIS ficam como `solicitante`.

### 1.3 — Camada Backend: contexts.yaml

Extrair e documentar o mapeamento completo atual nos dois contextos:

```
CONTEXTO DTIC:
  profile_map:
    [id] → role | label | route
  group_map:
    [id] → role | context_override (se houver)

CONTEXTO SIS:
  profile_map:
    [id] → role | label | route
  group_map:
    [id] → role | context_override
    ↳ Confirmar IDs 22 e 21 vs. IDs reais no GLPI
```

### 1.4 — Camada Backend: auth_service.py

Documentar os dois mecanismos:

**Mecanismo 1 — `resolve_hub_roles` (L64-122):**
- Como `profile_map` transforma perfil GLPI → role semântico
- Como `group_map` transforma grupo GLPI → role com `context_override`
- Qual é o fallback quando nenhum perfil/grupo bate
- Se o fallback é `solicitante` ou erro

**Mecanismo 2 — `resolve_app_access` (L22-43):**
- Como os grupos `Hub-App-*` são buscados via API REST do GLPI
- Como o array `app_access[]` é montado com os módulos desbloqueados
- O que retorna quando o usuário não tem nenhum grupo `Hub-App-*`
- Se retorna `[]` ou `null` — e como o frontend trata isso

**Incident conhecido — `auth_guard.py` (L51):**
Documentar o comportamento atual: o guard valida apenas presença do token.
A proteção real está em `get_user_glpi_session` que instancia `GLPIClient`.
Avaliar se todos os endpoints críticos seguem esse padrão ou se algum usa
`verify_session` sem instanciar o cliente.

### 1.5 — Camada Frontend: context-registry.ts + ContextGuard

Para cada módulo registrado:

```
Módulo: [nome]
  requireApp: [valor ou null]
  requiredRoles: [lista de roles]
  Grupo Hub-App-* correspondente: [nome + ID]
  Visível para: [roles que satisfazem]
  Invisível para: [roles que não satisfazem]
  Status: ✅ grupo existe no GLPI | ❌ grupo faltante
```

### 1.6 — Camada Frontend: varredura de lógica de permissão

Busca global em todos os `.tsx` e `.ts` por:
- `profile_id`, `profileId`, `PROFILE_ID` usados em **comparações de permissão**
- Constantes com sufixo `_PROFILE_ID`
- Comparações diretas com número inteiro em contexto de permissão: `=== 4`, `=== 6`, `=== 20`

**Distinção crítica a aplicar na varredura:**

```
SEGURO   → hubRoles.find(r => r.profile_id === activeProfile?.id)
           (lookup: dado o ID ativo, encontrar o hub_role — funciona com qualquer ID)

FRÁGIL   → if (profileId === 6) → canEdit = true
           (decisão de permissão hardcoded — quebra com qualquer novo ID)
```

Classificar cada ocorrência como SEGURO ou FRÁGIL.
Registrar as FRÁGEIS com arquivo, linha, decisão e correção proposta.

**Correções já aplicadas (não incluir no diagnóstico como pendentes):**
- `knowledge/page.tsx`: `canViewAll` migrado para `hub_role.role` ✅
- `knowledge/page.tsx`: `isTechnician` substituído por `canManageArticles` ✅

---

## FASE 2 — DIAGNÓSTICO DE INCONSISTÊNCIAS

Para cada inconsistência identificada na Fase 1:

```
INCONSISTÊNCIA [n]
  Camada(s): GLPI | backend | frontend | UX
  Descrição: [o que está errado]
  Sintoma visível: [o que o usuário experimenta]
  Severidade: CRÍTICA | ALTA | MÉDIA | BAIXA
  Causa raiz: [mecanismo exato de falha]
  Correção proposta: [o que mudar]
  Arquivos afetados: [lista]
  Relacionado ao padrão "Silent Hardcode Drift": sim | não
```

### 2.1 — Mapa de acesso esperado vs. acesso real

| Role | Contexto | Módulos esperados | Módulos reais | Status |
|---|---|---|---|---|
| solicitante | DTIC | Chamados, Dashboard básico | ? | ? |
| tecnico | DTIC | + KB (ver + CRUD), Busca | ? | ? |
| gestor | DTIC | Tudo + Permissões + KB (ver + CRUD) | ? | ? |
| gestor (Profile 4) | DTIC | Igual a gestor acima | ? | ? |
| solicitante | SIS | Chamados básicos | ? | ? |
| tecnico-manutencao | SIS | Módulos de manutenção | ? | ? |
| tecnico-conservacao | SIS | Módulos de conservação | ? | ? |
| gestor | SIS | Tudo SIS + Permissões | ? | ? |

Preencher a coluna "Módulos reais" com base no inventário da Fase 1.

### 2.2 — Checklist operacional por role

Para cada role, o que precisa estar configurado no GLPI para o acesso funcionar:

```
ROLE: gestor DTIC
  OBRIGATÓRIO:
  ✓ Perfil GLPI: ID 4 (Super-Admin) OU ID 20 (Gestor TI) na entidade correta
  ✓ Grupo: Hub-App-permissoes (ID 110)
  OPCIONAL (por módulo adicional):
  ✓ Hub-App-dtic-infra (ID 114) → para ver Infraestrutura
  ✓ Hub-App-dtic-kpi (ID 113) → para ver KPIs
  ✓ Hub-App-dtic-metrics (ID 112) → para ver Métricas
  ✓ Hub-App-busca (ID 109) → para Busca avançada
  NÃO PRECISA:
  ✗ Nenhum grupo SIS
  ATENÇÃO:
  ⚠ KB (criar/editar/excluir artigos) é concedido pelo role, não por grupo Hub-App-*

ROLE: tecnico-manutencao SIS
  OBRIGATÓRIO:
  ✓ Perfil GLPI: [confirmar ID] na entidade SIS
  ✓ Grupo SIS: [confirmar grupo e ID real] para ativar context_override
  ✗ NÃO deve ter grupos DTIC
  ATENÇÃO:
  ⚠ context_override "sis-manutencao" só ativa se o ID do grupo no GLPI
    bater com o ID no group_map do contexts.yaml — verificar IDs 22 e 21
```

Construir esta tabela para todos os 8 roles.

---

## FASE 3 — AUDITORIA DA UX: TELA DE PERMISSÕES

### 3.1 — Estado atual

Ler `web/src/app/[context]/permissoes/page.tsx` e componentes relacionados:
- O que é exibido hoje (quais dados, quais colunas, quais ações)
- Como os dados são carregados (endpoint, store, chamada direta GLPI)
- Quais componentes compõem a tela
- O que o gestor consegue fazer atualmente (só visualizar ou também modificar?)

### 3.2 — Problemas de UX a identificar

Para cada problema:
- O que o gestor vê hoje
- O que deveria ver
- Impacto operacional (ex: "gestor não consegue saber se usuário X está mal configurado")

### 3.3 — Proposta de redesign

A tela deve responder visualmente às seguintes perguntas sem o gestor precisar saber
como o GLPI funciona internamente:

**"Este usuário está corretamente configurado para o role que tem?"**
**"Quais módulos este usuário pode acessar?"**
**"Quem tem acesso ao módulo X?"**
**"Algum usuário está com configuração incompleta ou inconsistente?"**

Estrutura proposta:

```
[CABEÇALHO]
Gestão de Acessos — [DTIC / SIS]

[ABAS]

ABA: Usuários
  Lista: avatar | nome | role atual | módulos atribuídos | status (✅ completo / ⚠️ incompleto)
  Ação por usuário: Ver detalhes | Atribuir grupo | Remover grupo

ABA: Módulos
  Lista: módulo | grupo Hub-App-* | total de usuários com acesso | ação: gerenciar membros

ABA: Roles
  Seções por role: gestor / tecnico / solicitante
  Cada seção: lista de usuários com aquele role

ABA: Diagnóstico
  Alertas automáticos:
  ⚠ "Usuário X tem role gestor mas não está no grupo Hub-App-permissoes"
  ⚠ "Usuário Y está no grupo Hub-App-carregadores mas perfil não está mapeado"
  ❌ "IDs do group_map SIS divergem dos grupos reais no GLPI"
```

### 3.4 — Fonte de dados necessária

Mapear para cada visão quais dados são necessários e de onde viriam:

```
ABA Usuários:
  Dados: lista de usuários GLPI + perfil ativo + grupos Hub-App-* + role derivado
  Fonte atual: ? (endpoint existente ou direto GLPI?)
  Endpoint necessário: GET /api/v1/{context}/admin/users-matrix

ABA Módulos:
  Dados: grupos Hub-App-* + membros de cada grupo
  Fonte: API REST GLPI (getGroupUsers) — já usada em algum ponto?

ABA Diagnóstico:
  Dados: cruzamento usuários × grupos × roles × context-registry
  Lógica: pode ser computada no frontend se os dados anteriores estiverem disponíveis
```

Identificar endpoints já existentes vs. endpoints que precisariam ser criados.
Se um endpoint precisar ser criado, descrever o contrato de dados esperado.

---

## FASE 4 — PLANO DE CORREÇÃO PRIORIZADO

### 4.1 — Ações imediatas (sem código, sem deploy)

Ações executáveis agora no GLPI diretamente:
- Corrigir IDs 22 e 21 no `contexts.yaml` se houver divergência com GLPI real
- Atribuir usuários aos grupos `Hub-App-*` corretos que estejam faltando
- Verificar se todos os gestor DTIC estão no grupo `Hub-App-permissoes`

### 4.2 — Correções de código

Para cada correção:

```
CORREÇÃO [n]
  Prioridade: ALTA | MÉDIA | BAIXA
  Arquivo: [caminho]
  Linha(s): [números]
  Estado atual: [código]
  Estado proposto: [código]
  Justificativa: [por que]
  Risco: [o que pode quebrar]
  Teste de regressão: [como validar]
```

**Não incluir como pendente** (já corrigido):
- `knowledge/page.tsx`: `canViewAll` e `canManageArticles` — ✅ corrigidos

**Incluir como pendente** se a varredura da Fase 1.6 encontrar novos pontos frágeis.

### 4.3 — Redesign da tela de permissões (faseado)

```
FASE A — Infraestrutura de dados
  [ ] Mapear endpoints existentes reutilizáveis
  [ ] Definir e criar endpoints faltantes
  [ ] Validar que os dados do GLPI chegam corretamente

FASE B — Componentes base
  [ ] Tabela de usuários com badges de role e status
  [ ] Card de módulo com lista de membros
  [ ] Badge de diagnóstico (✅ / ⚠️ / ❌)

FASE C — Visões completas
  [ ] Aba Usuários funcional
  [ ] Aba Módulos funcional
  [ ] Aba Roles funcional
  [ ] Aba Diagnóstico com alertas automáticos

FASE D — Ações (requerem escrita na API GLPI)
  [ ] Atribuir usuário a grupo Hub-App-*
  [ ] Remover usuário de grupo Hub-App-*
  [ ] Confirmação de que mudanças refletem na sidebar do usuário afetado
```

---

## FASE 5 — CHECKLIST DE TESTES E2E

### Testes de acesso por role

```
CONTEXTO DTIC

[ ] solicitante (profile mapeado como solicitante):
    → Sidebar: apenas Novo Chamado, Meus Chamados, Dashboard
    → KB: apenas artigos FAQ
    → Sem botões de CRUD na KB
    → Sem módulos Hub-App-* na sidebar (a menos que atribuído manualmente)

[ ] tecnico (profile 6):
    → KB: todos os artigos visíveis
    → KB: botões Novo Artigo, Editar, Excluir visíveis
    → Hub-App-busca: visível se estiver no grupo 109

[ ] gestor (profile 20):
    → KB: todos os artigos visíveis
    → KB: botões Novo Artigo, Editar, Excluir visíveis ← VALIDAR (foi regressão)
    → Hub-App-permissoes: visível se estiver no grupo 110

[ ] gestor SUPER-ADMIN (profile 4, role gestor):
    → Comportamento idêntico ao gestor acima
    → KB: 21 artigos + botões CRUD visíveis ← VALIDAR (foram duas regressões)

CONTEXTO SIS

[ ] solicitante SIS:
    → Acesso básico, sem módulos satélite

[ ] tecnico-manutencao (via group_map, context_override sis-manutencao):
    → context_override ativo — confirmar via DevTools (active_hub_role.context)
    → Módulos de manutenção visíveis
    → Sem acesso a módulos de conservação ou KB

[ ] tecnico-conservacao (via group_map, context_override sis-memoria):
    → context_override ativo — confirmar via DevTools
    → Módulos de conservação visíveis
    → Sem acesso a módulos de manutenção ou KB

[ ] gestor SIS:
    → Acesso completo ao contexto SIS
    → Hub-App-permissoes SIS (grupo 103) visível
    → Hub-App-carregadores (grupo 104) visível
```

### Testes de borda

```
[ ] Usuário sem nenhum grupo Hub-App-*:
    → Sidebar sem módulos satélite
    → Sem crash, sem tela em branco

[ ] Usuário com grupo Hub-App-* mas perfil não mapeado no contexts.yaml:
    → Fallback para solicitante (não crash)
    → Confirmar qual é o comportamento real do fallback em auth_service.py

[ ] Token expirado:
    → Redirect para login
    → Não tela em branco, não loop de redirect

[ ] Troca de contexto DTIC → SIS:
    → Roles e módulos recarregados para o novo contexto
    → Sidebar atualizada sem necessidade de reload manual

[ ] Usuário com profile SIS tentando acessar rota DTIC:
    → ContextGuard bloqueia e redireciona corretamente
```

### Testes específicos da tela de permissões

```
[ ] Gestor consegue ver todos os usuários e seus roles atuais
[ ] Status de configuração (✅ / ⚠️) é exibido por usuário
[ ] Aba Diagnóstico exibe alertas para configurações incompletas
[ ] Atribuição de grupo reflete na sidebar do usuário afetado (tempo razoável ou relogin)
[ ] Remoção de grupo remove o módulo da sidebar do usuário
[ ] Gestor SIS não vê usuários DTIC (e vice-versa)
```

---

## FORMATO DE ENTREGA

```
1. INVENTÁRIO COMPLETO
   [Fases 1.1 a 1.6 com tabelas, mapas e classificações SEGURO/FRÁGIL]

2. DIAGNÓSTICO DE INCONSISTÊNCIAS
   [Lista numerada com severidade, causa raiz e correção]
   [Confirmação ou descarte dos IDs 22 e 21 do SIS]

3. CHECKLIST OPERACIONAL POR ROLE
   [Tabela completa — o que cada role precisa ter no GLPI]

4. AUDITORIA E PROPOSTA DE REDESIGN DA TELA DE PERMISSÕES
   [Estado atual + problemas identificados + proposta com abas]
   [Mapa de dados necessários vs. disponíveis]

5. PLANO DE CORREÇÃO PRIORIZADO
   [Imediatas sem deploy + código com diff + redesign faseado]

6. CHECKLIST E2E
   [Pronto para execução por humano]

7. REGISTROS PARA A KNOWLEDGE BASE
   - SOLUTION por cada correção confirmada
   - ADR: "Fonte de verdade de permissão no frontend = hub_role.role"
   - ADR: "Escopo da KB: exclusivo DTIC, canViewAll e canManageArticles por role semântico"
   - PATTERN: "Silent Hardcode Drift" (se não estiver já registrado)
   - INCIDENT: IDs 22/21 SIS se houver divergência confirmada
```

---

## CRITÉRIOS

- Toda inconsistência deve ter causa raiz — não apenas sintoma
- A classificação SEGURO/FRÁGIL da varredura deve ser aplicada a cada ocorrência
- O checklist operacional deve ser executável por alguém sem acesso ao código
- A proposta de redesign deve ser viável com os dados que o backend já tem ou pode ter
- Nenhuma correção de código sem teste de regressão definido
- A fonte de verdade de permissão no frontend é sempre `hub_role.role`
- A KB não tem lógica SIS — qualquer referência encontrada é um bug

---

*Gerado via PROMPT_LIBRARY — P01+P02 v2 | hub_dtic_and_sis | 2026-03-10*
