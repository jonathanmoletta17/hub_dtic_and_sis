import logging
from typing import List, Optional
from fastapi import HTTPException
from app.core.session_manager import session_manager
from app.schemas.auth_schemas import (
    ProfileResponse, HubRole, RoleResponse, AuthMeResponse, LoginResponse
)
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.config import settings


_log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════
# Regras de Negócio: Tradução GLPI → Hub Roles
# ═══════════════════════════════════════════════════════════

from app.core.context_registry import registry, ContextConfig


async def resolve_app_access(client, user_id: int) -> List[str]:
    """Busca grupos do user e extrai os que começam com Hub-App-*."""
    if not user_id:
        return []
    try:
        group_links = await client.get_sub_items("User", user_id, "Group_User")
        app_access = []
        for gl in group_links:
            gid = gl.get("groups_id")
            if not gid: continue
            try:
                group = await client.get_item("Group", gid)
                name = group.get("name", "")
                if name.startswith("Hub-App-"):
                    app_id = name.replace("Hub-App-", "").lower()
                    app_access.append(app_id)
            except Exception as e:
                _log.warning(f"Erro ao buscar detalhes do grupo {gid}: {e}")
        return app_access
    except Exception as e:
        _log.warning(f"Erro ao extrair app_access para user {user_id}: {e}")
        return []

async def fetch_session_identity(context: str) -> dict:
    """Helper que puxa os dados mastigados de sessão (Cacheável via roteador)."""
    try:
        client = await session_manager.get_client(context)
        session_data = await client.get_full_session()
        
        session_info = session_data.get("session", {})
        user_id = session_info.get("glpiID", 0)
        
        app_access = await resolve_app_access(client, user_id)
        
        return {
            "session": session_info,
            "app_access": app_access
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro na API Auth GLPI: {str(e)}")


def resolve_hub_roles(
    context: str,
    available_profiles: List[ProfileResponse],
    groups: List[int],
) -> List[HubRole]:
    """
    Traduz perfis GLPI + grupos → papéis de uso do Hub usando o Registry.
    """
    hub_roles: List[HubRole] = []
    seen_roles: set[str] = set()
    profile_ids = {p.id for p in available_profiles}
    
    try:
        cfg = registry.get(context)
    except KeyError:
        # Fallback de segurança se o registry falhar (embora improvável se a API chamou o context real)
        cfg = ContextConfig(id=context, label=context, glpi_url="", glpi_user_token="", glpi_app_token="",
                            db_host="", db_port=0, db_name="", db_user="", db_pass="", db_context=context,
                            color="", theme="", features=[], profile_map={}, group_map={})
    
    # 1. Definir roles via Profiles mapeados
    for pid, role_def in cfg.profile_map.items():
        if pid in profile_ids and role_def.role not in seen_roles:
            hub_roles.append(HubRole(
                role=role_def.role,
                label=role_def.label,
                profile_id=pid,
                route=role_def.route,
                context_override=role_def.context_override,
            ))
            seen_roles.add(role_def.role)
    
    # 2. Definir sub-roles via Grupos mapeados (ex: SIS conservação)
    for gid, role_def in cfg.group_map.items():
        if gid in groups and role_def.role not in seen_roles:
            hub_roles.append(HubRole(
                role=role_def.role,
                label=role_def.label,
                profile_id=None,
                group_id=gid,
                route=role_def.route,
                context_override=role_def.context_override,
            ))
            seen_roles.add(role_def.role)
    
    # 3. Fallback absoluto solicitante padrão
    if not hub_roles:
        hub_roles.append(HubRole(
            role="solicitante",
            label="Central do Solicitante",
            profile_id=9,
            route="user",
        ))
    
    # Ordenar: básico -> avançado
    order = {"solicitante": 0, "tecnico": 1, "tecnico-manutencao": 2, "tecnico-conservacao": 3, "gestor": 4}
    hub_roles.sort(key=lambda r: order.get(r.role, 99))
    
    return hub_roles


def build_login_response(context: str, session_token: str, session_info: dict, app_access: Optional[List[str]] = None) -> LoginResponse:
    """Constrói LoginResponse a partir dos dados de sessão GLPI."""
    if app_access is None:
        app_access = []
        
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
        app_access=app_access,
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
    user_row: dict = {}
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
    app_access = await resolve_app_access(service_client, glpi_id)
    
    return LoginResponse(
        context=context,
        session_token=service_token,
        user_id=glpi_id,
        name=glpi_name,
        realname=glpi_realname,
        firstname=glpi_firstname,
        roles=roles,
        hub_roles=hub_roles,
        app_access=app_access,
    )


async def perform_login(context: str, body) -> LoginResponse:
    """
    Centraliza a lógica de autenticação: Basic Auth -> Fallback.
    """
    instance = settings.get_glpi_instance(context)
    client = GLPIClient(instance)
    
    try:
        # ── Tentativa 1: Basic Auth real ──
        await client.init_session_basic(body.username, body.password)
        session_token = client._session_token
        
        session_data = await client.get_full_session()
        session_info = session_data.get("session", {})
        
        user_id = session_info.get("glpiID", 0)
        app_access = await resolve_app_access(client, user_id)
        
        return build_login_response(context, session_token, session_info, app_access)
        
    except GLPIClientError as e:
        if e.status_code and e.status_code in [401, 403]:
            _log.warning(
                "Basic Auth rejeitado pelo GLPI para '%s' (HTTP %s). Tentando fallback via user_token...",
                body.username, e.status_code
            )
            # ── Tentativa 2: Fallback via user_token de serviço ──
            try:
                return await fallback_login(context, body.username)
            except HTTPException:
                raise
            except Exception as fb_err:
                _log.error("Fallback de login falhou: %s", fb_err)
                raise HTTPException(status_code=401, detail="Credenciais inválidas ou acesso negado pelo GLPI.")
        raise HTTPException(status_code=502, detail=f"Erro na API GLPI: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno de autenticação: {str(e)}")
    finally:
        await client._http.aclose()


async def perform_logout(context: str, session_token: str):
    """
    Invalida a sessão no GLPI.
    """
    try:
        instance = settings.get_glpi_instance(context)
        client = GLPIClient.from_session_token(instance, session_token)
        await client.kill_session()
        await client._http.aclose()
    except Exception as e:
        _log.error("Erro no logout: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao efetuar logout: {str(e)}")
