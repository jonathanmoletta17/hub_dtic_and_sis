'use client';

// ═══════════════════════════════════════════════════════════════════
// FormWizard — Orquestrador principal do fluxo "Novo Chamado"
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useRef } from 'react';
import { useWizardStore } from '@/store/useWizardStore';
import { useDraftStore } from '@/store/useDraftStore';
import { StepRouter } from './StepRouter';
import type { WizardStep } from '@/types/form-schema';

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Serviço',
  2: 'Dados Gerais',
  3: 'Detalhamento',
  4: 'Revisão',
};

const AUTOSAVE_INTERVAL_MS = 30_000;

export function FormWizard() {
  const {
    currentStep,
    selectedFormId,
    answers,
    isSubmitting,
    submitError,
    reset,
  } = useWizardStore();

  const { saveDraft } = useDraftStore();
  const autosaveRef = useRef<ReturnType<typeof setInterval>>(null);

  // === Auto-save a cada 30s (apenas se tiver um form selecionado) ===
  const performAutosave = useCallback(() => {
    if (selectedFormId && Object.keys(answers).length > 0) {
      saveDraft(selectedFormId, answers, currentStep);
    }
  }, [selectedFormId, answers, currentStep, saveDraft]);

  useEffect(() => {
    autosaveRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [performAutosave]);

  // === Auto-save na mudança de step ===
  useEffect(() => {
    performAutosave();
  }, [currentStep, performAutosave]);

  // === Cleanup no unmount ===
  useEffect(() => {
    return () => {
      performAutosave();
    };
  }, [performAutosave]);

  return (
    <div className="wizard-container">
      {/* Header: Progress Bar */}
      <div className="wizard-header">
        <div className="wizard-progress">
          {([1, 2, 3, 4] as WizardStep[]).map((step) => (
            <div
              key={step}
              className={`wizard-step-indicator ${
                step === currentStep
                  ? 'active'
                  : step < currentStep
                    ? 'completed'
                    : 'pending'
              }`}
            >
              <div className="wizard-step-dot">
                {step < currentStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{step}</span>
                )}
              </div>
              <span className="wizard-step-label">{STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>

        {/* Botão reset (canto direito) */}
        {currentStep > 1 && (
          <button
            type="button"
            className="wizard-reset-btn"
            onClick={reset}
            title="Começar de novo"
          >
            ✕
          </button>
        )}
      </div>

      {/* Erro de submit (se houver) */}
      {submitError && (
        <div className="wizard-error">
          <p>{submitError}</p>
        </div>
      )}

      {/* Loading overlay durante submit */}
      {isSubmitting && (
        <div className="wizard-loading-overlay">
          <div className="wizard-spinner" />
          <p>Abrindo chamado...</p>
        </div>
      )}

      {/* Body: Step Router com animações */}
      <div className="wizard-body">
        <StepRouter />
      </div>

      {/* Estilos scoped */}
      <style jsx>{`
        .wizard-container {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          background: var(--bg-primary, #0a0a0f);
          border-radius: 16px;
          overflow: hidden;
        }

        .wizard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }

        .wizard-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .wizard-step-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.3s ease;
          flex: 1;
        }

        .wizard-step-indicator::after {
          content: '';
          flex: 1;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          margin-left: 8px;
        }

        .wizard-step-indicator:last-child::after {
          display: none;
        }

        .wizard-step-indicator.active {
          background: rgba(99, 102, 241, 0.1);
        }

        .wizard-step-indicator.completed::after {
          background: rgba(99, 102, 241, 0.5);
        }

        .wizard-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .pending .wizard-step-dot {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.3);
        }

        .active .wizard-step-dot {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
        }

        .completed .wizard-step-dot {
          background: rgba(99, 102, 241, 0.2);
          color: #6366f1;
        }

        .wizard-step-label {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }

        .pending .wizard-step-label {
          color: rgba(255, 255, 255, 0.3);
        }

        .active .wizard-step-label {
          color: rgba(255, 255, 255, 0.9);
        }

        .completed .wizard-step-label {
          color: rgba(255, 255, 255, 0.5);
        }

        .wizard-reset-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 14px;
        }

        .wizard-reset-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .wizard-error {
          margin: 12px 32px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 14px;
        }

        .wizard-loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 50;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }

        .wizard-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .wizard-body {
          flex: 1;
          padding: 32px;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .wizard-header {
            padding: 16px 20px;
          }

          .wizard-step-label {
            display: none;
          }

          .wizard-body {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
