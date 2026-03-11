import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth_guard import verify_session
from app.services.auth_service import resolve_hub_roles
from app.schemas.auth_schemas import ProfileResponse
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.config import settings
from app.core.context_registry import registry
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/{context}/admin",
    tags=["Admin"],
)

class AdminUserResponse(BaseModel):
    id: int
    username: str
    realname: str
    firstname: str
    profiles: List[str]
    groups: List[str]
    app_access: List[str]
    roles: List[str]


def validate_hub_app_group(context: str, group_id: int) -> bool:
    """Valida se o group_id pertence a um grupo Hub-App no contexto atual."""
    # Extraído do componente PermissionsMatrix.tsx do frontend para manter a fidelidade perfeita do contrato
    allowed_groups = {
        "dtic": [109, 110, 112, 113, 114],  # Hub-App-busca (109), Hub-App-permissoes (110)
        "sis": [102, 104, 105]              # Hub-App-busca (102), Hub-App-carregadores (104)
    }
    return group_id in allowed_groups.get(context, [])

async def _fetch_all_paginated(client: GLPIClient, itemtype: str, max_limit: int = 5000, **params) -> List[dict]:
    """Helper para contornar limites padrão de paginação do GLPI (como o default 30 itens/página)."""
    results = []
    start = 0
    step = 100
    while start < max_limit:
        try:
            batch = await client.get_all_items(itemtype, range_start=start, range_end=start + step - 1, **params)
        except GLPIClientError as e:
            # GLPI retorna 400 ou 416 (Normalmente 400 com body ["ERROR_RANGE_EXCEED_TOTAL", ...]) quando a paginacao excede
            if e.status_code in (400, 416):
                break
            raise
            
        if not isinstance(batch, list) or len(batch) == 0:
            break
            
        results.extend(batch)
        
        # A própria API do GLPI pode limitar a entrega em, ex, 30 itens por frame se a configuração do profile exigir.
        # Portanto iteramos a partir do start original + quantos ele efetivamente entregou:
        start += len(batch)
        
    return results



async def _get_glpi_client(context: str, auth_data: dict) -> GLPIClient:
    token = auth_data.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Token no session")
    instance = settings.get_glpi_instance(context)
    return GLPIClient.from_session_token(instance, token)

async def _require_gestor_cross_context(
    context: str, 
    target_context: Optional[str] = None,
    auth_data: dict = Depends(verify_session)
):
    """Verifica se o usuário executando a chamada possui a Role Hub-App 'gestor'.
    Suporta gerência Cross-Context escalando privileges para Service Account
    quando o target é diferente da origem do token.
    """
    target = target_context or context
    client_origin = await _get_glpi_client(context, auth_data)
    try:
        session_data = await client_origin.get_full_session()
        session_info = session_data.get("session", {})
        
        # Obter perfis ativos
        glpiprofiles = session_info.get("glpiprofiles", {})
        available_profiles = []
        if isinstance(glpiprofiles, dict):
            for pid_str, pdata in glpiprofiles.items():
                if isinstance(pdata, dict):
                    available_profiles.append(ProfileResponse(
                        id=int(pid_str),
                        name=pdata.get("name", "Unknown")
                    ))
        
        # Obter grupos
        groups_raw = session_info.get("glpigroups", [])
        groups = []
        if isinstance(groups_raw, list):
            for g in groups_raw:
                if isinstance(g, int):
                    groups.append(g)
                elif isinstance(g, dict):
                    gid = g.get("id")
                    if gid: groups.append(gid)
                    
        hub_roles = resolve_hub_roles(context, available_profiles, groups)
        if not any(r.role == "gestor" for r in hub_roles):
            raise HTTPException(status_code=403, detail="Acesso negado: Requer role gestor.")
            
        admin_id = session_info.get("glpiID", 0)
        
        # Cross Context Elevation
        if target != context:
            await client_origin._http.aclose()
            instance_target = settings.get_glpi_instance(target)
            client_target = GLPIClient(instance_target)
            await client_target.init_session()
            return client_target, admin_id
        else:
            return client_origin, admin_id
            
    except GLPIClientError as e:
        await client_origin._http.aclose()
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    context: str, 
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    target = target_context or context
    client, admin_id = admin_deps
    
    try:
        # Puxa usuários ativos e nao deletados
        users = await _fetch_all_paginated(client, "User", max_limit=2000, is_active=1, is_deleted=0)
        
        # Batch Fetch: Puxar relacional iterando nas pages limitadas (evita N+1 para cada usuario)
        group_users = await _fetch_all_paginated(client, "Group_User", max_limit=10000)
        profile_users = await _fetch_all_paginated(client, "Profile_User", max_limit=10000)
        
        # Dict de mappings locais para lookup O(1) de nomes de grupos e perfis
        groups_data = await _fetch_all_paginated(client, "Group", max_limit=2000)
        profiles_data = await _fetch_all_paginated(client, "Profile", max_limit=500)
        
        group_map = {g['id']: g for g in groups_data}
        profile_map = {p['id']: p for p in profiles_data}
        
        # Mapeando os relaciomentos por usuario ID
        user_groups = {}
        for gu in group_users:
            uid = gu.get("users_id")
            if uid:
                user_groups.setdefault(uid, []).append(gu.get("groups_id"))
                
        user_profiles = {}
        for pu in profile_users:
            uid = pu.get("users_id")
            if uid:
                user_profiles.setdefault(uid, []).append(pu.get("profiles_id"))
                
        result = []
        for u in users:
            uid = u.get("id")
            
            u_gids = user_groups.get(uid, [])
            u_pids = user_profiles.get(uid, [])
            
            p_names = list(dict.fromkeys([profile_map[pid].get("name", "") for pid in u_pids if pid in profile_map]))
            g_names = list(dict.fromkeys([group_map[gid].get("name", "") for gid in u_gids if gid in group_map]))
            
            # Formatar `ProfileResponse` necessarios pelo construtor da Service `resolve_hub_roles` baseada em contexts.yaml
            profile_responses = [ProfileResponse(id=pid, name=profile_map[pid].get("name", "")) for pid in dict.fromkeys(u_pids) if pid in profile_map]
            
            # Extrair os Roles do Hub usando Profile_User e Group_User
            u_gids_unique = list(dict.fromkeys(u_gids))
            # Extrair o access (modulos liberados baseados em Grupos Hub-App-*)
            app_access = list(dict.fromkeys([
                gname[8:].lower() for gname in g_names if gname.lower().startswith("hub-app-")
            ]))
            
            # Repassar target no lugar do context nativo pra roles ficarem corretas do target GLPI
            hub_roles_raw = resolve_hub_roles(target, profile_responses, u_gids_unique)
            roles = list(dict.fromkeys([r.role for r in hub_roles_raw]))
            
            result.append(AdminUserResponse(
                id=uid,
                username=u.get("name", ""),
                realname=u.get("realname") or "",
                firstname=u.get("firstname") or "",
                profiles=p_names,
                groups=g_names,
                app_access=app_access,
                roles=roles
            ))
            
        return result
        
    except Exception as e:
        logger.error(f"Erro em list_users: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao acessar API GLPI.")
    finally:
        await client._http.aclose()


class GroupAssignmentRequest(BaseModel):
    group_id: int

@router.post("/users/{user_id}/groups")
async def assign_user_to_group(
    context: str,
    user_id: int,
    payload: GroupAssignmentRequest,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    client, admin_id = admin_deps
    target = target_context or context
    
    if not validate_hub_app_group(target, payload.group_id):
        await client._http.aclose()
        raise HTTPException(status_code=400, detail="ID de grupo não permitido para este contexto.")
        
    try:
        # Impedir criacao duplicada caso API já conste (retornando exactly already_exists=true se pre-existe)
        user_groups = await client.get_sub_items("User", user_id, "Group_User")
        if any(g.get("groups_id") == payload.group_id for g in user_groups):
            return {"success": True, "binding_id": None, "message": "Usuário já possui este acesso", "already_exists": True}
            
        result = await client.add_user_to_group(user_id, payload.group_id)
        logger.info(f"[ADMIN] {admin_id} (via {context}) atribuiu grupo {payload.group_id} ao usuário {user_id} (target: {target})")
        
        return {"success": True, "binding_id": result.get("id"), "message": "Acesso concedido", "already_exists": False}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client._http.aclose()


@router.delete("/users/{user_id}/groups/{group_id}")
async def remove_user_from_group(
    context: str,
    user_id: int,
    group_id: int,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    client, admin_id = admin_deps
    target = target_context or context
    
    if not validate_hub_app_group(target, group_id):
        await client._http.aclose()
        raise HTTPException(status_code=400, detail="ID de grupo não permitido para este contexto.")
        
    try:
        success = await client.remove_user_from_group(user_id, group_id)
        if success:
            logger.info(f"[ADMIN] {admin_id} (via {context}) revogou grupo {group_id} do usuário {user_id} (target: {target})")
            return {"success": True, "message": "Acesso revogado", "user_id": user_id, "group_id": group_id}
        else:
            raise HTTPException(status_code=404, detail="Usuário não possui este acesso.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client._http.aclose()
