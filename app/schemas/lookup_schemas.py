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
