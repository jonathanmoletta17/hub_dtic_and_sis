import logging
from typing import List
from fastapi import HTTPException
from app.core.session_manager import session_manager
from app.schemas.auth_schemas import ProfileResponse, HubRole, RoleResponse, LoginResponse


_log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════
# Regras de Negócio: Tradução GLPI → Hub Roles
# ═══════════════════════════════════════════════════════════

# Mapeamento DTIC: profile_id → hubRole
_DTIC_PROFILE_MAP = {
    9:  {"role": "solicitante", "label": "Central do Solicitante", "route": "user"},
    6:  {"role": "tecnico",     "label": "Console do Técnico",    "route": "dashboard"},
    20: {"role": "gestor",      "label": "Gestão e Administração", "route": "dashboard"},
}

# Mapeamento SIS: profile_id → hubRole
_SIS_PROFILE_MAP = {
    9: {"role": "solicitante", "label": "Portfólio de Chamados",  "route": "user"},
    3: {"role": "gestor",      "label": "Gestão Estratégica",     "route": "dashboard"},
}

# Grupos SIS → sub-papéis técnicos distintos
_SIS_GROUP_MAP = {
    22: {
        "role": "tecnico-manutencao",
        "label": "Manutenção e Conservação",
        "context_override": "sis-manutencao",
    },
    21: {
        "role": "tecnico-conservacao",
        "label": "Conservação e Memória",
        "context_override": "sis-memoria",
    },
}


async def fetch_session_identity(context: str) -> dict:
    """Helper que puxa os dados mastigados de sessão (Cacheável via roteador)."""
    try:
        client = await session_manager.get_client(context)
        session_data = await client.get_full_session()
        return session_data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro na API Auth GLPI: {str(e)}")


def resolve_hub_roles(
    context: str,
    available_profiles: List[ProfileResponse],
    groups: List[int],
) -> List[HubRole]:
    """
    Traduz perfis GLPI + grupos → papéis de uso do Hub.
    No SIS, cada grupo técnico gera um sub-papel distinto.
    """
    hub_roles: List[HubRole] = []
    seen_roles: set[str] = set()
    
    profile_ids = {p.id for p in available_profiles}
    is_sis = context in ("sis", "sis-manutencao", "sis-memoria")
    
    profile_map = _SIS_PROFILE_MAP if is_sis else _DTIC_PROFILE_MAP
    
    # 1. Mapear profiles reconhecidos → hubRoles
    for pid, role_def in profile_map.items():
        if pid in profile_ids and role_def["role"] not in seen_roles:
            hub_roles.append(HubRole(
                role=role_def["role"],
                label=role_def["label"],
                profile_id=pid,
                route=role_def["route"],
            ))
            seen_roles.add(role_def["role"])
    
    # 2. SIS: Cada grupo técnico → sub-papel distinto
    if is_sis:
        for gid, grp_def in _SIS_GROUP_MAP.items():
            if gid in groups and grp_def["role"] not in seen_roles:
                hub_roles.append(HubRole(
                    role=grp_def["role"],
                    label=grp_def["label"],
                    profile_id=None,
                    group_id=gid,
                    route="dashboard",
                    context_override=grp_def["context_override"],
                ))
                seen_roles.add(grp_def["role"])
    
    # 3. Fallback: se nenhum hubRole encontrado, dar pelo menos Solicitante
    if not hub_roles:
        hub_roles.append(HubRole(
            role="solicitante",
            label="Central do Solicitante",
            profile_id=9,
            route="user",
        ))
    
    # Ordenar: solicitante → técnicos → gestor
    order = {"solicitante": 0, "tecnico": 1, "tecnico-manutencao": 2, "tecnico-conservacao": 3, "gestor": 4}
    hub_roles.sort(key=lambda r: order.get(r.role, 99))
    
    return hub_roles


def build_login_response(context: str, session_token: str, session_info: dict) -> LoginResponse:
    """Constrói LoginResponse a partir dos dados de sessão GLPI."""
    glpi_id = session_info.get("glpiID", 0)
    glpi_name = session_info.get("glpiname", "Unknown")
    glpi_realname = session_info.get("glpirealname", "")
    glpi_firstname = session_info.get("glpifirstname", "")
    
    active_prof = session_info.get("glpiactiveprofile", {})
    active_profile = ProfileResponse(
        id=active_prof.get("id", 0) if isinstance(active_prof, dict) else 0,
        name=active_prof.get("name", "Unknown") if isinstance(active_prof, dict) else "Unknown"
    )

    glpiprofiles = session_info.get("glpiprofiles", {})
    available_profiles = []
    if isinstance(glpiprofiles, dict):
        for pid_str, pdata in glpiprofiles.items():
            if isinstance(pdata, dict):
                available_profiles.append(ProfileResponse(
                    id=int(pid_str),
                    name=pdata.get("name", "Unknown")
                ))
    
    groups_raw = session_info.get("glpigroups", [])
    groups = []
    if isinstance(groups_raw, list):
        for g in groups_raw:
            if isinstance(g, int):
                groups.append(g)
            elif isinstance(g, dict):
                gid = g.get("id")
                if gid: groups.append(gid)
    
    roles = RoleResponse(
        active_profile=active_profile,
        available_profiles=available_profiles,
        groups=groups,
    )
    
    hub_roles = resolve_hub_roles(context, available_profiles, groups)
    
    return LoginResponse(
        context=context,
        session_token=session_token,
        user_id=glpi_id,
        name=glpi_name,
        realname=glpi_realname,
        firstname=glpi_firstname,
        roles=roles,
        hub_roles=hub_roles,
    )


async def fallback_login(context: str, username: str) -> LoginResponse:
    """
    Fallback: usa sessão de serviço (user_token) para validar que o 
    usuário existe no GLPI e buscar seus perfis e grupos reais.
    """
    service_client = await session_manager.get_client(context)
    
    search_result = await service_client.search_items(
        "User",
        **{
            "criteria[0][field]": 1,        # name (login)
            "criteria[0][searchtype]": "contains",
            "criteria[0][value]": username,
            "forcedisplay[0]": 2,   # id
            "forcedisplay[1]": 1,   # name
            "forcedisplay[2]": 34,  # realname
            "forcedisplay[3]": 9,   # firstname
        }
    )
    
    total = search_result.get("totalcount", 0)
    if total == 0:
        raise HTTPException(status_code=401, detail=f"Usuário '{username}' não encontrado no GLPI.")
    
    data_rows = search_result.get("data", [])
    user_row = None
    for row in data_rows:
        row_name = row.get("1", "")
        if row_name.lower() == username.lower():
            user_row = row
            break
    
    if not user_row:
        raise HTTPException(status_code=401, detail=f"Usuário '{username}' não encontrado no GLPI.")
    
    glpi_id = int(user_row.get("2", 0))
    glpi_name = user_row.get("1", username)
    glpi_realname = user_row.get("34", "")
    glpi_firstname = user_row.get("9", "")
    
    _log.info("Fallback login: usuário '%s' encontrado (ID=%s) no contexto '%s'", username, glpi_id, context)
    
    available_profiles = []
    try:
        profile_links = await service_client.get_sub_items("User", glpi_id, "Profile_User")
        seen_profiles = set()
        for pu in profile_links:
            pid = pu.get("profiles_id", 0)
            if pid and pid not in seen_profiles:
                seen_profiles.add(pid)
                try:
                    prof_data = await service_client.get_item("Profile", pid)
                    pname = prof_data.get("name", f"Profile {pid}")
                except Exception:
                    pname = f"Profile {pid}"
                available_profiles.append(ProfileResponse(id=pid, name=pname))
    except Exception as prof_err:
        _log.warning("Falha ao buscar perfis do usuário %s: %s", glpi_id, prof_err)
    
    if not available_profiles:
        available_profiles.append(ProfileResponse(id=9, name="Self-Service"))
    
    active_profile = available_profiles[0]
    
    groups: List[int] = []
    try:
        group_links = await service_client.get_sub_items("User", glpi_id, "Group_User")
        for gu in group_links:
            gid = gu.get("groups_id", 0)
            if gid:
                groups.append(gid)
    except Exception as grp_err:
        _log.warning("Falha ao buscar grupos do usuário %s: %s", glpi_id, grp_err)
    
    service_token = service_client._session_token or "service-session"
    
    roles = RoleResponse(
        active_profile=active_profile,
        available_profiles=available_profiles,
        groups=groups,
    )
    
    hub_roles = resolve_hub_roles(context, available_profiles, groups)
    
    return LoginResponse(
        context=context,
        session_token=service_token,
        user_id=glpi_id,
        name=glpi_name,
        realname=glpi_realname,
        firstname=glpi_firstname,
        roles=roles,
        hub_roles=hub_roles,
    )
