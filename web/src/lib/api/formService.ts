import { apiGet, apiPost, buildApiPath, withQuery } from "./client";
import { API_BASE, ApiError, normalizeApiPath } from "./httpClient";
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
import { useAuthStore } from "@/store/useAuthStore";

export type { CatalogGroup, CatalogItem } from "./models/formcreator";

export interface SubmitFormFileAnswer {
  questionId: number;
  file: File;
}

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
  fileAnswers: SubmitFormFileAnswer[] = [],
): Promise<SubmitFormResponseDto> {
  const submitPromise =
    fileAnswers.length > 0
      ? submitMultipartFormAnswers(context, formId, answers, fileAnswers)
      : apiPost<SubmitFormResponseDto, { answers: Record<string, unknown> }>(
          buildApiPath(context, `domain/formcreator/forms/${formId}/submit`),
          { answers },
        );

  return submitPromise.then((response) => {
    publishLiveDataEvent({
      context,
      domains: ["tickets", "dashboard", "analytics", "search", "user", "chargers"],
      source: "mutation",
      reason: "form-submit",
    });
    return response;
  });
}

async function submitMultipartFormAnswers(
  context: string,
  formId: number,
  answers: Record<string, unknown>,
  fileAnswers: SubmitFormFileAnswer[],
): Promise<SubmitFormResponseDto> {
  const body = new FormData();
  body.set("answers_json", JSON.stringify(answers));
  body.set(
    "file_question_ids_json",
    JSON.stringify(fileAnswers.map((answer) => answer.questionId)),
  );
  for (const answer of fileAnswers) {
    body.append("files", answer.file, answer.file.name);
  }

  return postFormData<SubmitFormResponseDto>(
    context,
    buildApiPath(context, `domain/formcreator/forms/${formId}/submit-multipart`),
    body,
  );
}

async function postFormData<T>(context: string, path: string, body: FormData): Promise<T> {
  const normalizedPath = normalizeApiPath(path);
  const rootContext = normalizedPath.match(/^\/api\/v1\/([^/]+)\//)?.[1];
  const authState = useAuthStore.getState();
  const headers: Record<string, string> = {};

  const sessionToken =
    authState.getSessionToken(context) ||
    (rootContext ? authState.getSessionToken(rootContext) : null);
  if (sessionToken) {
    headers["Session-Token"] = sessionToken;
  }

  const activeRole =
    authState.getActiveHubRoleForContext(context) ||
    (rootContext ? authState.getActiveHubRoleForContext(rootContext) : null);
  if (activeRole?.role) {
    headers["X-Active-Hub-Role"] = activeRole.role;
  }

  const response = await fetch(`${API_BASE}${normalizedPath}`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(errorBody.detail || response.statusText, response.status);
  }

  return response.json() as Promise<T>;
}
