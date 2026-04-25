'use client';

import type { FormQuestion, FormAnswers } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

const URGENCY_LEVELS = [
  { value: 5, label: 'Muito alta', color: '#ef4444', icon: '⚫' },
  { value: 4, label: 'Alta', color: '#f97316', icon: '🔴' },
  { value: 3, label: 'Média', color: '#eab308', icon: '🟡' },
  { value: 2, label: 'Baixa', color: '#22c55e', icon: '🟢' },
  { value: 1, label: 'Muito baixa', color: '#6b7280', icon: '⚪' },
];

export function UrgencyPicker({ question, value, onChange, error }: FieldProps) {
  const selected = Number(value ?? 0);

  return (
    <div className="field-wrapper">
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>
      <div className="field-urgency-group">
        {URGENCY_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            className={`field-urgency-btn ${selected === level.value ? 'selected' : ''}`}
            onClick={() => onChange(level.value)}
            style={{
              borderColor: selected === level.value ? level.color : undefined,
              background: selected === level.value ? `${level.color}15` : undefined,
            }}
          >
            <span className="field-urgency-icon">{level.icon}</span>
            <span className="field-urgency-label">{level.label}</span>
          </button>
        ))}
      </div>
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
