export interface ServiceCategoryDto {
  id: number;
  name: string;
  parent_id: number;
  level: number;
  completename?: string;
}

export interface ServiceFormDto {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  icon?: string;
  icon_color?: string;
  background_color?: string;
}

export interface FormOptionDto {
  label: string;
  value: string | number;
}

export interface FormLookupRefDto {
  source: string;
  params: Record<string, unknown>;
}

export interface ApiFormQuestionDto {
  id: number;
  name: string;
  fieldtype: string;
  required: boolean;
  description?: string;
  default_value?: unknown;
  options?: FormOptionDto[];
  lookup?: FormLookupRefDto;
  layout: { row: number; col: number; width: number };
  show_rule?: number;
}

export interface ApiFormSectionDto {
  id: number;
  name: string;
  order: number;
  questions: ApiFormQuestionDto[];
  show_rule?: number;
}

export interface ApiFormConditionDto {
  id: number;
  controller_question_id: number;
  target_itemtype: string;
  target_items_id: number;
  show_condition: number;
  show_logic: number;
  show_value: string;
  order: number;
}

export interface ApiFormSchemaDto {
  form: Record<string, unknown>;
  sections: ApiFormSectionDto[];
  conditions: ApiFormConditionDto[];
  regexes: Record<string, unknown>[];
  ranges: Record<string, unknown>[];
}

export interface SubmitFormResponseDto {
  form_answer_id: number;
  message: string;
  ticket_ids: number[];
}
