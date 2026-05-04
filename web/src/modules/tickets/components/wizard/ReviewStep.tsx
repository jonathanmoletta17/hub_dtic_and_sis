'use client';

import { submitFormAnswers } from '@/lib/api/formService';
import { useAuthStore } from '@/store/useAuthStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useWizardStore } from '@/store/useWizardStore';
import type { FormAnswers, FormQuestion, FormSchema, WizardStep } from '@/types/form-schema';
import { buildVisibilityMap } from '@/utils/schema-generator';

function isFileValue(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

interface FileAnswer {
  questionId: number;
  label: string;
  required: boolean;
  file: File;
}

export function formatAnswersForSubmit(answers: FormAnswers): Record<string, unknown> {
  const formattedAnswers: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (isFileValue(value)) {
      continue;
    }
    formattedAnswers[key.replace('q_', '')] = value;
  }

  return formattedAnswers;
}

export function collectFileAnswerLabels(
  schema: FormSchema,
  answers: FormAnswers,
  visibilityMap = buildVisibilityMap(schema.sections, answers),
): string[] {
  return collectFileAnswers(schema, answers, visibilityMap).map((answer) => answer.label);
}

export function collectFileAnswers(
  schema: FormSchema,
  answers: FormAnswers,
  visibilityMap = buildVisibilityMap(schema.sections, answers),
): FileAnswer[] {
  return schema.sections.flatMap((section) =>
    section.questions.flatMap((question) => {
      if (!visibilityMap.get(`question_${question.id}`)) {
        return [];
      }
      const value = answers[`q_${question.id}`];
      if (!isFileValue(value)) {
        return [];
      }
      return [
        {
          questionId: question.id,
          label: question.name,
          required: question.required,
          file: value,
        },
      ];
    }),
  );
}

export function filterVisibleAnswers(
  schema: FormSchema,
  answers: FormAnswers,
  visibilityMap = buildVisibilityMap(schema.sections, answers),
): FormAnswers {
  const visibleAnswers: FormAnswers = {};

  for (const section of schema.sections) {
    for (const question of section.questions) {
      const key = `q_${question.id}`;
      if (visibilityMap.get(`question_${question.id}`) && key in answers) {
        visibleAnswers[key] = answers[key];
      }
    }
  }

  return visibleAnswers;
}

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

  if (!schema) {
    return null;
  }

  const visibilityMap = buildVisibilityMap(schema.sections, answers);
  const visibleAnswers = filterVisibleAnswers(schema, answers, visibilityMap);
  const answeredFields = schema.sections.flatMap((section) =>
    section.questions
      .filter((question) => {
        const key = `q_${question.id}`;
        return visibleAnswers[key] != null && visibleAnswers[key] !== '';
      })
      .map((question) => ({
        section: section.name,
        question: question.name,
        value: resolveDisplayValue(question, visibleAnswers[`q_${question.id}`]),
        questionId: question.id,
      })),
  );

  const handleSubmit = async () => {
    if (!activeContext) {
      setSubmitError('Sessao expirada. Atualize a pagina antes de enviar.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!selectedFormId) {
        throw new Error('Formulario nao selecionado.');
      }

      const fileAnswers = collectFileAnswers(schema, visibleAnswers, visibilityMap);
      const requiredFileLabels = fileAnswers
        .filter((answer) => answer.required)
        .map((answer) => answer.label);
      if (requiredFileLabels.length > 0) {
        setSubmitError(
          `Este formulario usa arquivo obrigatorio nativo do FormCreator. Caso consolidado conhecido: DTIC / NOMEIA / EXONERA com TIPO "INGRESSO - ANEXO DE ARQUIVO DO RHE". Campo(s): ${requiredFileLabels.join(', ')}.`,
        );
        return;
      }

      const formattedAnswers = formatAnswersForSubmit(visibleAnswers);

      await submitFormAnswers(
        activeContext,
        selectedFormId,
        formattedAnswers,
        fileAnswers.map((answer) => ({ questionId: answer.questionId, file: answer.file })),
      );
      clearDraft(selectedFormId);
      reset();
    } catch (error) {
      setSubmitError(
        `Erro ao abrir chamado: ${
          error instanceof Error ? error.message : 'tente novamente em instantes.'
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-step">
      <div className="review-header">
        <div>
          <p className="review-eyebrow">Etapa final</p>
          <h2 className="review-title">Revisao do chamado</h2>
        </div>
        <p className="review-subtitle">
          Confira os dados antes do envio. Se precisar ajustar algo, volte uma etapa.
        </p>
      </div>

      <div className="review-form-name">
        <span className="review-form-badge">{schema.name}</span>
      </div>

      <div className="review-fields">
        {answeredFields.length > 0 ? (
          answeredFields.map((field) => (
            <div key={field.questionId} className="review-field">
              <div className="review-field-copy">
                <span className="review-field-section">{field.section}</span>
                <span className="review-field-label">{field.question}</span>
              </div>
              <span className="review-field-value">{field.value}</span>
            </div>
          ))
        ) : (
          <div className="review-empty">Nenhum campo preenchido.</div>
        )}
      </div>

      <div className="review-actions">
        <button
          type="button"
          className="review-btn review-btn-secondary"
          onClick={goBack}
          disabled={isSubmitting}
        >
          Voltar
        </button>
        <button
          type="button"
          className="review-btn review-btn-secondary"
          onClick={() => setStep(2 as WizardStep)}
          disabled={isSubmitting}
        >
          Editar respostas
        </button>
        <button
          type="button"
          className="review-btn review-btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Abrir chamado'}
        </button>
      </div>

      <style jsx>{`
        .review-step {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .review-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .review-eyebrow {
          margin: 0 0 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .review-title {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .review-subtitle {
          margin: 0;
          max-width: 48rem;
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-secondary);
        }

        .review-form-name {
          display: flex;
        }

        .review-form-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--accent-primary) 28%, var(--border-default));
          background: color-mix(in srgb, var(--accent-primary-subtle) 68%, var(--bg-surface) 32%);
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-primary);
        }

        .review-fields {
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          background: var(--bg-surface-alt);
        }

        .review-field {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .review-field:last-child {
          border-bottom: none;
        }

        .review-field-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .review-field-section {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .review-field-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .review-field-value {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-primary);
          word-break: break-word;
        }

        .review-empty {
          padding: 32px 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .review-actions {
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          padding-top: 4px;
        }

        .review-btn {
          width: 100%;
          border-radius: 14px;
          padding: 13px 16px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .review-btn:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .review-btn-secondary {
          border: 1px solid var(--border-default);
          background: var(--bg-surface-alt);
          color: var(--text-secondary);
        }

        .review-btn-secondary:hover:not(:disabled) {
          background: var(--card-bg-hover);
          color: var(--text-primary);
        }

        .review-btn-primary {
          border: none;
          background: linear-gradient(135deg, var(--status-solved), color-mix(in srgb, var(--status-solved) 70%, #065f46));
          color: var(--text-inverse);
          box-shadow: 0 10px 24px color-mix(in srgb, var(--status-solved) 22%, transparent);
        }

        .review-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px color-mix(in srgb, var(--status-solved) 30%, transparent);
        }

        @media (min-width: 768px) {
          .review-step {
            gap: 24px;
          }

          .review-title {
            font-size: 24px;
          }

          .review-field {
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
          }

          .review-field-copy {
            max-width: 18rem;
          }

          .review-field-value {
            max-width: min(32rem, 100%);
            text-align: right;
          }

          .review-actions {
            flex-direction: row;
            justify-content: flex-end;
          }

          .review-btn {
            width: auto;
            min-width: 170px;
          }
        }
      `}</style>
    </div>
  );
}

function resolveDisplayValue(question: FormQuestion, value: unknown): string {
  if (value == null) {
    return '-';
  }

  if (isFileValue(value)) {
    return `Arquivo: ${value.name}`;
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (
    (question.fieldtype === 'dropdown' || question.fieldtype === 'glpiselect') &&
    question.resolvedOptions
  ) {
    const optionId = Number(value);
    const option = question.resolvedOptions.find((item) => item.id === optionId);

    if (option) {
      return option.completename ?? option.name;
    }
  }

  if (question.fieldtype === 'urgency') {
    const urgencyLabels: Record<number, string> = {
      1: 'Muito baixa',
      2: 'Baixa',
      3: 'Media',
      4: 'Alta',
      5: 'Muito alta',
    };

    return urgencyLabels[Number(value)] ?? String(value);
  }

  return String(value);
}
