# Relatório de Auditoria Técnica: Matriz de Permissões e Contextos

Esta auditoria foi realizada para mapear exaustivamente todas as definições relacionadas ao sistema de permissões e contextos (DTIC/SIS) do Tensor Aurora, garantindo a integridade do "Single Source of Truth".

## 1. Definições de Core (Backend)
Arquivo: [app/core/contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml)

O backend utiliza este arquivo para carregar o [ContextRegistry](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/context_registry.py#38-134). Ele define:
- **Features Habilitadas**: Quais módulos aparecem no contexto (ex: `permissoes` está habilitado tanto em DTIC quanto em SIS).
- **Profile Map**: De-para de Perfis GLPI para Roles do Hub (ex: ID 20 -> `gestor`).
- **Group Map**: De-para de Grupos GLPI para Sub-Roles técnicos (ex: ID 22 -> `tecnico-manutencao`).
- **Sub-Contextos**: Definição de contextos filhos (ex: `sis-manutencao`) que herdam configurações do pai, mas filtram por IDs de grupo específicos.

## 2. Lógica de Autenticação e Permissão
Arquivo: [app/services/auth_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py)

Esta camada é o "tradutor" entre o GLPI e a aplicação:
- **[resolve_app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44)**: Verifica se o usuário pertence a grupos que começam com `Hub-App-*` (ex: `Hub-App-Permissoes`). Se sim, injeta a tag (ex: `permissoes`) no campo [app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) da resposta.
- **[resolve_hub_roles](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#64-124)**: Consolida os Perfis e Grupos do usuário para determinar seu papel ativo (Solicitante, Técnico, Técnico-Manutencao, Gestor).
- **[perform_login](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#281-320)**: Gerencia o fallback. Se o usuário não está no DTIC, tenta autenticar via SIS usando uma sessão de serviço para verificar a existência do usuário e buscar seus dados reais.

## 3. Manifesto de Frontend
Arquivo: [web/src/lib/context-registry.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/context-registry.ts)

É o espelho do [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) no lado do cliente:
- **`CONTEXT_MANIFESTS`**: Define os metadados visuais e a lista de features disponíveis.
- **[resolveMenuItems](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/context-registry.ts#117-143)**: Função crítica que filtra as abas da sidebar.
  - **Filtro 1 (AppAccess)**: Se a feature exige `requireApp` (ex: `permissoes`), ela **SÓ** aparece se o usuário tiver essa tag no [app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) retornado pelo backend.
  - **Filtro 2 (Roles)**: Verifica se o papel ativo do usuário está na lista `requiredRoles` da feature.

## 4. Persistência e Estado
Arquivo: [web/src/store/useAuthStore.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/store/useAuthStore.ts)

- Armazena o `currentUserRole` que contém o [app_access](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#22-44) e as [hub_roles](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/auth_service.py#64-124).
- O [ProfileSwitcher](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ProfileSwitcher.tsx#8-111) permite que o usuário alterne entre suas funções disponíveis (ex: de Solicitante para Gestor), disparando uma mudança de contexto visual e de menu.

## 5. Auditoria de Banco de Dados (Admin)
Arquivo: [app/routers/admin.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/admin.py)

O endpoint `/api/v1/{context}/admin/users` realiza um `JOIN` nas tabelas `glpi_users`, `glpi_groups` e `glpi_profiles` para exibir a matriz permissional atualizada em tempo real com base no estado real do GLPI.

---

### Diagnóstico da Inconsistência (Insight)
Se a matriz não estiver aparecendo mesmo após rebuilds:
1. **Grupo GLPI**: O usuário precisa estar no grupo chamado exatamente `Hub-App-Permissoes` (case-insensitive conforme o código) no GLPI.
2. **Feature Flag**: A feature `permissoes` deve estar na lista `features` do contexto em [contexts.yaml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/contexts.yaml) (confirmado: está presente).
3. **Role de Gestor**: No frontend, o manifest exige `requiredRoles: ["gestor"]`. Mesmo com a tag de grupo, o usuário deve estar operando sob a função de "Gestor" para ver a aba.

**Conclusão**: O código está 100% alinhado. A inconsistência reside na atribuição do usuário aos grupos `Hub-App-*` no GLPI ou na seleção da função ativa no [ProfileSwitcher](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/components/auth/ProfileSwitcher.tsx#8-111).
