'use client';

// ═══════════════════════════════════════════════════════════════════
// ServiceSelector — Step 1: Catálogo dinâmico de serviços SIS
// Busca formulários da API real. Fallback estático se offline.
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '@/store/useWizardStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useServiceCatalog } from '@/hooks/useServiceCatalog';

export function ServiceSelector() {
  const [search, setSearch] = useState('');
  const { selectForm } = useWizardStore();
  const { hasDraft, loadDraft } = useDraftStore();
  const { activeView } = useAuthStore();
  const { catalog, isLoading, error } = useServiceCatalog();
  const isTech = activeView === 'tech';

  const filteredCatalog = useMemo(() => {
    const term = search.toLowerCase().trim();

    return catalog
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.techOnly && !isTech) return false;
          if (!term) return true;
          return (
            item.name.toLowerCase().includes(term) ||
            (item.description ?? '').toLowerCase().includes(term)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [search, isTech, catalog]);

  const handleSelect = (formId: number) => {
    const draft = loadDraft(formId);
    if (draft) {
      selectForm(formId);
    } else {
      selectForm(formId);
    }
  };

  return (
    <div className="service-selector">
      {/* Busca */}
      <div className="service-search-wrapper">
        <span className="service-search-icon">🔍</span>
        <input
          type="text"
          className="service-search"
          placeholder="O que você precisa?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button
            type="button"
            className="service-search-clear"
            onClick={() => setSearch('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="service-skeleton">
          {[1, 2].map((g) => (
            <div key={g} className="service-skeleton-group">
              <div className="service-skeleton-title" />
              <div className="service-skeleton-grid">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="service-skeleton-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Erro (mas mostra fallback) */}
      {error && !isLoading && (
        <div className="service-error-banner">
          ⚠️ Usando catálogo local (backend indisponível)
        </div>
      )}

      {/* Grupos */}
      {!isLoading && filteredCatalog.map((group) => (
        <div key={group.id} className="service-group">
          <h3 className="service-group-title">
            <span>{group.icon}</span> {group.group}
          </h3>
          <div className="service-grid">
            {group.items.map((item, index) => (
              <motion.button
                key={item.formId}
                className="service-card"
                onClick={() => handleSelect(item.formId)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="service-card-icon">{item.icon}</span>
                <span className="service-card-name">{item.name}</span>
                {item.description && (
                  <span className="service-card-desc">{item.description}</span>
                )}
                {hasDraft(item.formId) && (
                  <span className="service-card-draft">Rascunho salvo</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && filteredCatalog.length === 0 && (
        <div className="service-empty">
          {error ? (
            <span>Serviço indisponível no momento. Tente novamente mais tarde.</span>
          ) : (
            <span>Nenhum serviço encontrado para &quot;{search}&quot;</span>
          )}
        </div>
      )}

      <style jsx>{`
        .service-selector {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .service-search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .service-search-icon {
          position: absolute;
          left: 16px;
          font-size: 16px;
          pointer-events: none;
        }

        .service-search {
          width: 100%;
          padding: 14px 40px 14px 44px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }

        .service-search:focus {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.05);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .service-search::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .service-search-clear {
          position: absolute;
          right: 12px;
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .service-error-banner {
          padding: 8px 14px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: 8px;
          color: #fbbf24;
          font-size: 12px;
          text-align: center;
        }

        /* ─── Skeleton ─── */
        .service-skeleton {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .service-skeleton-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .service-skeleton-title {
          width: 140px;
          height: 16px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .service-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }

        .service-skeleton-card {
          height: 88px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* ─── Groups ─── */
        .service-group-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }

        .service-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 20px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .service-card:hover {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.25);
        }

        .service-card-icon {
          font-size: 28px;
        }

        .service-card-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .service-card-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
        }

        .service-card-draft {
          font-size: 10px;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 4px;
        }

        .service-empty {
          text-align: center;
          padding: 48px 0;
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .service-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
