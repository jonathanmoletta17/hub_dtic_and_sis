// ═══════════════════════════════════════════════════════════════════
// Wizard Store — Estado global do fluxo "Novo Chamado"
// ═══════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { FormSchema, WizardStep, FormAnswers } from '@/types/form-schema';

interface WizardState {
  /** Step atual do wizard (1-4) */
  currentStep: WizardStep;
  /** ID do formulário selecionado */
  selectedFormId: number | null;
  /** Schema JSON carregado do backend */
  schema: FormSchema | null;
  /** Se o schema está sendo carregado */
  isLoadingSchema: boolean;
  /** Respostas do usuário: chave = "q_{questionId}" */
  answers: FormAnswers;
  /** Se o formulário está sendo submetido */
  isSubmitting: boolean;
  /** Erro de submit, se houver */
  submitError: string | null;

  // === Actions ===

  /** Define o step atual */
  setStep: (step: WizardStep) => void;
  /** Avança para o próximo step (max 4) */
  goNext: () => void;
  /** Volta para o step anterior (min 1) */
  goBack: () => void;
  /** Seleciona um serviço e carrega o schema (chamado no Step 1) */
  selectForm: (formId: number) => void;
  /** Define o schema carregado do backend */
  setSchema: (schema: FormSchema) => void;
  /** Define o estado de loading do schema */
  setLoadingSchema: (loading: boolean) => void;
  /** Atualiza uma resposta específica */
  setAnswer: (questionId: number, value: FormAnswers[string]) => void;
  /** Atualiza múltiplas respostas de uma vez */
  setAnswers: (answers: FormAnswers) => void;
  /** Define estado de submissão */
  setSubmitting: (submitting: boolean) => void;
  /** Define erro de submit */
  setSubmitError: (error: string | null) => void;
  /** Reseta o wizard para o estado inicial */
  reset: () => void;
}

const initialState = {
  currentStep: 1 as WizardStep,
  selectedFormId: null,
  schema: null,
  isLoadingSchema: false,
  answers: {},
  isSubmitting: false,
  submitError: null,
};

export const useWizardStore = create<WizardState>()((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  goNext: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, 4) as WizardStep,
    })),

  goBack: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1) as WizardStep,
    })),

  selectForm: (formId) =>
    set({
      selectedFormId: formId,
      schema: null,
      isLoadingSchema: true,
      answers: {},
      currentStep: 2 as WizardStep,
    }),

  setSchema: (schema) =>
    set({ schema, isLoadingSchema: false }),

  setLoadingSchema: (loading) =>
    set({ isLoadingSchema: loading }),

  setAnswer: (questionId, value) =>
    set((state) => ({
      answers: { ...state.answers, [`q_${questionId}`]: value },
    })),

  setAnswers: (answers) =>
    set((state) => ({
      answers: { ...state.answers, ...answers },
    })),

  setSubmitting: (submitting) =>
    set({ isSubmitting: submitting }),

  setSubmitError: (error) =>
    set({ submitError: error }),

  reset: () => set(initialState),
}));
