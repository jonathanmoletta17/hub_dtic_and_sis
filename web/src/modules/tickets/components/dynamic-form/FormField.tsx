'use client';

// ═══════════════════════════════════════════════════════════════════
// FormField — Factory que instancia o input correto pelo fieldtype
// ═══════════════════════════════════════════════════════════════════

import type { FormQuestion, FormAnswers } from '@/types/form-schema';
import { TextInput } from '../inputs/TextInput';
import { TextArea } from '../inputs/TextArea';
import { SelectInput } from '../inputs/SelectInput';
import { RadioInput } from '../inputs/RadioInput';
import { DropdownTree } from '../inputs/DropdownTree';
import { FileUpload } from '../inputs/FileUpload';
import { UrgencyPicker } from '../inputs/UrgencyPicker';

interface FormFieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (questionId: number, value: FormAnswers[string]) => void;
  error?: string;
}

const FIELD_MAP: Record<string, React.ComponentType<{
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}>> = {
  text: TextInput,
  integer: TextInput,
  textarea: TextArea,
  select: SelectInput,
  radios: RadioInput,
  multiselect: SelectInput, // TODO: MultiSelectInput dedicado
  dropdown: DropdownTree,
  glpiselect: DropdownTree, // TODO: AsyncSelect dedicado
  file: FileUpload,
  urgency: UrgencyPicker,
};

export function FormField({ question, value, onChange, error }: FormFieldProps) {
  const Component = FIELD_MAP[question.fieldtype];

  if (!Component) {
    return (
      <div className="field-wrapper">
        <label className="field-label">{question.name}</label>
        <div className="field-unsupported">
          Tipo de campo não suportado: <code>{question.fieldtype}</code>
        </div>
      </div>
    );
  }

  return (
    <Component
      question={question}
      value={value}
      onChange={(val) => onChange(question.id, val)}
      error={error}
    />
  );
}
