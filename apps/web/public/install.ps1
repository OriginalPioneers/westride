<#
.SYNOPSIS
  WeStride supporter runner installer (Windows).

.DESCRIPTION
  & ([scriptblock]::Create((irm https://www.westride.org/install.ps1))) -Code XXXX-XXXX -Url https://www.westride.org

  Installs nothing on the host besides a Docker container. The runner only
  takes agent jobs for ideas you pledged compute to, clones public
  repositories, and never holds GitHub credentials. Stop it any time with
    docker rm -f westride-runner
#>
[CmdletBinding()]
param(
  [string]$Code = "",
  [string]$Name = "",
  [string]$Url = $(if ($env:WESTRIDE_URL) { $env:WESTRIDE_URL } else { "https://www.westride.org" }),
  [string]$MetaKey = $(if ($env:META_API_KEY) { $env:META_API_KEY } else { "" }),
  [string]$Image = $(if ($env:WESTRIDE_RUNNER_IMAGE) { $env:WESTRIDE_RUNNER_IMAGE } else { "ghcr.io/westrideorg/westride-runner:latest" }),
  [string]$Memory = "6g",
  [string]$Cpus = "4"
)

$ErrorActionPreference = "Stop"
$Container = "westride-runner"
$Volume = "westride-runner-state"

function Fail($message) { Write-Host "Error: $message" -ForegroundColor Red; exit 1 }

# Runs docker quietly and returns its exit code; everything it printed is left
# in $script:DockerOutput so a failure can be shown. Windows PowerShell 5.1
# turns redirected native stderr into a terminating error while
# $ErrorActionPreference is "Stop", so it is relaxed for the call only.
function Invoke-Docker {
  # No param block: docker flags such as -a or -e must not bind to a parameter.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $script:DockerOutput = (& docker @args 2>&1 | ForEach-Object { "$_" }) -join "`n"
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
}

Write-Host ""
Write-Host "WeStride supporter runner"
Write-Host "========================="

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker is not installed. Get Docker Desktop from https://docs.docker.com/get-docker/ and run this again."
}
if ((Invoke-Docker info) -ne 0) { Fail "Docker is installed but not running. Start Docker Desktop and run this again." }

Invoke-Docker ps -a --format '{{.Names}}' | Out-Null
$existing = ($script:DockerOutput -split "`n") | Where-Object { $_ -eq $Container }
if ($existing) {
  $answer = Read-Host "A runner container already exists. Replace it? [y/N]"
  if ($answer -match '^(y|yes)$') {
    Invoke-Docker rm -f $Container | Out-Null
  } else {
    Write-Host "Leaving the existing runner alone. Logs: docker logs -f $Container"
    exit 0
  }
}

$hasToken = $false
if ((Invoke-Docker volume inspect $Volume) -eq 0) {
  if ((Invoke-Docker run --rm -v "${Volume}:/state:ro" alpine:3 sh -c 'test -s /state/device-token') -eq 0) {
    $hasToken = $true
  }
}

if (-not $Code -and -not $hasToken) {
  $Code = Read-Host "Pairing code from WeStride -> WePledge -> Link a computer"
  if (-not $Code) { Fail "A pairing code is required the first time." }
}

if (-not $Name) {
  $defaultName = $env:COMPUTERNAME
  if (-not $defaultName) { $defaultName = "My computer" }
  $Name = Read-Host "Name for this computer [$defaultName]"
  if (-not $Name) { $Name = $defaultName }
}

if (-not $MetaKey) {
  Write-Host ""
  Write-Host "Optional: a Meta API key lets jobs that need one run here. It stays on this"
  Write-Host "computer and is never sent to WeStride. Leave blank to only run jobs with"
  Write-Host "local Ollama models."
  $MetaKey = Read-Host "Meta API key (optional)"
}

try {
  Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 *> $null
  Write-Host "Ollama is running; local models will be offered."
} catch {
  Write-Host "Ollama was not found on port 11434. Jobs that need a local model will wait until it runs."
}

Write-Host ""
if ((Invoke-Docker image inspect $Image) -eq 0) {
  # A local copy (pulled earlier or built from apps/runner) is enough; refresh it when we can.
  if ((Invoke-Docker pull $Image) -eq 0) {
    Write-Host "Using the latest $Image."
  } else {
    Write-Host "Could not check for a newer image; using the local copy of $Image."
  }
} else {
  Write-Host "Pulling $Image..."
  if ((Invoke-Docker pull $Image) -ne 0) {
    Write-Host $script:DockerOutput
    Fail "The runner image could not be pulled. If you built it yourself, tag it as $Image or pass -Image <name>."
  }
}
Invoke-Docker volume create $Volume | Out-Null

$runArgs = @(
  "run", "-d", "--name", $Container, "--restart", "unless-stopped",
  "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "512",
  "--memory", $Memory, "--cpus", $Cpus,
  "--add-host", "host.docker.internal:host-gateway",
  "-v", "${Volume}:/state",
  "-e", "WESTRIDE_URL=$Url",
  "-e", "WESTRIDE_DEVICE_NAME=$Name"
)
if ($Code) { $runArgs += @("-e", "WESTRIDE_PAIRING_CODE=$Code") }
if ($MetaKey) { $runArgs += @("-e", "META_API_KEY=$MetaKey") }
$runArgs += $Image

if ((Invoke-Docker @runArgs) -ne 0) {
  Write-Host $script:DockerOutput
  Fail "The runner container could not be started."
}

Write-Host ""
Write-Host "The runner is starting. It shows up on your WePledge page within a minute."
Write-Host "  Logs:  docker logs -f $Container"
Write-Host "  Stop:  docker rm -f $Container"
