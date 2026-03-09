'use client';

import type { FormQuestion, FormAnswers } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

export function TextInput({ question, value, onChange, error }: FieldProps) {
  return (
    <div className="field-wrapper">
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>
      <input
        type={question.fieldtype === 'integer' ? 'number' : 'text'}
        className={`field-input ${error ? 'field-error' : ''}`}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Informe ${question.name.toLowerCase()}`}
      />
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
