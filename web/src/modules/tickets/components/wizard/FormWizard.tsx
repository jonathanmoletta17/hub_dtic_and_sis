'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useDraftStore } from '@/store/useDraftStore';
import { useWizardStore } from '@/store/useWizardStore';
import type { WizardStep } from '@/types/form-schema';

import { StepRouter } from './StepRouter';

interface FormWizardProps {
  contextLabel?: string;
}

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Servico',
  2: 'Dados gerais',
  3: 'Detalhamento',
  4: 'Revisao',
};

const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Escolha do servico',
  2: 'Dados gerais',
  3: 'Detalhamento',
  4: 'Revisao final',
};

const STEP_HELPERS: Record<WizardStep, string> = {
  1: 'Escolha a frente de atendimento para continuar com o chamado.',
  2: 'Preencha os campos principais do formulario selecionado.',
  3: 'Adicione os detalhes finais que sustentam a triagem.',
  4: 'Revise as informacoes antes de enviar o chamado.',
};

const AUTOSAVE_INTERVAL_MS = 30_000;
const WIZARD_STEPS = [1, 2, 3, 4] as WizardStep[];

export function FormWizard({ contextLabel }: FormWizardProps) {
  const { currentStep, selectedFormId, answers, isSubmitting, submitError, reset } =
    useWizardStore();
  const { saveDraft } = useDraftStore();

  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = (currentStep / WIZARD_STEPS.length) * 100;

  const performAutosave = useCallback(() => {
    if (selectedFormId && Object.keys(answers).length > 0) {
      saveDraft(selectedFormId, answers, currentStep);
    }
  }, [answers, currentStep, saveDraft, selectedFormId]);

  useEffect(() => {
    autosaveRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
      }
    };
  }, [performAutosave]);

  useEffect(() => {
    performAutosave();
  }, [currentStep, performAutosave]);

  useEffect(() => {
    return () => {
      performAutosave();
    };
  }, [performAutosave]);

  return (
    <section className="wizard-shell">
      <header className="wizard-header">
        <div className="wizard-header-copy">
          <div className="wizard-eyebrow-row">
            <p className="wizard-eyebrow">Abrir chamado</p>
            {contextLabel ? <span className="wizard-context-chip">{contextLabel}</span> : null}
          </div>
          <div className="wizard-title-row">
            <h2 className="wizard-title">{STEP_TITLES[currentStep]}</h2>
            <span className="wizard-step-counter">
              Etapa {currentStep} de {WIZARD_STEPS.length}
            </span>
          </div>
          <p className="wizard-subtitle">{STEP_HELPERS[currentStep]}</p>
        </div>

        {currentStep > 1 ? (
          <button
            type="button"
            className="wizard-reset-btn"
            onClick={reset}
            title="Comecar novamente"
          >
            Reiniciar fluxo
          </button>
        ) : null}
      </header>

      <div className="wizard-progress-shell" aria-label="Progresso do formulario">
        <div className="wizard-progress-track">
          <div className="wizard-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="wizard-progress-list">
          {WIZARD_STEPS.map((step) => {
            const state =
              step === currentStep ? 'active' : step < currentStep ? 'completed' : 'pending';

            return (
              <div
                key={step}
                className={`wizard-progress-chip ${state}`}
                aria-current={step === currentStep ? 'step' : undefined}
              >
                <span className="wizard-progress-index">{step}</span>
                <span className="wizard-progress-label">{STEP_LABELS[step]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {submitError ? (
        <div className="wizard-error" role="alert">
          <p>{submitError}</p>
        </div>
      ) : null}

      <div className="wizard-body">
        {isSubmitting ? (
          <div className="wizard-loading-overlay" aria-live="polite">
            <div className="wizard-spinner" />
            <p>Abrindo chamado...</p>
          </div>
        ) : null}

        <StepRouter />
      </div>

      <style jsx>{`
        .wizard-shell {
          position: relative;
          display: flex;
          width: 100%;
          flex: 1;
          flex-direction: column;
          gap: 18px;
          min-height: 100%;
          border-radius: 28px;
          border: 1px solid var(--card-border);
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 94%, transparent) 0%, var(--bg-surface) 100%);
          box-shadow: var(--floating-shadow);
          padding: 22px;
        }

        .wizard-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .wizard-header-copy {
          min-width: 0;
        }

        .wizard-eyebrow {
          margin: 0;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .wizard-eyebrow-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .wizard-context-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 7px 10px;
          text-transform: uppercase;
        }

        .wizard-title-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .wizard-title {
          margin: 0;
          color: var(--text-primary);
          font-size: clamp(26px, 2vw, 32px);
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .wizard-step-counter {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          padding: 9px 12px;
        }

        .wizard-subtitle {
          margin: 10px 0 0;
          max-width: 44rem;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.7;
        }

        .wizard-reset-btn {
          border: 1px solid var(--border-subtle);
          border-radius: 999px;
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          padding: 11px 14px;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .wizard-reset-btn:hover {
          border-color: color-mix(in srgb, var(--status-active) 36%, var(--border-default));
          background: color-mix(in srgb, var(--status-active-bg) 75%, var(--bg-surface) 25%);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .wizard-reset-btn:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
        }

        .wizard-progress-shell {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .wizard-progress-track {
          overflow: hidden;
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: var(--bg-surface-alt);
        }

        .wizard-progress-bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--accent-primary) 0%, var(--color-accent-violet) 100%);
          transition: width 0.25s ease;
        }

        .wizard-progress-list {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .wizard-progress-chip {
          display: inline-flex;
          min-width: 0;
          align-items: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid var(--card-border);
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
          padding: 10px 12px;
        }

        .wizard-progress-chip.active {
          border-color: color-mix(in srgb, var(--accent-primary) 34%, var(--border-default));
          background: color-mix(in srgb, var(--accent-primary-subtle) 64%, var(--bg-surface) 36%);
          color: var(--text-primary);
        }

        .wizard-progress-chip.completed {
          border-color: color-mix(in srgb, var(--accent-primary) 20%, var(--border-default));
          background: color-mix(in srgb, var(--accent-primary-subtle) 42%, var(--bg-surface) 58%);
          color: var(--text-secondary);
        }

        .wizard-progress-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 26px;
          height: 26px;
          border-radius: 999px;
          background: var(--bg-surface);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .wizard-progress-chip.active .wizard-progress-index {
          background: var(--accent-primary);
          color: var(--text-inverse);
        }

        .wizard-progress-chip.completed .wizard-progress-index {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
        }

        .wizard-progress-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 700;
        }

        .wizard-error {
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--color-danger) 24%, var(--border-default));
          background: color-mix(in srgb, var(--color-danger) 9%, var(--bg-surface) 91%);
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.6;
          padding: 12px 14px;
        }

        .wizard-error p {
          margin: 0;
        }

        .wizard-body {
          position: relative;
          flex: 1;
          min-height: 0;
          overflow: visible;
        }

        .wizard-loading-overlay {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          border-radius: 22px;
          background: color-mix(in srgb, var(--bg-surface) 74%, transparent);
          backdrop-filter: blur(6px);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
        }

        .wizard-spinner {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 3px solid color-mix(in srgb, var(--accent-primary) 14%, transparent);
          border-top-color: var(--accent-primary);
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 920px) {
          .wizard-progress-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .wizard-shell {
            border-radius: 22px;
            padding: 16px;
          }

          .wizard-progress-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
