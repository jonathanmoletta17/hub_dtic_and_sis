from __future__ import annotations

import asyncio
import html
import re
from contextlib import asynccontextmanager
from typing import Any
from pathlib import Path

from fastapi import HTTPException

from app.config import settings
from app.core.datetime_contract import ensure_aware_datetime, now_in_app_timezone
from app.core.context_registry import registry
from app.core.glpi_client import GLPIClient
from app.schemas.tickets import (
    TicketActionResponse,
    TicketAttachment,
    TicketAttachmentUploadResponse,
    TicketAssumeRequest,
    TicketFollowupCreateRequest,
    TicketSolutionCreateRequest,
    TicketTimelineEntry,
    TicketTransferRequest,
    TicketWorkflowDetailResponse,
    TicketWorkflowFlags,
    TicketWorkflowTicket,
)


MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
MAX_ATTACHMENTS_PER_REQUEST = 10
_ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".ppt",
    ".pptx",
}
_ALLOWED_ATTACHMENT_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}


def _strip_html(raw: Any) -> str:
    if not raw:
        return ""
    value = html.unescape(str(raw))
    value = re.sub(r"<[^>]*>", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def _as_int(value: Any, fallback: int = 0) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return fallback


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes"}


def _coalesce_datetime(*values: Any):
    for value in values:
        normalized = ensure_aware_datetime(value)
        if normalized is not None:
            return normalized
    return now_in_app_timezone()


def _display_name(record: dict[str, Any], fallback: str) -> str:
    for field in ("completename", "name", "realname"):
        if record.get(field):
            return str(record[field])
    return fallback


def _normalize_comment(comment: str | None) -> str:
    return (comment or "").strip()


def _extract_created_item_id(payload: object) -> int | None:
    if isinstance(payload, dict):
        direct_id = payload.get("id")
        if isinstance(direct_id, int):
            return direct_id
        if isinstance(direct_id, str) and direct_id.isdigit():
            return int(direct_id)

        for key in ("0", 0):
            nested = payload.get(key) if isinstance(payload, dict) else None
            if isinstance(nested, dict):
                nested_id = nested.get("id")
                if isinstance(nested_id, int):
                    return nested_id
                if isinstance(nested_id, str) and nested_id.isdigit():
                    return int(nested_id)

    return None


def _extract_glpi_upload_errors(payload: object) -> list[str]:
    if not isinstance(payload, dict):
        return []

    upload_result = payload.get("upload_result")
    if not isinstance(upload_result, dict):
        return []

    entries = upload_result.get("filename")
    if not isinstance(entries, list):
        return []

    errors: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        error = entry.get("error")
        if isinstance(error, str) and error.strip():
            errors.append(error.strip())
    return errors


def _sanitize_attachment_filename(filename: str) -> str:
    base = Path(filename).name.strip()
    if not base:
        base = "anexo"
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base)
    return base[:255]


def _assert_attachment_constraints(filename: str, content_type: str, size: int) -> None:
    suffix = Path(filename).suffix.lower()
    mime = (content_type or "application/octet-stream").lower()

    if size <= 0:
        raise HTTPException(status_code=400, detail=f"Arquivo '{filename}' vazio.")

    if size > MAX_ATTACHMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo '{filename}' excede o limite de {MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if suffix not in _ALLOWED_ATTACHMENT_EXTENSIONS and mime not in _ALLOWED_ATTACHMENT_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de arquivo nao permitido para '{filename}'.",
        )


class TicketWorkflowService:
    @asynccontextmanager
    async def _user_client(self, context: str, session_token: str):
        base_context = registry.get_base_context(context)
        client = GLPIClient.from_session_token(
            settings.get_glpi_instance(base_context),
            session_token,
        )
        try:
            yield client
        finally:
            await client._http.aclose()

    def _require_actor_user_id(self, actor_user_id: int) -> int:
        if actor_user_id <= 0:
            raise HTTPException(status_code=401, detail="Sessao de usuario invalida para esta operacao.")
        return actor_user_id

    async def _resolve_user_name(
        self,
        client,
        cache: dict[int, str],
        user_id: int,
    ) -> str:
        if not user_id:
            return "Sistema"
        if user_id in cache:
            return cache[user_id]

        try:
            user = await client.get_item("User", user_id, expand_dropdowns="true")
            resolved = _display_name(user, f"User #{user_id}")
        except Exception:
            resolved = f"User #{user_id}"

        cache[user_id] = resolved
        return resolved

    async def _resolve_group_name(self, client, group_id: int) -> str:
        if not group_id:
            return ""
        try:
            group = await client.get_item("Group", group_id, expand_dropdowns="true")
            return _display_name(group, f"Grupo #{group_id}")
        except Exception:
            return f"Grupo #{group_id}"

    def _attachment_url(self, context: str, ticket_id: int, document_id: int) -> str:
        return f"/api/v1/{context}/tickets/{ticket_id}/attachments/{document_id}/download"

    async def _get_ticket_attachments(self, client, context: str, ticket_id: int) -> list[TicketAttachment]:
        raw_document_items = await client.get_sub_items("Ticket", ticket_id, "Document_Item")
        if not raw_document_items:
            return []

        async def resolve_attachment(relation: dict[str, Any]) -> TicketAttachment | None:
            relation_id = _as_int(relation.get("id"))
            document_id = _as_int(relation.get("documents_id"))
            if not document_id:
                return None

            try:
                document = await client.get_item("Document", document_id, expand_dropdowns="true")
            except Exception:
                document = {}

            filename = (
                str(document.get("filename") or document.get("name") or f"anexo-{document_id}")
            )
            mime_type = str(
                document.get("mime")
                or document.get("mime_type")
                or "application/octet-stream"
            )
            size = _as_int(document.get("filesize") or document.get("size"))
            date_upload = ensure_aware_datetime(
                document.get("date_creation")
                or document.get("date_mod")
                or relation.get("date_mod")
            )

            return TicketAttachment(
                id=document_id,
                relation_id=relation_id or None,
                filename=filename,
                mime_type=mime_type,
                size=size,
                date_upload=date_upload,
                url=self._attachment_url(context, ticket_id, document_id),
            )

        resolved = await asyncio.gather(*(resolve_attachment(item) for item in raw_document_items))
        attachments = [item for item in resolved if item is not None]
        attachments.sort(key=lambda item: item.date_upload or now_in_app_timezone())
        return attachments

    async def get_ticket_detail(
        self,
        context: str,
        ticket_id: int,
        session_token: str,
    ) -> TicketWorkflowDetailResponse:
        async with self._user_client(context, session_token) as client:
            raw_ticket = await client.get_item("Ticket", ticket_id, expand_dropdowns="true")

            raw_followups, raw_solutions, raw_tasks, ticket_users, ticket_groups, attachments = await asyncio.gather(
                client.get_sub_items("Ticket", ticket_id, "ITILFollowup"),
                client.get_sub_items("Ticket", ticket_id, "ITILSolution"),
                client.get_sub_items("Ticket", ticket_id, "TicketTask"),
                client.get_sub_items("Ticket", ticket_id, "Ticket_User"),
                client.get_sub_items("Ticket", ticket_id, "Group_Ticket"),
                self._get_ticket_attachments(client, context, ticket_id),
            )

            requester_link = next((item for item in ticket_users if _as_int(item.get("type")) == 1), None)
            technician_link = next((item for item in ticket_users if _as_int(item.get("type")) == 2), None)
            assigned_group = next((item for item in ticket_groups if _as_int(item.get("type")) == 2), None)

            requester_user_id = _as_int(requester_link.get("users_id")) if requester_link else None
            technician_user_id = _as_int(technician_link.get("users_id")) if technician_link else None
            assigned_group_id = _as_int(assigned_group.get("groups_id")) if assigned_group else 0

            user_cache: dict[int, str] = {}
            requester_name, technician_name, group_name = await asyncio.gather(
                self._resolve_user_name(client, user_cache, requester_user_id or 0),
                self._resolve_user_name(client, user_cache, technician_user_id or 0),
                self._resolve_group_name(client, assigned_group_id),
            )

            timeline: list[TicketTimelineEntry] = []
            for followup in raw_followups:
                timeline.append(
                    TicketTimelineEntry(
                        id=_as_int(followup.get("id")),
                        type="followup",
                        content=_strip_html(followup.get("content")),
                        date=_coalesce_datetime(followup.get("date"), followup.get("date_creation")),
                        user_id=_as_int(followup.get("users_id")),
                        user_name="",
                        is_private=_as_bool(followup.get("is_private")),
                    )
                )

            for solution in raw_solutions:
                timeline.append(
                    TicketTimelineEntry(
                        id=_as_int(solution.get("id")),
                        type="solution",
                        content=_strip_html(solution.get("content")),
                        date=_coalesce_datetime(solution.get("date_creation"), solution.get("date")),
                        user_id=_as_int(solution.get("users_id")),
                        user_name="",
                        is_private=False,
                        solution_status=_as_int(solution.get("status"), 2),
                    )
                )

            for task in raw_tasks:
                timeline.append(
                    TicketTimelineEntry(
                        id=_as_int(task.get("id")),
                        type="task",
                        content=_strip_html(task.get("content")),
                        date=_coalesce_datetime(task.get("date"), task.get("date_creation")),
                        user_id=_as_int(task.get("users_id")) or _as_int(task.get("users_id_tech")),
                        user_name="",
                        is_private=_as_bool(task.get("is_private")),
                        action_time=_as_int(task.get("actiontime")),
                    )
                )

            timeline.sort(key=lambda item: item.date or now_in_app_timezone())

            for entry in timeline:
                entry.user_name = await self._resolve_user_name(client, user_cache, entry.user_id)

            status_id = _as_int(raw_ticket.get("status"), 1)
            urgency_id = _as_int(raw_ticket.get("urgency"), 3)

            ticket = TicketWorkflowTicket(
                id=_as_int(raw_ticket.get("id")),
                title=str(raw_ticket.get("name") or "Sem titulo"),
                content=_strip_html(raw_ticket.get("content")),
                category=str(
                    raw_ticket.get("itilcategories_id_completename")
                    or raw_ticket.get("itilcategories_id")
                    or "Sem categoria"
                ),
                status_id=status_id,
                status=str(raw_ticket.get("status_completename") or f"Status {status_id}"),
                urgency_id=urgency_id,
                urgency=str(raw_ticket.get("urgency_name") or f"Urgencia {urgency_id}"),
                priority=_as_int(raw_ticket.get("priority"), 3),
                type=_as_int(raw_ticket.get("type"), 1),
                date_created=_coalesce_datetime(raw_ticket.get("date")),
                date_modified=_coalesce_datetime(raw_ticket.get("date_mod"), raw_ticket.get("date")),
                solve_date=ensure_aware_datetime(raw_ticket.get("solvedate")),
                close_date=ensure_aware_datetime(raw_ticket.get("closedate")),
                location=(
                    str(raw_ticket.get("locations_id_completename") or raw_ticket.get("locations_id"))
                    if raw_ticket.get("locations_id_completename") or raw_ticket.get("locations_id")
                    else None
                ),
                entity_name=(
                    str(raw_ticket.get("entities_id_completename") or raw_ticket.get("entities_id"))
                    if raw_ticket.get("entities_id_completename") or raw_ticket.get("entities_id")
                    else None
                ),
            )

            flags = TicketWorkflowFlags(
                is_new=status_id == 1,
                is_in_progress=status_id in {2, 3},
                is_pending=status_id == 4,
                is_resolved=status_id == 5,
                is_closed=status_id == 6,
                has_assigned_technician=technician_user_id is not None,
            )

            return TicketWorkflowDetailResponse(
                ticket=ticket,
                requester_name="" if requester_name == "Sistema" else requester_name,
                requester_user_id=requester_user_id,
                technician_name="" if technician_name == "Sistema" else technician_name,
                technician_user_id=technician_user_id,
                group_name=group_name,
                timeline=timeline,
                attachments=attachments,
                flags=flags,
            )

    async def add_followup(
        self,
        context: str,
        ticket_id: int,
        payload: TicketFollowupCreateRequest,
        session_token: str,
        actor_user_id: int,
    ) -> TicketActionResponse:
        actor_user_id = self._require_actor_user_id(actor_user_id)
        async with self._user_client(context, session_token) as client:
            await client.create_item(
                "ITILFollowup",
                {
                    "itemtype": "Ticket",
                    "items_id": ticket_id,
                    "content": payload.content.strip(),
                    "is_private": 1 if payload.is_private else 0,
                    "users_id": actor_user_id,
                },
            )
        return TicketActionResponse(message="Acompanhamento adicionado com sucesso.", ticket_id=ticket_id)

    async def upload_attachments(
        self,
        context: str,
        ticket_id: int,
        files,
        session_token: str,
    ) -> TicketAttachmentUploadResponse:
        if not files:
            raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")
        if len(files) > MAX_ATTACHMENTS_PER_REQUEST:
            raise HTTPException(
                status_code=400,
                detail=f"Maximo de {MAX_ATTACHMENTS_PER_REQUEST} arquivos por envio.",
            )

        async with self._user_client(context, session_token) as client:
            for file in files:
                safe_name = _sanitize_attachment_filename(file.filename or "anexo")
                content = await file.read()
                _assert_attachment_constraints(safe_name, file.content_type or "", len(content))

                uploaded = await client.upload_document(
                    display_name=safe_name,
                    filename=safe_name,
                    content=content,
                    mime_type=file.content_type or "application/octet-stream",
                )
                upload_errors = _extract_glpi_upload_errors(uploaded)
                document_id = _extract_created_item_id(uploaded)

                if upload_errors:
                    if document_id:
                        try:
                            await client.delete_item("Document", document_id, force_purge=True)
                        except Exception:
                            pass
                    raise HTTPException(
                        status_code=415,
                        detail=f"Erro ao enviar '{safe_name}': {'; '.join(upload_errors)}",
                    )

                if not document_id:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Upload concluido sem ID de documento para '{safe_name}'.",
                    )

                try:
                    await client.link_document_to_item(
                        itemtype="Ticket",
                        item_id=ticket_id,
                        document_id=document_id,
                    )
                except Exception:
                    try:
                        await client.delete_item("Document", document_id, force_purge=True)
                    except Exception:
                        pass
                    raise

            attachments = await self._get_ticket_attachments(client, context, ticket_id)
            return TicketAttachmentUploadResponse(
                message="Anexos enviados com sucesso.",
                ticket_id=ticket_id,
                attachments=attachments,
            )

    async def download_attachment(
        self,
        context: str,
        ticket_id: int,
        document_id: int,
        session_token: str,
    ) -> dict[str, Any]:
        async with self._user_client(context, session_token) as client:
            attachments = await self._get_ticket_attachments(client, context, ticket_id)
            attachment = next((item for item in attachments if item.id == document_id), None)
            if attachment is None:
                raise HTTPException(status_code=404, detail="Anexo nao encontrado para este ticket.")

            response = await client.download_document(document_id)
            return {
                "filename": attachment.filename,
                "mime_type": attachment.mime_type or "application/octet-stream",
                "content": response.content,
            }

    async def add_solution(
        self,
        context: str,
        ticket_id: int,
        payload: TicketSolutionCreateRequest,
        session_token: str,
        actor_user_id: int,
    ) -> TicketActionResponse:
        actor_user_id = self._require_actor_user_id(actor_user_id)
        async with self._user_client(context, session_token) as client:
            await client.create_item(
                "ITILSolution",
                {
                    "itemtype": "Ticket",
                    "items_id": ticket_id,
                    "content": payload.content.strip(),
                    "users_id": actor_user_id,
                },
            )
        return TicketActionResponse(message="Solucao adicionada com sucesso.", ticket_id=ticket_id)

    async def assume_ticket(
        self,
        context: str,
        ticket_id: int,
        payload: TicketAssumeRequest,
        session_token: str,
    ) -> TicketActionResponse:
        async with self._user_client(context, session_token) as client:
            await self._replace_assigned_technician(client, ticket_id, payload.technician_user_id)
            await client.update_item("Ticket", ticket_id, {"status": 2})
        return TicketActionResponse(message="Ticket assumido com sucesso.", ticket_id=ticket_id)

    async def set_pending(self, context: str, ticket_id: int, session_token: str) -> TicketActionResponse:
        async with self._user_client(context, session_token) as client:
            await client.update_item("Ticket", ticket_id, {"status": 4})
        return TicketActionResponse(message="Ticket colocado em pendencia.", ticket_id=ticket_id)

    async def resume_ticket(self, context: str, ticket_id: int, session_token: str) -> TicketActionResponse:
        async with self._user_client(context, session_token) as client:
            await client.update_item("Ticket", ticket_id, {"status": 2})
        return TicketActionResponse(message="Atendimento retomado.", ticket_id=ticket_id)

    async def return_to_queue(self, context: str, ticket_id: int, session_token: str) -> TicketActionResponse:
        async with self._user_client(context, session_token) as client:
            await self._remove_assigned_technicians(client, ticket_id)
            await client.update_item("Ticket", ticket_id, {"status": 1})
        return TicketActionResponse(message="Ticket devolvido para a fila.", ticket_id=ticket_id)

    async def reopen_ticket(self, context: str, ticket_id: int, session_token: str) -> TicketActionResponse:
        async with self._user_client(context, session_token) as client:
            await client.update_item("Ticket", ticket_id, {"status": 2})
        return TicketActionResponse(message="Ticket reaberto.", ticket_id=ticket_id)

    async def transfer_ticket(
        self,
        context: str,
        ticket_id: int,
        payload: TicketTransferRequest,
        session_token: str,
    ) -> TicketActionResponse:
        async with self._user_client(context, session_token) as client:
            ticket = await client.get_item("Ticket", ticket_id)
            await self._replace_assigned_technician(client, ticket_id, payload.technician_user_id)
            if _as_int(ticket.get("status")) in {1, 4}:
                await client.update_item("Ticket", ticket_id, {"status": 2})
        return TicketActionResponse(message="Ticket transferido com sucesso.", ticket_id=ticket_id)

    async def approve_solution(
        self,
        context: str,
        ticket_id: int,
        session_token: str,
        actor_user_id: int,
        comment: str | None = None,
    ) -> TicketActionResponse:
        actor_user_id = self._require_actor_user_id(actor_user_id)
        async with self._user_client(context, session_token) as client:
            requester_user_id = await self._get_requester_user_id(client, ticket_id)
            self._ensure_requester_actor(requester_user_id, actor_user_id)

            solution = await self._get_target_solution(client, ticket_id, allowed_statuses={2, 3})
            solution_id = _as_int(solution.get("id"))
            if not solution_id:
                raise HTTPException(status_code=409, detail="Nao foi possivel identificar a solucao a aprovar.")

            approval_date = now_in_app_timezone().strftime("%Y-%m-%d %H:%M:%S")
            await client.update_item(
                "ITILSolution",
                solution_id,
                {
                    "status": 3,
                    "users_id_approval": actor_user_id,
                    "date_approval": approval_date,
                },
            )
            await client.create_item(
                "ITILFollowup",
                {
                    "itemtype": "Ticket",
                    "items_id": ticket_id,
                    "content": _normalize_comment(comment) or "Solucao aprovada pelo solicitante.",
                    "is_private": 0,
                    "users_id": actor_user_id,
                },
            )
            await client.update_item("Ticket", ticket_id, {"status": 6})
        return TicketActionResponse(message="Solucao aprovada e ticket fechado.", ticket_id=ticket_id)

    async def reject_solution(
        self,
        context: str,
        ticket_id: int,
        session_token: str,
        actor_user_id: int,
        comment: str | None = None,
    ) -> TicketActionResponse:
        actor_user_id = self._require_actor_user_id(actor_user_id)
        async with self._user_client(context, session_token) as client:
            requester_user_id = await self._get_requester_user_id(client, ticket_id)
            self._ensure_requester_actor(requester_user_id, actor_user_id)

            solution = await self._get_target_solution(client, ticket_id, allowed_statuses={2, 3})
            solution_id = _as_int(solution.get("id"))
            if not solution_id:
                raise HTTPException(status_code=409, detail="Nao foi possivel identificar a solucao a recusar.")

            approval_date = now_in_app_timezone().strftime("%Y-%m-%d %H:%M:%S")
            await client.update_item(
                "ITILSolution",
                solution_id,
                {
                    "status": 4,
                    "users_id_approval": actor_user_id,
                    "date_approval": approval_date,
                },
            )
            await client.create_item(
                "ITILFollowup",
                {
                    "itemtype": "Ticket",
                    "items_id": ticket_id,
                    "content": _normalize_comment(comment) or "Solucao recusada pelo solicitante.",
                    "is_private": 0,
                    "users_id": actor_user_id,
                },
            )
            await client.update_item("Ticket", ticket_id, {"status": 2})
        return TicketActionResponse(message="Solucao recusada e ticket reaberto.", ticket_id=ticket_id)

    async def _get_requester_user_id(self, client, ticket_id: int) -> int:
        ticket_users = await client.get_sub_items("Ticket", ticket_id, "Ticket_User")
        requester_link = next((item for item in ticket_users if _as_int(item.get("type")) == 1), None)
        requester_user_id = _as_int(requester_link.get("users_id")) if requester_link else 0
        if not requester_user_id:
            raise HTTPException(status_code=409, detail="Ticket sem solicitante definido para validacao.")
        return requester_user_id

    async def _get_target_solution(
        self,
        client,
        ticket_id: int,
        allowed_statuses: set[int] | None = None,
    ) -> dict[str, Any]:
        solutions = await client.get_sub_items("Ticket", ticket_id, "ITILSolution")
        if not solutions:
            raise HTTPException(status_code=409, detail="Ticket sem solucao registrada.")

        ordered = sorted(solutions, key=lambda item: _as_int(item.get("id")), reverse=True)
        if not allowed_statuses:
            return ordered[0]

        candidate = next(
            (item for item in ordered if _as_int(item.get("status"), 2) in allowed_statuses),
            None,
        )
        if candidate is None:
            allowed_text = ", ".join(str(status) for status in sorted(allowed_statuses))
            raise HTTPException(
                status_code=409,
                detail=f"Nao existe solucao apta para validacao (status permitidos: {allowed_text}).",
            )
        return candidate

    def _ensure_requester_actor(self, requester_user_id: int, actor_user_id: int) -> None:
        if requester_user_id != actor_user_id:
            raise HTTPException(
                status_code=403,
                detail="Apenas o solicitante do ticket pode aprovar ou recusar a solucao.",
            )

    async def _remove_assigned_technicians(self, client, ticket_id: int) -> None:
        users = await client.get_sub_items("Ticket", ticket_id, "Ticket_User")
        for binding in users:
            if _as_int(binding.get("type")) == 2 and _as_int(binding.get("id")):
                await client.delete_item("Ticket_User", _as_int(binding["id"]))

    async def _replace_assigned_technician(self, client, ticket_id: int, technician_user_id: int) -> None:
        await self._remove_assigned_technicians(client, ticket_id)
        await client.create_item(
            "Ticket_User",
            {
                "tickets_id": ticket_id,
                "users_id": technician_user_id,
                "type": 2,
            },
        )


service = TicketWorkflowService()
