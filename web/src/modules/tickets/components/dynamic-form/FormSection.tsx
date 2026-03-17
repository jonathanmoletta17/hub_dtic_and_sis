'use client';

// ═══════════════════════════════════════════════════════════════════
// FormSection — Grid layout multi-coluna + visibilidade condicional
// ═══════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FormSection as FormSectionType, FormAnswers, FormQuestion } from '@/types/form-schema';
import { FormField } from './FormField';

interface FormSectionProps {
  section: FormSectionType;
  visible: boolean;
  answers: FormAnswers;
  onAnswer: (questionId: number, value: FormAnswers[string]) => void;
  errors: Record<string, string>;
  isQuestionVisible: (questionId: number) => boolean;
}

/** Agrupa questions por row para renderizar em grid */
function groupByRow(questions: FormQuestion[]): Map<number, FormQuestion[]> {
  const map = new Map<number, FormQuestion[]>();
  for (const q of questions) {
    const row = q.row ?? 0;
    const existing = map.get(row) ?? [];
    existing.push(q);
    map.set(row, existing);
  }
  return map;
}

export function FormSection({
  section,
  visible,
  answers,
  onAnswer,
  errors,
  isQuestionVisible,
}: FormSectionProps) {
  const rowGroups = useMemo(() => groupByRow(section.questions), [section.questions]);
  const sortedRows = useMemo(() => 
    Array.from(rowGroups.entries()).sort(([a], [b]) => a - b),
    [rowGroups]
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="form-section"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <h3 className="form-section-title">{section.name}</h3>
          <div className="form-section-fields">
            {sortedRows.map(([row, questions]) => {
              // Verifica se alguma question nesta row está visível
              const visibleQs = questions.filter(q => isQuestionVisible(q.id));
              if (visibleQs.length === 0) return null;

              return (
                <div key={row} className="form-row">
                  {questions.map((question) => (
                    <AnimatePresence key={question.id}>
                      {isQuestionVisible(question.id) && (
                        <motion.div
                          className="form-cell"
                          style={{
                            gridColumn: `${question.col + 1} / span ${question.width}`,
                          }}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField
                            question={question}
                            value={answers[`q_${question.id}`]}
                            onChange={onAnswer}
                            error={errors[`q_${question.id}`]}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ))}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
