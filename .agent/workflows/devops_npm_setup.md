---
description: Como instalar e configurar o Nginx Proxy Manager
---

# Instalação e Configuração Nginx Proxy Manager (NPM) Automática

Use este workflow para configurar um proxy reverso para os projetos na rede do laboratório ou desenvolvedor sem utilizar HTTPS público, baseando-se em nomes falsos `.local` com arquivo Hosts.

1. Implemente no `docker-compose.yml` a versão mais recente das imagens do Nginx Proxy Manager e MariaDB (jc21/nginx-proxy-manager:latest e jc21/mariadb-aria:latest).
2. Certifique-se que as senhas estão passadas com variáveis de ambiente.
3. Configure duas redes em bridge isoladas: `npm-rede` e `apps-rede`. O NPM tem acesso às duas. MariaDB tem acesso só a `npm-rede`. A aplicação local tem acesso a `apps-rede`.
4. Faça o Docker Compose `up -d` em ambos os serviços novos.
5. Inspecione a rede e garanta que subiu perfeitamente enviando um Curl para o painel Admin porta 81.
6. Faça a injeção do DNS editando o hosts file pelo Powershell ou consumindo a ferramenta pronta: `.agent/scripts/update_windows_hosts.ps1 -Domain dominio.local -IP 192.168.1.100`.
7. Interaja com a API do NPM (Porta 81) no terminal realizando um Autenticação POST `/api/tokens` e use o respectivo AccessToken para automatizar a criação do Host com o POST em `/api/nginx/proxy-hosts`.
8. Envie requests de validação para o nome `.local` do navegador / via Curl, o retorno deve ser **200**, se der **502 Bad Gateway** o Proxy tentou comunicar com "localhost" em vez do "nome-do-container".
