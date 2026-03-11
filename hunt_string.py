import asyncio
from app.core.glpi_client import GLPIClient
from app.config import settings
import sys

async def check_glpi(name, url, app_token, user_token):
    client = GLPIClient(url=url, app_token=app_token, user_token=user_token)
    try:
        await client.init_session()
        print(f"\n[{name}] Sessão conectada.")
        
        print(f"[{name}] Buscando todos os Perfis (Profiles)...")
        profiles = await client.get_all_items("Profile")
        found_prof = [p for p in profiles if "administrad" in p.get("name", "").lower() or "hub" in p.get("name", "").lower()]
        
        for p in found_prof:
            print(f"  👉 ACHOU PERFIL! ID: {p.get('id')} | Nome: '{p.get('name')}'")
            
        print(f"[{name}] Buscando todos os Grupos (Groups)...")
        groups = await client.get_all_items("Group")
        found_grp = [g for g in groups if "administrad" in g.get("name", "").lower() or "hub" in g.get("name", "").lower()]
        
        for g in found_grp:
            print(f"  👉 ACHOU GRUPO! ID: {g.get('id')} | Nome: '{g.get('name')}'")
            
    except Exception as e:
        print(f"[{name}] Falha ao conectar: {e}")
    finally:
        await client._http.aclose()

async def main():
    print("Iniciando varredura profunda no GLPI procurando origens de 'Administrador' ou 'Hub'...")
    
    await check_glpi("DTIC", settings.dtic_glpi_url, settings.dtic_glpi_app_token, settings.dtic_glpi_user_token)
    await check_glpi("SIS", settings.sis_glpi_url, settings.sis_glpi_app_token, settings.sis_glpi_user_token)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
