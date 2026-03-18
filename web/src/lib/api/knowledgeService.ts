/**
 * knowledgeService - Client HTTP for GLPI Knowledge Base.
 */

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  buildApiPath,
  sessionHeaders,
} from "./client";
import type {
  KBArticleAttachmentDto,
  KBArticleResponseDto,
  KBCategoryDto,
  KBListResponseDto,
} from "./contracts/knowledge";
import {
  mapKBArticleAttachmentDto,
  mapKBArticleResponseDto,
  mapKBCategoryDto,
  mapKBListResponseDto,
} from "./mappers/knowledge";
import type {
  KBArticleAttachment,
  KBArticleDetail,
  KBArticlePayload,
  KBCategory,
  KBListResult,
} from "./models/knowledge";
import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";

export type {
  KBArticleAttachment,
  KBArticleDetail,
  KBArticlePayload,
  KBArticleSummary,
  KBCategory,
  KBListResult,
} from "./models/knowledge";

interface KBUploadAttachmentsResponseDto {
  success: boolean;
  attachments: KBArticleAttachmentDto[];
  message: string;
}

interface KBMutationResponse {
  success: boolean;
  data: unknown;
  message: string;
}

function createApiError(statusText: string, detail?: string): Error {
  return new Error(detail || statusText || "Erro de comunicacao com a API.");
}

async function parseApiError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return createApiError(response.statusText, payload?.detail);
  } catch {
    return createApiError(response.statusText);
  }
}

async function fetchAttachmentBlob(
  sessionToken: string,
  articleId: number,
  attachmentId: number,
  disposition: "attachment" | "inline",
): Promise<Blob> {
  const url = `${buildApiPath("dtic", `knowledge/articles/${articleId}/attachments/${attachmentId}/download`)}?disposition=${disposition}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Session-Token": sessionToken,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.blob();
}

async function fetchEmbeddedDocumentBlob(
  sessionToken: string,
  documentId: number,
  disposition: "attachment" | "inline",
): Promise<Blob> {
  const url = `${buildApiPath("dtic", `knowledge/documents/${documentId}/content`)}?disposition=${disposition}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Session-Token": sessionToken,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.blob();
}

function openBlobInNewTab(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

// Read

export async function fetchKBCategories(params?: {
  is_faq?: boolean;
}): Promise<KBCategory[]> {
  const data = await apiGet<{ categories: KBCategoryDto[] }>(
    buildApiPath("dtic", "knowledge/categories"),
    params?.is_faq !== undefined ? { is_faq: params.is_faq } : undefined,
  );
  return data.categories.map(mapKBCategoryDto);
}

export async function fetchKBArticles(params?: {
  q?: string;
  category_id?: number;
  is_faq?: boolean;
  limit?: number;
}): Promise<KBListResult> {
  const data = await apiGet<KBListResponseDto>(
    buildApiPath("dtic", "knowledge/articles"),
    {
      q: params?.q,
      category_id: params?.category_id,
      is_faq: params?.is_faq,
      limit: params?.limit,
    },
  );
  return mapKBListResponseDto(data);
}

export async function fetchKBArticle(id: number): Promise<KBArticleDetail> {
  const data = await apiGet<KBArticleResponseDto>(
    buildApiPath("dtic", `knowledge/articles/${id}`),
  );
  return mapKBArticleResponseDto(data);
}

// Write

export async function createKBArticle(
  sessionToken: string,
  payload: KBArticlePayload,
): Promise<KBMutationResponse> {
  const response = await apiPost<KBMutationResponse>(
    buildApiPath("dtic", "knowledge/articles"),
    payload,
    {
      headers: sessionHeaders(sessionToken),
    },
  );

  publishLiveDataEvent({
    context: "dtic",
    domains: ["knowledge"],
    source: "mutation",
    reason: "knowledge-create",
  });

  return response;
}

export async function updateKBArticle(
  sessionToken: string,
  id: number,
  payload: Partial<KBArticlePayload>,
): Promise<KBMutationResponse> {
  const response = await apiPut<KBMutationResponse>(
    buildApiPath("dtic", `knowledge/articles/${id}`),
    payload,
    {
      headers: sessionHeaders(sessionToken),
    },
  );

  publishLiveDataEvent({
    context: "dtic",
    domains: ["knowledge"],
    source: "mutation",
    reason: "knowledge-update",
  });

  return response;
}

export async function deleteKBArticle(
  sessionToken: string,
  id: number,
): Promise<KBMutationResponse> {
  const response = await apiDelete<KBMutationResponse>(
    buildApiPath("dtic", `knowledge/articles/${id}`),
    {
      headers: sessionHeaders(sessionToken),
    },
  );

  publishLiveDataEvent({
    context: "dtic",
    domains: ["knowledge"],
    source: "mutation",
    reason: "knowledge-delete",
  });

  return response;
}

export async function uploadKBArticleAttachments(
  sessionToken: string,
  articleId: number,
  files: File[],
): Promise<KBArticleAttachment[]> {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await fetch(
    buildApiPath("dtic", `knowledge/articles/${articleId}/attachments`),
    {
      method: "POST",
      headers: {
        "Session-Token": sessionToken,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload = (await response.json()) as KBUploadAttachmentsResponseDto;

  publishLiveDataEvent({
    context: "dtic",
    domains: ["knowledge"],
    source: "mutation",
    reason: "knowledge-attachments-upload",
  });

  return (payload.attachments || []).map(mapKBArticleAttachmentDto);
}

export async function deleteKBArticleAttachment(
  sessionToken: string,
  articleId: number,
  attachmentId: number,
): Promise<KBArticleAttachment[]> {
  const response = await fetch(
    buildApiPath("dtic", `knowledge/articles/${articleId}/attachments/${attachmentId}`),
    {
      method: "DELETE",
      headers: {
        "Session-Token": sessionToken,
      },
    },
  );

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload = (await response.json()) as KBUploadAttachmentsResponseDto;

  publishLiveDataEvent({
    context: "dtic",
    domains: ["knowledge"],
    source: "mutation",
    reason: "knowledge-attachment-delete",
  });

  return (payload.attachments || []).map(mapKBArticleAttachmentDto);
}

export async function viewKBArticleAttachment(
  sessionToken: string,
  articleId: number,
  attachment: KBArticleAttachment,
): Promise<void> {
  const blob = await fetchAttachmentBlob(sessionToken, articleId, attachment.id, "inline");
  openBlobInNewTab(blob);
}

export async function downloadKBArticleAttachment(
  sessionToken: string,
  articleId: number,
  attachment: KBArticleAttachment,
): Promise<void> {
  const blob = await fetchAttachmentBlob(sessionToken, articleId, attachment.id, "attachment");
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = attachment.filename || `anexo-${attachment.id}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}

export async function fetchKBEmbeddedDocumentBlob(
  sessionToken: string,
  documentId: number,
  disposition: "attachment" | "inline" = "inline",
): Promise<Blob> {
  return fetchEmbeddedDocumentBlob(sessionToken, documentId, disposition);
}

export async function viewKBEmbeddedDocument(
  sessionToken: string,
  documentId: number,
): Promise<void> {
  const blob = await fetchEmbeddedDocumentBlob(sessionToken, documentId, "inline");
  openBlobInNewTab(blob);
}
