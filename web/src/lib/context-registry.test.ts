/**
 * context-registry.test.ts — Testes unitários para resolveMenuItems().
 *
 * Valida que a resolução de menus por (contextId, userRoles, appAccess)
 * retorna exatamente as features esperadas.
 */
import { resolveMenuItems, getContextManifest, CONTEXT_MANIFESTS } from './context-registry';
import { describe, test, expect } from 'vitest';

describe('context-registry', () => {
  // ─── Smoke test: manifesto carregou dos JSONs ───
  test('CONTEXT_MANIFESTS deve conter ao menos 4 contextos', () => {
    expect(CONTEXT_MANIFESTS.length).toBeGreaterThanOrEqual(4);
    const ids = CONTEXT_MANIFESTS.map(m => m.id);
    expect(ids).toContain('dtic');
    expect(ids).toContain('sis');
    expect(ids).toContain('sis-manutencao');
    expect(ids).toContain('sis-memoria');
  });

  test('Cada manifesto deve ter label e features não vazios', () => {
    for (const m of CONTEXT_MANIFESTS) {
      expect(m.label).toBeTruthy();
      expect(m.features.length).toBeGreaterThan(0);
      for (const f of m.features) {
        expect(f.label).toBeTruthy();
        expect(f.icon).toBeTruthy();
        expect(f.route).toBeTruthy();
      }
    }
  });

  // ─── Cenário 1: Técnico DTIC com apps dashboard+busca ───
  test('tecnico DTIC com dashboard+busca → Dashboard + Smart Search', () => {
    const items = resolveMenuItems('dtic', ['tecnico'], ['dashboard', 'busca']);
    const ids = items.map(i => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('search');
    // Também recebe knowledge e new-ticket (sem restrição de role nem requireApp)
    expect(ids).toContain('knowledge');
    expect(ids).toContain('new-ticket');
    // Não recebe permissoes (requer gestor e requireApp=permissoes)
    expect(ids).not.toContain('permissoes');
  });

  // ─── Cenário 2: Gestor SIS com carregadores+permissoes ───
  test('gestor SIS com carregadores+permissoes → Dashboard + Permissões + Carregadores + Novo Chamado', () => {
    const items = resolveMenuItems('sis', ['gestor'], ['carregadores', 'permissoes']);
    const ids = items.map(i => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('permissoes');
    expect(ids).toContain('chargers');
    expect(ids).toContain('new-ticket');
    // search requer requireApp=busca que não foi passado
    expect(ids).not.toContain('search');
  });

  // ─── Cenário 3: Solicitante DTIC sem nenhum appAccess ───
  test('solicitante DTIC sem appAccess → apenas features sem restrição (knowledge + new-ticket)', () => {
    const items = resolveMenuItems('dtic', ['solicitante'], []);
    const ids = items.map(i => i.id);
    // knowledge e new-ticket não exigem role específica nem requireApp
    expect(ids).toContain('knowledge');
    expect(ids).toContain('new-ticket');
    // dashboard exige tecnico/gestor
    expect(ids).not.toContain('dashboard');
    // search exige requireApp=busca
    expect(ids).not.toContain('search');
  });

  // ─── Cenário 4: tecnico-manutencao no sis-manutencao ───
  test('tecnico-manutencao no sis-manutencao → dashboard sim, chargers NÃO (não existe no manifesto)', () => {
    const items = resolveMenuItems('sis-manutencao', ['tecnico-manutencao'], ['carregadores']);
    const ids = items.map(i => i.id);
    // tecnico-manutencao casa com requiredRoles=["tecnico"] via sub-role match
    expect(ids).toContain('dashboard');
    expect(ids).toContain('new-ticket');
    // sis-manutencao NÃO tem chargers no manifesto
    expect(ids).not.toContain('chargers');
  });

  // ─── Cenário 5: contexto inexistente ───
  test('contexto inexistente retorna array vazio', () => {
    const items = resolveMenuItems('inexistente', ['gestor'], ['tudo']);
    expect(items).toEqual([]);
  });

  // ─── getContextManifest ───
  test('getContextManifest retorna null para id null ou inexistente', () => {
    expect(getContextManifest(null)).toBeNull();
    expect(getContextManifest('xyz')).toBeNull();
  });

  test('getContextManifest retorna manifesto correto para dtic', () => {
    const m = getContextManifest('dtic');
    expect(m).not.toBeNull();
    expect(m!.id).toBe('dtic');
    expect(m!.label).toBe('Ecossistema Digital');
  });

  // ─── Rotas injetadas com contexto ───
  test('resolveMenuItems injeta contextId na rota', () => {
    const items = resolveMenuItems('sis', ['tecnico'], []);
    const dashboard = items.find(i => i.id === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard!.route).toBe('/sis/dashboard');
  });
});
