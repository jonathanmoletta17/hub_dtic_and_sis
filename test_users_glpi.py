import asyncio
import json
from app.config import settings
from app.core.glpi_client import GLPIClient

async def test():
    instance = settings.get_glpi_instance("dtic")
    client = GLPIClient(instance)
    await client.init_session()
    
    # 1. Tenta get_all_items puro
    users = await client.get_all_items("User", range_start=0, range_end=500)
    print("REST /User (0-500) retornou:", len(users))
    
    # 2. Testa com is_active e is_deleted
    users_active = await client.get_all_items("User", range_start=0, range_end=500, is_active=1, is_deleted=0)
    print("REST /User (is_active=1, is_deleted=0) retornou:", len(users_active))

    # 3. Tenta search_items puro
    search_res = await client.search_items("User", range="0-500")
    if isinstance(search_res, dict):
        total_count = search_res.get("totalcount", "N/A")
        data_len = len(search_res.get("data", []))
        print("search_items(User) retornou data:", data_len, "totalcount:", total_count)
    else:
        print("search_items(User) retornou lista de", len(search_res))
        
    await client.close()

if __name__ == "__main__":
    asyncio.run(test())
