from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.core.datetime_contract import AwareDateTime


class TicketUrgency:
    VERY_LOW = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    VERY_HIGH = 5


class TicketType:
    INCIDENT = 1
    REQUEST = 2


class TicketCreateCommand(BaseModel):
    title: str = Field(..., max_length=255, description="Titulo do chamado")
    description: str = Field(..., description="Descricao completa e detalhada")
    requester_id: int = Field(..., description="ID GLPI do solicitante")
    category_id: int = Field(..., description="ITILCategory ID associado")
    location_id: int = Field(..., description="Location ID onde ocorre o problema")
    group_tech_id: Optional[int] = Field(None, description="Grupo Tecnico Responsavel")

    urgency: int = Field(default=TicketUrgency.MEDIUM, description="Urgencia 1-5")
    type: int = Field(default=TicketType.REQUEST, description="1=Incidente, 2=Requisicao")

    def to_glpi_payload(self) -> dict:
        payload = {
            "name": self.title,
            "content": self.description,
            "urgency": self.urgency,
            "type": self.type,
            "itilcategories_id": self.category_id,
            "locations_id": self.location_id,
        }
        return payload


class TicketSolutionCommand(BaseModel):
    solution_type_id: int = Field(..., description="SolutionTemplate ID")
    content: str = Field(..., description="Texto da solucao final")

    def to_glpi_payload(self) -> dict:
        return {
            "solutiontypes_id": self.solution_type_id,
            "content": self.content,
        }


class TicketWorkflowTicket(BaseModel):
    id: int
    title: str
    content: str = ""
    category: str = "Sem categoria"
    status_id: int
    status: str
    urgency_id: int
    urgency: str
    priority: int
    type: int
    date_created: AwareDateTime
    date_modified: AwareDateTime
    solve_date: Optional[AwareDateTime] = None
    close_date: Optional[AwareDateTime] = None
    location: Optional[str] = None
    entity_name: Optional[str] = None


class TicketTimelineEntry(BaseModel):
    id: int
    type: Literal["followup", "solution", "task"]
    content: str
    date: AwareDateTime
    user_id: int
    user_name: str
    is_private: bool
    action_time: Optional[int] = None
    solution_status: Optional[int] = None


class TicketWorkflowFlags(BaseModel):
    is_new: bool
    is_in_progress: bool
    is_pending: bool
    is_resolved: bool
    is_closed: bool
    has_assigned_technician: bool


class TicketWorkflowDetailResponse(BaseModel):
    ticket: TicketWorkflowTicket
    requester_name: str = ""
    requester_user_id: Optional[int] = None
    technician_name: str = ""
    technician_user_id: Optional[int] = None
    group_name: str = ""
    timeline: list[TicketTimelineEntry]
    flags: TicketWorkflowFlags


class TicketActionResponse(BaseModel):
    success: bool = True
    message: str
    ticket_id: int


class TicketStatusActionRequest(BaseModel):
    actor_user_id: Optional[int] = None


class TicketFollowupCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    user_id: int
    is_private: bool = False


class TicketSolutionCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    user_id: int


class TicketAssumeRequest(BaseModel):
    technician_user_id: int


class TicketTransferRequest(BaseModel):
    technician_user_id: int


class TicketSolutionApprovalRequest(BaseModel):
    comment: str = ""
