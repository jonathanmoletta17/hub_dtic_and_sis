'use client';

// ═══════════════════════════════════════════════════════════════════
// useConditionEngine — Hook reativo de visibilidade
// Reavalia quais seções/questions estão visíveis a cada mudança.
// ═══════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { buildVisibilityMap } from '@/utils/schema-generator';
import type { FormSection, FormAnswers } from '@/types/form-schema';

/**
 * Hook que retorna um mapa de visibilidade reativo.
 * Recalcula automaticamente quando `answers` muda.
 *
 * @example
 * const { isVisible } = useConditionEngine(schema.sections, answers);
 * if (isVisible('section', 145)) { ... }
 * if (isVisible('question', 576)) { ... }
 */
export function useConditionEngine(
  sections: FormSection[],
  answers: FormAnswers
) {
  const visibilityMap = useMemo(
    () => buildVisibilityMap(sections, answers),
    [sections, answers]
  );

  const isVisible = (type: 'section' | 'question', id: number): boolean => {
    return visibilityMap.get(`${type}_${id}`) ?? true;
  };

  const visibleQuestionCount = useMemo(() => {
    let count = 0;
    visibilityMap.forEach((visible, key) => {
      if (key.startsWith('question_') && visible) count++;
    });
    return count;
  }, [visibilityMap]);

  return { visibilityMap, isVisible, visibleQuestionCount };
}
