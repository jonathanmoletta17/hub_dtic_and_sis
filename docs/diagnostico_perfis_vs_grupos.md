# Diagnóstico Técnico: Perfis vs Grupos GLPI — Impacto na Matriz Permissional do Hub

> **Data**: 2026-03-09 | **Escopo**: Auditoria completa do fluxo de autorização  
> **Regra**: Nenhuma alteração antes do diagnóstico confirmado.

---

## 1. Diferença Técnica: Perfil vs Grupo no GLPI

| Aspecto | **Perfil** (`glpi_profiles`) | **Grupo** (`glpi_groups`) |
|---|---|---|
| **Função** | Define o **nível de permissão** do usuário na interface GLPI (o que ele pode ver/editar nativamente). | Define a **associação organizacional** do usuário (equipe, departamento, local). |
| **Tabela Relacional** | `glpi_profiles_users` (user ↔ profile ↔ entity) | `glpi_groups_users` (user ↔ group) |
| **Na API REST** | `GET /getFullSession` → chave `glpiprofiles` (dict `{id: {name}}`) e `glpiactiveprofile` | `GET /getFullSession` → chave [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156) (list de IDs ou dicts) |
| **Sub-items da API** | `GET /User/{id}/Profile_User` → retorna `profiles_id` | `GET /User/{id}/Group_User` → retorna `groups_id` |
| **Uso Típico** | Controle de acesso GLPI nativo (menus, formulários, ITIL) | Atribuição de tickets, filtros, encaminhamento |
| **Escopo da Entity** | Perfil é vinculado **por entidade** (recursivo ou não) | Grupo é global ou vinculado a entidade |

### Implicação Crítica para Integrações
> O GLPI **não retorna grupos na mesma estrutura que perfis**. A chave [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156) na sessão pode retornar uma **lista de inteiros** OU uma **lista de dicts com `{id}`**, dependendo da versão/configuração. A chave `glpiprofiles` **sempre** retorna um dict indexado por ID.

---

## 2. Como o Hub Consome Cada Entidade Hoje (Mapa de Pontos)

### 2.1 Fluxo de Resolução de Roles (Backend)

O hub **já** usa ambos (perfis E grupos) em dois caminhos distintos dentro de [auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py):

| Etapa | Arquivo | Linha(s) | O que faz | Usa Perfil? | Usa Grupo? |
|---|---|---|---|---|---|
| [build_login_response](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#125-180) | auth_service.py | L125-179 | Extrai `glpiprofiles` e [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156) da sessão GLPI | ✅ `glpiprofiles` → `available_profiles` | ✅ [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156) → `groups[]` |
| [resolve_hub_roles](file:///C:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#64-123) | auth_service.py | L64-122 | Traduz perfis + grupos → HubRoles usando [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) | ✅ `profile_map` (ex: `{9: solicitante, 6: tecnico}`) | ✅ `group_map` (ex: `{22: tecnico-manutencao}`) |
| [resolve_app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) | auth_service.py | L22-43 | Busca grupos `Hub-App-*` via API REST | ❌ Não usa perfis | ✅ `Group_User` → filtra por nome `Hub-App-*` |
| [fallback_login](file:///C:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#182-278) | auth_service.py | L182-277 | Login alternativo via user_token | ✅ `Profile_User` sub-items | ✅ `Group_User` sub-items |

### 2.2 Mapeamento Estático (contexts.yaml)

O arquivo [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) define os IDs numéricos:

**DTIC** — Apenas `profile_map`:
- `9` → [solicitante](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#79-88) (Self-Service)
- `6` → [tecnico](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#18-30) (Technician)  
- `20` → [gestor](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#31-41) (Super-Admin)

**SIS** — `profile_map` + `group_map`:
- `9` → [solicitante](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#79-88)
- `3` → [gestor](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#31-41) (Supervisor)
- Grupo `22` → `tecnico-manutencao` (com `context_override: sis-manutencao`)
- Grupo `21` → `tecnico-conservacao` (com `context_override: sis-memoria`)

### 2.3 Frontend (Sidebar + Proteção de Rotas)

| Componente | Arquivo | O que verifica | Fonte dos dados |
|---|---|---|---|
| [AppSidebar](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/ui/AppSidebar.tsx#41-183) | [AppSidebar.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/ui/AppSidebar.tsx) L72-75 | `rolesArr` (do `activeHubRole.role`) + `appAccess` (do `currentUserRole.app_access`) | Zustand store ← API `/auth/login` ou `/auth/me` |
| [resolveMenuItems](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/constants/navigation.ts#44-107) | [context-registry.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/context-registry.ts) L116-141 | `requiredRoles[]` (ex: `["gestor"]`) + `requireApp` (ex: `"permissoes"`) | Manifesto estático |
| [ContextGuard](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ContextGuard.tsx#13-67) | ContextGuard.tsx | `requiredRoles` + `requireApp` | Zustand store |

---

## 3. Pontos de Falha Prováveis

### ❌ Falha 1: Grupo `Hub-App-*` não criado no GLPI
- **Sintoma**: Módulo não aparece na Sidebar mesmo para Gestores.
- **Causa**: A função [resolve_app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) busca grupos via API e filtra pelo prefixo `Hub-App-`. Se o grupo não existe na instância GLPI, [app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) retorna `[]`.
- **Verificação**: `GET /api/v1/{context}/auth/diagnose-access?username=jonathan-moletta`
- **Status Atual**: **CONFIRMADO** — os grupos `Hub-App-permissoes`, `Hub-App-busca`, `Hub-App-carregadores` ainda não foram criados no GLPI físico.

### ❌ Falha 2: Grupos GLPI nativos com IDs diferentes dos mapeados
- **Sintoma**: Técnico que deveria ser `tecnico-manutencao` cai como [solicitante](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#79-88) (fallback).
- **Causa**: O [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) mapeia IDs fixos (`22` e `21`). Se na instância GLPI real esses grupos tiverem IDs diferentes, o `group_map` não resolve.
- **Verificação**: `GET /api/v1/sis/User/{id}/Group_User` → conferir se `groups_id` retorna `22` ou `21`.

### ⚠️ Falha 3: [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156) retorna formato inesperado
- **Sintoma**: `groups[]` fica vazio mesmo com grupos atribuídos.
- **Causa**: Em [build_login_response](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#125-180) (L151-159), o código trata [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156) como lista de [int](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/db_read.py#214-243) OU lista de [dict](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#157-170). Se o GLPI retornar outro formato (ex: lista de strings ou dict aninhado), o parser silenciosamente descarta.
- **Verificação**: Capturar o payload bruto de `GET /getFullSession` e inspecionar a chave [glpigroups](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/tests/test_auth_service.py#142-156).

### ⚠️ Falha 4: DTIC não tem `group_map` no registry
- **Sintoma**: Nenhum grupo resolve roles técnicas no contexto DTIC.
- **Causa**: O [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) para DTIC só tem `profile_map` sem `group_map`. Qualquer lógica baseada em grupos para DTIC é ignorada.
- **Impacto**: Baixo (DTIC usa perfis nativos para diferenciar roles), mas impede expansão futura de sub-roles DTIC.

---

## 4. Roteiro de Diagnóstico (Sem Alterar Código)

### Passo 1: Capturar payload real do GLPI
```bash
# Via endpoint de diagnóstico já existente:
curl http://localhost:8000/api/v1/dtic/auth/diagnose-access?username=jonathan-moletta \
  -H "Session-Token: <SEU_TOKEN>"
```

### Passo 2: Validar grupos existentes na instância GLPI
No painel web do GLPI (Administração > Grupos):
- [ ] Listar todos os grupos existentes
- [ ] Confirmar se existem grupos com prefixo `Hub-App-`
- [ ] Anotar os IDs numéricos dos grupos `CC-MANUTENCAO` (esperado: 22) e `CC-CONSERVACAO` (esperado: 21)

### Passo 3: Confrontar IDs do YAML com IDs reais
Comparar a saída do Passo 2 com o [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml):
- `profile_map` DTIC: IDs 9, 6, 20
- `profile_map` SIS: IDs 9, 3
- `group_map` SIS: IDs 22, 21

### Passo 4: Verificar o que o Frontend recebe
No DevTools do navegador (aba Network):
- Capturar resposta de `POST /api/v1/{context}/auth/login`
- Verificar campos: `hub_roles[]`, `app_access[]`, `roles.groups[]`

---

## 5. Opções de Correção com Riscos

| # | Ação | Risco | Recomendação |
|---|---|---|---|
| 1 | **Criar grupos Hub-App-* no GLPI** e atribuir aos usuários | Nenhum risco (aditivo) | ✅ **Fazer agora** — é o que desbloqueia toda a Matriz |
| 2 | **Validar IDs dos grupos SIS** (22 e 21) contra o GLPI real | Nenhum risco (leitura) | ✅ **Fazer agora** — se os IDs forem diferentes, precisamos atualizar [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) |
| 3 | **Remover `requireApp` temporariamente** para testar visibilidade | Baixo (expõe módulo a todos os gestores) | ⚠️ Apenas para debug, reverter depois |
| 4 | **Adicionar `group_map` para DTIC** no [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) | Baixo (sem efeito se nenhum grupo estiver atribuído) | 📋 Planejar para quando DTIC precisar de sub-roles |
| 5 | **Adicionar logging detalhado** em [resolve_app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) | Nenhum risco | ✅ Recomendado para debugar sem alterar lógica |

---

## 6. Checklist de Grupos a Criar no GLPI (Ação Imediata)

### Instância DTIC
- [ ] `Hub-App-busca`
- [ ] `Hub-App-permissoes`
- [ ] `Hub-App-dashboard-avancado` (futuro)

### Instância SIS
- [ ] `Hub-App-busca`
- [ ] `Hub-App-carregadores`
- [ ] `Hub-App-permissoes`
- [ ] `Hub-App-dashboard-avancado` (futuro)

### Atribuir ao seu usuário (jonathan-moletta)
- [ ] DTIC: `Hub-App-permissoes` + `Hub-App-busca`
- [ ] SIS: `Hub-App-permissoes` + `Hub-App-busca` + `Hub-App-carregadores`
