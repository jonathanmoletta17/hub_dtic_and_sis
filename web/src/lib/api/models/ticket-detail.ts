import type { IsoDateTimeString } from "@/lib/datetime/iso";

import type { TicketDetail } from "../types";

export type TimelineEntryType = "followup" | "solution" | "task";

export interface TicketTimelineEntry {
  id: number;
  type: TimelineEntryType;
  sourceItemtype: "ITILFollowup" | "ITILSolution" | "TicketTask";
  content: string;
  date: IsoDateTimeString;
  userId: number;
  userName: string;
  isPrivate: boolean;
  actionTime?: number;
  solutionStatus?: number;
  documentRefs: number[];
  attachments: TicketAttachment[];
}

export interface TicketAttachment {
  id: number;
  relationId?: number;
  parentType: "Ticket" | "ITILFollowup" | "ITILSolution" | "TicketTask";
  parentId: number;
  filename: string;
  mimeType: string;
  size: number;
  dateUpload?: IsoDateTimeString;
  url: string;
}

export interface TicketActor {
  role: "requester" | "technician" | "observer" | "unknown";
  roleId: number;
  userId: number;
  name: string;
}

export interface TicketGroupActor {
  role: "requester" | "assigned" | "observer" | "unknown";
  roleId: number;
  groupId: number;
  name: string;
}

export interface TicketAuditLog {
  id: number;
  date?: IsoDateTimeString;
  userName: string;
  linkedItemtype?: string;
  linkedAction?: string;
  oldValue?: string;
  newValue?: string;
}

export interface TicketWorkflowFlags {
  isNew: boolean;
  isInProgress: boolean;
  isPending: boolean;
  isResolved: boolean;
  isClosed: boolean;
  hasAssignedTechnician: boolean;
}

export interface TicketWorkflowDetail {
  ticket: TicketDetail;
  requesterName: string;
  requesterUserId?: number;
  technicianName: string;
  technicianUserId: number | null;
  groupName: string;
  actors: TicketActor[];
  groups: TicketGroupActor[];
  timeline: TicketTimelineEntry[];
  attachments: TicketAttachment[];
  auditLogs: TicketAuditLog[];
  flags: TicketWorkflowFlags;
}
