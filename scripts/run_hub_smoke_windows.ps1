param(
  [Parameter(Mandatory = $true)]
  [string]$Username,

  [Parameter(Mandatory = $true)]
  [string]$Password,

  [string]$BaseUrl = "http://hub.local:8080"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceWebDir = Join-Path $repoRoot "web"
$tempRoot = Join-Path $env:TEMP "tensor-aurora-web-smoke"
$tempWebDir = Join-Path $tempRoot "web"

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
New-Item -ItemType Directory -Path $tempWebDir -Force | Out-Null

$robocopyArgs = @(
  $sourceWebDir,
  $tempWebDir,
  "/MIR",
  "/XD", "node_modules", ".next", "output",
  "/NFL", "/NDL", "/NJH", "/NJS", "/NP"
)

robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -gt 3) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

Push-Location $tempWebDir
try {
  npm ci
  if ($LASTEXITCODE -ne 0) {
    throw "npm ci failed with exit code $LASTEXITCODE"
  }

  npm run smoke:hub:install
  if ($LASTEXITCODE -ne 0) {
    throw "npm run smoke:hub:install failed with exit code $LASTEXITCODE"
  }

  $env:SMOKE_USERNAME = $Username
  $env:SMOKE_PASSWORD = $Password
  $env:SMOKE_BASE_URL = $BaseUrl

  $maxAttempts = 2
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    npm run smoke:hub
    if ($LASTEXITCODE -eq 0) {
      break
    }

    if ($attempt -eq $maxAttempts) {
      throw "npm run smoke:hub failed with exit code $LASTEXITCODE"
    }

    Start-Sleep -Seconds 2
  }
}
finally {
  Pop-Location
}
