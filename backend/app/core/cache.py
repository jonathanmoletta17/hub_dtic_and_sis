import time
import asyncio
from typing import Any, Callable, Dict, Tuple

class AsyncTTLMemoryCache:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl = ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}
        # Lock de registro dos locks por chave.
        self._registry_lock = asyncio.Lock()
        self._key_locks: Dict[str, asyncio.Lock] = {}

    def _is_fresh(self, timestamp: float) -> bool:
        return (time.time() - timestamp) < self.ttl

    def try_get(self, key: str) -> Tuple[bool, Any]:
        entry = self._cache.get(key)
        if not entry:
            return False, None

        timestamp, data = entry
        if self._is_fresh(timestamp):
            return True, data

        # Remove entradas expiradas para evitar acúmulo de lixo.
        self._cache.pop(key, None)
        return False, None

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = (time.time(), value)

    async def _get_key_lock(self, key: str) -> asyncio.Lock:
        async with self._registry_lock:
            lock = self._key_locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                self._key_locks[key] = lock
            return lock

    async def get_or_set(self, key: str, fetch_func: Callable[[], Any]) -> Any:
        found, cached = self.try_get(key)
        if found:
            return cached

        # Single-flight por chave: evita serializar chaves independentes.
        key_lock = await self._get_key_lock(key)
        async with key_lock:
            found, cached = self.try_get(key)
            if found:
                return cached

            # Fetch new data — resolve coroutines (lambda wrapping async funcs)
            result = fetch_func()
            if asyncio.iscoroutine(result):
                result = await result
            self.set(key, result)
            return result

    def clear(self):
        self._cache.clear()
        self._key_locks.clear()

# Global cache instances
formcreator_cache = AsyncTTLMemoryCache(ttl_seconds=300) # 5 minutes for catalog
identity_cache = AsyncTTLMemoryCache(ttl_seconds=120)  # 2 minutes for user roles
