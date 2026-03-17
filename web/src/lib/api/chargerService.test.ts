import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignMultipleChargersToTicket } from './chargerService';
import { useAuthStore } from '@/store/useAuthStore';

// Mock the request payload so we don't actually fetch
vi.mock('./chargerService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./chargerService')>();
  return {
    ...actual,
    request: vi.fn(),
  };
});

describe('chargerService - assignMultipleChargersToTicket', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw Error if user does not have permission (is not tech and has no tech role)', async () => {
    // Definimos o mock Zustand
    useAuthStore.setState({
      activeView: 'user',
      currentUserRole: {
        context: 'sis',
        user_id: 1,
        name: 'testuser',
        roles: { active_profile: { id: 1, name: 'User' }, available_profiles: [], groups: [] },
        hub_roles: [{ role: 'solicitante', label: 'Solicitante', profile_id: null, group_id: null, route: 'user', context_override: null }]
      }
    });

    await expect(assignMultipleChargersToTicket('sis', 1234, [1, 2]))
      .rejects.toThrow("Você não tem permissão para executar essa ação.");
  });

  it('should pass and call request if user is tech', async () => {
    useAuthStore.setState({
      activeView: 'tech', // This alone grants permission
      currentUserRole: null // Even without hub_roles, activeView='tech' works by your current logic
    });

    // We can't actually spy on "request" easily when it's just an exported function inside the same file unless it's mocked or we override fetch.
    // Instead of mocking request, let's mock global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    const result = await assignMultipleChargersToTicket('sis', 1234, [1, 2]);
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should throw backend error message when fetch fails (e.g. 500 API Error)', async () => {
    useAuthStore.setState({
      activeView: 'tech',
      currentUserRole: null
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ detail: "Erro no banco de dados do GLPI" })
    });

    await expect(assignMultipleChargersToTicket('sis', 1234, [1, 2]))
      .rejects.toThrow("Erro no banco de dados do GLPI");
  });
});
