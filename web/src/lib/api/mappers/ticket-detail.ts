import { asIsoDateTimeString, toIsoDateTimeOrUndefined } from "@/lib/datetime/iso";

import type {
  TicketActorDto,
  TicketAuditLogDto,
  TicketAttachmentDto,
  TicketGroupActorDto,
  TicketTimelineEntryDto,
  TicketWorkflowDetailResponseDto,
  TicketWorkflowFlagsDto,
  TicketWorkflowTicketDto,
} from "../contracts/ticket-detail";
import type {
  TicketActor,
  TicketAuditLog,
  TicketAttachment,
  TicketGroupActor,
  TicketWorkflowDetail,
  TicketWorkflowFlags,
  TicketTimelineEntry,
} from "../models/ticket-detail";
import type { TicketDetail } from "../types";

function mapTicketWorkflowTicketDto(dto: TicketWorkflowTicketDto): TicketDetail {
  return {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    category: dto.category,
    status: dto.status,
    statusId: dto.status_id,
    urgency: dto.urgency,
    urgencyId: dto.urgency_id,
    priority: dto.priority,
    type: dto.type,
    dateCreated: asIsoDateTimeString(dto.date_created),
    dateModified: asIsoDateTimeString(dto.date_modified),
    solveDate: toIsoDateTimeOrUndefined(dto.solve_date ?? undefined),
    closeDate: toIsoDateTimeOrUndefined(dto.close_date ?? undefined),
    location: dto.location ?? undefined,
    entityName: dto.entity_name ?? undefined,
    entity_name: dto.entity_name ?? undefined,
  };
}

function mapTicketTimelineEntryDto(dto: TicketTimelineEntryDto): TicketTimelineEntry {
  return {
    id: dto.id,
    type: dto.type,
    sourceItemtype: dto.source_itemtype ?? (
      dto.type === "solution" ? "ITILSolution" : dto.type === "task" ? "TicketTask" : "ITILFollowup"
    ),
    content: dto.content,
    date: asIsoDateTimeString(dto.date),
    userId: dto.user_id,
    userName: dto.user_name,
    isPrivate: dto.is_private,
    actionTime: dto.action_time ?? undefined,
    solutionStatus: dto.solution_status ?? undefined,
    documentRefs: dto.document_refs ?? [],
    attachments: (dto.attachments || []).map(mapTicketAttachmentDto),
  };
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
    dateUpload: toIsoDateTimeOrUndefined(dto.date_upload ?? undefined),
    url: dto.url,
  };
}

function mapTicketActorDto(dto: TicketActorDto): TicketActor {
  return {
    role: dto.role,
    roleId: dto.role_id,
    userId: dto.user_id,
    name: dto.name,
  };
}

function mapTicketGroupActorDto(dto: TicketGroupActorDto): TicketGroupActor {
  return {
    role: dto.role,
    roleId: dto.role_id,
    groupId: dto.group_id,
    name: dto.name,
  };
}

function mapTicketAuditLogDto(dto: TicketAuditLogDto): TicketAuditLog {
  return {
    id: dto.id,
    date: toIsoDateTimeOrUndefined(dto.date ?? undefined),
    userName: dto.user_name ?? "",
    linkedItemtype: dto.linked_itemtype ?? undefined,
    linkedAction: dto.linked_action ?? undefined,
    oldValue: dto.old_value ?? undefined,
    newValue: dto.new_value ?? undefined,
  };
}

function mapTicketWorkflowFlagsDto(dto: TicketWorkflowFlagsDto): TicketWorkflowFlags {
  return {
    isNew: dto.is_new,
    isInProgress: dto.is_in_progress,
    isPending: dto.is_pending,
    isResolved: dto.is_resolved,
    isClosed: dto.is_closed,
    hasAssignedTechnician: dto.has_assigned_technician,
  };
}

export function mapTicketWorkflowDetailResponseDto(dto: TicketWorkflowDetailResponseDto): TicketWorkflowDetail {
  return {
    ticket: mapTicketWorkflowTicketDto(dto.ticket),
    requesterName: dto.requester_name,
    requesterUserId: dto.requester_user_id ?? undefined,
    technicianName: dto.technician_name,
    technicianUserId: dto.technician_user_id ?? null,
    groupName: dto.group_name,
    actors: (dto.actors || []).map(mapTicketActorDto),
    groups: (dto.groups || []).map(mapTicketGroupActorDto),
    timeline: dto.timeline.map(mapTicketTimelineEntryDto),
    attachments: (dto.attachments || []).map(mapTicketAttachmentDto),
    auditLogs: (dto.audit_logs || []).map(mapTicketAuditLogDto),
    flags: mapTicketWorkflowFlagsDto(dto.flags),
  };
}
