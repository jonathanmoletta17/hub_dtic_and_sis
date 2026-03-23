from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_local_db
from app.schemas.charger_management import (
    ActorIdentity,
    AssignmentCreateRequest,
    AssignmentResponse,
    AssignmentStatusActionRequest,
    ChargerCreateRequest,
    ChargerInactivationRequest,
    ChargerInactivationResponse,
    ChargerReportResponse,
    ChargerResponse,
    ChargerUpdateRequest,
    NotificationResponse,
    AuditEventResponse,
    TicketSolutionRequest,
    TicketSolutionResponse,
    TimeRuleCreateRequest,
    TimeRuleResponse,
)
from app.services.charger_management_service import ChargerManagementError, service


router = APIRouter(prefix="/api/v2/{context}/charger-management", tags=["Domain: Charger Management"])


def _raise_service_error(error: Exception) -> None:
    if isinstance(error, HTTPException):
        raise error
    if isinstance(error, ChargerManagementError):
        raise HTTPException(status_code=error.status_code, detail=error.detail)
    raise HTTPException(status_code=500, detail=f"Unexpected charger management error: {error}")


async def get_actor_identity(
    request: Request,
    user_id: str = Header(..., alias="X-GLPI-User-Id"),
    role: str = Header(..., alias="X-GLPI-Role"),
    display_name: str | None = Header(default=None, alias="X-GLPI-User-Name"),
) -> ActorIdentity:
    request_id = (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Trace-ID")
        or "-"
    )
    return ActorIdentity(
        user_id=user_id.strip(),
        role=role.strip().lower(),
        display_name=(display_name or "").strip() or None,
        request_id=request_id,
    )


@router.post("/chargers", response_model=ChargerResponse)
async def create_charger(
    context: str,
    payload: ChargerCreateRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.create_charger(session, actor=actor, payload=payload)
    except Exception as error:
        _raise_service_error(error)


@router.get("/chargers", response_model=list[ChargerResponse])
async def list_chargers(
    context: str,
    include_deleted: bool = Query(default=False),
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.list_chargers(session, actor=actor, include_deleted=include_deleted)
    except Exception as error:
        _raise_service_error(error)


@router.put("/chargers/{charger_id}", response_model=ChargerResponse)
async def update_charger(
    context: str,
    charger_id: int,
    payload: ChargerUpdateRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.update_charger(
            session,
            actor=actor,
            charger_id=charger_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.delete("/chargers/{charger_id}", response_model=ChargerResponse)
async def delete_charger(
    context: str,
    charger_id: int,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.delete_charger(session, actor=actor, charger_id=charger_id)
    except Exception as error:
        _raise_service_error(error)


@router.post("/chargers/{charger_id}/inactivation", response_model=ChargerInactivationResponse)
async def inactivate_charger(
    context: str,
    charger_id: int,
    payload: ChargerInactivationRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.inactivate_charger(
            session,
            actor=actor,
            charger_id=charger_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.post("/chargers/{charger_id}/reactivation", response_model=ChargerResponse)
async def reactivate_charger(
    context: str,
    charger_id: int,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.reactivate_charger(session, actor=actor, charger_id=charger_id)
    except Exception as error:
        _raise_service_error(error)


@router.post("/chargers/{charger_id}/time-rules", response_model=TimeRuleResponse)
async def create_time_rule(
    context: str,
    charger_id: int,
    payload: TimeRuleCreateRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.create_time_rule(
            session,
            actor=actor,
            charger_id=charger_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.get("/chargers/{charger_id}/time-rules", response_model=list[TimeRuleResponse])
async def list_time_rules(
    context: str,
    charger_id: int,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.list_time_rules(session, actor=actor, charger_id=charger_id)
    except Exception as error:
        _raise_service_error(error)


@router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(
    context: str,
    payload: AssignmentCreateRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.create_assignment(session, actor=actor, payload=payload)
    except Exception as error:
        _raise_service_error(error)


@router.post("/assignments/{assignment_id}/start", response_model=AssignmentResponse)
async def start_assignment(
    context: str,
    assignment_id: int,
    payload: AssignmentStatusActionRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.start_assignment(
            session,
            actor=actor,
            assignment_id=assignment_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.post("/assignments/{assignment_id}/finish", response_model=AssignmentResponse)
async def finish_assignment(
    context: str,
    assignment_id: int,
    payload: AssignmentStatusActionRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.finish_assignment(
            session,
            actor=actor,
            assignment_id=assignment_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.post("/assignments/{assignment_id}/cancel", response_model=AssignmentResponse)
async def cancel_assignment(
    context: str,
    assignment_id: int,
    payload: AssignmentStatusActionRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.cancel_assignment(
            session,
            actor=actor,
            assignment_id=assignment_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.get("/reports", response_model=ChargerReportResponse)
async def report_chargers(
    context: str,
    start_at: datetime,
    end_at: datetime,
    charger_id: int | None = Query(default=None),
    assignment_status: str | None = Query(
        default=None,
        pattern="^(planned|active|completed|canceled)$",
    ),
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        data = await service.build_report(
            session,
            actor=actor,
            start_at=start_at,
            end_at=end_at,
            charger_id=charger_id,
            assignment_status=assignment_status,
        )
        return {
            "start_at": start_at,
            "end_at": end_at,
            "assignment_status": assignment_status,
            "charger_id": charger_id,
            "data": data,
        }
    except Exception as error:
        _raise_service_error(error)


@router.post("/tickets/{ticket_id}/solution", response_model=TicketSolutionResponse)
async def solve_ticket(
    context: str,
    ticket_id: int,
    payload: TicketSolutionRequest,
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.solve_ticket_and_wait_user_approval(
            session,
            actor=actor,
            context=context,
            ticket_id=ticket_id,
            payload=payload,
        )
    except Exception as error:
        _raise_service_error(error)


@router.get("/notifications", response_model=list[NotificationResponse])
async def read_notifications(
    context: str,
    only_pending: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.read_notifications(
            session,
            actor=actor,
            only_pending=only_pending,
            limit=limit,
        )
    except Exception as error:
        _raise_service_error(error)


@router.get("/audit", response_model=list[AuditEventResponse])
async def read_audit(
    context: str,
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    actor: ActorIdentity = Depends(get_actor_identity),
    session: AsyncSession = Depends(get_local_db),
):
    try:
        service.ensure_context_supported(context)
        return await service.read_audit(
            session,
            actor=actor,
            entity_type=entity_type,
            entity_id=entity_id,
            limit=limit,
        )
    except Exception as error:
        _raise_service_error(error)
