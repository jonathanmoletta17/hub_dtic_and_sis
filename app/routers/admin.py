import logging
import time
import asyncio
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth_guard import verify_session
from app.core.session_manager import session_manager
from app.services.auth_service import resolve_hub_roles
from app.schemas.auth_schemas import ProfileResponse
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.core.cache import AsyncTTLMemoryCache, identity_cache
from app.config import settings
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
    "inventario": "Inventário",
    "permissoes": "Gestão de Acessos",
    "carregadores": "Carregadores",
    "dtic-infra": "Infraestrutura DTIC",
    "dtic-kpi": "KPIs DTIC",
    "dtic-metrics": "Métricas DTIC",
    "sis-dashboard": "Dashboard SIS",
}

ADMIN_USERS_CACHE_TTL_SECONDS = 60
MODULE_CATALOG_CACHE_TTL_SECONDS = 300
ADMIN_REFERENCE_CACHE_TTL_SECONDS = 300

admin_users_cache = AsyncTTLMemoryCache(ttl_seconds=ADMIN_USERS_CACHE_TTL_SECONDS)
module_catalog_cache = AsyncTTLMemoryCache(ttl_seconds=MODULE_CATALOG_CACHE_TTL_SECONDS)
admin_reference_cache = AsyncTTLMemoryCache(ttl_seconds=ADMIN_REFERENCE_CACHE_TTL_SECONDS)
admin_users_refresh_tasks: Dict[str, asyncio.Task] = {}
admin_users_refresh_lock = asyncio.Lock()


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
    duplicate_markers = ("duplicate", "already exists", "ja existe", "já existe", "error_glpi_add")
    return any(marker in payload for marker in duplicate_markers)


def _raise_glpi_http_error(error: GLPIClientError, fallback_detail: str) -> None:
    status_code = error.status_code if isinstance(error.status_code, int) and 400 <= error.status_code < 600 else 502
    detail = str(error.detail).strip() if error.detail is not None else ""
    raise HTTPException(status_code=status_code, detail=detail or fallback_detail)


def _normalize_context_key(value: str) -> str:
    return (value or "").strip().lower()


def _extract_request_id(request: Request) -> str:
    return (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Trace-ID")
        or "-"
    )


def _admin_users_cache_key(target_context: str) -> str:
    return f"admin_users:{_normalize_context_key(target_context)}"


def _module_catalog_cache_key(target_context: str) -> str:
    return f"module_catalog:{_normalize_context_key(target_context)}"


def _group_reference_cache_key(target_context: str) -> str:
    return f"admin_groups:{_normalize_context_key(target_context)}"


def _profile_reference_cache_key(target_context: str) -> str:
    return f"admin_profiles:{_normalize_context_key(target_context)}"


def _invalidate_admin_runtime_caches() -> None:
    # assign/revoke impacta permissao em tempo de sessao.
    logger.info(
        "admin.cache.invalidate admin_users_size=%d module_catalog_size=%d",
        len(admin_users_cache._cache),
        len(module_catalog_cache._cache),
    )
    admin_users_cache.clear()
    module_catalog_cache.clear()
    admin_reference_cache.clear()
    identity_cache.clear()


async def _fetch_group_reference_data(client: GLPIClient, target_context: str, max_limit: int = 5000) -> List[dict]:
    cache_key = _group_reference_cache_key(target_context)
    return await admin_reference_cache.get_or_set(
        cache_key,
        lambda: _fetch_all_paginated(client, "Group", max_limit=max_limit),
    )


async def _fetch_profile_reference_data(client: GLPIClient, target_context: str, max_limit: int = 500) -> List[dict]:
    cache_key = _profile_reference_cache_key(target_context)
    return await admin_reference_cache.get_or_set(
        cache_key,
        lambda: _fetch_all_paginated(client, "Profile", max_limit=max_limit),
    )


async def _fetch_module_catalog(client: GLPIClient, target_context: str) -> List[ModuleCatalogItemResponse]:
    cache_key = _module_catalog_cache_key(target_context)

    async def _fetch_and_build() -> List[dict]:
        groups_data = await _fetch_group_reference_data(client, target_context, max_limit=5000)
        return [item.model_dump() for item in _build_module_catalog(groups_data)]

    payload = await module_catalog_cache.get_or_set(cache_key, _fetch_and_build)
    return [ModuleCatalogItemResponse(**item) for item in payload]


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
    """Helper para contornar limites padrao de paginacao do GLPI (ex: default 30 itens/pagina)."""
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
        
        # A propria API do GLPI pode limitar a entrega em, ex., 30 itens por frame.
        # Portanto iteramos a partir do start original + quantos ele efetivamente entregou:
        start += len(batch)
        
    return results


async def _build_admin_users_payload(client: GLPIClient, target_context: str) -> List[AdminUserResponse]:
    users, group_users, profile_users, groups_data, profiles_data = await asyncio.gather(
        _fetch_all_paginated(client, "User", max_limit=2000, is_active=1, is_deleted=0),
        _fetch_all_paginated(client, "Group_User", max_limit=10000),
        _fetch_all_paginated(client, "Profile_User", max_limit=10000),
        _fetch_group_reference_data(client, target_context, max_limit=5000),
        _fetch_profile_reference_data(client, target_context, max_limit=500),
        return_exceptions=True,
    )

    if isinstance(users, Exception):
        raise users
    if isinstance(group_users, Exception):
        raise group_users
    if isinstance(profile_users, Exception):
        raise profile_users
    if isinstance(groups_data, Exception):
        raise groups_data

    # Falha de referência de perfil não deve derrubar o endpoint inteiro.
    if isinstance(profiles_data, Exception):
        logger.warning(
            "admin.build_users_payload profile_reference_fallback context=%s error_type=%s detail=%s",
            target_context,
            type(profiles_data).__name__,
            profiles_data,
        )
        profiles_data = []

    group_map = {group["id"]: group for group in groups_data}
    profile_map = {profile["id"]: profile for profile in profiles_data}

    user_groups = {}
    for group_user in group_users:
        user_id = group_user.get("users_id")
        if user_id:
            user_groups.setdefault(user_id, []).append(group_user.get("groups_id"))

    user_profiles = {}
    for profile_user in profile_users:
        user_id = profile_user.get("users_id")
        if user_id:
            user_profiles.setdefault(user_id, []).append(profile_user.get("profiles_id"))

    response_items = []
    for user in users:
        user_id = user.get("id")
        user_group_ids = user_groups.get(user_id, [])
        user_profile_ids = user_profiles.get(user_id, [])

        profile_names = list(dict.fromkeys([profile_map[profile_id].get("name", "") for profile_id in user_profile_ids if profile_id in profile_map]))
        group_names = list(dict.fromkeys([group_map[group_id].get("name", "") for group_id in user_group_ids if group_id in group_map]))

        profile_responses = [
            ProfileResponse(id=profile_id, name=profile_map[profile_id].get("name", ""))
            for profile_id in dict.fromkeys(user_profile_ids)
            if profile_id in profile_map
        ]

        unique_group_ids = list(dict.fromkeys(user_group_ids))
        app_access = list(
            dict.fromkeys([group_name[8:].lower() for group_name in group_names if group_name.lower().startswith("hub-app-")])
        )
        hub_roles_raw = resolve_hub_roles(target_context, profile_responses, unique_group_ids)
        roles = list(dict.fromkeys([role.role for role in hub_roles_raw]))

        response_items.append(
            AdminUserResponse(
                id=user_id,
                username=user.get("name", ""),
                realname=user.get("realname") or "",
                firstname=user.get("firstname") or "",
                profiles=profile_names,
                groups=group_names,
                app_access=app_access,
                roles=roles,
            )
        )

    return _merge_admin_users(response_items)


async def _prewarm_single_context(target_context: str) -> None:
    started_at = time.perf_counter()
    client = await session_manager.get_client(target_context)
    await _fetch_group_reference_data(client, target_context, max_limit=5000)
    await _fetch_profile_reference_data(client, target_context, max_limit=500)
    await _fetch_module_catalog(client, target_context)
    users_payload = await _build_admin_users_payload(client, target_context)
    admin_users_cache.set(_admin_users_cache_key(target_context), users_payload)
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "admin.prewarm done target=%s users=%d elapsed_ms=%.1f",
        target_context,
        len(users_payload),
        elapsed_ms,
    )


async def prewarm_admin_runtime_caches(target_contexts: Optional[List[str]] = None) -> None:
    contexts = [(_normalize_context_key(ctx) or "").strip() for ctx in (target_contexts or ["dtic", "sis"])]
    contexts = [ctx for ctx in contexts if ctx]
    if not contexts:
        return

    logger.info("admin.prewarm starting contexts=%s", contexts)
    results = await asyncio.gather(
        *[asyncio.wait_for(_prewarm_single_context(ctx), timeout=45) for ctx in contexts],
        return_exceptions=True,
    )
    for ctx, result in zip(contexts, results):
        if isinstance(result, Exception):
            logger.warning(
                "admin.prewarm failed target=%s error_type=%s detail=%s",
                ctx,
                type(result).__name__,
                result,
            )


async def _build_admin_users_payload_with_service_client(target_context: str) -> List[AdminUserResponse]:
    client = await session_manager.get_client(target_context)
    return await _build_admin_users_payload(client, target_context)


async def _run_admin_users_refresh(cache_key: str, target_context: str) -> None:
    try:
        await admin_users_cache.get_or_set(
            cache_key,
            lambda: _build_admin_users_payload_with_service_client(target_context),
        )
    except Exception:
        logger.exception(
            "admin.list_users background_refresh_failed target=%s cache_key=%s",
            target_context,
            cache_key,
        )
    finally:
        async with admin_users_refresh_lock:
            admin_users_refresh_tasks.pop(cache_key, None)


async def _schedule_admin_users_refresh(cache_key: str, target_context: str) -> None:
    async with admin_users_refresh_lock:
        existing = admin_users_refresh_tasks.get(cache_key)
        if existing and not existing.done():
            return
        admin_users_refresh_tasks[cache_key] = asyncio.create_task(
            _run_admin_users_refresh(cache_key, target_context)
        )



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
    """Verifica se o usuario executando a chamada possui a Role Hub-App 'gestor'.
    Suporta gerencia cross-context escalando privileges para Service Account
    quando o target e diferente da origem do token.
    """
    target = target_context or context
    client_origin = await _get_glpi_client(context, auth_data)
    session_token = auth_data.get("session_token")
    if not session_token:
        await client_origin._http.aclose()
        raise HTTPException(status_code=401, detail="Sessao nao autenticada.")

    cache_key = f"admin_gate_session:{_normalize_context_key(context)}:{session_token}"

    async def _fetch_session_info() -> dict:
        session_data = await client_origin.get_full_session()
        return session_data.get("session", {})

    try:
        session_info = await identity_cache.get_or_set(cache_key, _fetch_session_info)

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
                    if gid:
                        groups.append(gid)

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

        return client_origin, admin_id

    except GLPIClientError as e:
        await client_origin._http.aclose()
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    request: Request,
    context: str, 
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    request_id = _extract_request_id(request)
    target = target_context or context
    client, admin_id = admin_deps

    started_at = time.perf_counter()
    try:
        cache_key = _admin_users_cache_key(target)
        stale_entry = admin_users_cache._cache.get(cache_key)
        cache_hit_pre = False
        if stale_entry:
            timestamp, cached_payload = stale_entry
            if admin_users_cache._is_fresh(timestamp):
                cache_hit_pre = True
                payload = cached_payload
            else:
                payload = cached_payload
                await _schedule_admin_users_refresh(cache_key, target)
                logger.info(
                    "admin.list_users stale_return request_id=%s context=%s target=%s admin_id=%s cache_key=%s",
                    request_id,
                    context,
                    target,
                    admin_id,
                    cache_key,
                )
        else:
            payload = await admin_users_cache.get_or_set(
                cache_key,
                lambda: _build_admin_users_payload(client, target),
            )
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "admin.list_users ok request_id=%s context=%s target=%s admin_id=%s users=%d elapsed_ms=%.1f cache_hit_pre=%s cache_size=%d",
            request_id,
            context,
            target,
            admin_id,
            len(payload),
            elapsed_ms,
            cache_hit_pre,
            len(admin_users_cache._cache),
        )
        return payload
    except GLPIClientError as error:
        logger.warning(
            "admin.list_users glpi_error request_id=%s context=%s target=%s admin_id=%s status=%s detail=%s",
            request_id,
            context,
            target,
            admin_id,
            error.status_code,
            error.detail,
        )
        _raise_glpi_http_error(error, "Falha ao carregar usuarios do GLPI.")
    except Exception as error:
        logger.exception(
            "admin.list_users unexpected_error request_id=%s context=%s target=%s admin_id=%s error_type=%s",
            request_id,
            context,
            target,
            admin_id,
            type(error).__name__,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao acessar API GLPI.")
    finally:
        await client._http.aclose()


@router.get("/module-catalog", response_model=List[ModuleCatalogItemResponse])
async def list_module_catalog(
    request: Request,
    context: str,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context),
):
    request_id = _extract_request_id(request)
    target = target_context or context
    client, admin_id = admin_deps
    try:
        payload = await _fetch_module_catalog(client, target)
        logger.info(
            "admin.list_module_catalog ok request_id=%s context=%s target=%s admin_id=%s modules=%d",
            request_id,
            context,
            target,
            admin_id,
            len(payload),
        )
        return payload
    except GLPIClientError as error:
        logger.warning(
            "admin.list_module_catalog glpi_error request_id=%s context=%s target=%s admin_id=%s status=%s detail=%s",
            request_id,
            context,
            target,
            admin_id,
            error.status_code,
            error.detail,
        )
        _raise_glpi_http_error(error, "Falha ao montar catalogo de modulos no GLPI.")
    except Exception as error:
        logger.exception(
            "admin.list_module_catalog unexpected_error request_id=%s context=%s target=%s admin_id=%s error_type=%s",
            request_id,
            context,
            target,
            admin_id,
            type(error).__name__,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao montar catalogo de modulos.")
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
    request: Request,
    context: str,
    user_id: int,
    payload: GroupAssignmentRequest,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    request_id = _extract_request_id(request)
    started_at = time.perf_counter()
    client, admin_id = admin_deps
    target = target_context or context
    
    try:
        catalog = await _fetch_module_catalog(client, target)
        allowed_group_ids = {item.group_id for item in catalog}
        if payload.group_id not in allowed_group_ids:
            logger.warning(
                "admin.assign_user_to_group validation_failed request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s reason=group_not_allowed",
                request_id,
                context,
                target,
                admin_id,
                user_id,
                payload.group_id,
            )
            raise HTTPException(status_code=400, detail="ID de grupo não permitido para este contexto.")
        
        # Impedir criacao duplicada caso API já conste (retornando exactly already_exists=true se pre-existe)
        user_groups = await client.get_sub_items("User", user_id, "Group_User")
        if any(g.get("groups_id") == payload.group_id for g in user_groups):
            logger.info(
                "admin.assign_user_to_group already_exists request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s",
                request_id,
                context,
                target,
                admin_id,
                user_id,
                payload.group_id,
            )
            return {"success": True, "binding_id": None, "message": "Usuário já possui este acesso", "already_exists": True}
        try:
            result = await client.add_user_to_group(user_id, payload.group_id)
        except GLPIClientError as glpi_error:
            if glpi_error.status_code in (400, 409) and _is_duplicate_membership_error(glpi_error):
                logger.info(
                    "admin.assign_user_to_group duplicate_glpi request_id=%s admin_id=%s context=%s target=%s user_id=%s group_id=%s",
                    request_id,
                    admin_id,
                    context,
                    target,
                    user_id,
                    payload.group_id,
                )
                return {
                    "success": True,
                    "binding_id": None,
                    "message": "Usuário já possui este acesso",
                    "already_exists": True,
                }
            raise

        binding_id = _extract_binding_id(result)
        _invalidate_admin_runtime_caches()
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "admin.assign_user_to_group ok request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s binding_id=%s elapsed_ms=%.1f",
            request_id,
            context,
            target,
            admin_id,
            user_id,
            payload.group_id,
            binding_id,
            elapsed_ms,
        )
        
        return {"success": True, "binding_id": binding_id, "message": "Acesso concedido", "already_exists": False}
    except HTTPException as error:
        logger.warning(
            "admin.assign_user_to_group http_error request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s status=%s detail=%s",
            request_id,
            context,
            target,
            admin_id,
            user_id,
            payload.group_id,
            error.status_code,
            error.detail,
        )
        raise
    except GLPIClientError as error:
        logger.warning(
            "admin.assign_user_to_group glpi_error request_id=%s context=%s target=%s user_id=%s group_id=%s status=%s detail=%s",
            request_id,
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
            "admin.assign_user_to_group unexpected_error request_id=%s context=%s target=%s user_id=%s group_id=%s",
            request_id,
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
    request: Request,
    context: str,
    user_id: int,
    group_id: int,
    target_context: Optional[str] = None,
    admin_deps: tuple = Depends(_require_gestor_cross_context)
):
    request_id = _extract_request_id(request)
    started_at = time.perf_counter()
    client, admin_id = admin_deps
    target = target_context or context
    
    try:
        catalog = await _fetch_module_catalog(client, target)
        allowed_group_ids = {item.group_id for item in catalog}
        if group_id not in allowed_group_ids:
            logger.warning(
                "admin.remove_user_from_group validation_failed request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s reason=group_not_allowed",
                request_id,
                context,
                target,
                admin_id,
                user_id,
                group_id,
            )
            raise HTTPException(status_code=400, detail="ID de grupo não permitido para este contexto.")

        success = await client.remove_user_from_group(user_id, group_id)
        if success:
            _invalidate_admin_runtime_caches()
            elapsed_ms = (time.perf_counter() - started_at) * 1000
            logger.info(
                "admin.remove_user_from_group ok request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s elapsed_ms=%.1f",
                request_id,
                context,
                target,
                admin_id,
                user_id,
                group_id,
                elapsed_ms,
            )
            return RevokeGroupResponse(success=True, message="Acesso revogado", user_id=user_id, group_id=group_id)
        else:
            raise HTTPException(status_code=404, detail="Usuário não possui este acesso.")
    except HTTPException as error:
        logger.warning(
            "admin.remove_user_from_group http_error request_id=%s context=%s target=%s admin_id=%s user_id=%s group_id=%s status=%s detail=%s",
            request_id,
            context,
            target,
            admin_id,
            user_id,
            group_id,
            error.status_code,
            error.detail,
        )
        raise
    except GLPIClientError as error:
        logger.warning(
            "admin.remove_user_from_group glpi_error request_id=%s context=%s target=%s user_id=%s group_id=%s status=%s detail=%s",
            request_id,
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
            "admin.remove_user_from_group unexpected_error request_id=%s context=%s target=%s user_id=%s group_id=%s",
            request_id,
            context,
            target,
            user_id,
            group_id,
        )
        raise HTTPException(status_code=500, detail="Erro interno ao revogar acesso.")
    finally:
        await client._http.aclose()
