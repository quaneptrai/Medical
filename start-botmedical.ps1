<#
.SYNOPSIS
    Starts the Phong kham YG backend (FastAPI) and web portal (Next.js).
.DESCRIPTION
    Runs a preflight check, opens one window per service, waits until the
    backend reports "ready", then opens the web portal in the browser.
.EXAMPLE
    .\start-botmedical.ps1
.EXAMPLE
    .\start-botmedical.ps1 -BackendPort 8010 -FrontendPort 3010 -NoBrowser
#>
[CmdletBinding()]
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [switch]$NoBrowser,
    [switch]$NoReload,
    [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$frontendDir = Join-Path $root 'frontend\clinic'
$venvPython = Join-Path $root 'venv\Scripts\python.exe'
$backendUrl = "http://127.0.0.1:$BackendPort"
$frontendUrl = "http://localhost:$FrontendPort"

function Write-Ok   { param([string]$m) Write-Host "  OK   $m" -ForegroundColor Green }
function Write-Info { param([string]$m) Write-Host "  ..   $m" -ForegroundColor DarkGray }
function Fail {
    param([string]$Message, [string[]]$Hints = @())
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    foreach ($h in $Hints) { Write-Host "       $h" -ForegroundColor Yellow }
    exit 1
}
function Test-PortBusy {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$conn
}

Write-Host ''
Write-Host '===========================================================' -ForegroundColor Magenta
Write-Host '  Phong kham YG - Starting services' -ForegroundColor Magenta
Write-Host '===========================================================' -ForegroundColor Magenta
Write-Host ''

# ------------------------------------------------------------ Preflight ----
if (-not $SkipChecks) {
    if (-not (Test-Path $venvPython)) {
        Fail 'Python virtualenv not found (.\venv).' @('Run the installer first:  .\setup.ps1')
    }
    Write-Ok 'python virtualenv'

    if (-not (Test-Path (Join-Path $frontendDir 'node_modules\next'))) {
        Fail 'Web dependencies are missing (frontend\clinic\node_modules).' @('Run the installer first:  .\setup.ps1')
    }
    Write-Ok 'web dependencies'

    if (-not (Test-Path (Join-Path $root 'models\bge-m3-medical-v2-recovered-a050-fp16\model.safetensors'))) {
        Fail 'The embedding model has not been assembled yet.' @(
            'The 1.1 GB weights ship as split parts under models\...\parts\.',
            'Run the installer, which joins and verifies them:  .\setup.ps1'
        )
    }
    Write-Ok 'embedding model'

    if (-not (Test-Path (Join-Path $root 'data\embeddings\chroma.sqlite3'))) {
        Fail 'The retrieval index has not been built.' @('Run:  .\setup.ps1')
    }
    Write-Ok 'retrieval index'

    foreach ($p in @($BackendPort, $FrontendPort)) {
        if (Test-PortBusy -Port $p) {
            Fail "Port $p is already in use." @(
                'Another instance is probably still running. Stop it with:',
                '    .\stop-botmedical.ps1',
                'Or pick different ports:',
                "    .\start-botmedical.ps1 -BackendPort 8010 -FrontendPort 3010"
            )
        }
    }
    Write-Ok "ports $BackendPort and $FrontendPort are free"
}

# -------------------------------------------------------------- Backend ----
Write-Host ''
Write-Info "starting FastAPI backend on $backendUrl"

$reloadFlags = ''
if (-not $NoReload) {
    # Watch source only - watching the project root would scan venv, models and node_modules.
    $reloadFlags = ' --reload --reload-dir src --reload-dir config'
}
$backendCmd = @"
`$Host.UI.RawUI.WindowTitle = 'YG Backend (FastAPI :$BackendPort)'
Set-Location -LiteralPath '$root'
`$env:ANONYMIZED_TELEMETRY = 'False'
Write-Host 'Phong kham YG - FastAPI backend' -ForegroundColor Cyan
Write-Host 'Docs: $backendUrl/api/docs' -ForegroundColor DarkGray
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor DarkGray
& '$venvPython' -m uvicorn src.web.app:app --host 127.0.0.1 --port $BackendPort$reloadFlags
"@
$backendProc = Start-Process powershell.exe -ArgumentList @('-NoExit', '-NoProfile', '-Command', $backendCmd) -PassThru

# ------------------------------------------------------------- Frontend ----
Write-Info "starting Next.js web portal on $frontendUrl"

$frontendCmd = @"
`$Host.UI.RawUI.WindowTitle = 'YG Web (Next.js :$FrontendPort)'
Set-Location -LiteralPath '$frontendDir'
`$env:BOTMED_BACKEND_URL = '$backendUrl'
Write-Host 'Phong kham YG - web portal' -ForegroundColor Cyan
Write-Host 'Backend: $backendUrl' -ForegroundColor DarkGray
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor DarkGray
npm run dev -- --port $FrontendPort
"@
$frontendProc = Start-Process powershell.exe -ArgumentList @('-NoExit', '-NoProfile', '-Command', $frontendCmd) -PassThru

# Record the window PIDs so stop-botmedical.ps1 can close exactly these two.
$stateFile = Join-Path $root '.botmedical-run.json'
[pscustomobject]@{
    started_at    = (Get-Date).ToString('s')
    backend_pid   = $backendProc.Id
    frontend_pid  = $frontendProc.Id
    backend_port  = $BackendPort
    frontend_port = $FrontendPort
} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding utf8

# ---------------------------------------------------------- Health wait ----
Write-Host ''
Write-Info 'waiting for the backend to answer (up to 90s) ...'
$backendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-RestMethod -Uri "$backendUrl/api/status" -TimeoutSec 5
        if ($resp.service -eq 'ready') {
            $backendReady = $true
            Write-Ok "backend ready - knowledge base: $($resp.knowledge_base_files) diseases, index: $($resp.vector_index.count)/$($resp.vector_index.target)"
            break
        }
    }
    catch { }
}
if (-not $backendReady) {
    Write-Host '  WARN backend did not answer in time - check the "YG Backend" window for errors.' -ForegroundColor Yellow
}

Write-Info 'waiting for the web portal (up to 120s) ...'
$frontendReady = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    if (Test-PortBusy -Port $FrontendPort) {
        $frontendReady = $true
        Write-Ok 'web portal ready'
        break
    }
}
if (-not $frontendReady) {
    Write-Host '  WARN web portal did not come up in time - check the "YG Web" window.' -ForegroundColor Yellow
}

# ------------------------------------------------------------- Summary ----
Write-Host ''
Write-Host '===========================================================' -ForegroundColor Green
Write-Host '  RUNNING' -ForegroundColor Green
Write-Host '===========================================================' -ForegroundColor Green
Write-Host ''
Write-Host "  Web portal        $frontendUrl" -ForegroundColor Cyan
Write-Host "  Symptom desk      $frontendUrl/tro-ly" -ForegroundColor DarkGray
Write-Host "  Booking           $frontendUrl/dat-lich" -ForegroundColor DarkGray
Write-Host "  Backend API docs  $backendUrl/api/docs" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Note: the first symptom search loads the model and takes' -ForegroundColor Yellow
Write-Host '        ~40s on CPU. Later searches answer in under a second.' -ForegroundColor Yellow
Write-Host ''
Write-Host '  Stop everything:  .\stop-botmedical.ps1' -ForegroundColor White
Write-Host ''

if (-not $NoBrowser -and $frontendReady) {
    Start-Process $frontendUrl | Out-Null
}
