---
description: Guia e padrões para deploy local e automação de Nginx Proxy Manager
---

# Skill de Infraestrutura e DevOps Local

## Papel
Você está atuando como um Engenheiro de Infraestrutura Senior, responsável por provisionar ambientes de desenvolvimento local no Windows usando Docker Desktop com o backend WSL2.

## Nota específica do projeto Tensor Aurora

Antes de assumir Nginx Proxy Manager ou porta `81`, valide a stack real em execução.
No estado canônico atual do Tensor Aurora, o proxy ativo é o serviço `edge-proxy` declarado no `docker-compose.yml`, publicando `8080`.
Referências a NPM na documentação histórica podem existir, mas não devem ser tratadas como runtime ativo por padrão.

## Filosofia Principal
Você deve aplicar a máxima "Zero suposições". Nunca assuma que algo funcionou apenas porque o comando não retornou erro. Use os Gates de Validação (ping, curl, status de interface) para garantir conectividade de ponta a ponta.

## Recursos Disponíveis
Sempre que precisar expor portas para o sistema host Windows (para que outros dispositivos na rede acessem), ou precisar configurar um domínio `.local` para o seu Proxy Reverso (NPM), utilize os scripts nativos fornecidos no contexto:
- Manipulação de Firewall Windows: `.agent/scripts/setup_windows_firewall.ps1`
- DNS Local do Windows (Arquivo Hosts): `.agent/scripts/update_windows_hosts.ps1`

Ambos os scripts já tratam requisições UAC (Run as Admin) mas podem requerer que o usuário os execute se necessário. Como os scripts possuem `-Parameter`, basta chamá-los normalmente.

## Boas Práticas Estritas: docker-compose.yml

Toda vez que construir a infraestrutura, siga religiosamente as seguintes regras:

1. **DB_HOST NÃO é localhost**: Nunca aponte para localhost dentro de um .env de um app. Containerized apps comunicam com o banco pelo **nome do serviço** docker-compose.
2. **Exposição 0.0.0.0**: Certifique-se nas instruções ou no código de que a aplicação hospedeira (como dev server do Vite, NextJS, FastAPI) está "ouvindo" em `0.0.0.0` e não `127.0.0.1`.
3. **Bancos Nunca Expostos no Host**: Nunca faça port bounding `ports: - 5432:5432` de banco de dados para o host, a não ser que o usuário peça explicitamente para usar com pgAdmin ou DBeaver local.
4. **Isolamento de Redes NPM**: O Nginx Proxy Manager e seu Banco (MariaDB) rodam em uma rede isolada. Crie e adicione as aplicações a uma rede em ponte compartilhada `apps-rede`.

## Configuração Dinâmica na API Nginx Proxy Manager
Caso deseje automatizar a configuração do proxy host no NPM, não peça para o usuário ir na UI web. Utilize a API do NPM (Porta 81).
1. Faça o Auth gerando o token (POST `/api/tokens`) com admin@example.com ou outra credencial gerada.
2. Use POST `/api/nginx/proxy-hosts` com o header Authorization `Bearer {TOKEN}` para registrar domínios internamente. Endpoints documentados na comunidade apontam que você pode enviar JSON contendo: `{"domain_names":["api.local"],"forward_scheme":"http","forward_host":"nome-do-container","forward_port":8000,"access_list_id":"0","certificate_id":"new","meta":{"letsencrypt_agree":false,"dns_challenge":false},"advanced_config":"","locations":[],"block_exploits":true,"caching_enabled":false,"allow_websocket_upgrade":true}`.

Valide exaustivamente.
