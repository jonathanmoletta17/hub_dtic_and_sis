import requests
from pprint import pprint
import urllib.parse

def fetch_glpi(base_url, app_token, user_token, instance_name):
    print(f"\n================ {instance_name} ================")
    
    headers = {
        "App-Token": app_token,
        "Authorization": f"user_token {user_token}",
        "Content-Type": "application/json"
    }

    print("\n--- initSession ---")
    res = requests.get(f"{base_url}/initSession", headers=headers)
    session_token = res.json().get('session_token')
    if not session_token:
        print("Failed to init session")
        print(res.text)
        return
        
    auth_headers = {
        "App-Token": app_token,
        "Session-Token": session_token,
        "Content-Type": "application/json"
    }
    
    try:
        print("\n--- getMyEntities ---")
        pprint(requests.get(f"{base_url}/getMyEntities", headers=auth_headers).json())
        
        print("\n--- Entidades (GET /Entity) ---")
        entities = requests.get(f"{base_url}/Entity?range=0-100", headers=auth_headers).json()
        for e in entities:
             if isinstance(e, dict):
                 print(f"ID: {e.get('id')} | Name: {e.get('name')} | completename: {e.get('completename')} | entities_id (pai): {e.get('entities_id')}")
        
        print("\n--- Perfis (GET /Profile) ---")
        profiles = requests.get(f"{base_url}/Profile?range=0-100", headers=auth_headers).json()
        for p in profiles:
             if isinstance(p, dict):
                 print(f"ID: {p.get('id')} | Name: {p.get('name')} | interface: {p.get('interface')} | is_default: {p.get('is_default')}")

        print("\n--- Grupos (GET /Group) ---")
        groups = requests.get(f"{base_url}/Group?range=0-200&expand_dropdowns=true", headers=auth_headers).json()
        for g in groups:
             if isinstance(g, dict):
                 print(f"ID: {g.get('id')} | Name: {g.get('name')} | entities_id: {g.get('entities_id')}")

        print("\n--- Usuário Jonathan ---")
        qs = urllib.parse.quote('criteria[0][field]') + '=1&' + \
             urllib.parse.quote('criteria[0][searchtype]') + '=contains&' + \
             urllib.parse.quote('criteria[0][value]') + '=jonathan-moletta'
        url_search = f"{base_url}/search/User?{qs}"
        user_search = requests.get(url_search, headers=auth_headers).json()
        
        user_id = None
        
        if 'data' in user_search and len(user_search['data']) > 0:
            user_id = user_search['data'][0].get('2') # 2 is ID field in glpi search usually
            
        if not user_id and 'data' not in user_search and len(user_search) > 0 and isinstance(user_search, list): # maybe direct user array
             user_id = user_search[0].get('id')
             
        if user_id:
             print(f"User ID found: {user_id}")
             
             print("\n  Grupos do Usuário:")
             gu = requests.get(f"{base_url}/User/{user_id}/Group_User", headers=auth_headers).json()
             for g in gu:
                  if isinstance(g, dict):
                      print(f"   Vínculo ID {g.get('id')}: group_id={g.get('groups_id')} entity_id={g.get('entities_id')}")

             print("\n  Perfis do Usuário:")
             pu = requests.get(f"{base_url}/User/{user_id}/Profile_User", headers=auth_headers).json()
             for p in pu:
                  if isinstance(p, dict):
                      print(f"   Vínculo ID {p.get('id')}: profile_id={p.get('profiles_id')} entity_id={p.get('entities_id')} is_recursive={p.get('is_recursive')}")
        
        if instance_name == "SIS":
            print("\n--- Group 22 SIS ---")
            pprint(requests.get(f"{base_url}/Group/22", headers=auth_headers).json())
            
            print("\n--- Group 21 SIS ---")
            pprint(requests.get(f"{base_url}/Group/21", headers=auth_headers).json())
    finally:
        requests.get(f"{base_url}/killSession", headers=auth_headers)


fetch_glpi(
    "http://cau.ppiratini.intra.rs.gov.br/glpi/apirest.php",
    "2UVQ8P4gL2Z1xyo31liYpeSH2xaHjUQHJNABfuWO",
    "T7jJvlFkU71CFoX1sQ9Cq82L2mwlc70qx35Fvldu",
    "DTIC"
)

fetch_glpi(
    "http://cau.ppiratini.intra.rs.gov.br/sis/apirest.php",
    "m6TzlGYMgrbGIkIaOQf2ecWOy8T9ynShT887tRPm",
    "Rs1pLfsSMnqa5LQ5roph0Ne7xSiZafQdfbXeL3CN",
    "SIS"
)
