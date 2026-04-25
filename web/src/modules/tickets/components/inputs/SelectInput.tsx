'use client';

import type { FormQuestion, FormAnswers } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

export function SelectInput({ question, value, onChange, error }: FieldProps) {
  const options = question.options ?? [];

  return (
    <div className="field-wrapper">
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>
      <select
        className={`field-select ${error ? 'field-error' : ''}`}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
