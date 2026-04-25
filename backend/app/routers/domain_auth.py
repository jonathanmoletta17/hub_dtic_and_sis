"""
Router: Auth — Identidade e Roles (Universal)
Router final refatorado (Thin Router). Lógica em auth_service.py.
"""
import hashlib

from fastapi import APIRouter, HTTPException, Request, Header, Depends
from app.config import settings
from app.core.cache import identity_cache
from app.core.rate_limit import limiter
from app.core.context_registry import registry
from app.core.auth_guard import verify_session
from app.core.glpi_client import GLPIClient
from pydantic import BaseModel
from typing import List

from app.schemas.auth_schemas import AuthMeResponse, LoginRequest, LoginResponse
import app.services.auth_service as auth_service

import logging
_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/{context}/auth", tags=["Auth"])


@router.get("/me", response_model=AuthMeResponse, operation_id="getMyIdentity")
@limiter.limit("200/minute")
async def get_my_identity(request: Request, context: str, auth_data: dict = Depends(verify_session)):
    """
    [Universal] Recupera a identidade logada e retorna os dados brutos da sessão GLPI.
    """
    session_token = auth_data["session_token"]
    token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()[:16]
    cache_key = f"auth_me_{context}_{token_hash}"
    
    session_data = await identity_cache.get_or_set(
        cache_key, 
        lambda: auth_service.fetch_session_identity(
            context,
            session_token=session_token,
            prefetched_session=auth_data.get("session") if isinstance(auth_data.get("session"), dict) else None,
        )
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
async def diagnose_access(request: Request, context: str, auth_data: dict = Depends(verify_session)):
    client = None
    try:
        session_token = auth_data["session_token"]
        session_data = await auth_service.fetch_session_identity(
            context,
            session_token=session_token,
            prefetched_session=auth_data.get("session") if isinstance(auth_data.get("session"), dict) else None,
        )
        session_info = session_data.get("session", {})
        app_access = session_data.get("app_access", [])
        login_resp = auth_service.build_login_response(context, session_token, session_info, app_access)

        ctx_cfg = registry.get(context)
        glpi_id = int(login_resp.user_id or 0)
        if not glpi_id:
            raise HTTPException(status_code=404, detail="Sessao GLPI sem usuario identificado.")

        profiles = [profile.name for profile in login_resp.roles.available_profiles]
        group_ids = list(login_resp.roles.groups)
        groups: List[str] = []

        instance = settings.get_glpi_instance(registry.get_base_context(context))
        client = GLPIClient.from_session_token(instance, session_token)
        for gid in group_ids:
            try:
                group = await client.get_item("Group", gid, expand_dropdowns="true")
                gname = str(group.get("completename") or group.get("name") or f"Group {gid}")
            except Exception:
                gname = f"Group {gid}"
            groups.append(gname)

        feature_to_app = {
            "search": "busca",
            "inventory": "inventario",
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
        hub_roles = [role.role for role in login_resp.hub_roles]
        has_permissoes_tag = any(g.lower().startswith("hub-app-permissoes") for g in groups)
        has_gestor_role = any(r == "gestor" for r in hub_roles)
        reasons: List[str] = []
        if not has_permissoes_tag:
            reasons.append("Usuário não está no grupo Hub-App-Permissoes.")
        if not has_gestor_role:
            reasons.append("Perfil não resolve para papel 'gestor'.")
        verdict = "OK" if not reasons else "; ".join(reasons)
        return DiagnoseAccessResponse(
            username=login_resp.name,
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
    finally:
        if client is not None:
            await client._http.aclose()

