import { apiGet, apiPost, buildApiPath, withQuery } from "./client";
import type {
  ApiFormSchemaDto,
  ServiceCategoryDto,
  ServiceFormDto,
  SubmitFormResponseDto,
} from "./contracts/formcreator";
import type { LookupSource } from "./contracts/lookups";
import {
  collectLookupRequests,
  mapFormSchemaDto,
  mapServiceCatalog,
} from "./mappers/formcreator";
import type { CatalogGroup } from "./models/formcreator";
import { fetchLookupItems as fetchLookupOptions } from "./lookupService";
import type { FormSchema } from "@/types/form-schema";
import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";

export type { CatalogGroup, CatalogItem } from "./models/formcreator";

async function fetchFormCategoriesDto(context: string): Promise<ServiceCategoryDto[]> {
  return apiGet<ServiceCategoryDto[]>(buildApiPath(context, "domain/formcreator/categories"));
}

async function fetchFormListDto(context: string, categoryId?: number): Promise<ServiceFormDto[]> {
  return apiGet<ServiceFormDto[]>(
    withQuery(buildApiPath(context, "domain/formcreator/forms"), { category_id: categoryId }),
  );
}

async function fetchFormSchemaDto(context: string, formId: number): Promise<ApiFormSchemaDto> {
  return apiGet<ApiFormSchemaDto>(buildApiPath(context, `domain/formcreator/forms/${formId}/schema`));
}

export async function fetchServiceCatalog(context: string): Promise<CatalogGroup[]> {
  const [categories, forms] = await Promise.all([
    fetchFormCategoriesDto(context),
    fetchFormListDto(context),
  ]);
  return mapServiceCatalog(categories, forms);
}

export async function fetchResolvedFormSchema(context: string, formId: number): Promise<FormSchema> {
  const schema = await fetchFormSchemaDto(context, formId);
  const lookupRequests = collectLookupRequests(schema);
  const lookupEntries = await Promise.all(
    lookupRequests.map(async (request) => [
      request.key,
      await fetchLookupOptions(context, request.source as LookupSource, request.treeRoot),
    ] as const),
  );

  const lookupCache = Object.fromEntries(lookupEntries);
  return mapFormSchemaDto(schema, lookupCache);
}

export function submitFormAnswers(
  context: string,
  formId: number,
  answers: Record<string, unknown>,
): Promise<SubmitFormResponseDto> {
  return apiPost<SubmitFormResponseDto, { answers: Record<string, unknown> }>(
    buildApiPath(context, `domain/formcreator/forms/${formId}/submit`),
    { answers },
  ).then((response) => {
    publishLiveDataEvent({
      context,
      domains: ["tickets", "dashboard", "analytics", "search", "user", "chargers"],
      source: "mutation",
      reason: "form-submit",
    });
    return response;
  });
}
