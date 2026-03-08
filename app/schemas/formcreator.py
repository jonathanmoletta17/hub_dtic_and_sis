from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class ServiceCategory(BaseModel):
    id: int
    name: str
    parent_id: int
    level: int
    completename: Optional[str] = None

class ServiceForm(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category_id: int
    icon: Optional[str] = None
    icon_color: Optional[str] = None
    background_color: Optional[str] = None

class FormLookupRef(BaseModel):
    source: str
    params: Dict[str, Any] = {}

class FormOption(BaseModel):
    label: str
    value: Any

class FormQuestion(BaseModel):
    id: int
    name: str
    fieldtype: str
    required: bool
    description: Optional[str] = None
    default_value: Any = None
    options: Optional[List[FormOption]] = None
    lookup: Optional[FormLookupRef] = None
    layout: Dict[str, int] = {}
    show_rule: Optional[int] = None

class FormSection(BaseModel):
    id: int
    name: str
    order: int
    questions: List[FormQuestion]
    show_rule: Optional[int] = None

class FormCondition(BaseModel):
    id: int
    controller_question_id: int
    target_itemtype: str
    target_items_id: int
    show_condition: int
    show_logic: int
    show_value: str
    order: int

class FormSchema(BaseModel):
    form: Dict[str, Any]
    sections: List[FormSection]
    conditions: List[FormCondition]
    regexes: List[Dict[str, Any]] = []
    ranges: List[Dict[str, Any]] = []

class SubmitFormRequest(BaseModel):
    answers: Dict[str, Any]

class SubmitFormResponse(BaseModel):
    form_answer_id: int
    message: str
    ticket_ids: List[int] = []

class LookupItem(BaseModel):
    id: int
    name: str
    completename: Optional[str] = None

class LookupResponse(BaseModel):
    items: List[LookupItem]
