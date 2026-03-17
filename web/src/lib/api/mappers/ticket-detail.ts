import { asIsoDateTimeString, toIsoDateTimeOrUndefined } from "@/lib/datetime/iso";

import type {
  TicketTimelineEntryDto,
  TicketWorkflowDetailResponseDto,
  TicketWorkflowFlagsDto,
  TicketWorkflowTicketDto,
} from "../contracts/ticket-detail";
import type { TicketWorkflowDetail, TicketWorkflowFlags, TicketTimelineEntry } from "../models/ticket-detail";
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
    content: dto.content,
    date: asIsoDateTimeString(dto.date),
    userId: dto.user_id,
    userName: dto.user_name,
    isPrivate: dto.is_private,
    actionTime: dto.action_time ?? undefined,
    solutionStatus: dto.solution_status ?? undefined,
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
    timeline: dto.timeline.map(mapTicketTimelineEntryDto),
    flags: mapTicketWorkflowFlagsDto(dto.flags),
  };
}
