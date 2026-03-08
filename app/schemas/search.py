"""
Schemas: Search Response
Modelos Pydantic para o endpoint de busca de tickets.
"""

from pydantic import BaseModel, Field
from typing import Optional


class TicketSearchItem(BaseModel):
    """Ticket individual retornado pela busca."""

    id: int
    title: str
    content: str = ""
    status_id: int = Field(alias="statusId")
    status: str
    urgency_id: int = Field(alias="urgencyId")
    urgency: str
    priority: int
    date_created: str = Field(alias="dateCreated")
    date_modified: Optional[str] = Field(None, alias="dateModified")
    solve_date: Optional[str] = Field(None, alias="solveDate")
    close_date: Optional[str] = Field(None, alias="closeDate")
    entity: Optional[str] = None
    category: str = "Sem categoria"
    requester: str = "N/A"
    technician: str = "N/A"
    group: Optional[str] = None
    relevance: float = 0.0

    model_config = {"populate_by_name": True}


class SearchResponse(BaseModel):
    """Resposta padronizada do endpoint de busca."""

    total: int
    query: str
    context: str
    department: Optional[str] = None
    data: list[TicketSearchItem]
