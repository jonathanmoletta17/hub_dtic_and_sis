// ═══════════════════════════════════════════════════════════════════
// Schema Generator — Converte JSON dinâmico → Zod schema
// ═══════════════════════════════════════════════════════════════════

import { z } from 'zod';
import type {
  FormQuestion,
  FormSection,
  FormCondition,
  FormAnswers,
} from '@/types/form-schema';

/**
 * Avalia se uma lista de condições é verdadeira dado o estado atual das respostas.
 * Suporta operadores == e !=, combinados com AND/OR.
 */
export function evaluateConditions(
  conditions: FormCondition[],
  answers: FormAnswers
): boolean {
  if (conditions.length === 0) return true;

  return conditions.reduce<boolean>((result, condition, index) => {
    const answer = String(answers[`q_${condition.questionId}`] ?? '');
    const match =
      condition.operator === '=='
        ? answer === condition.value
        : answer !== condition.value;

    if (index === 0) return match;
    return condition.logic === 'AND' ? result && match : result || match;
  }, true);
}

/**
 * Gera um mapa de visibilidade para todas as seções e questions de um form,
 * dado o estado atual das respostas.
 *
 * @returns Map<"section_{id}" | "question_{id}", boolean>
 */
export function buildVisibilityMap(
  sections: FormSection[],
  answers: FormAnswers
): Map<string, boolean> {
  const map = new Map<string, boolean>();

  for (const section of sections) {
    const sectionVisible =
      section.showRule === 'always' ||
      evaluateConditions(section.conditions, answers);

    map.set(`section_${section.id}`, sectionVisible);

    for (const question of section.questions) {
      // Question invisível se a seção-pai for invisível
      if (!sectionVisible) {
        map.set(`question_${question.id}`, false);
        continue;
      }

      const questionVisible =
        question.showRule === 'always' ||
        evaluateConditions(question.conditions, answers);

      map.set(`question_${question.id}`, questionVisible);
    }
  }

  return map;
}

/**
 * Gera um schema Zod dinâmico baseado nas questions visíveis.
 * Campos invisíveis são excluídos da validação.
 * Campos obrigatórios usam `.min(1, ...)`.
 */
export function generateZodSchema(
  sections: FormSection[],
  visibilityMap: Map<string, boolean>
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of sections) {
    if (!visibilityMap.get(`section_${section.id}`)) continue;

    for (const question of section.questions) {
      if (!visibilityMap.get(`question_${question.id}`)) continue;

      const key = `q_${question.id}`;
      let field = buildFieldSchema(question);

      if (!question.required) {
        field = field.optional() as z.ZodTypeAny;
      }

      shape[key] = field;
    }
  }

  return z.object(shape);
}

/**
 * Cria o schema Zod para um campo individual baseado no seu fieldtype.
 */
function buildFieldSchema(question: FormQuestion): z.ZodTypeAny {
  const requiredMsg = `"${question.name}" é obrigatório`;

  switch (question.fieldtype) {
    case 'text':
    case 'textarea':
      return question.required
        ? z.string().min(1, requiredMsg)
        : z.string();

    case 'integer':
      return question.required
        ? z.coerce.number().int()
        : z.coerce.number().int().optional();

    case 'select':
    case 'radios':
      return question.required
        ? z.string().min(1, requiredMsg)
        : z.string();

    case 'multiselect':
      return question.required
        ? z.array(z.string()).min(1, requiredMsg)
        : z.array(z.string());

    case 'dropdown':
    case 'glpiselect':
      // Dropdown/glpiselect retorna o ID numérico da opção selecionada
      return question.required
        ? z.coerce.number().positive(requiredMsg)
        : z.coerce.number().optional();

    case 'urgency':
      return question.required
        ? z.coerce.number().min(1).max(5)
        : z.coerce.number().min(1).max(5).optional();

    case 'file':
      // File é tratado separadamente no submit (FormData)
      return z.any();

    default:
      return z.any();
  }
}
