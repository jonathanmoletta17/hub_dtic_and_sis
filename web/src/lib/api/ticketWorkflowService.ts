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
import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";

function workflowPath(context: string, ticketId: number, action: string): string {
  return buildApiPath(context, `tickets/${ticketId}/${action}`);
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
