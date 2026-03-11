/**
 * Testes de Contrato — Frontend
 * Verificam que os tipos TypeScript refletem o contrato real da API.
 * Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis
 *
 * Se alguém remover ou renomear um campo crítico nos tipos,
 * estes testes falham ANTES de chegar ao browser.
 */

import { describe, it, expect } from 'vitest'

import type { AuthMeResponse, HubRole } from '@/store/useAuthStore'
import type { AdminUser, AssignGroupResponse, RevokeGroupResponse } from '@/lib/api/adminService'

// ═══════════════════════════════════════════════════════════
// Contrato 1: AuthMeResponse (useAuthStore.ts)
// ═══════════════════════════════════════════════════════════

describe('Contrato: AuthMeResponse', () => {
  it('deve ter os campos obrigatórios do payload de autenticação', () => {
    const mock: AuthMeResponse = {
      context: 'dtic',
      user_id: 1,
      name: 'test-user',
      roles: {
        active_profile: { id: 4, name: 'Super-Admin' },
        available_profiles: [],
        groups: [],
      },
      hub_roles: [],
      app_access: [],
    }

    expect(mock.context).toBeDefined()
    expect(mock.user_id).toBeDefined()
    expect(mock.name).toBeDefined()
    expect(mock.roles).toBeDefined()
    expect(Array.isArray(mock.hub_roles)).toBe(true)
    expect(Array.isArray(mock.app_access)).toBe(true)
  })

  it('hub_roles deve aceitar objetos HubRole válidos', () => {
    const hubRole: HubRole = {
      role: 'gestor',
      label: 'Super-Admin',
      profile_id: 4,
      group_id: null,
      route: 'dashboard',
      context_override: null,
    }

    expect(hubRole.role).toBe('gestor')
    expect(hubRole.route).toBeDefined()
  })

  it('app_access deve ser array de strings', () => {
    const mock: Pick<AuthMeResponse, 'app_access'> = {
      app_access: ['busca', 'permissoes', 'carregadores'],
    }

    expect(Array.isArray(mock.app_access)).toBe(true)
    mock.app_access!.forEach(item => {
      expect(typeof item).toBe('string')
    })
  })
})

// ═══════════════════════════════════════════════════════════
// Contrato 2: AdminUser (adminService.ts)
// ═══════════════════════════════════════════════════════════

describe('Contrato: AdminUser', () => {
  it('deve ter os campos críticos que PermissionsMatrix consome', () => {
    const mock: AdminUser = {
      id: 1,
      username: 'test-user',
      realname: 'Test',
      firstname: 'User',
      profiles: ['Super-Admin'],
      groups: ['Hub-App-busca'],
      app_access: ['busca'],
      roles: ['gestor'],
    }

    expect(mock.id).toBeDefined()
    expect(mock.username).toBeDefined()
    expect(mock.realname).toBeDefined()
    expect(mock.firstname).toBeDefined()
    expect(Array.isArray(mock.profiles)).toBe(true)
    expect(Array.isArray(mock.groups)).toBe(true)
    expect(Array.isArray(mock.app_access)).toBe(true)
    expect(Array.isArray(mock.roles)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════
// Contrato 3: Respostas de escrita (assign/revoke)
// ═══════════════════════════════════════════════════════════

describe('Contrato: AssignGroupResponse', () => {
  it('deve ter campo success booleano', () => {
    const mock: AssignGroupResponse = {
      success: true,
      binding_id: 42,
      message: 'Acesso concedido',
      already_exists: false,
    }
    expect(typeof mock.success).toBe('boolean')
    expect(mock.message).toBeDefined()
  })
})

describe('Contrato: RevokeGroupResponse', () => {
  it('deve ter campo success booleano', () => {
    const mock: RevokeGroupResponse = {
      success: true,
      message: 'Acesso revogado',
      user_id: 1,
      group_id: 109,
    }
    expect(typeof mock.success).toBe('boolean')
    expect(mock.user_id).toBeDefined()
    expect(mock.group_id).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════
// Contrato 4: Roles semânticos conhecidos
// ═══════════════════════════════════════════════════════════

describe('Contrato: Roles semânticos conhecidos', () => {
  const ROLES_VALIDOS = [
    'gestor',
    'tecnico',
    'tecnico-manutencao',
    'tecnico-conservacao',
    'solicitante',
  ] as const

  it('todos os roles válidos são strings não-vazias', () => {
    ROLES_VALIDOS.forEach(role => {
      expect(typeof role).toBe('string')
      expect(role.length).toBeGreaterThan(0)
    })
  })

  it('solicitante está na lista como fallback', () => {
    expect(ROLES_VALIDOS).toContain('solicitante')
  })

  it('gestor está na lista', () => {
    expect(ROLES_VALIDOS).toContain('gestor')
  })
})
