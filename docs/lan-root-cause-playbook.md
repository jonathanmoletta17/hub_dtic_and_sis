# LAN Root-Cause Playbook (Tensor Aurora)

Documento consolidado principal:

- [network-availability-consolidated-diagnosis.md](/home/jonathan-moletta/projects/tensor-aurora/docs/network-availability-consolidated-diagnosis.md)

## Objective

Stop random rebuild/config changes and diagnose LAN access with deterministic checks.

This project has 4 critical layers:

1. Container/app health (`glpi-backend`, `glpi-frontend`, `edge-proxy`).
2. Host network publish (`hub.local:8080` and `<LAN_IP>:8080` or fallback `<LAN_IP>:3001`).
3. Client name resolution (`hub.local`, `api.hub.local`) and browser session flow.
4. Compose execution context (`WSL Linux path` vs `\\wsl.localhost\...` from Windows).

If layer 2 fails, rebuilding images does not fix LAN access.
If layer 4 is wrong, rebuild can fail even when `nginx.conf` is correct.

## Expected topology

- Browser uses same-origin web app at `http://hub.local:8080`.
- Browser calls API through `/api/*` on the same origin (Nginx edge proxy).
- Edge proxy forwards:
  - `/` to `glpi-tensor-frontend:3000`
  - `/api/` to `glpi-universal-backend:8080`
- NPM/port `81` is not part of the current canonical runtime.

## Critical operational rule

Run the stack from Linux inside WSL, not from a UNC path in Windows:

```powershell
wsl.exe -d Ubuntu --cd /home/jonathan-moletta/projects/tensor-aurora sh -lc "docker compose up -d --build"
```

If Compose is run from `\\wsl.localhost\...`, bind mounts to `nginx.conf` may fail intermittently with `not a directory`.

## One-command diagnosis (Windows)

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/diagnose_hub_lan_windows.ps1 -BaseUrl http://hub.local:8080 -PublicIp <SERVER_LAN_IP>
```

Interpretation:

- `HTTP Local` must be `OK`.
- `LAN Reachability` must be `OK`.
- If `LAN Reachability` is `FAIL` but local is `OK`, issue is host networking/firewall/portproxy.

## Deterministic sequence (manual)

### 1) Container health

```powershell
docker compose ps
```

Pass criteria:

- `glpi-universal-backend`: `healthy`
- `glpi-tensor-frontend`: `healthy`
- `tensor-aurora-edge-proxy`: `healthy`

### 2) Local HTTP path

```powershell
curl.exe -s -o NUL -w "hub:%{http_code}`n" http://hub.local:8080/
curl.exe -s -o NUL -w "fallback:%{http_code}`n" http://<SERVER_LAN_IP>:3001/
```

Pass criteria: HTTP 200 in `hub.local:8080` and no erro no fallback configurado.

Note: `localhost:8080` can fail on this host topology while LAN still works, so treat it as optional telemetry.

### 3) LAN self-test on server (critical gate)

```powershell
Test-NetConnection -ComputerName <SERVER_LAN_IP> -Port 8080
```

Pass criteria: `TcpTestSucceeded=True`.

If this fails, do not modify app code. Fix host networking first.

### 4) Name resolution on clients

On each client machine, map hostnames to server LAN IP (or provide internal DNS):

```text
<SERVER_LAN_IP> hub.local
<SERVER_LAN_IP> api.hub.local
<SERVER_LAN_IP> carregadores.local
<SERVER_LAN_IP> api.carregadores.local
```

### 5) Browser/session validation

From a client machine:

1. Open `http://hub.local:8080`.
2. Login.
3. Navigate to `/sis/dashboard` and `/dtic/dashboard`.
4. Verify no redirect loop to login.

If login fails only on client (but not server), check:

- client hosts/DNS mapping
- clock/time skew on client
- blocked cookies in browser policy

## Known host-side blocker (Windows + Docker Desktop)

Observed in this environment:

- `http://hub.local:8080` responds.
- `Test-NetConnection <LAN_IP> -Port 8080` may fail on the server itself.

This indicates port publish is not reachable via LAN.

Typical fix (requires elevated PowerShell):

```powershell
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=127.0.0.1 connectport=8080
New-NetFirewallRule -DisplayName "Tensor Aurora LAN 8080" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080
```

If rule exists but no TCP listener appears on 8080, recreate using the explicit LAN IP:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080
netsh interface portproxy add v4tov4 listenaddress=<SERVER_LAN_IP> listenport=8080 connectaddress=127.0.0.1 connectport=8080
Restart-Service iphlpsvc
```

Then re-test:

```powershell
Test-NetConnection -ComputerName <SERVER_LAN_IP> -Port 8080
```

If 8080 still does not create a listener on the host, use stable fallback on 3001:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=3001
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3001 connectaddress=127.0.0.1 connectport=8080
New-NetFirewallRule -DisplayName "Tensor Aurora LAN 3001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
Test-NetConnection -ComputerName <SERVER_LAN_IP> -Port 3001
```

In this fallback mode, standardize client access on `http://hub.local:3001`.

## Realtime/SSE integrity checks

For stable realtime updates:

- `ContextLiveSync` is injected at context layout level.
- Nginx has explicit SSE route with buffering disabled.
- Polling fallback remains active if stream reconnects/fails.

Quick checks:

```powershell
curl.exe -s -o NUL -w "api_health:%{http_code}`n" -H "Host: api.hub.local" http://127.0.0.1:8080/health
curl.exe -s -o NUL -w "sse_auth:%{http_code}`n" -H "Host: api.hub.local" http://127.0.0.1:8080/api/v1/dtic/events/stream
```

Expected:

- `/health` => `200`
- `/events/stream` => `401` without session token

## Decision rule (clean workflow)

1. If layer 2 (`LAN Reachability`) fails: fix host network, not app code.
2. If layer 2 passes and clients still fail: fix DNS/hosts on clients.
3. If app opens but data does not refresh: inspect SSE/auth/realtime domain invalidation.
4. Only change backend/frontend code after layers 1-2-3 are green.
