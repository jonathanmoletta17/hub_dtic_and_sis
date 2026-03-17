"""
Auth Guard — Dependência FastAPI para validação de sessão.

Valida o token do usuário contra a API GLPI real via getFullSession.
Usa cache LRU com TTL para evitar roundtrip a cada request.
Degradação graciosa: se GLPI indisponível, aceita token por presença.
"""
import logging
import time
import hashlib
from collections import OrderedDict
from typing import Optional
import httpx
import asyncio

from fastapi import Request, HTTPException, Header

from app.config import settings
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.core.cache import identity_cache

_log = logging.getLogger(__name__)

# ── Cache LRU com TTL ──────────────────────────────────
_TOKEN_CACHE_MAX = 128
_TOKEN_CACHE_TTL = 60  # segundos

_token_cache: OrderedDict[str, dict] = OrderedDict()


def _cache_get(token: str) -> Optional[dict]:
    """Retorna dados cacheados se token válido e dentro do TTL."""
    entry = _token_cache.get(token)
    if entry and (time.monotonic() - entry["ts"]) < _TOKEN_CACHE_TTL:
        _token_cache.move_to_end(token)
        return entry
    if entry:
        del _token_cache[token]
    return None


def _cache_set(token: str, session_data: dict) -> None:
    """Armazena validação com timestamp."""
    if len(_token_cache) >= _TOKEN_CACHE_MAX:
        _token_cache.popitem(last=False)
    _token_cache[token] = {"ts": time.monotonic(), "data": session_data}


def _extract_context(request: Request) -> str:
    """Extrai o contexto da URL (ex: /api/v1/sis/chargers → 'sis')."""
    parts = request.url.path.strip("/").split("/")
    # Padrão: /api/v1/{context}/...
    if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
        return parts[2]
    return "sis"  # fallback seguro


def _extract_request_id(request: Request) -> str:
    return (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Trace-ID")
        or "-"
    )


def _normalize_token_candidate(value: object) -> Optional[str]:
    if not isinstance(value, str):
        return None
    token = value.strip()
    return token or None


async def verify_session(
    request: Request,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    session_token: Optional[str] = Header(None, alias="Session-Token"),
) -> dict:
    """
    Verifica que o request possui um token de sessão válido contra o GLPI.

    Fluxo:
    1. Extrair token de qualquer fonte (header ou cookie)
    2. Checar cache LRU (evita roundtrip repetido)
    3. Validar via GLPIClient.get_full_session()
    4. Se GLPI indisponível → degradação graciosa (aceita por presença)

    Returns:
        dict com informação da sessão validada

    Raises:
        HTTPException 401 se nenhum token encontrado ou inválido
    """
    started_at = time.perf_counter()
    request_id = _extract_request_id(request)
    token = (
        _normalize_token_candidate(x_session_token)
        or _normalize_token_candidate(session_token)
        or _normalize_token_candidate(request.cookies.get("sessionToken"))
        or _normalize_token_candidate(request.cookies.get("hub-session-token"))
    )

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Sessão não autenticada. Forneça um token via header X-Session-Token ou Session-Token."
        )

    # 1. Cache hit → retorna direto sem roundtrip
    cached = _cache_get(token)
    if cached:
        session_data = cached.get("data") if isinstance(cached, dict) else {}
        session_info = session_data.get("session") if isinstance(session_data, dict) else None
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        _log.debug(
            "auth.verify_session cache_hit context=%s request_id=%s elapsed_ms=%.1f",
            _extract_context(request),
            request_id,
            elapsed_ms,
        )
        return {
            "session_token": token,
            "validated": True,
            "source": "cache",
            "request_id": request_id,
            "session": session_info if isinstance(session_info, dict) else None,
        }

    # 2. Validar contra GLPI real
    context = _extract_context(request)
    base_context = context.split("-")[0]
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]

    # 2.1 Fast-path: evita roundtrip quando identidade recente já está no cache compartilhado.
    for key in (
        f"authz_identity_{base_context}_{token_hash}",
        f"auth_me_{base_context}_{token_hash}",
        f"admin_gate_session:{base_context}:{token}",
    ):
        found, cached_identity = identity_cache.try_get(key)
        if not found:
            continue

        cached_session: dict | None = None
        if isinstance(cached_identity, dict):
            if isinstance(cached_identity.get("session"), dict):
                cached_session = cached_identity.get("session")
            elif "glpiID" in cached_identity:
                cached_session = cached_identity

        _cache_set(token, {"session": cached_session or {}})
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        _log.debug(
            "auth.verify_session identity_cache_hit context=%s request_id=%s cache_key=%s elapsed_ms=%.1f",
            base_context,
            request_id,
            key,
            elapsed_ms,
        )
        return {
            "session_token": token,
            "validated": True,
            "source": "identity-cache",
            "request_id": request_id,
            "session": cached_session,
        }

    client: Optional[GLPIClient] = None
    try:
        instance = settings.get_glpi_instance(base_context)
        client = GLPIClient.from_session_token(instance, token)
        session_data = await client.get_full_session()
        session_info = session_data.get("session", {}) if isinstance(session_data, dict) else {}

        # Token válido — cachear
        _cache_set(token, session_data)
        identity_cache.set(f"admin_gate_session:{base_context}:{token}", session_info)
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        _log.info(
            "auth.verify_session validated context=%s request_id=%s source=glpi elapsed_ms=%.1f",
            base_context,
            request_id,
            elapsed_ms,
        )
        return {
            "session_token": token,
            "validated": True,
            "source": "glpi",
            "request_id": request_id,
            "session": session_info,
        }

    except GLPIClientError as e:
        # Token inválido/expirado — GLPI rejeitou
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        _log.warning(
            "auth.verify_session invalid_token context=%s request_id=%s elapsed_ms=%.1f detail=%s",
            base_context,
            request_id,
            elapsed_ms,
            e,
        )
        raise HTTPException(
            status_code=401,
            detail="Token de sessão inválido ou expirado. Faça login novamente."
        )
    except (httpx.ConnectError, httpx.TimeoutException, asyncio.TimeoutError) as e:
        # GLPI indisponível (Erro de Rede/Timeout) — degradação graciosa sob opt-in explícito
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        _log.warning(
            "auth.verify_session glpi_unavailable context=%s request_id=%s elapsed_ms=%.1f error_type=%s detail=%s",
            base_context,
            request_id,
            elapsed_ms,
            type(e).__name__,
            str(e),
        )
        if settings.auth_fail_open_on_glpi_unavailable:
            _log.warning(
                "AUTH_FAIL_OPEN_ON_GLPI_UNAVAILABLE=true: aceitando sessão por presença de token. "
                "Este modo reduz a segurança da aplicação."
            )
            return {
                "session_token": token,
                "validated": True,
                "source": "fallback",
                "request_id": request_id,
                "session": None,
            }
        raise HTTPException(
            status_code=503,
            detail="Serviço de autenticação GLPI indisponível. Tente novamente em instantes.",
        )
    finally:
        if client is not None:
            await client._http.aclose()


async def verify_session_optional(
    request: Request,
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    session_token: Optional[str] = Header(None, alias="Session-Token"),
) -> Optional[dict]:
    """
    Versão opcional — não bloqueia se não houver token.
    Útil para endpoints que funcionam com e sem auth (ex: public views).
    """
    token = (
        x_session_token
        or session_token
        or request.cookies.get("sessionToken")
        or request.cookies.get("hub-session-token")
    )

    if not token:
        return None

    return {"session_token": token, "validated": True}
