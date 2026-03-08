"""
Router: Auth — Identidade e Roles (Universal)
Router final refatorado (Thin Router). Lógica em auth_service.py.
"""
from fastapi import APIRouter, HTTPException, Request, Header
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.core.cache import identity_cache
from app.core.rate_limit import limiter
from app.config import settings

from app.schemas.auth_schemas import AuthMeResponse, LoginRequest, LoginResponse
from app.services import auth_service

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
        
        # Constrói o response inicial via helper comum (ignorando token na response /me)
        login_resp = auth_service.build_login_response(context, "dummy_token", session_info)
        
        return AuthMeResponse(
            context=login_resp.context,
            user_id=login_resp.user_id,
            name=login_resp.name,
            realname=login_resp.realname,
            firstname=login_resp.firstname,
            roles=login_resp.roles,
            hub_roles=login_resp.hub_roles,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro parseando JSON de sessão: {str(e)}")


@router.post("/login", response_model=LoginResponse, operation_id="loginUser")
async def login_user(request: Request, context: str, body: LoginRequest):
    """
    [Universal] Autenticação Híbrida: tenta Basic Auth real no GLPI.
    Se falhar, usa fallback_login.
    """
    instance = settings.get_glpi_instance(context)
    client = GLPIClient(instance)
    
    try:
        # ── Tentativa 1: Basic Auth real ──
        await client.init_session_basic(body.username, body.password)
        session_token = client._session_token
        
        session_data = await client.get_full_session()
        session_info = session_data.get("session", {})
        
        return auth_service.build_login_response(context, session_token, session_info)
        
    except GLPIClientError as e:
        if e.status_code and e.status_code in [401, 403]:
            _log.warning(
                "Basic Auth rejeitado pelo GLPI para '%s' (HTTP %s). Tentando fallback via user_token...",
                body.username, e.status_code
            )
            # ── Tentativa 2: Fallback via user_token de serviço ──
            try:
                return await auth_service.fallback_login(context, body.username)
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


@router.post("/logout", operation_id="logoutUser")
async def logout_user(context: str, session_token: str = Header(..., alias="Session-Token")):
    """
    [Universal] Invalida o token de Sessão HTTP do GLPI, destruindo o acesso.
    """
    try:
        instance = settings.get_glpi_instance(context)
        client = GLPIClient.from_session_token(instance, session_token)
        await client.kill_session()
        await client._http.aclose()
        return {"success": True, "message": "Logout com sucesso. Sessão destruída no GLPI."}
    except Exception as e:
        _log.error("Erro no logout: %s", e)
        raise HTTPException(status_code=500, detail=f"Erro ao efetuar logout: {str(e)}")

