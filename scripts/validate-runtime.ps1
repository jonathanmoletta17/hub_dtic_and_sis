[CmdletBinding()]
param(
  [switch]$SkipDockerBuild,
  [switch]$RunPlaywright,
  [switch]$RunFullPlaywright
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $true
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$webRoot = Join-Path $repoRoot "web"
$backendRoot = Join-Path $repoRoot "backend"
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$doctorScript = Join-Path $repoRoot "scripts\doctor-runtime.ps1"

function Invoke-Step {
  param(
    [string]$Name,
    [string]$Workdir,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host ("==> " + $Name)
  Push-Location $Workdir
  try {
    & $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Step failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

Invoke-Step -Name "web lint" -Workdir $webRoot -Command { npm run lint }
Invoke-Step -Name "web vitest" -Workdir $webRoot -Command { npm exec vitest run }
Invoke-Step -Name "web build" -Workdir $webRoot -Command { npm run build }
Invoke-Step -Name "backend compileall" -Workdir $backendRoot -Command { python -m compileall app }

$backendTests = @(Get-ChildItem -Path $backendRoot -Recurse -File | Where-Object {
  $_.Name -like "test*.py" -or $_.Name -like "*_test.py"
})

if ($backendTests.Count -gt 0) {
  Invoke-Step -Name "backend pytest" -Workdir $backendRoot -Command { python -m pytest }
}
else {
  Write-Host ""
  Write-Host "==> backend pytest"
  Write-Host "No backend pytest suite found in this repo. Skipping."
}

if (-not $SkipDockerBuild) {
  Invoke-Step -Name "docker compose up -d --build" -Workdir $repoRoot -Command { docker compose -f $composeFile up -d --build }
}
else {
  Write-Host ""
  Write-Host "==> docker compose up -d --build"
  Write-Host "Skipped by -SkipDockerBuild."
}

Invoke-Step -Name "doctor runtime" -Workdir $repoRoot -Command { powershell -ExecutionPolicy Bypass -File $doctorScript }

if ($RunFullPlaywright) {
  Invoke-Step -Name "playwright full e2e" -Workdir $webRoot -Command { npx playwright test e2e --workers=1 }
}
elseif ($RunPlaywright) {
  Invoke-Step -Name "playwright smoke" -Workdir $webRoot -Command {
    npx playwright test e2e/hub-mvp.spec.ts e2e/hub-dashboard-analytics.spec.ts --workers=1
  }
}
else {
  Write-Host ""
  Write-Host "==> playwright smoke"
  Write-Host "Skipped. Use -RunPlaywright para o smoke basico ou -RunFullPlaywright para a suite e2e completa."
}

Write-Host ""
Write-Host "Validation completed."
