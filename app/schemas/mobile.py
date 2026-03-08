from pydantic import BaseModel, Field
from typing import List, Optional

class TimelineItem(BaseModel):
    id: int
    content: str
    date: str
    author: str
    type: str = Field(..., description="'task', 'followup', 'solution'")
    status: Optional[int] = Field(None, description="Apenas aplicável para solutions")

class TicketMobileDetail(BaseModel):
    id: int
    glpi_id: int
    title: str
    description: str
    status: int
    priority: int
    creation_date: str
    solve_date: Optional[str] = None
    requester: str
    technician: str
    timeline: List[TimelineItem] = []

class TicketValidateSolutionCommand(BaseModel):
    approved: bool = Field(..., description="True para Aprovar, False para Recusar")
    feedback: Optional[str] = Field(None, description="Justificativa, obrigatória se recusado")

    def to_glpi_payload(self) -> dict:
        return {
            "status": 3 if self.approved else 4, # 3=Accepted, 4=Refused
            "comment_submission": self.feedback if self.feedback else "",
        }

class TicketAssignCommand(BaseModel):
    technician_glpi_id: int = Field(..., description="ID do usuário GLPI a ser designado como Técnico no Chamado")
