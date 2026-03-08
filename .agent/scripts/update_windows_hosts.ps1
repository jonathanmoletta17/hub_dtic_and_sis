param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    [Parameter(Mandatory=$true)]
    [string]$IP
)

# Requer elevação de privilégio (Run as Administrator)
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Este script requer privilégios de Administrador. Tentando elevar..."
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Domain `"$Domain`" -IP `"$IP`"" -Verb RunAs
    exit
}

$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -ErrorAction Stop

$newContent = @()
$found = $false
$pattern = "\s+([a-zA-Z0-9.-]*$Domain)$"

foreach ($line in $hostsContent) {
    if ($line.Trim() -match $pattern -and -not $line.StartsWith("#")) {
        $found = $true
        $newContent += "$IP`t$Domain"
        Write-Host "Entrada existente atualizada: $Domain -> $IP"
    } else {
        $newContent += $line
    }
}

if (-not $found) {
    $newContent += "$IP`t$Domain"
    Write-Host "Nova entrada DNS adicionada: $Domain -> $IP"
}

# Salvar arquivo
$newContent | Set-Content $hostsPath -Force -Encoding ascii
Write-Host "Arquivo hosts do Windows atualizado corretamente."

# Teste imediato
ipconfig /flushdns | Out-Null
Write-Host "Teste de ping interno:"
ping -n 1 $Domain | Select-String "Ping"
