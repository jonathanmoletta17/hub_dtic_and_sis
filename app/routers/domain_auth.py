"""
Router: Auth — Identidade e Roles (Universal)
Router final refatorado (Thin Router). Lógica em auth_service.py.
"""
from fastapi import APIRouter, HTTPException, Request, Header
from app.core.cache import identity_cache
from app.core.rate_limit import limiter
from app.core.session_manager import session_manager
from app.core.context_registry import registry
from pydantic import BaseModel
from typing import List

from app.schemas.auth_schemas import AuthMeResponse, LoginRequest, LoginResponse, ProfileResponse
import app.services.auth_service as auth_service

import logging
_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/{context}/auth", tags=["Auth"])


@router.get("/me", response_model=AuthMeResponse, operation_id="getMyIdentity")
@limiter.limit("200/minute")
async def get_my_identity(request: Request, context: str):
    """
    [Universal] Recupera a identidade logada e retorna os dados brutos da sessão GLPI.
    """
    cache_key = f"auth_me_{context}"
    
    session_data = await identity_cache.get_or_set(
        cache_key, 
        lambda: auth_service.fetch_session_identity(context)
    )
    
    try:
        session_info = session_data.get("session", {})
        app_access = session_data.get("app_access", [])
        
        # Constrói o response inicial via helper comum (ignorando token na response /me)
        login_resp = auth_service.build_login_response(context, "dummy_token", session_info, app_access)
        
        return AuthMeResponse(
            context=login_resp.context,
            user_id=login_resp.user_id,
            name=login_resp.name,
            realname=login_resp.realname,
            firstname=login_resp.firstname,
            roles=login_resp.roles,
            hub_roles=login_resp.hub_roles,
            app_access=login_resp.app_access,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro parseando JSON de sessão: {str(e)}")


@router.post("/login", response_model=LoginResponse, operation_id="loginUser")
async def login_user(request: Request, context: str, body: LoginRequest):
    """
    [Universal] Autenticação Híbrida: tenta Basic Auth real no GLPI via Service.
    """
    return await auth_service.perform_login(context, body)


@router.post("/logout", operation_id="logoutUser")
async def logout_user(context: str, session_token: str = Header(..., alias="Session-Token")):
    """
    [Universal] Invalida a sessão via Service.
    """
    await auth_service.perform_logout(context, session_token)
    return {"success": True, "message": "Logout com sucesso. Sessão destruída no GLPI."}


class DiagnoseAccessResponse(BaseModel):
    username: str
    user_id: int
    profiles: List[str]
    groups: List[str]
    app_access: List[str]
    expected_app_access: List[str]
    missing_app_access: List[str]
    extra_app_access: List[str]
    hub_roles: List[str]
    has_permissoes_tag: bool
    has_gestor_role: bool
    verdict: str


@router.get("/diagnose-access", response_model=DiagnoseAccessResponse, operation_id="diagnoseAccess")
@limiter.limit("100/minute")
async def diagnose_access(request: Request, context: str, username: str):
    try:
        client = await session_manager.get_client(context)
        ctx_cfg = registry.get(context)
        search_result = await client.search_items(
            "User",
            **{
                "criteria[0][field]": 1,
                "criteria[0][searchtype]": "contains",
                "criteria[0][value]": username,
                "forcedisplay[0]": 2,
                "forcedisplay[1]": 1,
                "forcedisplay[2]": 34,
                "forcedisplay[3]": 9,
            }
        )
        total = search_result.get("totalcount", 0)
        if total == 0:
            raise HTTPException(status_code=404, detail=f"Usuário '{username}' não encontrado.")
        data_rows = search_result.get("data", [])
        user_row: dict = {}
        for row in data_rows:
            row_name = row.get("1", "")
            if row_name and row_name.lower() == username.lower():
                user_row = row
                break
        if not user_row and data_rows:
            user_row = data_rows[0]
        glpi_id = int(user_row.get("2", 0))
        if not glpi_id:
            raise HTTPException(status_code=404, detail=f"Usuário '{username}' inválido.")
        profile_links = await client.get_sub_items("User", glpi_id, "Profile_User")
        profiles: List[str] = []
        available_profiles = []
        seen_profiles = set()
        for pu in profile_links:
            pid = pu.get("profiles_id")
            if not pid or pid in seen_profiles:
                continue
            seen_profiles.add(pid)
            try:
                prof_data = await client.get_item("Profile", pid)
                pname = prof_data.get("name", f"Profile {pid}")
            except Exception:
                pname = f"Profile {pid}"
            profiles.append(pname)
            available_profiles.append(ProfileResponse(id=pid, name=pname))
        group_links = await client.get_sub_items("User", glpi_id, "Group_User")
        groups: List[str] = []
        group_ids: List[int] = []
        for gu in group_links:
            gid = gu.get("groups_id")
            if not gid:
                continue
            group_ids.append(gid)
            try:
                g = await client.get_item("Group", gid)
                gname = g.get("name", f"Group {gid}")
            except Exception:
                gname = f"Group {gid}"
            groups.append(gname)
        app_access = await auth_service.resolve_app_access(client, glpi_id)
        feature_to_app = {
            "search": "busca",
            "chargers": "carregadores",
            "permissoes": "permissoes",
        }
        expected_app_access = []
        for feat in ctx_cfg.features:
            app_id = feature_to_app.get(feat)
            if app_id:
                expected_app_access.append(app_id)
        missing_app_access = [a for a in expected_app_access if a not in app_access]
        extra_app_access = [a for a in app_access if a not in expected_app_access]
        hub_roles_objs = auth_service.resolve_hub_roles(context, available_profiles, group_ids)
        hub_roles = [r.role for r in hub_roles_objs]
        has_permissoes_tag = any(g.lower().startswith("hub-app-permissoes") for g in groups)
        has_gestor_role = any(r == "gestor" for r in hub_roles)
        reasons: List[str] = []
        if not has_permissoes_tag:
            reasons.append("Usuário não está no grupo Hub-App-Permissoes.")
        if not has_gestor_role:
            reasons.append("Perfil não resolve para papel 'gestor'.")
        verdict = "OK" if not reasons else "; ".join(reasons)
        return DiagnoseAccessResponse(
            username=username,
            user_id=glpi_id,
            profiles=profiles,
            groups=groups,
            app_access=app_access,
            expected_app_access=expected_app_access,
            missing_app_access=missing_app_access,
            extra_app_access=extra_app_access,
            hub_roles=hub_roles,
            has_permissoes_tag=has_permissoes_tag,
            has_gestor_role=has_gestor_role,
            verdict=verdict,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no diagnóstico: {str(e)}")

