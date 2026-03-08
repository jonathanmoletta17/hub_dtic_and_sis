from pydantic import BaseModel
from typing import List, Optional

class ProfileResponse(BaseModel):
    """Modelo de um perfil individual."""
    id: int
    name: str

class HubRole(BaseModel):
    """Papel de uso no Hub — traduzido a partir de profiles + groups GLPI."""
    role: str                              # "solicitante" | "tecnico-manutencao" | "tecnico-conservacao" | "tecnico" | "gestor"
    label: str                             # Nome amigável: "Central do Solicitante"
    profile_id: Optional[int] = None       # Profile GLPI de origem (None se veio de grupo)
    group_id: Optional[int] = None         # Grupo GLPI de origem (para sub-papéis técnicos)
    route: str                             # Rota alvo: "user" ou "dashboard"
    context_override: Optional[str] = None # Sub-contexto visual (ex: "sis-manutencao")

class RoleResponse(BaseModel):
    """Papéis derivados dos dados brutos da sessão."""
    active_profile: ProfileResponse
    available_profiles: List[ProfileResponse]
    groups: List[int]

class AuthMeResponse(BaseModel):
    """Identidade completa do usuário logado."""
    context: str
    user_id: int
    name: str
    realname: Optional[str] = None
    firstname: Optional[str] = None
    roles: RoleResponse
    hub_roles: List[HubRole] = []

class LoginRequest(BaseModel):
    """Credenciais do usuário para login real."""
    username: str
    password: str

class LoginResponse(BaseModel):
    """Resposta do login com dados de autenticação por contexto."""
    context: str
    session_token: str
    user_id: int
    name: str
    realname: Optional[str] = None
    firstname: Optional[str] = None
    roles: RoleResponse
    hub_roles: List[HubRole] = []
