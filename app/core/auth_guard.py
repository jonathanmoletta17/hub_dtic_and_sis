"""
Auth Guard — Dependência FastAPI para validação de sessão.

Valida o token do usuário contra a API GLPI real via getFullSession.
Usa cache LRU com TTL para evitar roundtrip a cada request.
Degradação graciosa: se GLPI indisponível, aceita token por presença.
"""
import logging
import time
from collections import OrderedDict
from typing import Optional

from fastapi import Request, HTTPException, Header

from app.config import settings
from app.core.glpi_client import GLPIClient, GLPIClientError

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
    token = (
        x_session_token
        or session_token
        or request.cookies.get("hub-session-token")
    )

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Sessão não autenticada. Forneça um token via header X-Session-Token ou Session-Token."
        )

    # 1. Cache hit → retorna direto sem roundtrip
    cached = _cache_get(token)
    if cached:
        _log.debug("Auth cache hit para token: %s...", token[:8])
        return {"session_token": token, "validated": True, "source": "cache"}

    # 2. Validar contra GLPI real
    context = _extract_context(request)
    try:
        instance = settings.get_glpi_instance(context)
        client = GLPIClient.from_session_token(instance, token)
        session_data = await client.get_full_session()

        # Token válido — cachear
        _cache_set(token, session_data)
        _log.debug("Auth GLPI validado para token: %s...", token[:8])
        return {"session_token": token, "validated": True, "source": "glpi"}

    except GLPIClientError as e:
        # Token inválido/expirado — GLPI rejeitou
        _log.warning("Token inválido rejeitado pelo GLPI: %s... → %s", token[:8], e)
        raise HTTPException(
            status_code=401,
            detail="Token de sessão inválido ou expirado. Faça login novamente."
        )
    except Exception as e:
        # GLPI indisponível — degradação graciosa
        _log.warning("GLPI indisponível para validação (degradação graciosa): %s", e)
        return {"session_token": token, "validated": True, "source": "fallback"}


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
        or request.cookies.get("hub-session-token")
    )

    if not token:
        return None

    return {"session_token": token, "validated": True}
