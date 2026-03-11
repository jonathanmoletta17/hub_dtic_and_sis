import asyncio
from app.core.glpi_client import GLPIClient
from app.config import settings

async def main():
    print("Iniciando auditoria de perfis do GLPI DTIC...")
    client = GLPIClient(
        url=settings.dtic_glpi_url,
        app_token=settings.dtic_glpi_app_token,
        user_token=settings.dtic_glpi_user_token
    )
    
    await client.init_session()
    print("Sessão DTIC iniciada.")
    
    # Busca a propria sessao para ver os perfis cacheados
    session_data = await client.get_full_session()
    glpiprofiles = session_data.get("session", {}).get("glpiprofiles", {})
    
    print("\n[PERFIS ATRIBUÍDOS AO SEU USUÁRIO NA SESSÃO DO GLPI DTIC]")
    if isinstance(glpiprofiles, dict):
        for pid, pdata in glpiprofiles.items():
            print(f"ID {pid} -> Nome no DB do GLPI: '{pdata.get('name')}'")
            
    print("\nBuscando na raiz de Profiles do GLPI DTIC (apenas se tiver acesso)...")
    try:
        all_profiles = await client.get_all_items("Profile")
        for p in all_profiles:
            print(f"ID {p.get('id')} -> Nome: '{p.get('name')}'")
    except Exception as e:
        print(f"Aviso: Não foi possível listar todos os profiles globais (permissão): {e}")
        
if __name__ == "__main__":
    asyncio.run(main())
