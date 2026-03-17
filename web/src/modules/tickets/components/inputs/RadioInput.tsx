'use client';

import type { FormQuestion, FormAnswers } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

export function RadioInput({ question, value, onChange, error }: FieldProps) {
  const options = question.options ?? [];
  const selected = String(value ?? '');

  return (
    <div className="field-wrapper">
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>
      <div className="field-radio-group">
        {options.map((opt) => (
          <label
            key={opt}
            className={`field-radio-option ${selected === opt ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name={`q_${question.id}`}
              value={opt}
              checked={selected === opt}
              onChange={() => onChange(opt)}
              className="field-radio-input"
            />
            <span className="field-radio-dot" />
            <span className="field-radio-label">{opt}</span>
          </label>
        ))}
      </div>
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
