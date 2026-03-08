param(
    [Parameter(Mandatory=$true)]
    [int]$Port,
    [Parameter(Mandatory=$true)]
    [string]$AppName
)

# Requer elevação de privilégio (Run as Administrator)
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Este script requer privilégios de Administrador. Tentando elevar..."
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Port $Port -AppName `"$AppName`"" -Verb RunAs
    exit
}

$ruleName = "Docker - $AppName ($Port)"

# Checar se a regra já existe
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "A regra de Firewall '$ruleName' já existe. Verificando se está habilitada..."
    if ($existingRule.Enabled -ne "True") {
        Enable-NetFirewallRule -DisplayName $ruleName
        Write-Host "Regra habilitada."
    } else {
        Write-Host "Regra já está habilitada."
    }
} else {
    Write-Host "Criando regra '$ruleName' para porta TCP $Port..."
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
    Write-Host "Regra '$ruleName' criada com sucesso!"
}

# Confirmação visual
Get-NetFirewallRule -DisplayName $ruleName | Select-Object DisplayName, Enabled, Action
