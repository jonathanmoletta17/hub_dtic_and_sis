// ═══════════════════════════════════════════════════════════════════
// Tipos — Formulários Dinâmicos SIS (Contrato com Backend Formcreator)
// ═══════════════════════════════════════════════════════════════════

/**
 * Tipos de campo suportados pelo Formcreator.
 * Cada tipo mapeia para um componente React específico.
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'select'
  | 'radios'
  | 'multiselect'
  | 'dropdown'
  | 'glpiselect'
  | 'file'
  | 'urgency';

/**
 * Operador de comparação para condições de visibilidade.
 * 1 = igual (==), 2 = diferente (!=)
 */
export type ConditionOperator = '==' | '!=';

/**
 * Lógica de combinação entre múltiplas condições.
 * 1 = AND, 2 = OR
 */
export type ConditionLogic = 'AND' | 'OR';

// --- Condições de Visibilidade ---

export interface FormCondition {
  /** ID da question que é o gatilho */
  questionId: number;
  /** Operador de comparação */
  operator: ConditionOperator;
  /** Valor esperado para a condição ser verdadeira */
  value: string;
  /** Lógica de combinação com a próxima condição */
  logic: ConditionLogic;
}

// --- Opções de Dropdown (Árvore resolvida) ---

export interface DropdownOption {
  id: number;
  name: string;
  completename?: string;
  children?: DropdownOption[];
}

// --- Question (Campo do formulário) ---

export interface FormQuestion {
  id: number;
  name: string;
  fieldtype: FieldType;
  required: boolean;
  row: number;
  /** Coluna no grid (0-based, grid de 4 colunas) */
  col: number;
  /** Largura em colunas do grid (1-4, padrão 4 = full width) */
  width: number;
  /** Opções estáticas (para select, radios, multiselect) */
  options?: string[];
  /** Valor padrão */
  defaultValue?: string;
  /** Tipo de entidade GLPI (Location, ITILCategory, User, Entity, Ticket) */
  itemtype?: string;
  /** Configuração de árvore para dropdowns */
  treeConfig?: {
    rootId: number;
    depth: number;
  };
  /** Opções pré-resolvidas da árvore (para dropdown/glpiselect) */
  resolvedOptions?: DropdownOption[];
  /** Regra de exibição: 'always' = sempre visível, 'conditional' = depende de condições */
  showRule: 'always' | 'conditional';
  /** Condições de visibilidade (quando showRule === 'conditional') */
  conditions: FormCondition[];
}

// --- Section (Agrupamento de campos) ---

export interface FormSection {
  id: number;
  name: string;
  order: number;
  showRule: 'always' | 'conditional';
  conditions: FormCondition[];
  questions: FormQuestion[];
}

// --- Form Schema (Raiz do contrato) ---

export interface FormSchema {
  id: number;
  name: string;
  category: string | null;
  accessRights: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  sections: FormSection[];
}

// --- Catálogo de Serviços (Step 1 do Wizard) ---

export interface ServiceGroup {
  id: string;
  label: string;
  icon: string;
  services: ServiceItem[];
}

export interface ServiceItem {
  formId: number;
  name: string;
  description?: string;
  icon?: string;
  /** Se true, só aparece para técnicos/gestores */
  techOnly: boolean;
}

// --- Wizard State Types ---

export type WizardStep = 1 | 2 | 3 | 4;

export interface FormAnswers {
  [questionId: string]: string | number | string[] | File | null;
}

export interface FormDraft {
  formId: number;
  answers: FormAnswers;
  currentStep: WizardStep;
  savedAt: number;
}

// --- Target (destino do ticket gerado) ---

export interface FormTarget {
  id: number;
  name: string;
  categoryRule: 'NONE' | 'SPECIFIC' | 'FROM_FORM' | 'LAST_ANSWER';
  categoryQuestionId?: number;
  locationRule: 'NONE' | 'SPECIFIC' | 'FROM_FORM' | 'LAST_ANSWER';
  locationQuestionId?: number;
  destinationEntity: number;
}

// --- Resposta do backend: lista de formulários disponíveis ---

export interface FormListResponse {
  forms: FormSchema[];
  serviceGroups: ServiceGroup[];
}
