'use client';

import { useRef } from 'react';
import type { FormQuestion, FormAnswers } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

export function FileUpload({ question, value, onChange, error }: FieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const file = value instanceof File ? value : null;

  return (
    <div className="field-wrapper">
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>
      <div
        className={`field-file-dropzone ${error ? 'field-error' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onChange(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="field-file-hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(f);
          }}
        />
        {file ? (
          <div className="field-file-info">
            <span className="field-file-name">{file.name}</span>
            <span className="field-file-size">
              {(file.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              className="field-file-remove"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="field-file-placeholder">
            <span className="field-file-icon">📎</span>
            <span>Clique ou arraste um arquivo</span>
          </div>
        )}
      </div>
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
