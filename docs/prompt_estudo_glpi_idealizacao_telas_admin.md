# PROMPT — Estudo das Bases GLPI DTIC e SIS: Idealização das Telas de Administração

> Template: P01 + P02 — Diagnóstico + Planejamento  
> Destino: antigravity  
> Base: Relatório "GLPI REST API — Módulo Administração" (glpi_api_admin_report.docx)  
> Regra absoluta: Apenas leitura e estudo nesta fase. Nenhuma alteração em nenhum arquivo.  
> Esta tarefa termina com um relatório de descobertas e uma proposta de idealização.

---

## CONTEXTO

Foi produzido um estudo completo da API REST do GLPI cobrindo todos os endpoints
disponíveis para o módulo Administração: Usuários, Grupos, Perfis e Entidades.

Agora precisamos ir além da documentação e entender **como esses recursos estão
sendo usados na prática nas nossas duas instâncias GLPI reais** — DTIC e SIS.

O objetivo é chegar a uma compreensão profunda e contextualizada que permita
**idealizar as telas de administração do Hub** com total aderência à nossa realidade,
sem suposições, sem dados genéricos — apenas o que existe de verdade.

---

## OBJETIVO

Ao final desta tarefa, ter:

1. Fotografia completa do estado atual de Usuários, Grupos, Perfis e Entidades nas duas instâncias
2. Mapeamento de como o Hub usa e depende de cada um desses recursos hoje
3. Diagnóstico de gaps entre o que existe e o que o Hub precisa
4. Idealização completa das telas de administração — funcionalidades, fluxos e UX

---

## FASE 1 — ESTUDO DA INSTÂNCIA DTIC

Usando o GLPIClient com as credenciais do contexto DTIC, executar cada consulta abaixo
e documentar o resultado completo.

### 1.1 — Entidades DTIC

```
GET /Entity
GET /getMyEntities
GET /getActiveEntities
```

Para cada entidade retornada, registrar:
- ID, nome, entidade pai (`entities_id`), `is_recursive`
- Construir o diagrama hierárquico completo das entidades DTIC

### 1.2 — Perfis DTIC

```
GET /Profile
GET /getMyProfiles
```

Para cada perfil retornado, registrar:
- ID, nome, `interface` (helpdesk vs central), `is_default`
- Cruzar com o `profile_map` em `contexts.yaml` (DTIC):
  ```
  ID real no GLPI → nome → role mapeado no Hub
  ```
- Identificar perfis no GLPI sem mapeamento no Hub
- Identificar perfis no `contexts.yaml` cujo ID não existe no GLPI real

### 1.3 — Grupos DTIC

```
GET /Group (range=0-99, expand_dropdowns=true)
```

Para cada grupo retornado, registrar:
- ID, nome, entidade, `is_usergroup`, `is_requester`, `is_assign`
- Identificar e destacar os grupos `Hub-App-*`:
  ```
  Hub-App-busca        → ID esperado: 109 → ID real: ?
  Hub-App-dtic-infra   → ID esperado: 114 → ID real: ?
  Hub-App-dtic-kpi     → ID esperado: 113 → ID real: ?
  Hub-App-dtic-metrics → ID esperado: 112 → ID real: ?
  Hub-App-permissoes   → ID esperado: 110 → ID real: ?
  ```
- Confirmar se os IDs batem com o que está hardcoded no sistema

### 1.4 — Usuários DTIC

```
GET /User (range=0-99, expand_dropdowns=true)
GET /search/User (critério: is_active=1)
```

Para cada usuário ativo, registrar:
- ID, `name` (login), `realname`, `firstname`, `is_active`, `entities_id`
- Total de usuários ativos

Para o usuário `jonathan-moletta` especificamente:
```
GET /User/{id_jonathan}/Group_User
GET /User/{id_jonathan}/Profile_User
```
- Listar todos os grupos que possui (confirmar Hub-App-*)
- Listar todos os perfis e em quais entidades
- Verificar se profile_id=4 está corretamente configurado

### 1.5 — Matriz Usuário × Grupo DTIC (Hub-App-*)

Para cada grupo `Hub-App-*` identificado:
```
GET /Group/{id}/Group_User (expand_dropdowns=true)
```
Construir a matriz:
```
GRUPO               | MEMBROS ATUAIS         | IDs dos usuários
Hub-App-busca       | [lista de nomes]       | [lista de IDs]
Hub-App-dtic-infra  | ...                    | ...
Hub-App-dtic-kpi    | ...                    | ...
Hub-App-dtic-metrics| ...                    | ...
Hub-App-permissoes  | ...                    | ...
```

---

## FASE 2 — ESTUDO DA INSTÂNCIA SIS

Repetir o processo da Fase 1 para o contexto SIS.

### 2.1 — Entidades SIS

```
GET /Entity  (contexto SIS)
GET /getMyEntities
```
- Diagrama hierárquico das entidades SIS
- Comparar com a estrutura DTIC — são instâncias separadas ou sub-entidades?

### 2.2 — Perfis SIS

```
GET /Profile (contexto SIS)
```

Para cada perfil, registrar ID, nome e cruzar com `profile_map` SIS no `contexts.yaml`.

### 2.3 — Grupos SIS

```
GET /Group (contexto SIS, range=0-99)
```

Identificar e destacar os grupos `Hub-App-*` SIS:
```
Hub-App-busca         → ID esperado: 102 → ID real: ?
Hub-App-carregadores  → ID esperado: 104 → ID real: ?
Hub-App-permissoes    → ID esperado: 103 → ID real: ?
Hub-App-sis-dashboard → ID esperado: 105 → ID real: ?
```

**Atenção especial — group_map SIS:**
O `contexts.yaml` referencia grupos com IDs 22 e 21 para os roles
`tecnico-manutencao` e `tecnico-conservacao` respectivamente.
Verificar se esses grupos existem no GLPI SIS e quais são seus IDs reais:
```
GET /Group/{22}  → existe? qual o nome?
GET /Group/{21}  → existe? qual o nome?
```
Se os IDs divergirem dos grupos reais, o `context_override` nunca ativa.

### 2.4 — Usuários SIS

```
GET /User (contexto SIS, range=0-99, expand_dropdowns=true)
```
- Lista de usuários ativos no SIS
- Para cada usuário: grupos Hub-App-* que possui
- Identificar usuários com `tecnico-manutencao` ou `tecnico-conservacao` configurados

### 2.5 — Matriz Usuário × Grupo SIS (Hub-App-*)

Mesma estrutura da Fase 1.5, para os grupos Hub-App-* do SIS.

---

## FASE 3 — ANÁLISE DO USO ATUAL NO HUB

Com os dados das Fases 1 e 2, cruzar com o código do Hub para entender como
esses dados são consumidos hoje.

### 3.1 — Como o auth_service.py usa os dados

Documentar o fluxo completo:
```
Login do usuário
    ↓
initSession (GLPI API) → session_token
    ↓
getFullSession ou getMyProfiles → active_profile.id
    ↓
resolve_hub_roles (contexts.yaml lookup por profile_id ou group_id)
    ↓
resolve_app_access (busca grupos Hub-App-* do usuário via API)
    ↓
payload retornado ao frontend: { role, app_access[], active_hub_role }
```

Identificar quais endpoints GLPI são chamados durante o login e quais campos
são usados de cada resposta.

### 3.2 — Como a tela de Permissões atual consome os dados

Ler `web/src/app/[context]/permissoes/page.tsx`:
- Quais endpoints o frontend chama?
- Quais dados exibe atualmente?
- Quais ações de escrita já estão implementadas?
- O que a tela mostra hoje que é suficiente?
- O que está faltando?

### 3.3 — Gaps identificados

Construir a lista de gaps entre o que a API permite, o que existe no GLPI,
e o que o Hub usa hoje:

```
GAP [n]
  Descrição: [o que falta]
  Impacto: [o que o gestor não consegue fazer hoje]
  Dados disponíveis na API: [sim/não — qual endpoint]
  Esforço estimado: [simples / médio / complexo]
```

---

## FASE 4 — IDEALIZAÇÃO DAS TELAS

Com toda a base de dados mapeada e os gaps identificados, propor a idealização
completa das telas de administração do Hub.

> **Princípio guia:** As telas devem permitir que um gestor administre completamente
> os acessos do Hub sem precisar abrir o GLPI nativo. Tudo que hoje requer abrir
> Administração → Grupos no GLPI deve ser possível dentro do Hub.

### 4.1 — Tela: Gestão de Usuários

Propor a tela completa com:

**Visão principal (listagem):**
- Quais colunas exibir (nome, login, role atual, módulos, status de configuração)
- Como filtrar (por role, por módulo, por status)
- Indicadores visuais de status (✅ completo / ⚠️ incompleto / ❌ sem acesso)

**Visão de detalhe (usuário individual):**
- Informações do usuário (nome, perfil GLPI, entidade)
- Role Hub derivado
- Módulos que tem acesso (lista de grupos Hub-App-*)
- Módulos que não tem acesso
- Ações disponíveis: atribuir grupo, remover grupo

**Fluxo de atribuição de acesso:**
- Como o gestor atribui um módulo ao usuário
- Feedback imediato (o usuário verá o módulo no próximo login?)
- Tratamento de erro (permissão insuficiente no GLPI)

### 4.2 — Tela: Gestão de Módulos (Grupos Hub-App-*)

**Visão principal:**
- Lista de módulos disponíveis no contexto (DTIC / SIS)
- Para cada módulo: nome, grupo Hub-App-* correspondente, quantidade de membros
- Status do grupo no GLPI (existe? ID confirmado?)

**Visão de detalhe (módulo individual):**
- Nome do módulo e grupo correspondente
- Lista de usuários com acesso
- Ação: adicionar usuário, remover usuário

### 4.3 — Tela: Visão por Role

**Estrutura:**
- Seções para cada role do contexto: gestor / tecnico / solicitante (DTIC)
  ou gestor / tecnico-manutencao / tecnico-conservacao / solicitante (SIS)
- Cada seção: lista de usuários com aquele role
- Clique no usuário → abre detalhe da Tela 4.1

### 4.4 — Painel de Diagnóstico

O painel que transforma a tela de permissões de "lista estática" em "ferramenta ativa":

**Alertas automáticos a gerar:**
```
⚠️ CONFIGURAÇÃO INCOMPLETA
   "Usuário X tem role gestor mas não está no grupo Hub-App-permissoes"
   → Ação rápida: [Adicionar ao grupo]

⚠️ ACESSO SEM ROLE
   "Usuário Y está no grupo Hub-App-carregadores mas seu perfil não está
   mapeado no contexts.yaml — role será 'solicitante'"
   → Ação: verificar perfil no GLPI

❌ GRUPO AUSENTE NO GLPI
   "O grupo Hub-App-X está registrado no context-registry mas não foi
   encontrado no GLPI — módulo nunca será desbloqueado"
   → Ação: criar grupo no GLPI

⚠️ IDs DIVERGENTES
   "O group_map do contexts.yaml referencia o grupo ID 22 para
   tecnico-manutencao, mas o grupo encontrado no GLPI tem ID diferente"
   → Ação: corrigir contexts.yaml
```

Como esses alertas são computados:
- Cruzamento entre context-registry.ts (módulos esperados) e grupos reais no GLPI
- Cruzamento entre contexts.yaml (IDs esperados) e IDs reais confirmados na Fase 1 e 2

### 4.5 — Fluxos Críticos a Detalhar

Para cada fluxo, descrever passo a passo:

**Fluxo 1: Dar acesso ao módulo de Carregadores para um novo usuário**
```
Gestor abre tela → seleciona usuário → vê módulos disponíveis →
clica "Dar acesso a Carregadores" → confirmação →
POST /Group_User {groups_id: 104, users_id: X} →
feedback: "Acesso concedido. O usuário verá o módulo no próximo login."
```

**Fluxo 2: Revogar acesso de um usuário que saiu do time**
```
Gestor busca usuário → vê módulos que possui →
clica "Remover acesso" em cada módulo →
DELETE /Group_User/{vínculo_id} por módulo →
feedback: "Acesso revogado."
```

**Fluxo 3: Diagnóstico de "por que o usuário X não vê o módulo Y"**
```
Painel de Diagnóstico → alerta para usuário X →
detalhe: "usuário não está no grupo Hub-App-Y" →
ação rápida: [Adicionar ao grupo] →
resolução imediata sem sair do Hub
```

---

## FASE 5 — RELATÓRIO FINAL

### Formato de entrega

```
════════════════════════════════════════════
ESTUDO: GLPI DTIC e SIS — Base para Idealização das Telas de Administração
Data: [data] | Instâncias: DTIC (CAU) + SIS
════════════════════════════════════════════

PARTE 1 — FOTOGRAFIA DO ESTADO ATUAL

  DTIC:
  - Entidades: [diagrama]
  - Perfis: [tabela ID → nome → role Hub]
  - Grupos Hub-App-*: [tabela ID real × ID esperado × status]
  - Usuários ativos: [total + lista simplificada]
  - Matriz usuário × grupo: [tabela completa]

  SIS:
  - [mesma estrutura]
  - Confirmação IDs 22 e 21: [resultado]

PARTE 2 — GAPS IDENTIFICADOS
  [Lista numerada com impacto e esforço]

PARTE 3 — IDEALIZAÇÃO DAS TELAS

  Tela 1 — Gestão de Usuários:
    [Wireframe textual + campos + ações + fluxos]

  Tela 2 — Gestão de Módulos:
    [Wireframe textual + campos + ações]

  Tela 3 — Visão por Role:
    [Estrutura proposta]

  Tela 4 — Painel de Diagnóstico:
    [Alertas possíveis + como são computados]

PARTE 4 — FLUXOS CRÍTICOS DETALHADOS
  [Fluxos 1, 2 e 3 com passos e endpoints]

PARTE 5 — ENDPOINTS NECESSÁRIOS
  [O que já existe vs. o que precisa ser criado no backend]

PARTE 6 — REGISTROS PARA A KNOWLEDGE BASE
  - ADR: "Modelo de dados para tela de Gestão de Acessos do Hub"
  - SOLUTION: "IDs dos grupos Hub-App-* confirmados em DTIC e SIS"
  - INCIDENT ou SOLUTION: "IDs 22 e 21 SIS — confirmação ou divergência"
```

---

## CRITÉRIOS

- Todos os IDs de grupos Hub-App-* devem ser confirmados via query real — não assumir
- O diagrama de entidades deve ser construído com dados reais, não assumidos
- Os gaps devem ter impacto descrito do ponto de vista do gestor (não técnico)
- A idealização deve ser 100% viável com os endpoints documentados no relatório base
- Nenhum endpoint inventado — apenas o que foi confirmado na documentação oficial
- Fluxos críticos devem incluir o endpoint exato e o body da requisição

---

*Gerado via PROMPT_LIBRARY — P01+P02 Estudo+Idealização | hub_dtic_and_sis | 2026-03-10*
