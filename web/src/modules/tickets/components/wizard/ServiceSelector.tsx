'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Building2,
  ClipboardList,
  Coffee,
  FolderKanban,
  Hammer,
  Layers3,
  LoaderCircle,
  Network,
  Search,
  Send,
  Snowflake,
  Sparkles,
  TreePine,
  Wrench,
  Zap,
  Droplets,
  type LucideIcon,
} from 'lucide-react';

import { useServiceCatalog } from '@/hooks/useServiceCatalog';
import { useAuthStore } from '@/store/useAuthStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useWizardStore } from '@/store/useWizardStore';

import {
  buildFamilies,
  buildPresentedServices,
  buildQuickActions,
  filterPresentedServices,
  type PresentedService,
  type ServiceFamilyId,
  type ServiceIconKey,
} from './serviceCatalogPresentation';

const SERVICE_ICONS: Record<ServiceIconKey, LucideIcon> = {
  snowflake: Snowflake,
  battery: BatteryCharging,
  coffee: Coffee,
  zap: Zap,
  droplets: Droplets,
  trees: TreePine,
  sparkles: Sparkles,
  hammer: Hammer,
  send: Send,
  network: Network,
  clipboard: ClipboardList,
  folder: FolderKanban,
  layers: Layers3,
  building: Building2,
  wrench: Wrench,
};

export function ServiceSelector() {
  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState<ServiceFamilyId>('all');
  const { selectForm, restoreDraft } = useWizardStore();
  const { hasDraft, loadDraft } = useDraftStore();
  const { activeContext, activeView, getOperationalViewForContext } = useAuthStore();
  const { catalog, isLoading, error, reload } = useServiceCatalog();
  const isTech = (getOperationalViewForContext(activeContext) ?? activeView) === 'tech';

  const availableServices = useMemo(
    () =>
      buildPresentedServices(catalog, hasDraft).filter((service) =>
        isTech ? true : !service.techOnly,
      ),
    [catalog, hasDraft, isTech],
  );

  const families = useMemo(() => buildFamilies(availableServices), [availableServices]);
  const safeFamily = families.some((family) => family.id === activeFamily) ? activeFamily : 'all';
  const quickActions = useMemo(() => buildQuickActions(availableServices), [availableServices]);
  const activeFamilyMeta = families.find((family) => family.id === safeFamily);
  const visibleServices = useMemo(() => {
    const quickActionIds = new Set(quickActions.map((action) => action.service.formId));
    const filtered = filterPresentedServices(availableServices, safeFamily, search);

    if (search || safeFamily !== 'all') {
      return filtered;
    }

    return filtered.filter((service) => !quickActionIds.has(service.formId));
  }, [availableServices, quickActions, safeFamily, search]);

  const handleSelect = (service: PresentedService) => {
    const draft = loadDraft(service.formId);
    if (draft) {
      restoreDraft(draft);
      return;
    }
    selectForm(service.formId);
  };

  if (isLoading) {
    return (
      <div className="service-loading-state" aria-live="polite">
        <div className="service-loading-copy">
          <LoaderCircle size={18} className="service-loading-icon" aria-hidden="true" />
          <span>Carregando servicos...</span>
        </div>
        <div className="service-loading-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="service-loading-card" />
          ))}
        </div>

        <style jsx>{`
          .service-loading-state {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .service-loading-copy {
            display: inline-flex;
            width: fit-content;
            align-items: center;
            gap: 10px;
            border-radius: 999px;
            border: 1px solid var(--border-subtle);
            background: var(--bg-surface-alt);
            color: var(--text-secondary);
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 600;
          }

          .service-loading-icon {
            animation: spin 0.8s linear infinite;
          }

          .service-loading-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .service-loading-card {
            min-height: 112px;
            border-radius: 20px;
            border: 1px solid var(--border-subtle);
            background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-alt) 100%);
            box-shadow: var(--card-shadow);
            animation: pulse 1.4s ease-in-out infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 0.75;
            }

            50% {
              opacity: 1;
            }
          }

          @media (max-width: 900px) {
            .service-loading-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  if (error && availableServices.length === 0) {
    return (
      <div className="service-error-state" role="alert">
        <div className="service-error-icon-shell" aria-hidden="true">
          <AlertTriangle size={20} />
        </div>
        <div className="service-error-copy">
          <h3>Nao foi possivel carregar o catalogo de servicos</h3>
          <p>
            Tente novamente agora. Se o problema continuar, valide o backend do contexto SIS antes
            de seguir com a abertura.
          </p>
        </div>
        <button type="button" className="service-error-action" onClick={reload}>
          Tentar novamente
        </button>

        <style jsx>{`
          .service-error-state {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            border-radius: 24px;
            border: 1px solid rgba(217, 119, 6, 0.2);
            background: color-mix(in srgb, var(--status-active-bg) 82%, var(--bg-surface) 18%);
            padding: 24px;
          }

          .service-error-icon-shell {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 999px;
            background: var(--status-active-bg);
            color: var(--status-active);
          }

          .service-error-copy h3 {
            margin: 0 0 6px;
            color: var(--text-primary);
            font-size: 20px;
            font-weight: 700;
          }

          .service-error-copy p {
            margin: 0;
            max-width: 38rem;
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.65;
          }

          .service-error-action {
            border: none;
            border-radius: 14px;
            background: var(--accent-primary);
            color: var(--text-inverse);
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            padding: 12px 18px;
            transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          }

          .service-error-action:hover {
            background: var(--accent-primary-hover);
            box-shadow: var(--card-shadow-hover);
            transform: translateY(-1px);
          }

          .service-error-action:focus-visible {
            outline: 2px solid var(--accent-primary);
            outline-offset: 3px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="service-selector-shell">
      <div className="service-discovery-header">
        <div className="service-discovery-copy">
          <p className="service-discovery-eyebrow">Selecao de servico</p>
          <h3>Escolha a frente mais proxima do seu pedido</h3>
          <p>
            Busque por servico, problema ou area. Se a demanda envolver mais de uma frente, use a
            entrada assistida.
          </p>
        </div>

        <div className="service-discovery-meta">
          <span>{availableServices.length} servicos disponiveis</span>
          {safeFamily !== 'all' ? (
            <span>{activeFamilyMeta?.label}</span>
          ) : null}
        </div>
      </div>

      <div className="service-search-shell">
        <label htmlFor="service-search" className="service-search-label">
          Buscar servico
        </label>
        <div className="service-search-field">
          <Search size={18} aria-hidden="true" />
          <input
            id="service-search"
            name="service-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            className="service-search-input"
            placeholder="Busque por servico, problema ou area..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="service-search-clear"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {!error ? null : (
        <div className="service-warning-strip" role="status">
          O catalogo foi carregado, mas houve instabilidade ao consultar o backend. Revise com
          atencao antes de seguir.
        </div>
      )}

      {quickActions.length > 0 && !search ? (
        <section className="service-quick-actions" aria-label="Atalhos">
          <header className="service-section-header">
            <div>
              <h4>Comece por aqui</h4>
              <p>Atalhos para rascunhos, triagem assistida e fluxos mais recorrentes.</p>
            </div>
          </header>
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="service-quick-card"
              onClick={() => handleSelect(action.service)}
            >
              <span className="service-quick-label">{action.label}</span>
              <span className="service-quick-description">{action.description}</span>
            </button>
          ))}
        </section>
      ) : null}

      <div className="service-discovery-grid">
        <aside className="service-family-rail" aria-label="Categorias de servico">
          {families.map((family) => {
            const active = family.id === safeFamily;
            return (
              <button
                key={family.id}
                type="button"
                className={`service-family-btn ${active ? 'active' : ''}`}
                onClick={() => setActiveFamily(family.id)}
                aria-pressed={active}
              >
                <span className="service-family-copy">
                  <span className="service-family-label">{family.label}</span>
                  <span className="service-family-description">{family.description}</span>
                </span>
                <span className="service-family-count">{family.count}</span>
              </button>
            );
          })}
        </aside>

        <section className="service-results-panel" aria-label="Resultados de servicos">
          <header className="service-results-header">
            <div>
              <h4>{safeFamily === 'all' ? 'Catalogo de servicos' : activeFamilyMeta?.label}</h4>
              <p>
                {search
                  ? `${visibleServices.length} servico(s) encontrados para "${search}".`
                  : safeFamily === 'all'
                    ? `${visibleServices.length} servico(s) listados abaixo.`
                    : `${visibleServices.length} servico(s) disponiveis nesta categoria.`}
              </p>
            </div>
          </header>

          {visibleServices.length > 0 ? (
            <div className="service-results-list">
              {visibleServices.map((service) => {
                const Icon = SERVICE_ICONS[service.iconKey] ?? Layers3;
                return (
                  <button
                    key={service.formId}
                    type="button"
                    className="service-result-card service-card"
                    onClick={() => handleSelect(service)}
                  >
                    <span className="service-result-icon-shell" aria-hidden="true">
                      <Icon size={20} />
                    </span>

                    <span className="service-result-copy">
                      <span className="service-result-topline">
                        <span className="service-result-name">{service.displayName}</span>
                        <span className="service-result-tags">
                          <span className="service-result-family">{service.familyTagLabel}</span>
                          {service.badge ? (
                            <span className="service-result-badge">{service.badge}</span>
                          ) : null}
                          {service.hasDraft ? (
                            <span className="service-result-draft">Rascunho salvo</span>
                          ) : null}
                        </span>
                      </span>

                      <span className="service-result-summary">{service.summary}</span>
                      {service.helperText ? (
                        <span className="service-result-helper">{service.helperText}</span>
                      ) : null}
                    </span>

                    <span className="service-result-arrow" aria-hidden="true">
                      <ArrowRight size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="service-empty-state">
              <div className="service-empty-icon" aria-hidden="true">
                <Search size={18} />
              </div>
              <div className="service-empty-copy">
                <h4>Nenhum servico encontrado</h4>
                <p>
                  Tente outro termo, volte para &quot;Todos os servicos&quot; ou use
                  &quot;Multiplas demandas&quot;
                  quando a frente ainda nao estiver clara.
                </p>
              </div>
              <button type="button" className="service-empty-action" onClick={() => setSearch('')}>
                Limpar busca
              </button>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .service-selector-shell {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .service-discovery-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .service-discovery-copy {
          min-width: 0;
        }

        .service-discovery-eyebrow {
          margin: 0 0 6px;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .service-discovery-copy h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: clamp(24px, 2vw, 30px);
          font-weight: 800;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .service-discovery-copy p {
          margin: 10px 0 0;
          max-width: 46rem;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.7;
        }

        .service-discovery-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .service-discovery-meta span {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          padding: 10px 14px;
        }

        .service-search-shell {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .service-search-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .service-search-field {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          border: 1px solid var(--card-border);
          background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-alt) 100%);
          box-shadow: var(--card-shadow);
          color: var(--text-secondary);
          padding: 0 14px 0 16px;
        }

        .service-search-field:focus-within {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-primary) 16%, transparent);
        }

        .service-search-input {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 15px;
          line-height: 1.5;
          outline: none;
          padding: 16px 0;
        }

        .service-search-input::placeholder {
          color: color-mix(in srgb, var(--text-secondary) 70%, var(--text-muted) 30%);
        }

        .service-search-clear {
          flex-shrink: 0;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 0 8px 8px;
        }

        .service-search-clear:hover {
          color: var(--text-primary);
        }

        .service-search-clear:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
          border-radius: 8px;
        }

        .service-warning-strip {
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--status-active) 22%, var(--border-subtle));
          background: color-mix(in srgb, var(--status-active-bg) 78%, var(--bg-surface) 22%);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.6;
          padding: 12px 14px;
        }

        .service-quick-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .service-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          grid-column: 1 / -1;
        }

        .service-section-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 800;
        }

        .service-section-header p {
          margin: 6px 0 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
        }

        .service-quick-card {
          display: grid;
          align-items: flex-start;
          gap: 8px;
          border: 1px solid var(--card-border);
          border-radius: 18px;
          background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-alt) 100%);
          box-shadow: var(--card-shadow);
          cursor: pointer;
          min-height: 106px;
          padding: 16px 18px;
          text-align: left;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .service-quick-card:hover {
          background: var(--card-bg-hover);
          border-color: var(--card-border-hover);
          box-shadow: var(--card-shadow-hover);
          transform: translateY(-1px);
        }

        .service-quick-card:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
        }

        .service-quick-label {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
        }

        .service-quick-description {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.65;
        }

        .service-discovery-grid {
          display: grid;
          grid-template-columns: minmax(260px, 310px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .service-family-rail {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .service-family-btn {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--card-border);
          border-radius: 18px;
          background: var(--bg-surface);
          box-shadow: var(--card-shadow);
          cursor: pointer;
          padding: 16px;
          text-align: left;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.2s ease;
        }

        .service-family-btn:hover {
          background: var(--card-bg-hover);
          border-color: var(--card-border-hover);
          box-shadow: var(--card-shadow-hover);
          transform: translateY(-1px);
        }

        .service-family-btn.active {
          border-color: color-mix(in srgb, var(--accent-primary) 44%, var(--border-default));
          background: color-mix(in srgb, var(--accent-primary-subtle) 62%, var(--bg-surface) 38%);
        }

        .service-family-btn:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
        }

        .service-family-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 4px;
        }

        .service-family-label {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 700;
        }

        .service-family-description {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.55;
        }

        .service-family-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          border-radius: 999px;
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
          padding: 7px 10px;
        }

        .service-results-panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 1px solid var(--card-border);
          border-radius: 24px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 84%, transparent) 0%, var(--bg-surface) 100%);
          box-shadow: var(--floating-shadow);
          min-height: 100%;
          padding: 18px;
        }

        .service-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 6px;
        }

        .service-results-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 800;
        }

        .service-results-header p {
          margin: 6px 0 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
        }

        .service-results-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .service-result-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: flex-start;
          gap: 14px;
          border: 1px solid var(--card-border);
          border-radius: 20px;
          background: var(--bg-surface);
          box-shadow: var(--card-shadow);
          cursor: pointer;
          padding: 16px 18px;
          text-align: left;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .service-result-card:hover {
          background: var(--card-bg-hover);
          border-color: var(--card-border-hover);
          box-shadow: var(--card-shadow-hover);
          transform: translateY(-1px);
        }

        .service-result-card:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
        }

        .service-result-icon-shell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--accent-primary-subtle) 62%, var(--bg-surface) 38%);
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .service-result-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 8px;
        }

        .service-result-topline {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 10px;
        }

        .service-result-name {
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 800;
          line-height: 1.4;
        }

        .service-result-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .service-result-family,
        .service-result-badge,
        .service-result-draft {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          padding: 6px 9px;
          text-transform: uppercase;
        }

        .service-result-family {
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
        }

        .service-result-badge {
          background: var(--status-pending-bg);
          color: var(--status-pending);
        }

        .service-result-draft {
          background: var(--status-active-bg);
          color: var(--status-active);
        }

        .service-result-summary {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.7;
        }

        .service-result-helper {
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .service-result-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          flex-shrink: 0;
          padding-top: 4px;
        }

        .service-empty-state {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          border-radius: 20px;
          border: 1px dashed var(--border-default);
          background: var(--bg-surface-alt);
          padding: 22px;
        }

        .service-empty-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: var(--bg-surface);
          color: var(--text-secondary);
        }

        .service-empty-copy h4 {
          margin: 0 0 6px;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 800;
        }

        .service-empty-copy p {
          margin: 0;
          max-width: 32rem;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.65;
        }

        .service-empty-action {
          border: none;
          border-radius: 14px;
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          padding: 12px 16px;
        }

        .service-empty-action:hover {
          background: color-mix(in srgb, var(--accent-primary-subtle) 76%, var(--bg-surface) 24%);
        }

        .service-empty-action:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
        }

        @media (max-width: 1120px) {
          .service-quick-actions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .service-discovery-grid {
            grid-template-columns: 1fr;
          }

          .service-family-rail {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .service-discovery-header {
            flex-direction: column;
          }

          .service-quick-actions,
          .service-family-rail {
            grid-template-columns: 1fr;
          }

          .service-result-card {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .service-result-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
