# ============================================================
#   TENSOR AURORA: CONFIGURACAO DE CONECTIVIDADE (WSL2 Mirrored Mode)
# ============================================================
# Este script deve ser executado como ADMINISTRADOR no Windows.
# Ele prepara o ambiente de rede para os containers Frontend (3001) e Backend (8080).

Write-Host "Iniciando configuracao de rede para o Tensor Aurora..." -ForegroundColor Cyan

# 1. REMOVER CONFLITOS DE PORTPROXY
# Em WSL2 Mirrored Mode, qualquer regra de port proxy causa "timeout" ou bloqueios
# no acesso por IP externo (mesmo que o localhost funcione). 
Write-Host "[1/3] Limpando regras de roteamento incorretas (PortProxy)..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0 2>$null

# 2. ABRIR PORTAS NO FIREWALL DO WINDOWS (EXTERNAL ACCESS)
Write-Host "[2/3] Abrindo portas 3001 e 8080 no Firewall do Windows..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Tensor_Aurora_*" -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName "Tensor_Aurora_Frontend_3001" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 3001 `
    -Profile Any `
    -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName "Tensor_Aurora_Backend_8080" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 8080 `
    -Profile Any `
    -ErrorAction SilentlyContinue

# 3. ABRIR PORTAS NO FIREWALL DO HYPER-V (TRAFEGO PARA O WSL2)
# Sem essas regras, os pacotes que passam pelo Windows não chegam ao Linux (WSL2).
Write-Host "[3/3] Abrindo roteamento no Hyper-V Firewall para o WSL2..." -ForegroundColor Yellow
Remove-NetFirewallHyperVRule -DisplayName "Tensor_Aurora_*" -ErrorAction SilentlyContinue

New-NetFirewallHyperVRule -DisplayName "Tensor_Aurora_HyperV_3001" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPorts 3001 `
    -VMCreatorId Any `
    -ErrorAction SilentlyContinue

New-NetFirewallHyperVRule -DisplayName "Tensor_Aurora_HyperV_8080" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPorts 8080 `
    -VMCreatorId Any `
    -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  CONFIGURACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "  A aplicacao deve estar acessivel em http://<SEU_IP>:3001" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
