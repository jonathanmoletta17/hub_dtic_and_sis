from pydantic import BaseModel, Field
from typing import Optional

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
    title: str = Field(..., max_length=255, description="Título do chamado")
    description: str = Field(..., description="Descrição completa e detalhada")
    requester_id: int = Field(..., description="ID GLPI do solicitante")
    category_id: int = Field(..., description="ITILCategory ID associado")
    location_id: int = Field(..., description="Location ID onde ocorre o problema")
    group_tech_id: Optional[int] = Field(None, description="Grupo Técnico Responsável")
    
    # Defaults
    urgency: int = Field(default=TicketUrgency.MEDIUM, description="Urgência 1-5")
    type: int = Field(default=TicketType.REQUEST, description="1=Incidente, 2=Requisição")
    
    def to_glpi_payload(self) -> dict:
        """
        Converte o schema robusto no JSON Payload exigido pela API GLPI.
        """
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
    content: str = Field(..., description="Texto da solução final")
    
    def to_glpi_payload(self) -> dict:
        return {
            "solutiontypes_id": self.solution_type_id,
            "content": self.content
        }
