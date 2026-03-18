from pydantic import BaseModel
from typing import List

class LookupLocation(BaseModel):
    id: int
    name: str
    completename: str

class LocationsResponse(BaseModel):
    context: str
    locations: List[LookupLocation]

class LookupCategory(BaseModel):
    id: int
    name: str
    completename: str

class CategoriesResponse(BaseModel):
    context: str
    categories: List[LookupCategory]

class LookupTechnician(BaseModel):
    id: int
    name: str
    login: str

class TechniciansResponse(BaseModel):
    context: str
    technicians: List[LookupTechnician]


class LookupNamedOption(BaseModel):
    id: int
    name: str


class LookupGroupOption(BaseModel):
    id: int
    name: str
    completename: str


class UsersResponse(BaseModel):
    context: str
    users: List[LookupTechnician]


class StatesResponse(BaseModel):
    context: str
    states: List[LookupNamedOption]


class ManufacturersResponse(BaseModel):
    context: str
    manufacturers: List[LookupNamedOption]


class GroupsResponse(BaseModel):
    context: str
    groups: List[LookupGroupOption]


class ModelsResponse(BaseModel):
    context: str
    itemtype: str
    models: List[LookupNamedOption]
