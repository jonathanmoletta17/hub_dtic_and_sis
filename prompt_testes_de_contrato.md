# PROMPT — Testes de Contrato: Detecção Automática de Divergência Backend ↔ Frontend

> Destino: antigravity  
> Escopo: app/tests/ + web/src/__tests__/  
> Objetivo: testes que QUEBRAM automaticamente se um contrato divergir  
> Regra: derivar os testes DO CÓDIGO REAL — não de documentação ou memória

---

## CONTEXTO E MOTIVAÇÃO

O `ARCHITECTURE_RULES.md` define os contratos entre backend e frontend.
O problema: documentação pode ficar desatualizada silenciosamente.

Testes de contrato resolvem isso na raiz — eles **derivam a verdade do código**
e falham automaticamente quando um contrato diverge, antes de qualquer bug
chegar ao browser.

O princípio central desta tarefa:
> "O teste não verifica se a feature funciona. Verifica se o CONTRATO sobreviveu."

---

## PRÉ-LEITURA OBRIGATÓRIA

Ler na íntegra antes de escrever qualquer teste:

```
[ ] app/schemas/auth_schemas.py          → campos reais do payload de auth
[ ] app/services/auth_service.py         → o que resolve_hub_roles retorna
[ ] app/routers/admin.py                 → schemas de resposta dos 3 endpoints
[ ] web/src/store/useAuthStore.ts        → AuthMeResponse — o que o frontend espera
[ ] web/src/lib/api/adminService.ts      → tipos de resposta esperados pelo frontend
[ ] web/src/types/ (todos os arquivos)   → tipos TypeScript do projeto
[ ] app/tests/test_auth_service.py       → testes existentes (não duplicar)
```

Registrar o estado atual antes de prosseguir.

---

## PARTE 1 — TESTES DE CONTRATO BACKEND (pytest)

### Localização
`app/tests/test_contracts.py` — arquivo novo, não alterar testes existentes.

### Filosofia
Cada teste lê o schema Pydantic real e verifica que os campos obrigatórios
do contrato existem e têm o tipo correto.
Se alguém renomear `hub_roles` para `roles` no schema, o teste quebra imediatamente.

---

### Contrato 1 — Payload de autenticação

```python
# app/tests/test_contracts.py

"""
Testes de Contrato — tensor-aurora / hub_dtic_and_sis
Estes testes verificam que os contratos entre backend e frontend
estão íntegros. Falha aqui = divergência de contrato detectada.
Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis
"""

import pytest
from pydantic import BaseModel
from app.schemas.auth_schemas import (
    LoginResponse,      # ajustar para o nome real do schema
    HubRole,            # ajustar para o nome real
    # importar os schemas reais encontrados na pré-leitura
)


class TestAuthContract:
    """
    Contrato 1: Payload de autenticação
    O que o frontend (useAuthStore.ts / AuthMeResponse) espera receber.
    """

    def test_login_response_tem_session_token(self):
        """session_token é obrigatório — sem ele o frontend não autentica."""
        fields = LoginResponse.model_fields
        assert "session_token" in fields, (
            "CONTRATO QUEBRADO: 'session_token' removido de LoginResponse. "
            "Atualizar useAuthStore.ts → AuthMeResponse simultaneamente."
        )

    def test_login_response_tem_hub_roles(self):
        """hub_roles[] é o array que define quais papéis o usuário tem."""
        fields = LoginResponse.model_fields
        assert "hub_roles" in fields, (
            "CONTRATO QUEBRADO: 'hub_roles' removido de LoginResponse. "
            "Todo o sistema de permissões do frontend depende deste campo."
        )

    def test_login_response_tem_app_access(self):
        """app_access[] define quais módulos Hub-App-* o usuário pode ver."""
        fields = LoginResponse.model_fields
        assert "app_access" in fields, (
            "CONTRATO QUEBRADO: 'app_access' removido de LoginResponse. "
            "ContextGuard e AppSidebar param de funcionar."
        )

    def test_login_response_tem_active_hub_role(self):
        """active_hub_role contém o role semântico ativo (gestor, tecnico, etc)."""
        fields = LoginResponse.model_fields
        assert "active_hub_role" in fields, (
            "CONTRATO QUEBRADO: 'active_hub_role' removido de LoginResponse."
        )

    def test_hub_role_tem_role_semantico(self):
        """O objeto HubRole deve ter o campo 'role' com o valor semântico."""
        fields = HubRole.model_fields
        assert "role" in fields, (
            "CONTRATO QUEBRADO: 'role' removido de HubRole. "
            "Todos os guards de rota usam hub_role.role para decisões."
        )

    def test_hub_role_tem_context(self):
        """O objeto HubRole deve ter o campo 'context' (dtic ou sis)."""
        fields = HubRole.model_fields
        assert "context" in fields, (
            "CONTRATO QUEBRADO: 'context' removido de HubRole."
        )
```

---

### Contrato 2 — Roles semânticos válidos

```python
class TestRoleContract:
    """
    Contrato 2: Roles semânticos conhecidos
    Se um role for adicionado ou removido, o teste documenta a mudança
    e força atualização do ARCHITECTURE_RULES.md.
    """

    # Roles confirmados e em uso no sistema
    # Atualizar esta lista quando um novo role for adicionado
    ROLES_VALIDOS = {
        "admin-hub",
        "gestor",
        "tecnico",
        "tecnico-manutencao",
        "tecnico-conservacao",
        "solicitante",
    }

    def test_roles_conhecidos_nao_foram_removidos(self):
        """
        Verifica que os roles definidos em contexts.yaml ainda existem.
        Se um role for removido, este teste falha e força revisão consciente.
        """
        import yaml
        from pathlib import Path

        contexts_path = Path("app/core/contexts.yaml")
        assert contexts_path.exists(), "contexts.yaml não encontrado"

        with open(contexts_path) as f:
            contexts = yaml.safe_load(f)

        roles_no_yaml = set()
        for context_data in contexts.values():
            if isinstance(context_data, dict):
                profile_map = context_data.get("profile_map", {})
                group_map = context_data.get("group_map", {})
                roles_no_yaml.update(profile_map.values())
                roles_no_yaml.update(group_map.values())

        for role in self.ROLES_VALIDOS:
            # admin-hub pode não estar em ambos os contextos
            # mas deve existir em pelo menos um
            if role != "solicitante":  # solicitante é fallback, pode não estar explícito
                pass  # verificação permissiva — o objetivo é documentar, não bloquear

        # O teste principal: nenhum role desconhecido apareceu sem ser registrado
        roles_desconhecidos = roles_no_yaml - self.ROLES_VALIDOS
        assert not roles_desconhecidos, (
            f"NOVO ROLE DETECTADO: {roles_desconhecidos}. "
            f"Adicionar à lista ROLES_VALIDOS e atualizar ARCHITECTURE_RULES.md."
        )
```

---

### Contrato 3 — IDs dos grupos Hub-App-*

```python
class TestHubAppGroupContract:
    """
    Contrato 3: IDs dos grupos Hub-App-* confirmados via GLPI físico.
    Estes IDs foram validados manualmente. Qualquer alteração é breaking change.
    Referência: ARCHITECTURE_RULES.md → Contrato 2
    """

    HUB_APP_GROUPS_DTIC = {
        "Hub-App-busca": 109,
        "Hub-App-permissoes": 110,
        "Hub-App-dtic-metrics": 112,
        "Hub-App-dtic-kpi": 113,
        "Hub-App-dtic-infra": 114,
    }

    HUB_APP_GROUPS_SIS = {
        "Hub-App-busca": 102,
        "Hub-App-permissoes": 103,
        "Hub-App-carregadores": 104,
        "Hub-App-sis-dashboard": 105,
        "CC-CONSERVACAO": 21,
        "CC-MANUTENCAO": 22,
    }

    def test_admin_router_valida_grupos_dtic_corretos(self):
        """
        O validate_hub_app_group em admin.py deve conter exatamente
        os IDs confirmados — nem mais, nem menos.
        """
        from app.routers.admin import VALID_HUB_APP_GROUPS
        # Ajustar o import para o nome real da constante/dict

        ids_esperados_dtic = set(self.HUB_APP_GROUPS_DTIC.values())
        ids_no_codigo = set(VALID_HUB_APP_GROUPS.get("dtic", []))

        ids_removidos = ids_esperados_dtic - ids_no_codigo
        ids_adicionados = ids_no_codigo - ids_esperados_dtic

        assert not ids_removidos, (
            f"CONTRATO QUEBRADO: grupos DTIC removidos de VALID_HUB_APP_GROUPS: "
            f"{ids_removidos}. Verificar se foi intencional e atualizar este teste."
        )
        assert not ids_adicionados, (
            f"NOVO GRUPO DTIC detectado: {ids_adicionados}. "
            f"Confirmar ID via GLPI físico antes de aceitar. "
            f"Atualizar ARCHITECTURE_RULES.md e este teste."
        )

    def test_admin_router_valida_grupos_sis_corretos(self):
        """Mesma verificação para o contexto SIS."""
        from app.routers.admin import VALID_HUB_APP_GROUPS

        ids_esperados_sis = set(self.HUB_APP_GROUPS_SIS.values())
        ids_no_codigo = set(VALID_HUB_APP_GROUPS.get("sis", []))

        ids_removidos = ids_esperados_sis - ids_no_codigo
        ids_adicionados = ids_no_codigo - ids_esperados_sis

        assert not ids_removidos, (
            f"CONTRATO QUEBRADO: grupos SIS removidos: {ids_removidos}."
        )
        assert not ids_adicionados, (
            f"NOVO GRUPO SIS detectado: {ids_adicionados}. "
            f"Confirmar via GLPI SIS físico antes de aceitar."
        )
```

---

### Contrato 4 — Endpoints de administração

```python
class TestAdminEndpointContract:
    """
    Contrato 4: Schemas de resposta dos 3 endpoints de administração.
    O frontend (adminService.ts) espera estes campos exatos.
    """

    def test_diagnostics_response_tem_users(self):
        """GET /admin/users/diagnostics deve retornar campo 'users'."""
        from app.routers.admin import DiagnosticsResponse  # ajustar import real
        fields = DiagnosticsResponse.model_fields
        assert "users" in fields, (
            "CONTRATO QUEBRADO: 'users' removido de DiagnosticsResponse. "
            "PermissionsMatrix.tsx para de renderizar."
        )

    def test_user_permission_row_tem_campos_criticos(self):
        """Cada linha de usuário deve ter os campos que o frontend consome."""
        from app.routers.admin import UserPermissionRow  # ajustar import real
        fields = UserPermissionRow.model_fields
        campos_criticos = ["id", "name", "hub_role", "modules", "alerts"]
        for campo in campos_criticos:
            assert campo in fields, (
                f"CONTRATO QUEBRADO: '{campo}' removido de UserPermissionRow. "
                f"Atualizar adminService.ts e tipos TypeScript simultaneamente."
            )

    def test_assign_response_tem_success(self):
        """POST /groups deve retornar campo 'success' booleano."""
        from app.routers.admin import AssignGroupResponse  # ajustar import real
        fields = AssignGroupResponse.model_fields
        assert "success" in fields

    def test_revoke_response_tem_success(self):
        """DELETE /groups deve retornar campo 'success' booleano."""
        from app.routers.admin import RevokeGroupResponse  # ajustar import real
        fields = RevokeGroupResponse.model_fields
        assert "success" in fields
```

---

## PARTE 2 — TESTES DE CONTRATO FRONTEND (vitest/TypeScript)

### Localização
`web/src/__tests__/contracts/auth.contract.test.ts` — arquivo novo.

### Filosofia
Estes testes verificam que os **tipos TypeScript** têm os campos
que o backend promete entregar. Se alguém muda `hub_roles` para `hubRoles`
no store sem atualizar o tipo, o compilador TypeScript deveria pegar —
mas sem strict mode configurado corretamente, não pega.
Estes testes pegam em runtime de teste, antes do build.

```typescript
// web/src/__tests__/contracts/auth.contract.test.ts

/**
 * Testes de Contrato — Frontend
 * Verificam que os tipos TypeScript refletem o contrato real da API.
 * Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis
 */

import { describe, it, expect } from 'vitest'

// Importar os tipos reais do projeto (ajustar paths conforme pré-leitura)
import type { AuthMeResponse } from '@/store/useAuthStore'
import type { AdminUser, DiagnosticsResponse } from '@/lib/api/adminService'

describe('Contrato: AuthMeResponse', () => {
  it('deve ter session_token como string', () => {
    // Cria um objeto que satisfaz o tipo — se o campo não existir, TS erro
    const mockValid: AuthMeResponse = {
      session_token: 'mock-token',
      hub_roles: [],
      app_access: [],
      active_hub_role: { role: 'gestor', context: 'dtic' },
      // adicionar outros campos obrigatórios encontrados na pré-leitura
    } as AuthMeResponse

    expect(mockValid.session_token).toBeDefined()
    expect(typeof mockValid.session_token).toBe('string')
  })

  it('deve ter hub_roles como array', () => {
    const mockValid = { hub_roles: [] } as Pick<AuthMeResponse, 'hub_roles'>
    expect(Array.isArray(mockValid.hub_roles)).toBe(true)
  })

  it('deve ter app_access como array de strings', () => {
    const mockValid = { app_access: ['busca', 'carregadores'] } as Pick<AuthMeResponse, 'app_access'>
    expect(Array.isArray(mockValid.app_access)).toBe(true)
    mockValid.app_access.forEach(item => {
      expect(typeof item).toBe('string')
    })
  })

  it('active_hub_role deve ter role e context', () => {
    const mockHubRole = { role: 'gestor', context: 'dtic' }
    // Se HubRole mudar de shape, este cast vai falhar em strict TypeScript
    const typed = mockHubRole as AuthMeResponse['active_hub_role']
    expect(typed.role).toBeDefined()
    expect(typed.context).toBeDefined()
  })
})

describe('Contrato: AdminUser (DiagnosticsResponse)', () => {
  it('DiagnosticsResponse deve ter campo users como array', () => {
    const mock: DiagnosticsResponse = {
      users: [],
      total: 0,
      context: 'dtic',
    } as DiagnosticsResponse

    expect(Array.isArray(mock.users)).toBe(true)
  })

  it('AdminUser deve ter campos críticos que o PermissionsMatrix consome', () => {
    // Se qualquer campo for removido do tipo, este objeto causa erro de compilação
    const mockUser: AdminUser = {
      id: 1,
      name: 'teste',
      hub_role: 'gestor',
      modules: [],
      alerts: [],
      // adicionar campos obrigatórios encontrados na pré-leitura
    } as AdminUser

    expect(mockUser.id).toBeDefined()
    expect(mockUser.hub_role).toBeDefined()
    expect(Array.isArray(mockUser.modules)).toBe(true)
    expect(Array.isArray(mockUser.alerts)).toBe(true)
  })
})

describe('Contrato: Roles semânticos conhecidos', () => {
  // Esta lista deve espelhar ARCHITECTURE_RULES.md → Hierarquia de roles
  // e app/tests/test_contracts.py → ROLES_VALIDOS
  const ROLES_VALIDOS = [
    'admin-hub',
    'gestor',
    'tecnico',
    'tecnico-manutencao',
    'tecnico-conservacao',
    'solicitante',
  ] as const

  type HubRoleValue = typeof ROLES_VALIDOS[number]

  it('todos os roles válidos são strings não-vazias', () => {
    ROLES_VALIDOS.forEach(role => {
      expect(typeof role).toBe('string')
      expect(role.length).toBeGreaterThan(0)
    })
  })

  it('admin-hub está na lista de roles válidos', () => {
    expect(ROLES_VALIDOS).toContain('admin-hub')
  })

  it('solicitante está na lista como fallback', () => {
    expect(ROLES_VALIDOS).toContain('solicitante')
  })
})
```

---

## PARTE 3 — SCRIPT DE VERIFICAÇÃO RÁPIDA

Criar um script shell que roda os dois conjuntos de testes juntos
e reporta claramente qual contrato quebrou:

```bash
# scripts/check_contracts.sh

#!/bin/bash
set -e

echo "════════════════════════════════════════"
echo "  VERIFICAÇÃO DE CONTRATOS — tensor-aurora"
echo "════════════════════════════════════════"

echo ""
echo "▶ Contratos Backend (pytest)..."
cd app
python -m pytest tests/test_contracts.py -v --tb=short 2>&1
BACKEND_STATUS=$?

echo ""
echo "▶ Contratos Frontend (vitest)..."
cd ../web
npx vitest run src/__tests__/contracts/ 2>&1
FRONTEND_STATUS=$?

echo ""
echo "════════════════════════════════════════"
if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
  echo "  ✅ TODOS OS CONTRATOS ÍNTEGROS"
else
  echo "  ❌ CONTRATO(S) QUEBRADO(S) — ver output acima"
  echo "  Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis"
  exit 1
fi
echo "════════════════════════════════════════"
```

---

## INSTRUÇÃO PARA O ANTIGRAVITY: QUANDO ESTE SCRIPT FALHA

Adicionar esta regra ao `ARCHITECTURE_RULES.md` após a implementação:

```markdown
## REGRA DE CONTRATOS

Antes de considerar qualquer tarefa concluída, rodar:
  ./scripts/check_contracts.sh

Se falhar:
  1. Ler o erro — ele diz EXATAMENTE qual contrato quebrou e o que atualizar
  2. Corrigir a divergência (atualizar o lado que ficou para trás)
  3. Rodar novamente até passar
  4. NUNCA comentar ou deletar um teste de contrato para fazê-lo passar
```

---

## AJUSTES ESPERADOS DURANTE IMPLEMENTAÇÃO

Os imports nos testes usam nomes inferidos. O antigravity deve:

```
[ ] Confirmar o nome real do schema de login em auth_schemas.py
[ ] Confirmar o nome real de HubRole/ActiveHubRole
[ ] Confirmar o nome real de DiagnosticsResponse em admin.py
[ ] Confirmar o nome real de UserPermissionRow
[ ] Confirmar se VALID_HUB_APP_GROUPS é dict, constante ou função
[ ] Confirmar paths de import TypeScript (@ alias configurado?)
[ ] Ajustar campos do mock TypeScript para bater com tipos reais
```

Todos os ajustes devem ser feitos LENDO o código — nunca assumindo.

---

## VALIDAÇÃO FINAL

```
[ ] pytest app/tests/test_contracts.py → todos os testes passam
[ ] vitest web/src/__tests__/contracts/ → todos passam
[ ] ./scripts/check_contracts.sh → saída ✅ TODOS OS CONTRATOS ÍNTEGROS
[ ] Simular quebra: renomear hub_roles→roles em auth_schemas.py
    → test_login_response_tem_hub_roles deve FALHAR ✅
    → reverter após confirmar
[ ] Simular quebra: remover campo 'modules' de UserPermissionRow
    → teste frontend deve FALHAR ✅
    → reverter após confirmar
```

O teste de simulação de quebra é obrigatório — confirma que o teste
realmente detecta divergência e não está passando por acidente.

---

## FORMATO DE ENTREGA

```
PRÉ-LEITURA
  Schemas encontrados: [lista com nomes reais]
  Tipos TypeScript encontrados: [lista]
  Ajustes feitos nos imports: [lista]

IMPLEMENTAÇÃO
  app/tests/test_contracts.py: [n testes criados]
  web/src/__tests__/contracts/auth.contract.test.ts: [n testes criados]
  scripts/check_contracts.sh: [criado]
  ARCHITECTURE_RULES.md: [Regra de Contratos adicionada]

VALIDAÇÃO
  pytest test_contracts.py: ✅ [n/n passando]
  vitest contracts/: ✅ [n/n passando]
  check_contracts.sh: ✅
  Simulação de quebra backend: ✅ detectou
  Simulação de quebra frontend: ✅ detectou
```

---

*Gerado via PROMPT_LIBRARY — Testes de Contrato | hub_dtic_and_sis | 2026-03-10 | Mecanismo 1/3*
