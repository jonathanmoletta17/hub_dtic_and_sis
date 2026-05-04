import { useAuthStore } from "@/store/useAuthStore";
import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";

import { apiGet, apiPost, buildApiPath, resolveRootContext } from "./client";
import type {
  TicketAttachmentUploadResponseDto,
  TicketActionResponseDto,
  TicketAttachmentDto,
  TicketSolutionApprovalRequestDto,
  TicketAssumeRequestDto,
  TicketFollowupCreateRequestDto,
  TicketSolutionCreateRequestDto,
  TicketStatusActionRequestDto,
  TicketTransferRequestDto,
  TicketWorkflowDetailResponseDto,
} from "./contracts/ticket-detail";
import { mapTicketWorkflowDetailResponseDto } from "./mappers/ticket-detail";
import type { TicketAttachment, TicketWorkflowDetail } from "./models/ticket-detail";
import { API_BASE, normalizeApiPath } from "./httpClient";

export interface TicketAttachmentPreview {
  objectUrl: string;
  contentType: string;
  filename: string;
}

function workflowPath(context: string, ticketId: number, action: string): string {
  return buildApiPath(context, `tickets/${ticketId}/${action}`);
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

function mapTicketAttachmentDto(dto: TicketAttachmentDto): TicketAttachment {
  return {
    id: dto.id,
    relationId: dto.relation_id ?? undefined,
    parentType: dto.parent_type ?? "Ticket",
    parentId: dto.parent_id ?? 0,
    filename: dto.filename,
    mimeType: dto.mime_type,
    size: dto.size,
    dateUpload: dto.date_upload ?? undefined,
    url: dto.url,
  };
}

function getContextAuthHeaders(context: string): Record<string, string> {
  const authState = useAuthStore.getState();
  const rootContext = resolveRootContext(context);
  const cachedSession =
    authState.getCachedSession(context) ||
    (rootContext !== context ? authState.getCachedSession(rootContext) : null);
  const sessionToken =
    authState.getSessionToken(context) ||
    (rootContext !== context ? authState.getSessionToken(rootContext) : null) ||
    cachedSession?.session_token ||
    null;

  if (!sessionToken) {
    throw new Error(`Sessao nao encontrada para o contexto ${context}.`);
  }

  const headers: Record<string, string> = {
    "Session-Token": sessionToken,
  };

  const activeRole = authState.getActiveHubRoleForContext(context);
  if (activeRole?.role) {
    headers["X-Active-Hub-Role"] = activeRole.role;
  }

  return headers;
}

async function fetchTicketAttachmentBlob(
  context: string,
  ticketId: number,
  attachmentId: number,
  disposition: "attachment" | "inline",
): Promise<Blob> {
  const path = normalizeApiPath(
    `${workflowPath(context, ticketId, `attachments/${attachmentId}/download`)}?disposition=${disposition}`,
  );

  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: getContextAuthHeaders(context),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.blob();
}

function notifyTicketMutation(context: string, ticketId: number, action: string): void {
  publishLiveDataEvent({
    context,
    domains: ["tickets", "dashboard", "analytics", "search", "user", "chargers"],
    source: "mutation",
    reason: action,
    ticketId,
  });
}

export function fetchTicketWorkflowDetail(context: string, ticketId: number): Promise<TicketWorkflowDetail> {
  return apiGet<TicketWorkflowDetailResponseDto>(workflowPath(context, ticketId, "detail"))
    .then(mapTicketWorkflowDetailResponseDto);
}

export function addTicketFollowup(
  context: string,
  ticketId: number,
  payload: TicketFollowupCreateRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketFollowupCreateRequestDto>(
    workflowPath(context, ticketId, "followups"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "followup");
    return response;
  });
}

export async function uploadTicketAttachments(
  context: string,
  ticketId: number,
  files: File[],
): Promise<TicketAttachment[]> {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await fetch(
    `${API_BASE}${normalizeApiPath(workflowPath(context, ticketId, "attachments"))}`,
    {
      method: "POST",
      headers: getContextAuthHeaders(context),
      body: formData,
    },
  );

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload = (await response.json()) as TicketAttachmentUploadResponseDto;
  notifyTicketMutation(context, ticketId, "attachment-upload");
  return (payload.attachments || []).map(mapTicketAttachmentDto);
}

export async function downloadTicketAttachment(
  context: string,
  ticketId: number,
  attachment: TicketAttachment,
): Promise<void> {
  const blob = await fetchTicketAttachmentBlob(context, ticketId, attachment.id, "attachment");
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = attachment.filename || `anexo-${attachment.id}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function previewTicketAttachment(
  context: string,
  ticketId: number,
  attachment: TicketAttachment,
): Promise<TicketAttachmentPreview> {
  const blob = await fetchTicketAttachmentBlob(context, ticketId, attachment.id, "inline");
  return {
    objectUrl: URL.createObjectURL(blob),
    contentType: blob.type || attachment.mimeType || "application/octet-stream",
    filename: attachment.filename || `anexo-${attachment.id}`,
  };
}

export function addTicketSolution(
  context: string,
  ticketId: number,
  payload: TicketSolutionCreateRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketSolutionCreateRequestDto>(
    workflowPath(context, ticketId, "solutions"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "solution");
    return response;
  });
}

export function assumeTicket(
  context: string,
  ticketId: number,
  payload: TicketAssumeRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketAssumeRequestDto>(
    workflowPath(context, ticketId, "assume"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "assume");
    return response;
  });
}

export function setTicketPending(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "pending"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "pending");
    return response;
  });
}

export function resumeTicket(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "resume"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "resume");
    return response;
  });
}

export function returnTicketToQueue(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "return-to-queue"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "return-to-queue");
    return response;
  });
}

export function reopenTicket(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "reopen"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "reopen");
    return response;
  });
}

export function transferTicket(
  context: string,
  ticketId: number,
  payload: TicketTransferRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketTransferRequestDto>(
    workflowPath(context, ticketId, "transfer"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "transfer");
    return response;
  });
}

export function approveTicketSolution(
  context: string,
  ticketId: number,
  payload: TicketSolutionApprovalRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketSolutionApprovalRequestDto>(
    workflowPath(context, ticketId, "solution-approval/approve"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "solution-approve");
    return response;
  });
}

export function rejectTicketSolution(
  context: string,
  ticketId: number,
  payload: TicketSolutionApprovalRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketSolutionApprovalRequestDto>(
    workflowPath(context, ticketId, "solution-approval/reject"),
    payload,
  ).then((response) => {
    notifyTicketMutation(context, ticketId, "solution-reject");
    return response;
  });
}
