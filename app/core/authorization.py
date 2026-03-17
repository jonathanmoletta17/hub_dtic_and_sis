from __future__ import annotations

import hashlib
import logging
from typing import Any, Iterable

from fastapi import Depends, Header, HTTPException

from app.core.auth_guard import verify_session
from app.core.cache import identity_cache
import app.services.auth_service as auth_service

logger = logging.getLogger(__name__)


def _normalize_values(values: Iterable[str]) -> set[str]:
    return {value.strip().lower() for value in values if value and value.strip()}


def _expand_role(role: str) -> set[str]:
    normalized = role.strip().lower()
    if not normalized:
        return set()

    expanded = {normalized}

    # Sub-papeis tecnicos devem passar em checks que exigem "tecnico".
    if normalized.startswith("tecnico"):
        expanded.add("tecnico")

    # admin-hub herda privilegios operacionais de gestor.
    if normalized == "admin-hub":
        expanded.add("gestor")

    return expanded


async def get_authorization_identity(
    context: str,
    auth_data: dict[str, Any] = Depends(verify_session),
    active_hub_role_header: str | None = Header(default=None, alias="X-Active-Hub-Role"),
) -> dict[str, Any]:
    session_token = auth_data.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Sessao invalida para autorizacao.")

    token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()[:16]
    cache_key = f"authz_identity_{context}_{token_hash}"

    session_data = await identity_cache.get_or_set(
        cache_key,
        lambda: auth_service.fetch_session_identity(context, session_token=session_token),
    )

    session_info = session_data.get("session", {})
    app_access_raw = session_data.get("app_access", [])

    login_response = auth_service.build_login_response(
        context=context,
        session_token=session_token,
        session_info=session_info,
        app_access=app_access_raw,
    )

    normalized_roles = _normalize_values(item.role for item in login_response.hub_roles)
    active_hub_role = (active_hub_role_header or "").strip().lower() or None
    if active_hub_role and active_hub_role not in normalized_roles:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado: papel ativo invalido para esta sessao.",
        )

    return {
        "context": context,
        "session_token": session_token,
        "user_id": login_response.user_id,
        "hub_roles": [item.role for item in login_response.hub_roles],
        "active_hub_role": active_hub_role,
        "app_access": _normalize_values(login_response.app_access),
    }


def require_hub_permissions(
    *allowed_roles: str,
    require_app_access: str | None = None,
    require_active_hub_role: bool = False,
):
    allowed = _normalize_values(allowed_roles)
    required_app = (require_app_access or "").strip().lower() or None

    async def _dependency(
        identity: dict[str, Any] = Depends(get_authorization_identity),
    ) -> dict[str, Any]:
        hub_roles = identity.get("hub_roles", []) or []
        effective_roles: set[str] = set()
        active_hub_role = str(identity.get("active_hub_role") or "").strip().lower()
        if require_active_hub_role and not active_hub_role:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado: papel ativo obrigatorio para esta operacao.",
            )

        if active_hub_role:
            effective_roles.update(_expand_role(active_hub_role))
        else:
            # Modo legado de compatibilidade: se o papel ativo não vier no header,
            # a autorização usa a união de todos os papéis da sessão.
            logger.warning(
                "Authorization fallback sem X-Active-Hub-Role: context=%s user_id=%s hub_roles=%s",
                identity.get("context"),
                identity.get("user_id"),
                hub_roles,
            )
            for role in hub_roles:
                effective_roles.update(_expand_role(str(role)))

        if allowed and not any(role in effective_roles for role in allowed):
            allowed_text = ", ".join(sorted(allowed))
            raise HTTPException(
                status_code=403,
                detail=f"Acesso negado: requer papel de autorizacao ({allowed_text}).",
            )

        if required_app:
            app_access = identity.get("app_access", set()) or set()
            normalized_access = _normalize_values(str(item) for item in app_access)
            if required_app not in normalized_access:
                raise HTTPException(
                    status_code=403,
                    detail=f"Acesso negado: requer permissao do modulo '{required_app}'.",
                )

        return identity

    return _dependency
