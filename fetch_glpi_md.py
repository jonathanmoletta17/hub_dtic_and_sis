import requests
import json
import urllib.parse
from pathlib import Path

def fetch_and_dump():
    output_md = []
    
    def add_section(title):
        output_md.append(f"\n## {title}\n")
    
    def fetch_instance(base_url, app_token, user_token, instance_name):
        output_md.append(f"\n# INSTANCE {instance_name}\n")
        
        headers = {
            "App-Token": app_token,
            "Authorization": f"user_token {user_token}",
            "Content-Type": "application/json"
        }

        res = requests.get(f"{base_url}/initSession", headers=headers)
        session_token = res.json().get('session_token')
        if not session_token:
            output_md.append("Failed to init session")
            return
            
        auth_headers = {
            "App-Token": app_token,
            "Session-Token": session_token,
            "Content-Type": "application/json"
        }
        
        try:
            add_section("Entidades")
            entities = requests.get(f"{base_url}/Entity?range=0-100", headers=auth_headers).json()
            for e in entities:
                 if isinstance(e, dict):
                     output_md.append(f"- ID: {e.get('id')} | Name: **{e.get('name')}** | Pai: {e.get('entities_id')}")
            
            add_section("Perfis")
            profiles = requests.get(f"{base_url}/Profile?range=0-100", headers=auth_headers).json()
            for p in profiles:
                 if isinstance(p, dict):
                     output_md.append(f"- ID: {p.get('id')} | Name: **{p.get('name')}** | interface: {p.get('interface')}")

            add_section("Grupos Hub-App-*")
            groups = requests.get(f"{base_url}/Group?range=0-200&expand_dropdowns=true", headers=auth_headers).json()
            for g in groups:
                 if isinstance(g, dict):
                     if "Hub-App" in g.get('name', '') or str(g.get('id')) in ['21', '22']:
                         output_md.append(f"- ID: {g.get('id')} | Name: **{g.get('name')}** | Entidade: {g.get('entities_id')}")

            if instance_name == "SIS":
                add_section("Grupos 21 e 22 (SIS Específicos)")
                try:
                    g21 = requests.get(f"{base_url}/Group/21", headers=auth_headers).json()
                    output_md.append(f"Group 21: ID={g21.get('id')} Name={g21.get('name')}")
                except:
                    output_md.append("Group 21 não encontrado")
                try:
                    g22 = requests.get(f"{base_url}/Group/22", headers=auth_headers).json()
                    output_md.append(f"Group 22: ID={g22.get('id')} Name={g22.get('name')}")
                except:
                    output_md.append("Group 22 não encontrado")

            add_section("Usuário Jonathan")
            qs = urllib.parse.quote('criteria[0][field]') + '=1&' + \
                 urllib.parse.quote('criteria[0][searchtype]') + '=contains&' + \
                 urllib.parse.quote('criteria[0][value]') + '=jonathan-moletta'
            url_search = f"{base_url}/search/User?{qs}"
            user_search = requests.get(url_search, headers=auth_headers).json()
            
            user_id = None
            if 'data' in user_search and len(user_search['data']) > 0:
                user_id = user_search['data'][0].get('2')
            if not user_id and 'data' not in user_search and len(user_search) > 0 and isinstance(user_search, list):
                 user_id = user_search[0].get('id')
                 
            if user_id:
                 output_md.append(f"**Jonathan ID:** {user_id}")
                 output_md.append("\n**Grupos de Jonathan:**")
                 gu = requests.get(f"{base_url}/User/{user_id}/Group_User", headers=auth_headers).json()
                 for g in gu:
                      if isinstance(g, dict):
                          output_md.append(f"- Vínculo {g.get('id')}: group_id={g.get('groups_id')}")

                 output_md.append("\n**Perfis de Jonathan:**")
                 pu = requests.get(f"{base_url}/User/{user_id}/Profile_User", headers=auth_headers).json()
                 for p in pu:
                      if isinstance(p, dict):
                          output_md.append(f"- Vínculo {p.get('id')}: profile_id={p.get('profiles_id')} is_recursive={p.get('is_recursive')}")
            else:
                 output_md.append("Usuário Jonathan não encontrado.")

        finally:
            requests.get(f"{base_url}/killSession", headers=auth_headers)

    fetch_instance(
        "http://cau.ppiratini.intra.rs.gov.br/glpi/apirest.php",
        "2UVQ8P4gL2Z1xyo31liYpeSH2xaHjUQHJNABfuWO",
        "T7jJvlFkU71CFoX1sQ9Cq82L2mwlc70qx35Fvldu",
        "DTIC"
    )

    fetch_instance(
        "http://cau.ppiratini.intra.rs.gov.br/sis/apirest.php",
        "m6TzlGYMgrbGIkIaOQf2ecWOy8T9ynShT887tRPm",
        "Rs1pLfsSMnqa5LQ5roph0Ne7xSiZafQdfbXeL3CN",
        "SIS"
    )
    
    with open(r'c:\Users\jonathan-moletta\.gemini\antigravity\playground\tensor-aurora\glpi_dump.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_md))

if __name__ == '__main__':
    fetch_and_dump()
