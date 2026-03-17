## Edge Proxy

Esta pasta versiona o roteamento HTTP do ambiente local/containerizado.

Hosts suportados:

- `hub.local` -> frontend em `glpi-tensor-frontend:3000` e API same-origin em `/api/*`
- `carregadores.local` -> alias transitório com redirecionamento permanente para `hub.local`
- `api.hub.local` -> backend direto em `glpi-universal-backend:8080` para smoke test e diagnóstico
- `api.carregadores.local` -> alias transitório com redirecionamento permanente para `api.hub.local`

Entradas mínimas no arquivo `hosts` da máquina local:

```text
127.0.0.1 hub.local
127.0.0.1 api.hub.local
127.0.0.1 carregadores.local
127.0.0.1 api.carregadores.local
```

O Compose monta `nginx.conf` e `conf.d/tensor-aurora.conf` diretamente no container `edge-proxy`.
Qualquer mudança de host, timeout, buffering ou upload deve ser feita aqui, não em estado manual fora do repositório.
