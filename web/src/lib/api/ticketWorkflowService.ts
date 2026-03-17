import { apiGet, apiPost, buildApiPath } from "./client";
import type {
  TicketActionResponseDto,
  TicketSolutionApprovalRequestDto,
  TicketAssumeRequestDto,
  TicketFollowupCreateRequestDto,
  TicketSolutionCreateRequestDto,
  TicketStatusActionRequestDto,
  TicketTransferRequestDto,
  TicketWorkflowDetailResponseDto,
} from "./contracts/ticket-detail";
import { mapTicketWorkflowDetailResponseDto } from "./mappers/ticket-detail";
import type { TicketWorkflowDetail } from "./models/ticket-detail";

function workflowPath(context: string, ticketId: number, action: string): string {
  return buildApiPath(context, `tickets/${ticketId}/${action}`);
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
  );
}

export function addTicketSolution(
  context: string,
  ticketId: number,
  payload: TicketSolutionCreateRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketSolutionCreateRequestDto>(
    workflowPath(context, ticketId, "solutions"),
    payload,
  );
}

export function assumeTicket(
  context: string,
  ticketId: number,
  payload: TicketAssumeRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketAssumeRequestDto>(
    workflowPath(context, ticketId, "assume"),
    payload,
  );
}

export function setTicketPending(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "pending"),
    payload,
  );
}

export function resumeTicket(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "resume"),
    payload,
  );
}

export function returnTicketToQueue(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "return-to-queue"),
    payload,
  );
}

export function reopenTicket(
  context: string,
  ticketId: number,
  payload: TicketStatusActionRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketStatusActionRequestDto>(
    workflowPath(context, ticketId, "reopen"),
    payload,
  );
}

export function transferTicket(
  context: string,
  ticketId: number,
  payload: TicketTransferRequestDto,
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketTransferRequestDto>(
    workflowPath(context, ticketId, "transfer"),
    payload,
  );
}

export function approveTicketSolution(
  context: string,
  ticketId: number,
  payload: TicketSolutionApprovalRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketSolutionApprovalRequestDto>(
    workflowPath(context, ticketId, "solution-approval/approve"),
    payload,
  );
}

export function rejectTicketSolution(
  context: string,
  ticketId: number,
  payload: TicketSolutionApprovalRequestDto = {},
): Promise<TicketActionResponseDto> {
  return apiPost<TicketActionResponseDto, TicketSolutionApprovalRequestDto>(
    workflowPath(context, ticketId, "solution-approval/reject"),
    payload,
  );
}
