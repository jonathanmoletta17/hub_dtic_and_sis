'use client';

import type { FormQuestion, FormAnswers } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

export function TextArea({ question, value, onChange, error }: FieldProps) {
  const text = String(value ?? '');

  return (
    <div className="field-wrapper">
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>
      <textarea
        className={`field-textarea ${error ? 'field-error' : ''}`}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Descreva ${question.name.toLowerCase()}`}
        rows={4}
      />
      <div className="field-textarea-footer">
        <span className="field-char-count">{text.length} caracteres</span>
      </div>
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
