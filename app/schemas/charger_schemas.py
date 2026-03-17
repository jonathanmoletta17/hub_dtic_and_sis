from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from app.core.datetime_contract import AwareDateTime, now_in_app_timezone

# Regex para validação rigorosa de formato HH:MM (00:00 - 23:59)
HH_MM_REGEX = r"^([01]\d|2[0-3]):[0-5]\d$"

class ScheduleBase(BaseModel):
    business_start: str = Field("08:00", pattern=HH_MM_REGEX)
    business_end: str = Field("18:00", pattern=HH_MM_REGEX)
    work_on_weekends: bool = False

class ScheduleUpdate(ScheduleBase):
    pass

class ChargerScheduleReadResponse(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)

class ScheduleResponse(ScheduleBase):
    charger_id: int
    updated_at: AwareDateTime
    model_config = ConfigDict(from_attributes=True)

class GlobalScheduleUpdate(ScheduleBase):
    pass

class GlobalScheduleResponse(ScheduleBase):
    id: int
    updated_at: AwareDateTime
    model_config = ConfigDict(from_attributes=True)

# --- Status Offline ---

class OfflineBase(BaseModel):
    is_offline: bool = False
    reason: Optional[str] = None
    expected_return: Optional[str] = Field(None, pattern=HH_MM_REGEX)

class OfflineUpdate(OfflineBase):
    pass

class ChargerOfflineReadResponse(OfflineBase):
    model_config = ConfigDict(from_attributes=True)

class OfflineResponse(OfflineBase):
    charger_id: int
    offline_since: Optional[AwareDateTime] = None
    updated_at: AwareDateTime
    model_config = ConfigDict(from_attributes=True)

# --- Kanban ---

class KanbanDemand(BaseModel):
    id: int
    name: str                           # Nome do ticket
    status: int
    priority: int
    date_creation: AwareDateTime
    location: Optional[str] = None
    category: Optional[str] = None
    requester_name: Optional[str] = None
    time_elapsed: str = "0h 0m"         # Calculado no service

class KanbanLastTicket(BaseModel):
    id: int
    title: str
    solvedate: Optional[AwareDateTime] = None
    location: Optional[str] = None

class KanbanAvailableResource(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    is_offline: bool = False
    offline_reason: Optional[str] = None
    expected_return: Optional[str] = None
    business_start: str = "08:00"
    business_end: str = "18:00"
    lastTicket: Optional[KanbanLastTicket] = None

class ChargerInTicket(BaseModel):
    id: int
    name: str
    assigned_date: Optional[AwareDateTime] = None
    service_time_minutes: int = 0
    schedule: Optional[ScheduleBase] = None

class KanbanAllocatedResource(BaseModel):
    ticket_id: int
    title: str
    date: Optional[AwareDateTime] = None          # Data de abertura do ticket
    status: int = 1                     # Status GLPI (1-4 para ativos)
    category: Optional[str] = None
    location: Optional[str] = None
    time_elapsed: str = "0h 0m"
    requester_name: Optional[str] = None
    chargers: List[ChargerInTicket] = []

class KanbanResponse(BaseModel):
    context: str
    demands: List[KanbanDemand]
    availableResources: List[KanbanAvailableResource]
    allocatedResources: List[KanbanAllocatedResource]
    timestamp: AwareDateTime = Field(default_factory=now_in_app_timezone)
# --- Ranking ---

class RankingItem(BaseModel):
    id: int
    name: str
    completed_tickets: int
    average_wait_time: str
    total_service_minutes: int = 0
    last_activity: Optional[AwareDateTime] = None

class RankingResponse(BaseModel):
    context: str
    ranking: List[RankingItem]
    timestamp: AwareDateTime = Field(default_factory=now_in_app_timezone)

# --- CRUD de Carregadores ---
class ChargerCreate(BaseModel):
    name: str = Field(..., description="Nome do Carregador")
    locations_id: int = Field(0, description="ID da localização no GLPI")

class ChargerUpdate(BaseModel):
    name: str = Field(..., description="Nome do Carregador")
    locations_id: int = Field(0, description="ID da localização no GLPI")

class MultipleAssignment(BaseModel):
    charger_ids: List[int]

class BatchActionUpdate(BaseModel):
    charger_ids: List[int]
    update_schedule: bool = False
    schedule: Optional[ScheduleUpdate] = None
    update_offline: bool = False
    offline: Optional[OfflineUpdate] = None

# --- Detalhes do Ticket ---

class LastTicketBrief(BaseModel):
    id: int = 0
    title: str = ""
    solvedate: Optional[AwareDateTime] = None
    location: Optional[str] = None

class AvailableChargerBrief(BaseModel):
    id: int
    name: str
    is_offline: bool = False
    lastTicket: Optional[LastTicketBrief] = None

class TicketDetailResponse(BaseModel):
    id: int
    name: str
    content: Optional[str] = None       # Descrição HTML do ticket
    date: Optional[AwareDateTime] = None          # Data de abertura
    status: int = 1
    priority: int = 3
    location: Optional[str] = None
    category: Optional[str] = None
    requester_name: Optional[str] = None
    chargers: List[ChargerInTicket] = []
    available_chargers: List[AvailableChargerBrief] = []

