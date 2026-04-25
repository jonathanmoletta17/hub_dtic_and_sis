import { describe, it, expect } from 'vitest';
import { resolveMenuItems } from '../lib/context-registry';

describe('Menu Resolution and Ordering', () => {
  it('should always have "new-ticket" (Novo Chamado) as the first item for "dtic" context', () => {
    // Both tecnico and solicitante
    const itemsTecnico = resolveMenuItems('dtic', ['tecnico']);
    const itemsSolicitante = resolveMenuItems('dtic', ['solicitante']);

    expect(itemsTecnico[0].id).toBe('new-ticket');
    expect(itemsSolicitante[0].id).toBe('new-ticket');
  });

  it('should always have "new-ticket" (Novo Chamado) as the first item for "sis" context', () => {
    const itemsGestor = resolveMenuItems('sis', ['gestor']);
    const itemsSolicitante = resolveMenuItems('sis', ['solicitante']);

    expect(itemsGestor[0].id).toBe('new-ticket');
    expect(itemsSolicitante[0].id).toBe('new-ticket');
  });

  it('should include "user-tickets" (Meus Chamados) for all users lacking specific roles', () => {
    // Solicitante doesn't have "tecnico" or "gestor"
    const itemsSolicitante = resolveMenuItems('dtic', ['solicitante']);
    
    // Check if user-tickets is present
    const hasUserTickets = itemsSolicitante.some(item => item.id === 'user-tickets');
    expect(hasUserTickets).toBe(true);

    // Also check it's present in sis
    const itemsSis = resolveMenuItems('sis', ['solicitante']);
    const hasUserTicketsSis = itemsSis.some(item => item.id === 'user-tickets');
    expect(hasUserTicketsSis).toBe(true);
  });

  it('should correctly omit dashboard for solicitantes', () => {
    const itemsSolicitante = resolveMenuItems('dtic', ['solicitante']);
    const hasDashboard = itemsSolicitante.some(item => item.id === 'dashboard');
    expect(hasDashboard).toBe(false);
  });

  it('should expose inventory only for DTIC users with inventario app access', () => {
    const withoutAccess = resolveMenuItems('dtic', ['tecnico'], ['busca']);
    const withAccess = resolveMenuItems('dtic', ['tecnico'], ['inventario']);
    const sisItems = resolveMenuItems('sis', ['tecnico'], ['inventario']);

    expect(withoutAccess.some(item => item.id === 'inventory')).toBe(false);
    expect(withAccess.some(item => item.id === 'inventory')).toBe(true);
    expect(sisItems.some(item => item.id === 'inventory')).toBe(false);
  });
});
