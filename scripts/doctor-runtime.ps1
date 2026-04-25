[CmdletBinding()]
param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Net.Http

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $true
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Id,
    [ValidateSet("pass", "warn", "fail")]
    [string]$Status,
    [string]$Message,
    [string]$Details = ""
  )

  $checks.Add([pscustomobject]@{
      id = $Id
      status = $Status
      message = $Message
      details = $Details
    })
}

function Test-Command {
  param(
    [string]$Name,
    [string]$Id,
    [switch]$Optional
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -ne $command) {
    Add-Check -Id $Id -Status "pass" -Message "$Name disponivel" -Details $command.Source
    return
  }

  if ($Optional) {
    Add-Check -Id $Id -Status "warn" -Message "$Name nao encontrado" -Details "Opcional para este repo."
    return
  }

  Add-Check -Id $Id -Status "fail" -Message "$Name nao encontrado" -Details "Necessario para o fluxo principal."
}

function Test-HttpEndpoint {
  param(
    [string]$Id,
    [string]$Url,
    [string]$SuccessMessage,
    [string]$FailureMessage
  )

  $handler = [System.Net.Http.HttpClientHandler]::new()
  $client = [System.Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromSeconds(5)

  try {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $Url)
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    Add-Check -Id $Id -Status "pass" -Message $SuccessMessage -Details ("HTTP " + [string][int]$response.StatusCode)
  }
  catch {
    Add-Check -Id $Id -Status "warn" -Message $FailureMessage -Details $_.Exception.Message
  }
  finally {
    $client.Dispose()
    $handler.Dispose()
  }
}

$requiredFiles = @(
  "README.md",
  "ARCHITECTURE_RULES.md",
  "docs\canonical-scope.md",
  "BOOTSTRAP.md",
  "AGENTS.md",
  "docs\CLI_CONTROL_PLANE.md",
  "backend\pyproject.toml",
  "web\package.json"
)

foreach ($relativePath in $requiredFiles) {
  $fullPath = Join-Path $repoRoot $relativePath
  if (Test-Path $fullPath) {
    Add-Check -Id ("file:" + $relativePath) -Status "pass" -Message "$relativePath presente" -Details $fullPath
  }
  else {
    Add-Check -Id ("file:" + $relativePath) -Status "fail" -Message "$relativePath ausente" -Details $fullPath
  }
}

Test-Command -Name "docker" -Id "command:docker"
Test-Command -Name "npm" -Id "command:npm"
Test-Command -Name "python" -Id "command:python" -Optional
Test-Command -Name "codex" -Id "command:codex" -Optional
Test-Command -Name "gemini" -Id "command:gemini" -Optional
Test-Command -Name "claude" -Id "command:claude" -Optional
Test-Command -Name "hermes" -Id "command:hermes" -Optional

try {
  $composeOutput = docker compose -f $composeFile ps | Out-String
  Add-Check -Id "docker.compose.ps" -Status "pass" -Message "docker compose respondeu" -Details ($composeOutput.Trim())
}
catch {
  Add-Check -Id "docker.compose.ps" -Status "fail" -Message "docker compose ps falhou" -Details $_.Exception.Message
}

try {
  $health = Invoke-RestMethod -Uri "http://localhost:18080/health" -Method Get -TimeoutSec 5
  $healthStatus = if ($null -ne $health.status) { [string]$health.status } else { "sem-status" }
  $checkStatus = if ($healthStatus -in @("healthy", "degraded")) { "pass" } else { "warn" }
  Add-Check -Id "proxy.health" -Status $checkStatus -Message "health retornou $healthStatus" -Details (($health | ConvertTo-Json -Depth 6 -Compress))
}
catch {
  Add-Check -Id "proxy.health" -Status "warn" -Message "health do proxy indisponivel" -Details $_.Exception.Message
}

Test-HttpEndpoint -Id "proxy.root" -Url "http://localhost:18080/" -SuccessMessage "frontend respondeu" -FailureMessage "frontend no proxy indisponivel"
Test-HttpEndpoint -Id "hermes.url" -Url "http://localhost:8501/" -SuccessMessage "Hermes respondeu" -FailureMessage "Hermes nao respondeu em http://localhost:8501"
Test-HttpEndpoint -Id "hermes.api" -Url "http://localhost:8502/health" -SuccessMessage "Hermes API respondeu" -FailureMessage "Hermes API nao respondeu em http://localhost:8502/health"

$passCount = @($checks | Where-Object { $_.status -eq "pass" }).Count
$failCount = @($checks | Where-Object { $_.status -eq "fail" }).Count
$warnCount = @($checks | Where-Object { $_.status -eq "warn" }).Count
$status = if ($failCount -gt 0) { "fail" } elseif ($warnCount -gt 0) { "warn" } else { "pass" }

$report = [pscustomobject]@{
  timestamp = (Get-Date).ToString("s")
  repoRoot = $repoRoot
  status = $status
  summary = [pscustomobject]@{
    pass = $passCount
    warn = $warnCount
    fail = $failCount
    total = $checks.Count
  }
  checks = $checks
}

if ($Json) {
  $report | ConvertTo-Json -Depth 8
  exit 0
}

Write-Host ""
Write-Host ("hub-operacional-web doctor: " + $report.status.ToUpperInvariant())
Write-Host ""
$checks | Format-Table -AutoSize id, status, message
Write-Host ""
Write-Host ("summary pass=" + [string]$report.summary.pass + " warn=" + [string]$report.summary.warn + " fail=" + [string]$report.summary.fail + " total=" + [string]$report.summary.total)

if ($failCount -gt 0) {
  exit 1
}
