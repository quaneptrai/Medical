<#
.SYNOPSIS
    Stops the Phong kham YG backend and web portal.
.DESCRIPTION
    Closes the two service windows recorded by start-botmedical.ps1, then
    sweeps the backend/frontend ports in case anything is still listening
    (uvicorn --reload and "npm run dev" each spawn a worker process).
.EXAMPLE
    .\stop-botmedical.ps1
.EXAMPLE
    .\stop-botmedical.ps1 -BackendPort 8010 -FrontendPort 3010
#>
[CmdletBinding()]
param(
    [int]$BackendPort = 0,
    [int]$FrontendPort = 0
)

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$stateFile = Join-Path $root '.botmedical-run.json'
$stopped = 0

function Stop-Tree {
    param([int]$TargetPid)
    # Never take down this shell or its ancestors.
    if ($TargetPid -eq $PID -or $TargetPid -le 4) { return }
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$TargetPid" -ErrorAction SilentlyContinue
    foreach ($c in $children) { Stop-Tree -TargetPid ([int]$c.ProcessId) }
    Stop-Process -Id $TargetPid -Force -ErrorAction SilentlyContinue
}

function Stop-Port {
    param([int]$Port, [string]$Label)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { return $false }
    foreach ($owner in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
        $proc = Get-Process -Id $owner -ErrorAction SilentlyContinue
        $name = 'unknown'
        if ($proc) { $name = $proc.ProcessName }
        Stop-Tree -TargetPid ([int]$owner)
        Write-Host "  OK   stopped $Label (port $Port, pid $owner / $name)" -ForegroundColor Green
    }
    return $true
}

Write-Host ''
Write-Host 'Phong kham YG - stopping services' -ForegroundColor Magenta
Write-Host ''

# --- 1. Close the windows recorded by the last start ------------------------
if (Test-Path $stateFile) {
    $state = $null
    try { $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json } catch { $state = $null }
    if ($state) {
        if ($BackendPort -eq 0 -and $state.backend_port) { $BackendPort = [int]$state.backend_port }
        if ($FrontendPort -eq 0 -and $state.frontend_port) { $FrontendPort = [int]$state.frontend_port }
        foreach ($entry in @(
                @{ Id = $state.backend_pid;  Label = 'FastAPI backend window' },
                @{ Id = $state.frontend_pid; Label = 'web portal window' })) {
            if (-not $entry.Id) { continue }
            $targetPid = [int]$entry.Id
            if (Get-Process -Id $targetPid -ErrorAction SilentlyContinue) {
                Stop-Tree -TargetPid $targetPid
                Write-Host "  OK   closed $($entry.Label) (pid $targetPid)" -ForegroundColor Green
                $stopped++
            }
        }
    }
    Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
}

if ($BackendPort -eq 0) { $BackendPort = 8000 }
if ($FrontendPort -eq 0) { $FrontendPort = 3000 }

Start-Sleep -Seconds 1

# --- 2. Sweep the ports, for services started by hand ------------------------
if (Stop-Port -Port $BackendPort -Label 'FastAPI backend') { $stopped++ }
if (Stop-Port -Port $FrontendPort -Label 'Next.js web portal') { $stopped++ }

Start-Sleep -Seconds 2

$leftover = @()
foreach ($p in @($BackendPort, $FrontendPort)) {
    if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { $leftover += $p }
}

Write-Host ''
if ($leftover.Count -gt 0) {
    Write-Host "  WARN port(s) $($leftover -join ', ') still busy - close the service window manually." -ForegroundColor Yellow
}
elseif ($stopped -eq 0) {
    Write-Host '  Nothing was running.' -ForegroundColor DarkGray
}
else {
    Write-Host '  All services stopped.' -ForegroundColor Green
}
Write-Host ''
