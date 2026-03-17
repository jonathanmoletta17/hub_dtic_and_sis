'use client';

// ═══════════════════════════════════════════════════════════════════
// StepRouter — Steps reais c/ validação Zod + ConditionEngine
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '@/store/useWizardStore';
import { useFormSchema } from '@/hooks/useFormSchema';
import { useDynamicValidation } from '@/hooks/useDynamicValidation';
import { DynamicFormRenderer } from '../dynamic-form/DynamicFormRenderer';
import { ServiceSelector } from './ServiceSelector';
import { ReviewStep } from './ReviewStep';
import type { WizardStep, FormAnswers } from '@/types/form-schema';

// ── Step 2 & 3: Wrapper com validação ──

function FormStepWrapper({ stepSections }: { stepSections: number[] }) {
  const { schema, answers, setAnswer, goNext, goBack, isLoadingSchema } =
    useWizardStore();
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Valida apenas as seções do step atual
  const sectionsForStep = useMemo(
    () => (schema?.sections ?? []).filter((_, i) => stepSections.includes(i)),
    [schema, stepSections]
  );

  const { validate } = useDynamicValidation(sectionsForStep, answers);

  const handleNext = useCallback(() => {
    const result = validate();
    if (result.isValid) {
      setLocalErrors({});
      goNext();
    } else {
      setLocalErrors(result.errors);
    }
  }, [validate, goNext]);

  const handleAnswer = useCallback(
    (questionId: number, value: FormAnswers[string]) => {
      setAnswer(questionId, value);
      // Limpa erro do campo ao preencher
      setLocalErrors((prev) => {
        const key = `q_${questionId}`;
        if (prev[key]) {
          const rest = { ...prev };
          delete rest[key];
          return rest;
        }
        return prev;
      });
    },
    [setAnswer]
  );

  if (isLoadingSchema) {
    return (
      <div className="step-loading">
        <div className="step-spinner" />
        <p>Carregando formulário...</p>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="step-loading">
        <p>Nenhum formulário selecionado.</p>
      </div>
    );
  }

  const filteredSchema = { ...schema, sections: sectionsForStep };
  const errorCount = Object.keys(localErrors).length;

  return (
    <div className="form-step">
      <DynamicFormRenderer
        schema={filteredSchema}
        answers={answers}
        onAnswer={handleAnswer}
        errors={localErrors}
      />

      {errorCount > 0 && (
        <div className="step-validation-msg">
          ⚠️ {errorCount} campo(s) obrigatório(s) não preenchido(s)
        </div>
      )}

      <div className="form-step-nav">
        <button type="button" className="step-btn-back" onClick={goBack}>
          ← Voltar
        </button>
        <button type="button" className="step-btn-next" onClick={handleNext}>
          Próximo →
        </button>
      </div>
    </div>
  );
}

function Step2() {
  return <FormStepWrapper stepSections={[0]} />;
}

function Step3() {
  return <FormStepWrapper stepSections={[1]} />;
}

// ── Animation ──

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 250 : -250, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -250 : 250, opacity: 0 }),
};

const slideTransition = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 32,
};

const STEP_COMPONENTS: Record<WizardStep, React.ComponentType> = {
  1: ServiceSelector,
  2: Step2,
  3: Step3,
  4: ReviewStep,
};

// ── Router ──

export function StepRouter() {
  const { currentStep } = useWizardStore();
  useFormSchema();

  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <>
      <AnimatePresence mode="wait" custom={1}>
        <motion.div
          key={currentStep}
          custom={1}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
        >
          <StepComponent />
        </motion.div>
      </AnimatePresence>

      <style jsx global>{`
        /* ═══ Scrollbar Customizada ═══ */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 15, 30, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* ═══ Form Step Navigation ═══ */
        .form-step {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-step-nav {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          position: sticky;
          bottom: 0;
          background: rgba(15, 15, 30, 0.95);
          backdrop-filter: blur(8px);
          z-index: 50;
          border-radius: 0 0 12px 12px;
          margin-top: auto;
        }

        .step-btn-back {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .step-btn-back:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .step-btn-next {
          padding: 10px 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .step-btn-next:hover {
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .step-validation-msg {
          padding: 10px 16px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 13px;
          text-align: center;
        }

        .step-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 14px;
        }

        .step-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: step-spin 0.8s linear infinite;
        }

        @keyframes step-spin {
          to { transform: rotate(360deg); }
        }

        /* ═══ Form Fields Global Styles ═══ */
        .field-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 4px;
        }

        .field-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
        }

        .field-required {
          color: #ef4444;
          margin-left: 2px;
        }

        .field-input,
        .field-textarea,
        .field-select,
        .field-dropdown-search {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .field-input:focus,
        .field-textarea:focus,
        .field-select:focus,
        .field-dropdown-search:focus {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .field-input::placeholder,
        .field-textarea::placeholder,
        .field-dropdown-search::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .field-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .field-textarea-footer {
          display: flex;
          justify-content: flex-end;
        }

        .field-char-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.25);
        }

        .field-select {
          appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23ffffff60' viewBox='0 0 16 16'%3e%3cpath d='M8 11L3 6h10l-5 5z'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
        }

        .field-select option {
          background: #1a1a2e;
          color: white;
        }
        
        /* Ocultar spin buttons do input type number */
        .field-input[type="number"]::-webkit-inner-spin-button,
        .field-input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .field-input[type="number"] {
          -moz-appearance: textfield;
        }

        .field-error {
          border-color: rgba(239, 68, 68, 0.5) !important;
        }

        .field-error-msg {
          font-size: 12px;
          color: #fca5a5;
        }

        /* Radio */
        .field-radio-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-radio-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .field-radio-option:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .field-radio-option.selected {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .field-radio-input { display: none; }

        .field-radio-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
          transition: all 0.2s;
          position: relative;
        }

        .selected .field-radio-dot {
          border-color: #6366f1;
        }

        .selected .field-radio-dot::after {
          content: '';
          position: absolute;
          inset: 3px;
          background: #6366f1;
          border-radius: 50%;
        }

        .field-radio-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }

        /* ═══ Combobox (DropdownTree redesign) ═══ */
        .combobox-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          min-height: 42px;
        }

        .combobox-trigger:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .combobox-open {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .combobox-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 14px;
          padding: 0;
          width: 100%;
        }

        .combobox-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .combobox-display {
          flex: 1;
          font-size: 14px;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .combobox-placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .combobox-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .combobox-clear {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          font-size: 11px;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .combobox-clear:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }

        .combobox-chevron {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.3);
          transition: transform 0.2s;
        }

        .combobox-dropdown {
          position: relative;
          max-height: 220px;
          overflow-y: auto;
          background: rgba(15, 15, 30, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          margin-top: 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 50;
        }
        
        /* Otimizando scroll da lista de opções */
        .combobox-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .combobox-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .combobox-option {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 8px 14px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
          color: white;
        }

        .combobox-option:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .combobox-option-active {
          background: rgba(99, 102, 241, 0.15);
        }

        .combobox-option-name {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
        }

        .combobox-option-path {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
          margin-top: 1px;
        }

        .combobox-empty,
        .combobox-more {
          padding: 12px 14px;
          text-align: center;
          color: rgba(255, 255, 255, 0.25);
          font-size: 13px;
        }

        /* File Upload */
        .field-file-dropzone {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 72px;
        }

        .field-file-dropzone:hover {
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(99, 102, 241, 0.04);
        }

        .field-file-hidden { display: none; }

        .field-file-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
        }

        .field-file-icon { font-size: 24px; }

        .field-file-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .field-file-name {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }

        .field-file-size {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
        }

        .field-file-remove {
          font-size: 12px;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        /* Urgency Picker */
        .field-urgency-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .field-urgency-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }

        .field-urgency-btn:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .field-urgency-btn.selected {
          font-weight: 500;
          color: white;
        }

        .field-unsupported {
          padding: 10px 14px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 8px;
          color: #fbbf24;
          font-size: 12px;
        }

        .field-unsupported code {
          background: rgba(245, 158, 11, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Form Section */
        .form-section {
          overflow: hidden;
        }

        .form-section-title {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .form-section-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Grid Row — 4 colunas */
        .form-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .form-cell {
          min-width: 0; /* Prevenir overflow em grid */
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .form-cell {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </>
  );
}
