'use client';

// ═══════════════════════════════════════════════════════════════════
// DynamicFormRenderer — Renderizador genérico de formulários
// Recebe schema + answers, renderiza seções e fields com condições.
// ═══════════════════════════════════════════════════════════════════

import { useConditionEngine } from '@/hooks/useConditionEngine';
import type { FormSchema, FormAnswers } from '@/types/form-schema';
import { FormSection } from './FormSection';

interface DynamicFormRendererProps {
  schema: FormSchema;
  answers: FormAnswers;
  onAnswer: (questionId: number, value: FormAnswers[string]) => void;
  errors: Record<string, string>;
}

export function DynamicFormRenderer({
  schema,
  answers,
  onAnswer,
  errors,
}: DynamicFormRendererProps) {
  const { isVisible } = useConditionEngine(schema.sections, answers);

  return (
    <div className="dynamic-form">
      {schema.sections.map((section) => (
        <FormSection
          key={section.id}
          section={section}
          visible={isVisible('section', section.id)}
          answers={answers}
          onAnswer={onAnswer}
          errors={errors}
          isQuestionVisible={(qId) => isVisible('question', qId)}
        />
      ))}

      <style jsx>{`
        .dynamic-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
      `}</style>
    </div>
  );
}
