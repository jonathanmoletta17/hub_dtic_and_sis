"""
cache_utils.py — TTL cache mínimo para o dashboard de carregadores.
Usa apenas stdlib (functools + time). Zero dependência nova.
Propósito: reduzir N+1 queries do Kanban/Ranking.
"""
import time
import asyncio
from functools import wraps
from typing import Any, Dict, Tuple, Optional

_cache_store: Dict[str, Tuple[Any, float]] = {}


def clear_ttl_cache(prefix: Optional[str] = None) -> int:
    """
    Remove entradas do cache TTL.
    - prefix=None: limpa todo o cache.
    - prefix="pkg.mod.fn": limpa somente chaves iniciadas pelo prefixo.
    Retorna quantidade de chaves removidas.
    """
    if prefix is None:
        removed = len(_cache_store)
        _cache_store.clear()
        return removed

    keys = [key for key in _cache_store if key.startswith(prefix)]
    for key in keys:
        _cache_store.pop(key, None)
    return len(keys)

def ttl_cache(ttl_seconds: int, ignore_args: Optional[list[int]] = None):
    """
    Decorator de cache com TTL.
    A chave inclui o nome da função + argumentos selecionados.
    ignore_args: lista de índices de argumentos posicionais a ignorar (0-indexed).
    """
    if ignore_args is None:
        ignore_args = []

    def decorator(func):
        def get_key(args, kwargs):
            # Filtra argumentos ignorados (incluindo self se for método de instância)
            filtered_args = tuple(arg for i, arg in enumerate(args) if i not in ignore_args)
            return f"{func.__module__}.{func.__name__}:{filtered_args}:{sorted(kwargs.items())}"

        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                key = get_key(args, kwargs)
                now = time.monotonic()
                if key in _cache_store:
                    value, expires_at = _cache_store[key]
                    if now < expires_at:
                        return value
                result = await func(*args, **kwargs)
                _cache_store[key] = (result, now + ttl_seconds)
                return result
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                key = get_key(args, kwargs)
                now = time.monotonic()
                if key in _cache_store:
                    value, expires_at = _cache_store[key]
                    if now < expires_at:
                        return value
                result = func(*args, **kwargs)
                _cache_store[key] = (result, now + ttl_seconds)
                return result
            return sync_wrapper
    return decorator
    return decorator
