import type {
  ApiFormConditionDto,
  ApiFormQuestionDto,
  ApiFormSchemaDto,
  ApiFormSectionDto,
  ServiceCategoryDto,
  ServiceFormDto,
} from "../contracts/formcreator";
import type { LookupSource } from "../contracts/lookups";
import type { CatalogGroup, CatalogItem } from "../models/formcreator";
import type { LookupOption } from "../models/lookups";
import type { DropdownOption, FormCondition, FormQuestion, FormSchema, FormSection } from "@/types/form-schema";

const SHOW_CONDITION_MAP: Record<number, "==" | "!="> = { 1: "==", 2: "!=" };
const SHOW_LOGIC_MAP: Record<number, "AND" | "OR"> = { 1: "AND", 2: "OR" };

const SERVICE_ICON_MAP: Record<string, string> = {
  "ar-condicionado": "❄️",
  "ar condicionado": "❄️",
  "elétrica": "⚡",
  eletrica: "⚡",
  elevadores: "🛗",
  elevador: "🛗",
  "hidráulica": "🚿",
  hidraulica: "🚿",
  marcenaria: "🪵",
  pedreiro: "🧱",
  pintura: "🎨",
  "técnico de redes": "🌐",
  "tecnico de redes": "🌐",
  "vidraçaria": "🪟",
  vidracaria: "🪟",
  carregadores: "🔋",
  copa: "☕",
  jardinagem: "🌿",
  limpeza: "🧽",
  mensageria: "📨",
  checklist: "✅",
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  "manutenção": "🔧",
  manutencao: "🔧",
  "manutenção > manutenção": "🔧",
  "conservação": "🧹",
  conservacao: "🧹",
  "conservação > conservação": "🧹",
  checklists: "📋",
  checklist: "📋",
};

export interface LookupRequestSpec {
  key: string;
  source: LookupSource;
  treeRoot?: number;
}

type LookupCache = Record<string, LookupOption[]>;

function getServiceIcon(name: string): string {
  return SERVICE_ICON_MAP[name.toLowerCase().trim()] ?? "📋";
}

function getCategoryIcon(name: string): string {
  return CATEGORY_ICON_MAP[name.toLowerCase().trim()] ?? "📁";
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const raw = value.trim();
  if (!raw || (raw[0] !== "[" && raw[0] !== "{")) {
    return value;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return value;
  }
}

function toLookupKey(source: LookupSource, treeRoot?: number): string {
  return `${source}:${treeRoot ?? 0}`;
}

function normalizeCatalogName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toCatalogKey(categoryId: number, name: string): string {
  return `${categoryId}:${normalizeCatalogName(name)}`;
}

/**
 * Mapa canônico definido a partir de uso real no GLPI (B4).
 * Somente chaves explicitamente listadas serão deduplicadas.
 */
const CANONICAL_FORM_IDS_BY_KEY: Record<string, number> = {
  "1:ar-condicionado": 1,
  "1:carregadores": 3,
  "1:copa": 4,
  "1:elevadores": 2,
  "1:eletrica": 5,
  "1:hidraulica": 6,
  "1:jardinagem": 7,
  "1:limpeza": 8,
  "1:marcenaria": 9,
  "1:mensageria": 10,
  "1:pedreiro": 11,
  "1:pintura": 12,
  "1:tecnico de redes": 13,
  "1:vidracaria": 14,
};

/**
 * Casos explicitamente mantidos com múltiplos IDs por diferença de schema/regra.
 */
const KEEP_ALL_DUPLICATES_BY_KEY = new Set<string>([
  "1:projeto",
]);

function mapCatalogItem(dto: ServiceFormDto, duplicateCount: number): CatalogItem {
  const lowerName = dto.name.toLowerCase();
  const displayName = duplicateCount > 1 ? `${dto.name} (ID ${dto.id})` : dto.name;
  return {
    formId: dto.id,
    name: displayName,
    description: dto.description ?? undefined,
    icon: getServiceIcon(dto.name),
    categoryId: dto.category_id,
    techOnly: lowerName.includes("checklist") || lowerName.includes("inspeção") || lowerName.includes("inspecao"),
  };
}

export function mapServiceCatalog(categories: ServiceCategoryDto[], forms: ServiceFormDto[]): CatalogGroup[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const groupedByName = new Map<string, CatalogItem[]>();
  const duplicateCountByFormKey = new Map<string, number>();

  for (const form of forms) {
    const key = toCatalogKey(form.category_id, form.name);
    duplicateCountByFormKey.set(key, (duplicateCountByFormKey.get(key) ?? 0) + 1);
  }

  for (const form of forms) {
    const duplicateKey = toCatalogKey(form.category_id, form.name);
    const duplicateCount = duplicateCountByFormKey.get(duplicateKey) ?? 1;
    const hasDuplicates = duplicateCount > 1;
    const keepAllDuplicates = KEEP_ALL_DUPLICATES_BY_KEY.has(duplicateKey);
    const canonicalId = CANONICAL_FORM_IDS_BY_KEY[duplicateKey];

    // Deduplicação controlada apenas para pares canônicos conhecidos.
    if (hasDuplicates && !keepAllDuplicates && canonicalId != null && form.id !== canonicalId) {
      continue;
    }

    const category = categoryMap.get(form.category_id);
    const rawName = category?.completename ?? category?.name ?? `Categoria ${form.category_id}`;
    const parts = rawName.split(" > ");
    const cleanName = parts[parts.length - 1].trim();
    const items = groupedByName.get(cleanName) ?? [];
    const shouldDisambiguate = hasDuplicates && (keepAllDuplicates || canonicalId == null);
    const displayDuplicateCount = shouldDisambiguate ? duplicateCount : 1;
    items.push(mapCatalogItem(form, displayDuplicateCount));
    groupedByName.set(cleanName, items);
  }

  const groups: CatalogGroup[] = [];
  let groupId = 1;
  for (const [groupName, items] of groupedByName) {
    groups.push({
      id: groupId++,
      group: groupName,
      icon: getCategoryIcon(groupName),
      items: items.sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    });
  }

  return groups.sort((left, right) => {
    const leftChecklist = left.items.every((item) => item.techOnly);
    const rightChecklist = right.items.every((item) => item.techOnly);
    if (leftChecklist !== rightChecklist) {
      return leftChecklist ? 1 : -1;
    }
    return left.group.localeCompare(right.group, "pt-BR");
  });
}

export function collectLookupRequests(schema: ApiFormSchemaDto): LookupRequestSpec[] {
  const requests = new Map<string, LookupRequestSpec>();

  for (const section of schema.sections) {
    for (const question of section.questions) {
      const source = question.lookup?.source;
      if (source !== "locations" && source !== "itilcategories" && source !== "users") {
        continue;
      }
      const treeRoot = Number(question.lookup?.params?.show_tree_root) || 0;
      const key = toLookupKey(source, treeRoot || undefined);
      requests.set(key, {
        key,
        source,
        treeRoot: treeRoot || undefined,
      });
    }
  }

  return Array.from(requests.values());
}

function mapConditions(conditions: ApiFormConditionDto[], targetId: number): FormCondition[] {
  return conditions
    .filter((condition) => condition.target_itemtype === "PluginFormcreatorQuestion" && condition.target_items_id === targetId)
    .map((condition) => ({
      questionId: condition.controller_question_id,
      operator: SHOW_CONDITION_MAP[condition.show_condition] ?? "==",
      value: condition.show_value,
      logic: SHOW_LOGIC_MAP[condition.show_logic] ?? "AND",
    }));
}

function mapResolvedOptions(items: LookupOption[]): DropdownOption[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    completename: item.completename,
  }));
}

function mapQuestion(
  question: ApiFormQuestionDto,
  conditions: ApiFormConditionDto[],
  lookupCache: LookupCache,
): FormQuestion {
  const questionConditions = mapConditions(conditions, question.id);
  const parsedDefault = parseJson(question.default_value);

  let options: string[] | undefined;
  let resolvedOptions: DropdownOption[] | undefined;

  if (question.options) {
    options = question.options.map((option) => String(option.label));
  }

  const source = question.lookup?.source;
  if (source === "locations" || source === "itilcategories" || source === "users") {
    const treeRoot = Number(question.lookup?.params?.show_tree_root) || 0;
    resolvedOptions = mapResolvedOptions(lookupCache[toLookupKey(source, treeRoot || undefined)] ?? []);
  }

  return {
    id: question.id,
    name: question.name,
    fieldtype: question.fieldtype as FormQuestion["fieldtype"],
    required: question.required,
    row: question.layout?.row ?? 0,
    col: question.layout?.col ?? 0,
    width: question.layout?.width ?? 4,
    options,
    defaultValue: parsedDefault != null
      ? String(Array.isArray(parsedDefault) && (question.fieldtype === "select" || question.fieldtype === "radios")
        ? parsedDefault[0]
        : parsedDefault)
      : undefined,
    resolvedOptions,
    showRule: questionConditions.length > 0 ? "conditional" : "always",
    conditions: questionConditions,
  };
}

function mapSection(
  section: ApiFormSectionDto,
  conditions: ApiFormConditionDto[],
  lookupCache: LookupCache,
): FormSection {
  return {
    id: section.id,
    name: section.name,
    order: section.order,
    showRule: (section.show_rule ?? 0) > 1 ? "conditional" : "always",
    conditions: [],
    questions: section.questions.map((question) => mapQuestion(question, conditions, lookupCache)),
  };
}

export function mapFormSchemaDto(schema: ApiFormSchemaDto, lookupCache: LookupCache): FormSchema {
  return {
    id: Number(schema.form.id ?? 0),
    name: String(schema.form.name ?? ""),
    category: schema.form.plugin_formcreator_categories_id != null
      ? String(schema.form.plugin_formcreator_categories_id)
      : null,
    accessRights: Number(schema.form.access_rights ?? 0) === 0 ? "PRIVATE" : "PUBLIC",
    sections: schema.sections.map((section) => mapSection(section, schema.conditions, lookupCache)),
  };
}
