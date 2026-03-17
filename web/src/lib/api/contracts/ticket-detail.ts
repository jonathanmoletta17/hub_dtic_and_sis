import type { IsoDateTimeString } from "@/lib/datetime/iso";

export interface TicketWorkflowTicketDto {
  id: number;
  title: string;
  content: string;
  category: string;
  status_id: number;
  status: string;
  urgency_id: number;
  urgency: string;
  priority: number;
  type: number;
  date_created: IsoDateTimeString;
  date_modified: IsoDateTimeString;
  solve_date?: IsoDateTimeString | null;
  close_date?: IsoDateTimeString | null;
  location?: string | null;
  entity_name?: string | null;
}

export interface TicketTimelineEntryDto {
  id: number;
  type: "followup" | "solution" | "task";
  content: string;
  date: IsoDateTimeString;
  user_id: number;
  user_name: string;
  is_private: boolean;
  action_time?: number | null;
  solution_status?: number | null;
}

export interface TicketWorkflowFlagsDto {
  is_new: boolean;
  is_in_progress: boolean;
  is_pending: boolean;
  is_resolved: boolean;
  is_closed: boolean;
  has_assigned_technician: boolean;
}

export interface TicketWorkflowDetailResponseDto {
  ticket: TicketWorkflowTicketDto;
  requester_name: string;
  requester_user_id?: number | null;
  technician_name: string;
  technician_user_id?: number | null;
  group_name: string;
  timeline: TicketTimelineEntryDto[];
  flags: TicketWorkflowFlagsDto;
}

export interface TicketActionResponseDto {
  success: boolean;
  message: string;
  ticket_id: number;
}

export interface TicketFollowupCreateRequestDto {
  content: string;
  user_id: number;
  is_private: boolean;
}

export interface TicketSolutionCreateRequestDto {
  content: string;
  user_id: number;
}

export interface TicketAssumeRequestDto {
  technician_user_id: number;
}

export interface TicketTransferRequestDto {
  technician_user_id: number;
}

export interface TicketStatusActionRequestDto {
  actor_user_id?: number;
}

export interface TicketSolutionApprovalRequestDto {
  comment?: string;
}
