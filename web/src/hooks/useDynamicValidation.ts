'use client';

// ═══════════════════════════════════════════════════════════════════
// useDynamicValidation — Gera zodResolver dinâmico que muda com o form
// Integra useConditionEngine + generateZodSchema + react-hook-form.
// ═══════════════════════════════════════════════════════════════════

import { useMemo, useCallback } from 'react';
import { z } from 'zod';
import type { FormSection, FormAnswers } from '@/types/form-schema';
import { buildVisibilityMap, generateZodSchema } from '@/utils/schema-generator';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Hook que valida o estado atual do formulário contra o schema Zod dinâmico.
 * Recalcula a cada mudança de answers ou visibilidade.
 *
 * @returns validate() — função que retorna isValid + mapa de erros por campo
 */
export function useDynamicValidation(
  sections: FormSection[],
  answers: FormAnswers
) {
  const visibilityMap = useMemo(
    () => buildVisibilityMap(sections, answers),
    [sections, answers]
  );

  const zodSchema = useMemo(
    () => generateZodSchema(sections, visibilityMap),
    [sections, visibilityMap]
  );

  const validate = useCallback((): ValidationResult => {
    const result = zodSchema.safeParse(answers);

    if (result.success) {
      return { isValid: true, errors: {} };
    }

    const errors: Record<string, string> = {};
    if (result.error instanceof z.ZodError) {
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path) {
          errors[String(path)] = issue.message;
        }
      }
    }

    return { isValid: false, errors };
  }, [zodSchema, answers]);

  return { validate, zodSchema, visibilityMap };
}
