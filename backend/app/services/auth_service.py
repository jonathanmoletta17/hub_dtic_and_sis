# ╔══════════════════════════════════════════════════════════════════╗
# ║  ZONA PROTEGIDA — auth_service.py                               ║
# ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  PROIBIDO:                                                       ║
# ║    · Reescrever build_login_response                             ║
# ║    · Alterar ordenação de roles em resolve_hub_roles             ║
# ║    · Reintroduzir fallback por conta tecnica/user_token          ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  PERMITIDO (sem aprovação):                                      ║
# ║    · Adicionar logging                                           ║
# ║    · Adicionar novos providers no final do arquivo               ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  DEPENDENTES: toda a API + todo o frontend (via hub_roles)       ║
# ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Zonas de Proteção          ║
# ╚══════════════════════════════════════════════════════════════════╝
import logging
import hashlib
import time
from typing import Any, List, Optional
from fastapi import HTTPException
from app.schemas.auth_schemas import (
    ProfileResponse, HubRole, RoleResponse, AuthMeResponse, LoginResponse
)
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.core.cache import identity_cache
from app.config import settings


_log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════
# Regras de Negócio: Tradução GLPI → Hub Roles
# ═══════════════════════════════════════════════════════════

from app.core.context_registry import registry, ContextConfig


def _extract_group_id(record: dict[str, Any]) -> int | None:
    gid = record.get("groups_id") or record.get("id")
    if isinstance(gid, int):
        return gid
    if isinstance(gid, str) and gid.isdigit():
        return int(gid)
    return None


def _extract_group_name(record: dict[str, Any]) -> str:
    for field in (
        "groups_id_completename",
        "groups_id_name",
        "completename",
        "name",
    ):
        value = record.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


async def _resolve_group_name_with_user_session(
    client: GLPIClient,
    group_link: dict[str, Any],
) -> str:
    direct_name = _extract_group_name(group_link)
    if direct_name:
        return direct_name

    gid = _extract_group_id(group_link)
    if not gid:
        return ""

    try:
        group = await client.get_item("Group", gid, expand_dropdowns="true")
    except Exception as e:
        _log.debug("Grupo %s nao resolvido pela sessao do usuario: %s", gid, e)
        return f"Group {gid}"

    return _extract_group_name(group) or f"Group {gid}"


async def resolve_app_access(
    context: str,
    client: GLPIClient,
    user_id: int,
    prefetched_group_links: Optional[List[dict]] = None,
) -> List[str]:
    """Busca grupos do user e extrai os que começam com Hub-App-* sem N+1 por grupo."""
    if not user_id:
        return []

    try:
        app_access: List[str] = []
        seen: set[str] = set()
        group_links = prefetched_group_links or await client.get_sub_items("User", user_id, "Group_User")

        for gl in group_links:
            group_name = await _resolve_group_name_with_user_session(client, gl)
            if not group_name.startswith("Hub-App-"):
                continue
            app_id = group_name.removeprefix("Hub-App-").strip().lower()
            if not app_id or app_id in seen:
                continue
            seen.add(app_id)
            app_access.append(app_id)
        return app_access
    except Exception as e:
        _log.warning("Erro ao extrair app_access para user=%s context=%s: %s", user_id, context, e)
        return []

async def fetch_session_identity(
    context: str,
    session_token: Optional[str] = None,
    prefetched_session: Optional[dict] = None,
) -> dict:
    """Helper que puxa os dados mastigados de sessão (Cacheável via roteador)."""
    ephemeral_client: Optional[GLPIClient] = None
    started_at = time.perf_counter()
    base_context = registry.get_base_context(context)
    try:
        if not session_token:
            raise HTTPException(status_code=401, detail="Sessao de usuario obrigatoria para identidade.")

        instance = settings.get_glpi_instance(base_context)
        ephemeral_client = GLPIClient.from_session_token(instance, session_token)
        client = ephemeral_client

        session_info: dict = {}
        if isinstance(prefetched_session, dict) and prefetched_session:
            session_info = prefetched_session
        elif session_token:
            gate_key = f"admin_gate_session:{base_context}:{session_token}"
            found, cached_gate_session = identity_cache.try_get(gate_key)
            if found and isinstance(cached_gate_session, dict):
                session_info = cached_gate_session

        if not session_info:
            session_data = await client.get_full_session()
            session_info = session_data.get("session", {}) if isinstance(session_data, dict) else {}
            if session_token:
                identity_cache.set(f"admin_gate_session:{base_context}:{session_token}", session_info)

        user_id = session_info.get("glpiID", 0)

        app_access = await resolve_app_access(base_context, client, user_id)
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        _log.debug(
            "auth.fetch_session_identity context=%s user_id=%s elapsed_ms=%.1f app_access=%d prefetched=%s",
            base_context,
            user_id,
            elapsed_ms,
            len(app_access),
            bool(prefetched_session),
        )

        return {
            "session": session_info,
            "app_access": app_access
        }
    except GLPIClientError as e:
        raise HTTPException(status_code=e.status_code or 502, detail=f"Erro na API Auth GLPI: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro na API Auth GLPI: {str(e)}")
    finally:
        if ephemeral_client:
            await ephemeral_client._http.aclose()


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
        cfg = ContextConfig(id=context, label=context, glpi_url="", glpi_app_token="",
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


async def perform_login(context: str, body) -> LoginResponse:
    """
    Centraliza a lógica de autenticação por credenciais reais do usuario.
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
        app_access = await resolve_app_access(context, client, user_id)
        
        return build_login_response(context, session_token, session_info, app_access)
        
    except GLPIClientError as e:
        if e.status_code and e.status_code in [401, 403]:
            _log.warning(
                "Basic Auth rejeitado pelo GLPI para '%s' (HTTP %s).",
                body.username, e.status_code
            )
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
