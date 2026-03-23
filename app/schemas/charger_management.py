from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


TIME_PATTERN = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")

ChargerStatus = Literal["active", "inactive", "maintenance"]
AssignmentStatus = Literal["planned", "active", "completed", "canceled"]
InactiveReasonCode = Literal[
    "vacation",
    "medical_leave",
    "equipment_maintenance",
    "training",
    "administrative",
    "other",
]


class ActorIdentity(BaseModel):
    user_id: str
    role: str
    display_name: str | None = None
    request_id: str = "-"


class ChargerCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    department: str = Field(min_length=2, max_length=120)


class ChargerUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    department: str | None = Field(default=None, min_length=2, max_length=120)
    status: ChargerStatus | None = None


class ChargerResponse(BaseModel):
    id: int
    name: str
    department: str
    status: ChargerStatus
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class ChargerInactivationRequest(BaseModel):
    reason_code: InactiveReasonCode
    reason_text: str | None = Field(default=None, max_length=500)
    inactivated_at: datetime
    expected_return_at: datetime | None = None

    @model_validator(mode="after")
    def validate_reason(self) -> "ChargerInactivationRequest":
        if self.reason_code == "other":
            text = (self.reason_text or "").strip()
            if len(text) < 3:
                raise ValueError("reason_text is required when reason_code='other'.")
        if self.expected_return_at and self.expected_return_at <= self.inactivated_at:
            raise ValueError("expected_return_at must be greater than inactivated_at.")
        return self


class ChargerInactivationResponse(BaseModel):
    id: int
    charger_id: int
    reason_code: InactiveReasonCode
    reason_text: str | None
    inactivated_at: datetime
    expected_return_at: datetime | None
    created_by: str
    created_at: datetime


class TimeRuleCreateRequest(BaseModel):
    business_start: str = Field(description="HH:MM")
    business_end: str = Field(description="HH:MM")
    idle_threshold_minutes: int = Field(default=60, ge=0, le=1440)
    effective_from: datetime
    effective_to: datetime | None = None

    @model_validator(mode="after")
    def validate_time_window(self) -> "TimeRuleCreateRequest":
        if not TIME_PATTERN.match(self.business_start):
            raise ValueError("business_start must follow HH:MM.")
        if not TIME_PATTERN.match(self.business_end):
            raise ValueError("business_end must follow HH:MM.")
        if self.business_start >= self.business_end:
            raise ValueError("business_start must be lower than business_end.")
        if self.effective_to and self.effective_to <= self.effective_from:
            raise ValueError("effective_to must be greater than effective_from.")
        return self


class TimeRuleResponse(BaseModel):
    id: int
    charger_id: int
    business_start: str
    business_end: str
    idle_threshold_minutes: int
    effective_from: datetime
    effective_to: datetime | None
    created_at: datetime
    updated_at: datetime


class AssignmentCreateRequest(BaseModel):
    ticket_id: int = Field(gt=0)
    charger_id: int = Field(gt=0)
    planned_start_at: datetime
    planned_end_at: datetime

    @model_validator(mode="after")
    def validate_planned_window(self) -> "AssignmentCreateRequest":
        if self.planned_end_at <= self.planned_start_at:
            raise ValueError("planned_end_at must be greater than planned_start_at.")
        return self


class AssignmentStatusActionRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class AssignmentResponse(BaseModel):
    id: int
    ticket_id: int
    charger_id: int
    status: AssignmentStatus
    planned_start_at: datetime
    planned_end_at: datetime
    actual_start_at: datetime | None
    actual_end_at: datetime | None
    created_by: str
    created_at: datetime
    updated_at: datetime


class TicketSolutionRequest(BaseModel):
    solution_content: str = Field(min_length=5, max_length=4000)


class TicketSolutionResponse(BaseModel):
    ticket_id: int
    ticket_status: int
    message: str


class NotificationResponse(BaseModel):
    id: int
    event_type: str
    ticket_id: int | None
    payload: dict
    created_at: datetime
    sent: bool


class AuditEventResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    action: str
    actor_user_id: str
    actor_role: str
    before: dict | None
    after: dict | None
    details: dict | None
    created_at: datetime
    request_id: str


class ChargerReportItem(BaseModel):
    charger_id: int
    charger_name: str
    charger_status: ChargerStatus
    ticket_count: int
    planned_minutes: int
    acting_minutes: int
    idle_minutes: int


class ChargerReportResponse(BaseModel):
    start_at: datetime
    end_at: datetime
    assignment_status: AssignmentStatus | None
    charger_id: int | None
    data: list[ChargerReportItem]
