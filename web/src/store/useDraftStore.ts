// ═══════════════════════════════════════════════════════════════════
// Draft Store — Auto-save de formulários em progresso (localStorage)
// ═══════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FormDraft, FormAnswers, WizardStep } from '@/types/form-schema';

interface DraftState {
  /** Rascunhos salvos por formId */
  drafts: Record<string, FormDraft>;

  /**
   * Salva um rascunho do formulário.
   * Chamado automaticamente a cada 30s ou a cada mudança de step.
   */
  saveDraft: (formId: number, answers: FormAnswers, currentStep: WizardStep) => void;

  /**
   * Carrega um rascunho salvo (se existir).
   * Retorna null se não houver rascunho para o formId.
   */
  loadDraft: (formId: number) => FormDraft | null;

  /**
   * Remove o rascunho após submit com sucesso.
   */
  clearDraft: (formId: number) => void;

  /**
   * Verifica se existe rascunho para um formId.
   */
  hasDraft: (formId: number) => boolean;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (formId, answers, currentStep) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [String(formId)]: {
              formId,
              answers,
              currentStep,
              savedAt: Date.now(),
            },
          },
        })),

      loadDraft: (formId) => {
        const draft = get().drafts[String(formId)];
        if (!draft) return null;

        // Rascunhos com mais de 24h são descartados
        const MAX_AGE_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - draft.savedAt > MAX_AGE_MS) {
          get().clearDraft(formId);
          return null;
        }

        return draft;
      },

      clearDraft: (formId) =>
        set((state) => {
          const { [String(formId)]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),

      hasDraft: (formId) => {
        const draft = get().drafts[String(formId)];
        if (!draft) return false;
        const MAX_AGE_MS = 24 * 60 * 60 * 1000;
        return Date.now() - draft.savedAt <= MAX_AGE_MS;
      },
    }),
    {
      name: 'sis-form-drafts',
    }
  )
);
