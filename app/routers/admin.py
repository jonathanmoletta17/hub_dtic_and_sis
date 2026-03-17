import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException

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


class ModuleCatalogItemResponse(BaseModel):
    group_id: int
    tag: str
    group_name: str
    label: str


ROLE_ORDER = {
    "solicitante": 0,
    "tecnico": 1,
    "tecnico-manutencao": 2,
    "tecnico-conservacao": 3,
    "gestor": 4,
}

MODULE_LABEL_OVERRIDES = {
    "busca": "Smart Search",
    "permissoes": "Gestão de Acessos",
    "carregadores": "Carregadores",
    "dtic-infra": "Infraestrutura DTIC",
    "dtic-kpi": "KPIs DTIC",
    "dtic-metrics": "Métricas DTIC",
    "sis-dashboard": "Dashboard SIS",
}


def _unique_sorted(values: List[str]) -> List[str]:
    cleaned = [str(item).strip() for item in values if str(item).strip()]
    return sorted(set(cleaned), key=lambda item: item.lower())


def _unique_roles(values: List[str]) -> List[str]:
    unique = {str(item).strip().lower() for item in values if str(item).strip()}
    return sorted(unique, key=lambda role: (ROLE_ORDER.get(role, 99), role))


def _derive_module_label(tag: str, group_name: str) -> str:
    if tag in MODULE_LABEL_OVERRIDES:
        return MODULE_LABEL_OVERRIDES[tag]

    name = group_name.strip()
    if name.lower().startswith("hub-app-"):
        name = name[8:]
    if not name:
        name = tag

    tokens = [token for token in name.replace("_", "-").split("-") if token]
    if not tokens:
        return tag

    formatted = []
    for token in tokens:
        upper_token = token.upper()
        if len(token) <= 4:
            formatted.append(upper_token)
        else:
            formatted.append(token.capitalize())
    return " ".join(formatted)


def _build_module_catalog(groups_data: List[dict]) -> List[ModuleCatalogItemResponse]:
    dedup: Dict[int, ModuleCatalogItemResponse] = {}
    for group in groups_data:
        group_id = group.get("id")
        group_name = str(group.get("name") or "").strip()
        if not isinstance(group_id, int):
            continue
        if not group_name.lower().startswith("hub-app-"):
            continue

        tag = group_name[8:].strip().lower()
        if not tag:
            continue

        dedup[group_id] = ModuleCatalogItemResponse(
            group_id=group_id,
            tag=tag,
            group_name=group_name,
            label=_derive_module_label(tag, group_name),
        )

    return sorted(
        dedup.values(),
        key=lambda item: (item.label.lower(), item.tag, item.group_id),
    )


def _extract_binding_id(result: Any) -> int | None:
    raw_id: Any = None
    if isinstance(result, dict):
        raw_id = result.get("id")
    elif isinstance(result, list) and result and isinstance(result[0], dict):
        raw_id = result[0].get("id")

    if raw_id is None:
        return None

    try:
        return int(raw_id)
    except (TypeError, ValueError):
        return None


def _is_duplicate_membership_error(error: GLPIClientError) -> bool:
    payload = f"{error} {error.detail}".lower()
    duplicate_markers = ("duplicate", "already exists", "já existe", "error_glpi_add")
    return any(marker in payload for marker in duplicate_markers)


def _raise_glpi_http_error(error: GLPIClientError, fallback_detail: str) -> None:
    status_code = error.status_code if isinstance(error.status_code, int) and 400 <= error.status_code < 600 else 502
    detail = str(error.detail).strip() if error.detail is not None else ""
    raise HTTPException(status_code=status_code, detail=detail or fallback_detail)


async def _fetch_module_catalog(client: GLPIClient) -> List[ModuleCatalogItemResponse]:
    groups_data = await _fetch_all_paginated(client, "Group", max_limit=5000)
    return _build_module_catalog(groups_data)


def _merge_admin_users(users: List[AdminUserResponse]) -> List[AdminUserResponse]:
    merged: Dict[int, dict] = {}
    for user in users:
        existing = merged.get(user.id)
        if existing is None:
            merged[user.id] = {
                "id": user.id,
                "username": user.username or "",
                "realname": user.realname or "",
                "firstname": user.firstname or "",
                "profiles": list(user.profiles),
                "groups": list(user.groups),
                "app_access": list(user.app_access),
                "roles": list(user.roles),
            }
            continue

        if not existing["username"] and user.username:
            existing["username"] = user.username
        if not existing["realname"] and user.realname:
            existing["realname"] = user.realname
        if not existing["firstname"] and user.firstname:
            existing["firstname"] = user.firstname

        existing["profiles"].extend(user.profiles)
        existing["groups"].extend(user.groups)
        existing["app_access"].extend(user.app_access)
        existing["roles"].extend(user.roles)

    normalized = []
    for item in merged.values():
        normalized.append(
            AdminUserResponse(
                id=item["id"],
                username=item["username"],
                realname=item["realname"],
                firstname=item["firstname"],
                profiles=_unique_sorted(item["profiles"]),
                groups=_unique_sorted(item["groups"]),
                app_access=_unique_sorted(item["app_access"]),
                roles=_unique_roles(item["roles"]),
            )
        )

    normalized.sort(
        key=lambda user: (
            f"{user.firstname} {user.realname}".strip().lower() or user.username.lower(),
            user.username.lower(),
            user.id,
        )
    )
    return normalized

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

        return _merge_admin_users(result)
        
    except Exception as e:
        logger.error(f"Erro em list_users: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao acessar API GLPI.")
    finally:
        await client._http.aclose()


@router.get("/module-catalog", response_model=List[ModuleCatalogItemResponse])
async def list_module_catalog(
    context: str,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context),
):
    client, _admin_id = admin_deps
    try:
        return await _fetch_module_catalog(client)
    except Exception as e:
        logger.error(f"Erro em list_module_catalog: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao montar catálogo de módulos.")
    finally:
        await client._http.aclose()


class GroupAssignmentRequest(BaseModel):
    group_id: int

class RevokeGroupResponse(BaseModel):
    success: bool
    message: str
    user_id: int
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
    
    try:
        catalog = await _fetch_module_catalog(client)
        allowed_group_ids = {item.group_id for item in catalog}
        if payload.group_id not in allowed_group_ids:
            raise HTTPException(status_code=400, detail="ID de grupo não permitido para este contexto.")
        
        # Impedir criacao duplicada caso API já conste (retornando exactly already_exists=true se pre-existe)
        user_groups = await client.get_sub_items("User", user_id, "Group_User")
        if any(g.get("groups_id") == payload.group_id for g in user_groups):
            return {"success": True, "binding_id": None, "message": "Usuário já possui este acesso", "already_exists": True}
        try:
            result = await client.add_user_to_group(user_id, payload.group_id)
        except GLPIClientError as glpi_error:
            if glpi_error.status_code in (400, 409) and _is_duplicate_membership_error(glpi_error):
                logger.info(
                    "[ADMIN] %s (via %s) tentou atribuir grupo %s duplicado ao usuário %s (target: %s)",
                    admin_id,
                    context,
                    payload.group_id,
                    user_id,
                    target,
                )
                return {
                    "success": True,
                    "binding_id": None,
                    "message": "Usuário já possui este acesso",
                    "already_exists": True,
                }
            raise

        binding_id = _extract_binding_id(result)
        logger.info(f"[ADMIN] {admin_id} (via {context}) atribuiu grupo {payload.group_id} ao usuário {user_id} (target: {target})")
        
        return {"success": True, "binding_id": binding_id, "message": "Acesso concedido", "already_exists": False}
    except HTTPException:
        raise
    except GLPIClientError as error:
        logger.warning(
            "Erro GLPI ao atribuir grupo em admin.assign_user_to_group: context=%s target=%s user_id=%s group_id=%s status=%s detail=%s",
            context,
            target,
            user_id,
            payload.group_id,
            error.status_code,
            error.detail,
        )
        _raise_glpi_http_error(error, "Falha ao conceder acesso no GLPI.")
    except Exception:
        logger.exception(
            "Erro inesperado em assign_user_to_group: context=%s target=%s user_id=%s group_id=%s",
            context,
            target,
            user_id,
            payload.group_id,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao conceder acesso.")
    finally:
        await client._http.aclose()


@router.delete("/users/{user_id}/groups/{group_id}", response_model=RevokeGroupResponse)
async def remove_user_from_group(
    context: str,
    user_id: int,
    group_id: int,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    client, admin_id = admin_deps
    target = target_context or context
    
    try:
        catalog = await _fetch_module_catalog(client)
        allowed_group_ids = {item.group_id for item in catalog}
        if group_id not in allowed_group_ids:
            raise HTTPException(status_code=400, detail="ID de grupo não permitido para este contexto.")

        success = await client.remove_user_from_group(user_id, group_id)
        if success:
            logger.info(f"[ADMIN] {admin_id} (via {context}) revogou grupo {group_id} do usuário {user_id} (target: {target})")
            return RevokeGroupResponse(success=True, message="Acesso revogado", user_id=user_id, group_id=group_id)
        else:
            raise HTTPException(status_code=404, detail="Usuário não possui este acesso.")
    except HTTPException:
        raise
    except GLPIClientError as error:
        logger.warning(
            "Erro GLPI ao revogar grupo em admin.remove_user_from_group: context=%s target=%s user_id=%s group_id=%s status=%s detail=%s",
            context,
            target,
            user_id,
            group_id,
            error.status_code,
            error.detail,
        )
        _raise_glpi_http_error(error, "Falha ao revogar acesso no GLPI.")
    except Exception:
        logger.exception(
            "Erro inesperado em remove_user_from_group: context=%s target=%s user_id=%s group_id=%s",
            context,
            target,
            user_id,
            group_id,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao revogar acesso.")
    finally:
        await client._http.aclose()
