from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile

from app.core.authorization import require_hub_permissions
from app.core.auth_guard import verify_session
from app.core.rate_limit import limiter
from app.schemas.tickets import (
    TicketActionResponse,
    TicketAttachmentUploadResponse,
    TicketAssumeRequest,
    TicketFollowupCreateRequest,
    TicketSolutionApprovalRequest,
    TicketSolutionCreateRequest,
    TicketStatusActionRequest,
    TicketTransferRequest,
    TicketWorkflowDetailResponse,
)
from app.services.ticket_workflow_service import service


router = APIRouter(
    prefix="/api/v1/{context}/tickets/{ticket_id}",
    tags=["Domain: Ticket Workflow"],
    dependencies=[Depends(verify_session)],
)


def _raise_ticket_error(error: Exception) -> None:
    raise HTTPException(status_code=502, detail=f"Erro no workflow de tickets: {error}")


def _build_content_disposition(filename: str, disposition: str) -> str:
    safe_filename = filename.replace('"', "")
    return f"{disposition}; filename=\"{safe_filename}\"; filename*=UTF-8''{quote(safe_filename)}"


@router.get("/detail", response_model=TicketWorkflowDetailResponse)
@limiter.limit("120/minute")
async def get_ticket_detail(
    request: Request,
    context: str,
    ticket_id: int,
    auth_data: dict = Depends(verify_session),
):
    try:
        return await service.get_ticket_detail(context, ticket_id, str(auth_data["session_token"]))
    except HTTPException:
        raise
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/followups", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def add_followup(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketFollowupCreateRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.add_followup(
            context,
            ticket_id,
            body,
            session_token=str(_identity["session_token"]),
            actor_user_id=int(_identity.get("user_id") or 0),
        )
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/attachments", response_model=TicketAttachmentUploadResponse)
@limiter.limit("30/minute")
async def upload_attachments(
    request: Request,
    context: str,
    ticket_id: int,
    files: list[UploadFile] = File(..., description="Arquivos para anexar ao ticket"),
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.upload_attachments(
            context,
            ticket_id,
            files,
            session_token=str(_identity["session_token"]),
        )
    except HTTPException:
        raise
    except Exception as error:
        _raise_ticket_error(error)
    finally:
        for file in files:
            await file.close()


@router.get("/attachments/{document_id}/download")
@limiter.limit("60/minute")
async def download_attachment(
    request: Request,
    context: str,
    ticket_id: int,
    document_id: int,
    disposition: str = Query("attachment", pattern="^(attachment|inline)$"),
    auth_data: dict = Depends(verify_session),
):
    try:
        payload = await service.download_attachment(
            context,
            ticket_id,
            document_id,
            str(auth_data["session_token"]),
        )
    except HTTPException:
        raise
    except Exception as error:
        _raise_ticket_error(error)

    headers = {
        "Content-Disposition": _build_content_disposition(payload["filename"], disposition),
        "Cache-Control": "no-store",
    }
    return Response(
        content=payload["content"],
        media_type=payload["mime_type"],
        headers=headers,
    )


@router.post("/solutions", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def add_solution(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketSolutionCreateRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.add_solution(
            context,
            ticket_id,
            body,
            session_token=str(_identity["session_token"]),
            actor_user_id=int(_identity.get("user_id") or 0),
        )
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/solution-approval/approve", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def approve_solution(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketSolutionApprovalRequest,
    identity: dict = Depends(
        require_hub_permissions("solicitante", require_active_hub_role=True)
    ),
):
    try:
        return await service.approve_solution(
            context,
            ticket_id,
            session_token=str(identity["session_token"]),
            actor_user_id=int(identity.get("user_id") or 0),
            comment=body.comment,
        )
    except HTTPException:
        raise
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/solution-approval/reject", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def reject_solution(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketSolutionApprovalRequest,
    identity: dict = Depends(
        require_hub_permissions("solicitante", require_active_hub_role=True)
    ),
):
    try:
        return await service.reject_solution(
            context,
            ticket_id,
            session_token=str(identity["session_token"]),
            actor_user_id=int(identity.get("user_id") or 0),
            comment=body.comment,
        )
    except HTTPException:
        raise
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/assume", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def assume_ticket(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketAssumeRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.assume_ticket(
            context,
            ticket_id,
            body,
            session_token=str(_identity["session_token"]),
        )
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/pending", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def set_pending(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketStatusActionRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.set_pending(context, ticket_id, str(_identity["session_token"]))
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/resume", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def resume_ticket(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketStatusActionRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.resume_ticket(context, ticket_id, str(_identity["session_token"]))
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/return-to-queue", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def return_to_queue(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketStatusActionRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.return_to_queue(context, ticket_id, str(_identity["session_token"]))
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/reopen", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def reopen_ticket(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketStatusActionRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.reopen_ticket(context, ticket_id, str(_identity["session_token"]))
    except Exception as error:
        _raise_ticket_error(error)


@router.post("/transfer", response_model=TicketActionResponse)
@limiter.limit("60/minute")
async def transfer_ticket(
    request: Request,
    context: str,
    ticket_id: int,
    body: TicketTransferRequest,
    _identity: dict = Depends(
        require_hub_permissions("tecnico", "gestor", require_active_hub_role=True)
    ),
):
    try:
        return await service.transfer_ticket(
            context,
            ticket_id,
            body,
            session_token=str(_identity["session_token"]),
        )
    except Exception as error:
        _raise_ticket_error(error)
