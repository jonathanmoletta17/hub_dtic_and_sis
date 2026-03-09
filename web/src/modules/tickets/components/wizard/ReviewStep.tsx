'use client';

// ═══════════════════════════════════════════════════════════════════
// ReviewStep — Step 4: Resumo de todas respostas antes do envio
// ═══════════════════════════════════════════════════════════════════

import { useWizardStore } from '@/store/useWizardStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useAuthStore } from '@/store/useAuthStore';
import { submitFormAnswers } from '@/lib/api/formService';
import type { WizardStep, FormQuestion } from '@/types/form-schema';

export function ReviewStep() {
  const {
    goBack,
    schema,
    answers,
    isSubmitting,
    setSubmitting,
    setSubmitError,
    setStep,
    selectedFormId,
    reset,
  } = useWizardStore();

  const { clearDraft } = useDraftStore();
  const { activeContext } = useAuthStore();

  if (!schema) return null;

  // Coleta todas as questions visíveis com seus valores (resolve IDs → nomes)
  const answeredFields = schema.sections.flatMap((section) =>
    section.questions
      .filter((q) => answers[`q_${q.id}`] != null && answers[`q_${q.id}`] !== '')
      .map((q) => ({
        section: section.name,
        question: q.name,
        value: resolveDisplayValue(q, answers[`q_${q.id}`]),
        questionId: q.id,
      }))
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const context = activeContext || 'sis-manutencao';
      // Formata answers: {"question_id": "valor"}
      const formatted: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(answers)) {
        const qId = key.replace('q_', '');
        formatted[qId] = val;
      }
      await submitFormAnswers(context, selectedFormId!, formatted);
      if (selectedFormId) clearDraft(selectedFormId);
      reset();
    } catch (err) {
      setSubmitError(`Erro ao abrir chamado: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-step">
      <div className="review-header">
        <h2 className="review-title">📋 Revisão do Chamado</h2>
        <p className="review-subtitle">
          Confira os dados antes de enviar. Clique em qualquer campo para editar.
        </p>
      </div>

      <div className="review-form-name">
        <span className="review-form-badge">{schema.name}</span>
      </div>

      <div className="review-fields">
        {answeredFields.map((field) => (
          <div key={field.questionId} className="review-field">
            <span className="review-field-label">{field.question}</span>
            <span className="review-field-value">{field.value}</span>
          </div>
        ))}
        {answeredFields.length === 0 && (
          <div className="review-empty">Nenhum campo preenchido.</div>
        )}
      </div>

      <div className="review-actions">
        <button
          type="button"
          className="review-btn-back"
          onClick={goBack}
          disabled={isSubmitting}
        >
          ← Voltar
        </button>
        <button
          type="button"
          className="review-btn-edit"
          onClick={() => setStep(2 as WizardStep)}
          disabled={isSubmitting}
        >
          ✏️ Editar
        </button>
        <button
          type="button"
          className="review-btn-submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : '✅ Abrir Chamado'}
        </button>
      </div>

      <style jsx>{`
        .review-step {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .review-header {
          text-align: center;
        }

        .review-title {
          font-size: 22px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .review-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          margin: 4px 0 0;
        }

        .review-form-name {
          display: flex;
          justify-content: center;
        }

        .review-form-badge {
          padding: 6px 16px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          color: #818cf8;
          font-size: 13px;
          font-weight: 500;
        }

        .review-fields {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
        }

        .review-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .review-field:last-child {
          border-bottom: none;
        }

        .review-field-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          flex-shrink: 0;
          margin-right: 16px;
        }

        .review-field-value {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          text-align: right;
          word-break: break-word;
        }

        .review-empty {
          padding: 32px;
          text-align: center;
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
        }

        .review-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          padding-top: 8px;
        }

        .review-btn-back, .review-btn-edit {
          padding: 12px 20px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .review-btn-back:hover, .review-btn-edit:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .review-btn-submit {
          padding: 12px 32px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .review-btn-submit:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        .review-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/** Resolve valor para exibição: IDs de dropdown → nome legível */
function resolveDisplayValue(question: FormQuestion, val: unknown): string {
  if (val == null) return '—';
  if (val instanceof File) return `📎 ${val.name}`;
  if (Array.isArray(val)) return val.join(', ');

  // Para dropdown/glpiselect, resolve o ID para o nome
  if (
    (question.fieldtype === 'dropdown' || question.fieldtype === 'glpiselect') &&
    question.resolvedOptions
  ) {
    const id = Number(val);
    const opt = question.resolvedOptions.find((o) => o.id === id);
    if (opt) return opt.completename ?? opt.name;
  }

  // Para urgência, exibe o label
  if (question.fieldtype === 'urgency') {
    const urgencyLabels: Record<number, string> = {
      1: 'Muito baixa', 2: 'Baixa', 3: 'Média', 4: 'Alta', 5: 'Muito alta',
    };
    return urgencyLabels[Number(val)] ?? String(val);
  }

  return String(val);
}
