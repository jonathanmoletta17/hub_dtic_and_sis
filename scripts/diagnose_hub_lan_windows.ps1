param(
  [string]$BaseUrl = "http://hub.local:8080",
  [string]$PublicIp = ""
)

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-Result {
  param(
    [string]$Label,
    [bool]$Ok,
    [string]$Detail = ""
  )
  $status = if ($Ok) { "OK" } else { "FAIL" }
  $color = if ($Ok) { "Green" } else { "Red" }
  Write-Host ("[{0}] {1} {2}" -f $status, $Label, $Detail) -ForegroundColor $color
}

function Resolve-ServerIp {
  $candidate = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.InterfaceAlias -notlike "vEthernet*" -and
      $_.AddressState -eq "Preferred"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1

  if ($candidate) { return $candidate.IPAddress }
  return ""
}

function Get-PortFromUrl {
  param([string]$Url)
  try {
    $uri = [System.Uri]$Url
    if ($uri.IsDefaultPort) { return 80 }
    return $uri.Port
  } catch {
    return 8080
  }
}

function Test-HttpCode {
  param([string]$Url, [int]$TimeoutSec = 8)
  $output = & curl.exe --noproxy "*" -s -o NUL -w "%{http_code}" --max-time $TimeoutSec $Url 2>$null
  if ($LASTEXITCODE -eq 0 -and $output -match "^\d{3}$") {
    $code = [int]$output
    return @{ Ok = $true; Code = $code; Error = "" }
  }

  return @{ Ok = $false; Code = 0; Error = "curl failed (exit=$LASTEXITCODE)" }
}

Write-Section "Container Health"
Push-Location $repoRoot
try {
  $composePs = docker compose ps 2>&1
  $composeOk = $LASTEXITCODE -eq 0
}
finally {
  Pop-Location
}
Write-Result "docker compose ps" $composeOk
if ($composeOk) {
  $composePs | Write-Host
} else {
  Write-Host "  Run this script from any directory; it now resolves the repository root from the script path." -ForegroundColor DarkGray
}

Write-Section "HTTP Local"
$localhostCheck = Test-HttpCode -Url "http://localhost:8080/"
Write-Result "http://localhost:8080/" ($localhostCheck.Code -eq 200) "(code=$($localhostCheck.Code))"
if (-not $localhostCheck.Ok -and $localhostCheck.Error) {
  Write-Host "  $($localhostCheck.Error)" -ForegroundColor DarkGray
}

$baseCheck = Test-HttpCode -Url $BaseUrl
Write-Result $BaseUrl ($baseCheck.Code -eq 200) "(code=$($baseCheck.Code))"
if (-not $baseCheck.Ok -and $baseCheck.Error) {
  Write-Host "  $($baseCheck.Error)" -ForegroundColor DarkGray
}

Write-Section "Host/DNS"
$hostnames = @("hub.local", "api.hub.local", "carregadores.local", "api.carregadores.local")
$hostsFile = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"

foreach ($name in $hostnames) {
  $present = $false
  if (Test-Path $hostsFile) {
    $present = (Select-String -Path $hostsFile -Pattern "(?i)\b$([regex]::Escape($name))\b" -SimpleMatch:$false | Measure-Object).Count -gt 0
  }
  Write-Result "$name in hosts" $present
}

Write-Section "LAN Reachability"
if ([string]::IsNullOrWhiteSpace($PublicIp)) {
  $PublicIp = Resolve-ServerIp
}

if ([string]::IsNullOrWhiteSpace($PublicIp)) {
  Write-Result "Detectar IP LAN do servidor" $false
} else {
  Write-Result "IP LAN detectado" $true "($PublicIp)"
  $port = Get-PortFromUrl -Url $BaseUrl
  $tcp = Test-NetConnection -ComputerName $PublicIp -Port $port -InformationLevel Detailed
  Write-Result "${PublicIp}:$port (self-test heuristic)" ([bool]$tcp.TcpTestSucceeded) "(TcpTestSucceeded=$($tcp.TcpTestSucceeded))"
  if (-not $tcp.TcpTestSucceeded) {
    Write-Host "  A self-test against the server's own LAN IP can be a false negative on Windows host networking." -ForegroundColor DarkYellow
    Write-Host "  Confirm from another machine on the same network before concluding that LAN access is down." -ForegroundColor DarkYellow
  }
}

Write-Section "Portproxy"
$portProxy = netsh interface portproxy show all 2>&1
$portProxy | Write-Host

$port = Get-PortFromUrl -Url $BaseUrl
$listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($listeners) {
  Write-Result "Listener on TCP $port" $true
} else {
  Write-Result "Listener on TCP $port" $false
  Write-Host "  Portproxy rule may exist but not be bound. Try listenaddress=<SERVER_LAN_IP> instead of 0.0.0.0." -ForegroundColor DarkYellow
  Write-Host "  If 8080 still fails, use a known-listening LAN portproxy (ex: 3001) to forward to localhost:8080." -ForegroundColor DarkYellow
  Write-Host "  Admin example: netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3001 connectaddress=127.0.0.1 connectport=8080" -ForegroundColor DarkYellow
}

Write-Section "Conclusion"
Write-Host "If localhost works but LAN self-test fails, the issue is host networking/firewall/portproxy, not container rebuild." -ForegroundColor Yellow
Write-Host "A failing self-test on the server does not override a successful probe from a different LAN client." -ForegroundColor Yellow
Write-Host "For LAN clients, map hub.local/api.hub.local to the server IP (not 127.0.0.1)." -ForegroundColor Yellow
