import time
import asyncio
from typing import Any, Callable, Dict, Tuple

class AsyncTTLMemoryCache:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl = ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get_or_set(self, key: str, fetch_func: Callable[[], Any]) -> Any:
        async with self._lock:
            # Check if exists and is valid
            if key in self._cache:
                timestamp, data = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return data
            
            # Fetch new data — resolve coroutines (lambda wrapping async funcs)
            result = fetch_func()
            if asyncio.iscoroutine(result):
                result = await result
            data = result
            self._cache[key] = (time.time(), data)
            return data

    def clear(self):
        self._cache.clear()

# Global cache instances
formcreator_cache = AsyncTTLMemoryCache(ttl_seconds=300) # 5 minutes for catalog
identity_cache = AsyncTTLMemoryCache(ttl_seconds=120)  # 2 minutes for user roles
